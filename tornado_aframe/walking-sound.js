/* walking-sound.js */
AFRAME.registerComponent("walking-sound", {
  schema: {
    entity_with_marker: { type: "selector" }, // #tornado
    entity_with_walking_sound: { type: "selector" }, // #walking-sound
  },

  init: function () {
    this.myPos = new THREE.Vector3();
    this.markerPos = new THREE.Vector3();

    // Timer handles
    this.moveTimeout = null; // The debounce timer (waiting for movement to stop)
    this.fadeInterval = null; // The interval for lowering volume

    this.defaultVolume = 1.0; // Will store the original volume from HTML
    this.isFadingOut = false;

    this.onMoved = this.onMoved.bind(this);

    if (this.el.sceneEl.hasLoaded) {
      this.setup();
    } else {
      this.el.sceneEl.addEventListener("loaded", this.setup.bind(this));
    }
  },

  setup: function () {
    // 1. Capture the initial volume set in the HTML (e.g., volume="2")
    const soundEl = this.data.entity_with_walking_sound;
    if (soundEl) {
      const soundAttr = soundEl.getAttribute("sound");
      // If sound component is defined as an object style or string
      if (soundAttr && soundAttr.volume !== undefined) {
        this.defaultVolume = parseFloat(soundAttr.volume);
      } else {
        // Default A-Frame sound volume is 1
        this.defaultVolume = 1.0;
      }
    }

    this.el.addEventListener("moved", this.onMoved);
  },

  onMoved: function () {
    const data = this.data;
    const markerEl = data.entity_with_marker;
    const soundEl = data.entity_with_walking_sound;

    if (!markerEl || !soundEl) return;
    const soundComponent = soundEl.components.sound;
    if (!soundComponent) return;

    // --- 1. Calculate Distance ---
    this.el.object3D.getWorldPosition(this.myPos);
    markerEl.object3D.getWorldPosition(this.markerPos);

    // Flatten height for 2D distance check (optional, good for floor walking)
    this.myPos.y = 0;
    this.markerPos.y = 0;

    const distance = this.myPos.distanceTo(this.markerPos);

    // --- 2. Get poolSize from Tornado Params ---
    let poolSize = 0;
    if (markerEl.components.tornado && markerEl.components.tornado.params) {
      poolSize = markerEl.components.tornado.params.poolSize;
      // Optional: Multiply by scale factor if your floor mesh is scaled (e.g. * 2.5)
      poolSize = poolSize * 2.75;
    } else {
      return; // Tornado not ready
    }

    // --- 3. Logic ---
    if (distance < poolSize) {
      // ** WE ARE WALKING INSIDE THE ZONE **

      // If we were waiting to pause, cancel that. We are still moving.
      if (this.moveTimeout) {
        clearTimeout(this.moveTimeout);
        this.moveTimeout = null;
      }

      // If we were fading out, or sound is paused, bring it back instantly
      this.resetVolumeAndPlay(soundEl, soundComponent);

      // Set the debounce timer. If no 'moved' event happens for 200ms, start fading out.
      this.moveTimeout = setTimeout(() => {
        this.startFadeOut(soundEl, soundComponent);
        this.moveTimeout = null;
      }, 200);
    } else {
      // ** OUTSIDE THE ZONE **
      // Start fading out immediately if we step out
      if (this.moveTimeout) {
        clearTimeout(this.moveTimeout);
        this.moveTimeout = null;
      }
      // Only start fade if we aren't already fading/paused
      if (soundComponent.isPlaying && !this.isFadingOut) {
        this.startFadeOut(soundEl, soundComponent);
      }
    }
  },

  resetVolumeAndPlay: function (soundEl, soundComponent) {
    // 1. Stop any active fade process
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    this.isFadingOut = false;

    // 2. Snap volume back to original settings
    soundEl.setAttribute("sound", "volume", this.defaultVolume);

    // 3. Play if not playing
    if (!soundComponent.isPlaying) {
      soundComponent.playSound();
    }
  },

  startFadeOut: function (soundEl, soundComponent) {
    // If already fading or stopped, do nothing
    if (this.isFadingOut || !soundComponent.isPlaying) return;

    this.isFadingOut = true;

    const fadeDuration = 500; // ms
    const intervalTime = 50; // Update every 50ms
    const steps = fadeDuration / intervalTime;

    // Get current volume to fade down from (in case we barely started playing)
    let currentVol = soundEl.getAttribute("sound").volume; // Helper to get current parsed val
    // Fallback if getAttribute returns object/string
    if (typeof currentVol === "object")
      currentVol = currentVol.volume || this.defaultVolume;

    const volStep = currentVol / steps;

    this.fadeInterval = setInterval(() => {
      currentVol -= volStep;

      if (currentVol <= 0.01) {
        // FADE COMPLETE
        currentVol = 0;
        soundComponent.pauseSound();
        soundEl.setAttribute("sound", "volume", 0); // Ensure 0

        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        this.isFadingOut = false;
      } else {
        // STEP DOWN
        soundEl.setAttribute("sound", "volume", currentVol);
      }
    }, intervalTime);
  },

  remove: function () {
    this.el.removeEventListener("moved", this.onMoved);
    if (this.moveTimeout) clearTimeout(this.moveTimeout);
    if (this.fadeInterval) clearInterval(this.fadeInterval);
  },
});
