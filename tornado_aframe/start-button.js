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
    this.onSceneLoaded = this.onSceneLoaded.bind(this);
    this.onStartClick = this.onStartClick.bind(this);

    // Listen for scene load
    if (this.el.hasLoaded) {
      this.onSceneLoaded();
    } else {
      this.el.addEventListener("loaded", this.onSceneLoaded);
    }
  },

  setupStyles: function () {
    const style = document.createElement("style");
    style.innerHTML = `
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
        font-family: 'Times New Roman', serif;
        color: #e0e0e0;
        font-size: 24px;
        letter-spacing: 8px;
        text-transform: uppercase;
        user-select: none;
        -webkit-user-select: none;
        opacity: 0.7;
        transition: all 0.5s ease;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
      }

      @keyframes pulse {
        0% { opacity: 0.4; text-shadow: 0 0 5px rgba(255,255,255,0.1); }
        50% { opacity: 1.0; text-shadow: 0 0 15px rgba(255,255,255,0.5); }
        100% { opacity: 0.4; text-shadow: 0 0 5px rgba(255,255,255,0.1); }
      }

      .ethereal-loading {
        animation: pulse 3s infinite ease-in-out;
        cursor: default;
      }

      .ethereal-active {
        cursor: pointer;
        opacity: 1 !important;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 20px 40px;
        background: rgba(0,0,0,0.5);
      }

      .ethereal-active:hover {
        background: rgba(20, 20, 20, 0.8);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
        letter-spacing: 12px;
        color: #ffffff;
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
    this.text.innerText = "INITIALIZING ETHER...";

    this.overlay.appendChild(this.text);
    document.body.appendChild(this.overlay);
  },

  onSceneLoaded: function () {
    setTimeout(() => {
      this.text.innerText = "ENTER VORTEX";
      this.text.classList.remove("ethereal-loading");
      this.text.classList.add("ethereal-active");
      this.text.addEventListener("click", this.onStartClick);
    }, 500);
  },

  onStartClick: function () {
    // 1. Enter VR immediately (requires user gesture)
    if (this.data.enter_vr) {
      try {
        this.el.enterVR();
      } catch (e) {
        console.warn("Could not enter VR automatically", e);
      }
    }

    // 2. Start Fade Out
    this.overlay.classList.add("hidden");

    // 3. Cleanup and Emit Event after fade finishes
    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }

      // Emit event signaling the onboarding job is fully done
      this.el.emit("start-button-job-done", null, false);
    }, this.data.fade_in_time);
  },
});
