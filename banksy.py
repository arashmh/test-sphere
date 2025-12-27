import numpy as np
import pandas as pd
import folium
from folium.plugins import HeatMap
from sklearn.mixture import BayesianGaussianMixture

# ==========================================
# 1. SETUP: Create Fake "Banksy" Data
# ==========================================
# In a real scenario, you would load your CSV here.
# We will generate synthetic clusters around a "Suspect Home" in Shoreditch, London.

# True "Home" (The Anchor Point we want the model to find)
true_home_lat = 51.526
true_home_lon = -0.078

# Generate 50 artwork locations loosely clustered around the home
# The paper analyzed 140 points; we will simulate a smaller batch.
np.random.seed(42)
n_samples = 60

# We create two clusters: 
# 1. Main cluster around the "home" (representing local tagging)
# 2. A smaller cluster further away (representing a distinct project/exhibition)
cluster_1 = np.random.normal(loc=[true_home_lat, true_home_lon], scale=0.004, size=(45, 2))
cluster_2 = np.random.normal(loc=[true_home_lat + 0.015, true_home_lon - 0.01], scale=0.002, size=(15, 2))

data = np.vstack([cluster_1, cluster_2])

# Convert to DataFrame for easier handling
artworks_df = pd.DataFrame(data, columns=['lat', 'lon'])

print(f"Analying {len(artworks_df)} artwork locations...")

# ==========================================
# 2. THE MODEL: Dirichlet Process Mixture
# ==========================================
# The paper used a DPM. In sklearn, this is the 'BayesianGaussianMixture'
# with weight_concentration_prior_type='dirichlet_process'.

# We set n_components high (e.g., 10). The DPM math will automatically
# "kill" the components it doesn't need, effectively finding the 
# natural number of "bases" the artist uses.
dpm = BayesianGaussianMixture(
    n_components=10, 
    weight_concentration_prior_type='dirichlet_process',
    weight_concentration_prior=1e-2, # Controls how eager it is to create new clusters
    max_iter=1000,
    random_state=42
)

dpm.fit(artworks_df[['lat', 'lon']])

print("Model converged.")
print(f"Active clusters found: {sum(dpm.weights_ > 0.01)}")

# ==========================================
# 3. GENERATE THE PROBABILITY SURFACE (GRID)
# ==========================================
# To make a map, we need to calculate the probability "score" for every
# point on a grid overlaying the city.

# Define bounds of the map (add some padding)
min_lat, max_lat = artworks_df['lat'].min() - 0.01, artworks_df['lat'].max() + 0.01
min_lon, max_lon = artworks_df['lon'].min() - 0.01, artworks_df['lon'].max() + 0.01

# Create a fine grid
grid_lat = np.linspace(min_lat, max_lat, 100)
grid_lon = np.linspace(min_lon, max_lon, 100)
xx, yy = np.meshgrid(grid_lat, grid_lon)
grid_points = np.c_[xx.ravel(), yy.ravel()]

# precise Log-likelihood of each point in the grid being the "center"
# We use score_samples to get the log density
log_prob = dpm.score_samples(grid_points)

# Convert log-prob to probability density
prob_density = np.exp(log_prob)

# Normalize for visualization (0 to 1 scale)
prob_density = (prob_density - prob_density.min()) / (prob_density.max() - prob_density.min())

# ==========================================
# 4. VISUALIZATION: Create the Map
# ==========================================

# Center map on the average location
center_map = [np.mean(artworks_df['lat']), np.mean(artworks_df['lon'])]
m = folium.Map(location=center_map, zoom_start=14, tiles='cartodbdark_matter')

# A. Plot the Artworks (The Evidence)
for _, row in artworks_df.iterrows():
    folium.CircleMarker(
        location=[row['lat'], row['lon']],
        radius=3,
        color='cyan',
        fill=True,
        fill_opacity=0.7,
        popup="Artwork"
    ).add_to(m)

# B. Plot the "Suspect" Location (Ground Truth for our test)
folium.Marker(
    [true_home_lat, true_home_lon],
    popup="<b>Suspect Residence</b><br>(The model doesn't know this location)",
    icon=folium.Icon(color='red', icon='home')
).add_to(m)

# C. Plot the DPM Heatmap (The "Geoprofile")
# We construct the heat data from our grid predictions
heat_data = []
for i in range(len(grid_points)):
    # Only plot points with significant probability to keep map clean
    if prob_density[i] > 0.1: 
        heat_data.append([grid_points[i][0], grid_points[i][1], prob_density[i]])

# Add the heatmap layer
HeatMap(
    heat_data,
    radius=15, 
    blur=20, 
    max_zoom=1, 
    gradient={0.2: 'blue', 0.5: 'lime', 0.8: 'yellow', 1: 'red'}
).add_to(m)

# Save to file
m.save("banksy_geoprofile.html")

print("Map created: banksy_geoprofile.html")
print("Open this file in your browser to see the geographic profile.")