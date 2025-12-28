import AFRAME from "aframe";
import * as THREE from "three";

AFRAME.registerComponent("play-on-start", {
  schema: {
    event: { type: "string", default: "start-button-job-done" },
  },

  init: function () {
    this.onStart = this.onStart.bind(this);
    // Listen to the SCENE (global), not the entity
    this.el.sceneEl.addEventListener(this.data.event, this.onStart);
  },

  onStart: function () {
    const soundComp = this.el.components.sound;

    if (!soundComp) {
      console.warn("play-on-start: No 'sound' component found on this entity.");
      return;
    }

    // 1. Resume Audio Context
    // Browsers often suspend audio until a user click. This ensures it's running.
    if (THREE.AudioContext.getContext().state === "suspended") {
      THREE.AudioContext.getContext().resume();
    }

    // 2. Refresh the Source (The "Dead Link" Fix)
    // Because your assets loaded dynamically, the sound component might have
    // initialized with a broken link. We force it to look again.
    const currentSrc = this.el.getAttribute("sound").src;

    // We momentarily clear and reset the src to force A-Frame to update
    this.el.setAttribute("sound", "src", "");
    this.el.setAttribute("sound", "src", currentSrc);

    // 3. Play the sound
    // We use a tiny timeout to ensure the attribute update is processed first
    setTimeout(() => {
      soundComp.playSound();
    }, 50);
  },

  remove: function () {
    this.el.sceneEl.removeEventListener(this.data.event, this.onStart);
  },
});
