import AFRAME from "aframe";

AFRAME.registerComponent("start-button", {
  schema: {
    fade_in_time: { type: "number", default: 1000 },
    enter_vr: { type: "boolean", default: true },
  },

  init: function () {
    this.setupStyles();
    this.createOverlay();

    // Bind methods
    this.checkLoadState = this.checkLoadState.bind(this);
    this.onAllLoaded = this.onAllLoaded.bind(this);
    this.onStartClick = this.onStartClick.bind(this);

    // 1. Get references
    const scene = this.el;
    const assets = document.querySelector("a-assets");

    // 2. Define the listener logic
    // We attach this to both Scene and Assets to ensure we catch the latest one
    if (scene.hasLoaded) {
      this.checkLoadState();
    } else {
      scene.addEventListener("loaded", this.checkLoadState);
    }

    if (assets) {
      if (assets.hasLoaded) {
        this.checkLoadState();
      } else {
        // Specifically listen for the assets loaded event
        assets.addEventListener("loaded", this.checkLoadState);
      }
    } else {
      // If no a-assets tag exists, just rely on scene load
      this.checkLoadState();
    }
  },

  checkLoadState: function () {
    const scene = this.el;
    const assets = document.querySelector("a-assets");

    const sceneLoaded = scene.hasLoaded;
    // If <a-assets> exists, check if it's loaded. If it doesn't exist, treat as true.
    const assetsLoaded = assets ? assets.hasLoaded : true;

    if (sceneLoaded && assetsLoaded) {
      // Remove listeners so this doesn't fire multiple times
      scene.removeEventListener("loaded", this.checkLoadState);
      if (assets) assets.removeEventListener("loaded", this.checkLoadState);

      this.onAllLoaded();
    }
  },

  setupStyles: function () {
    const style = document.createElement("style");
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&display=swap');

      #ethereal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #000000;
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        transition: opacity ${this.data.fade_in_time}ms ease-out;
        pointer-events: auto;
      }

      #ethereal-text {
        font-family: 'Cinzel', serif;
        font-weight: 500;
        color: #e0d0b0; /* Warm beige */
        font-size: 24px;
        letter-spacing: 6px;
        text-transform: uppercase;
        user-select: none;
        -webkit-user-select: none;
        opacity: 0.7;
        transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        text-shadow: 0 0 15px rgba(180, 150, 100, 0.2);
        text-align: center;
      }

      /* Pulse animation for loading state */
      @keyframes soft-pulse {
        0% { opacity: 0.4; text-shadow: 0 0 5px rgba(255, 200, 120, 0.1); }
        50% { opacity: 0.9; text-shadow: 0 0 20px rgba(255, 200, 120, 0.4); }
        100% { opacity: 0.4; text-shadow: 0 0 5px rgba(255, 200, 120, 0.1); }
      }

      .ethereal-loading {
        animation: soft-pulse 3s infinite ease-in-out;
        cursor: default;
      }

      .ethereal-active {
        cursor: pointer;
        opacity: 1 !important;
        font-weight: 700;
        
        /* Shape & Border */
        border: 1px solid rgba(255, 215, 150, 0.3);
        border-radius: 50px; /* Fully rounded corners */
        padding: 20px 60px;
        
        /* Warm Background */
        background: radial-gradient(circle, rgba(40, 30, 20, 0.8) 0%, rgba(10, 5, 0, 0.9) 100%);
        
        /* Fuzzy Warm Glow (Inner and Outer) */
        box-shadow: 
          0 0 20px rgba(255, 180, 100, 0.1), 
          inset 0 0 20px rgba(255, 180, 100, 0.05);
        
        text-shadow: 0 0 12px rgba(255, 220, 180, 0.5);
      }

      .ethereal-active:hover {
        background: radial-gradient(circle, rgba(60, 45, 30, 0.9) 0%, rgba(20, 10, 0, 0.95) 100%);
        border-color: rgba(255, 215, 150, 0.6);
        color: #fff8e7;
        letter-spacing: 9px; /* Slight expansion */
        
        /* Stronger Warm Glow on Hover */
        box-shadow: 
          0 0 40px rgba(255, 160, 80, 0.3), 
          inset 0 0 30px rgba(255, 160, 80, 0.1);
          
        text-shadow: 0 0 20px rgba(255, 230, 200, 0.8);
        transform: scale(1.02);
      }
      
      .hidden {
        opacity: 0;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  },

  createOverlay: function () {
    this.overlay = document.createElement("div");
    this.overlay.id = "ethereal-overlay";

    this.text = document.createElement("div");
    this.text.id = "ethereal-text";
    this.text.className = "ethereal-loading";
    this.text.innerText = "INITIALIZING ETHER..."; // Initial Text

    this.overlay.appendChild(this.text);
    document.body.appendChild(this.overlay);
  },

  onAllLoaded: function () {
    // Small timeout to ensure browser renders the final frames of loading
    setTimeout(() => {
      this.text.innerText = "ENTER IBI";
      this.text.classList.remove("ethereal-loading");
      this.text.classList.add("ethereal-active");
      this.text.addEventListener("click", this.onStartClick);
    }, 500);
  },

  onStartClick: function () {
    // 1. Enter VR
    if (this.data.enter_vr) {
      try {
        if (AFRAME.utils.device.checkHeadsetConnected()) {
          this.el.enterVR();
        }
      } catch (e) {
        console.warn("Could not enter VR automatically", e);
      }
    }

    // 2. Fade Out
    this.overlay.classList.add("hidden");

    // 3. Cleanup and Emit
    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.el.emit("start-button-job-done", null, false);
      console.log("Start Button: Job Done emitted.");
    }, this.data.fade_in_time);
  },
});
