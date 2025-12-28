import AFRAME from "aframe";
import * as THREE from "three";

AFRAME.registerComponent("marker", {
  schema: {
    camera: { type: "selector", default: "#head" },
    show_hud: { type: "boolean", default: false }, // Default false as requested
  },

  init: function () {
    // --- TIMING ---
    this.tickTimer = 0;
    this.interval = 150; // Run every 150ms

    // --- HUD SETUP ---
    // Only create HUD if requested
    if (this.data.show_hud) {
      this.cameraEl = this.data.camera;

      this.hud = document.createElement("a-text");
      // Position: Top Left
      this.hud.setAttribute("position", "-0.7 0.7 -1");
      this.hud.setAttribute("width", 1.5);
      this.hud.setAttribute("color", "#ffffff");
      this.hud.setAttribute("align", "left");
      this.hud.setAttribute("anchor", "left");
      this.hud.setAttribute("font", "sourcecodepro");
      this.hud.setAttribute("value", "Initializing...");
      this.hud.setAttribute("material", "depthTest: false; shader: flat;");
      this.hud.setAttribute("render-order", "999");

      this.cameraEl.appendChild(this.hud);
    } else {
      // Need reference to camera even if no HUD, for calculations
      this.cameraEl = this.data.camera;
    }

    // Reusable objects
    this.tornadoPos = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.curve = new THREE.SplineCurve();
  },

  tick: function (t, dt) {
    // --- THROTTLE (150ms) ---
    this.tickTimer += dt;
    if (this.tickTimer < this.interval) return;
    this.tickTimer = 0;

    // 1. Get Tornado Data
    const tornadoComp = this.el.components.tornado;
    if (!tornadoComp || !tornadoComp.params) return;
    const p = tornadoComp.params;

    // 2. Rebuild curve (Live GUI support)
    const points = [
      new THREE.Vector2(p.baseWidth, 0),
      new THREE.Vector2(p.baseWidth * 0.5, 0.5),
      new THREE.Vector2(p.stemPinch, p.bulbHeight * 0.3),
      new THREE.Vector2(p.stemPinch * 1.5, p.bulbHeight * 0.5),
      new THREE.Vector2(p.bulbWidth, p.bulbHeight * 0.8),
      new THREE.Vector2(p.bulbWidth * 0.6, p.bulbHeight * 0.95),
      new THREE.Vector2(0.0, p.totalHeight),
    ];
    this.curve.points = points;

    // 3. World Positions
    this.el.object3D.getWorldPosition(this.tornadoPos);
    this.cameraEl.object3D.getWorldPosition(this.camPos);

    // 4. Cylindrical Calculations
    const localY = this.camPos.y - this.tornadoPos.y;
    const dx = this.camPos.x - this.tornadoPos.x;
    const dz = this.camPos.z - this.tornadoPos.z;
    const distFromCenter = Math.sqrt(dx * dx + dz * dz);

    // 5. Get Radii at Height
    const curvePoints = this.curve.getPoints(100);

    const getRadiusAtY = (targetY) => {
      if (targetY < 0) return points[0].x;
      if (targetY > p.totalHeight) return 0;

      for (let i = 0; i < curvePoints.length - 1; i++) {
        const p1 = curvePoints[i];
        const p2 = curvePoints[i + 1];
        if (targetY >= p1.y && targetY <= p2.y) {
          const alpha = (targetY - p1.y) / (p2.y - p1.y);
          return p1.x + (p2.x - p1.x) * alpha;
        }
      }
      return 0;
    };

    const radiusCore = getRadiusAtY(localY);
    const radiusShell = getRadiusAtY(localY / 1.02) * 1.05;

    // 6. Calculate Intersection Points (Global Coordinates)

    // Normalize direction vector from Tornado Center to Camera
    let dirX = 0,
      dirZ = 0;
    if (distFromCenter > 0.001) {
      dirX = dx / distFromCenter;
      dirZ = dz / distFromCenter;
    }

    // Calculate intersection coordinates
    // Base Pos + (Direction * Radius) + Vertical Height

    const shellIntX = this.tornadoPos.x + dirX * radiusShell;
    const shellIntZ = this.tornadoPos.z + dirZ * radiusShell;
    const shellIntY = this.camPos.y; // Intersection is at camera height

    const plasmaIntX = this.tornadoPos.x + dirX * radiusCore;
    const plasmaIntZ = this.tornadoPos.z + dirZ * radiusCore;
    const plasmaIntY = this.camPos.y;

    // 7. Emit Event
    this.el.emit("position-updated", {
      shell: { x: shellIntX, y: shellIntY, z: shellIntZ },
      plasma: { x: plasmaIntX, y: plasmaIntY, z: plasmaIntZ },
      distance: distFromCenter,
    });

    // 8. Update HUD (Only if enabled)
    if (this.data.show_hud && this.hud) {
      const distToCoreCm = (distFromCenter - radiusCore) * 100;
      const distToShellCm = (distFromCenter - radiusShell) * 100;
      const distFromCenterCm = distFromCenter * 100;

      const text =
        `Dist Center:   ${distFromCenterCm.toFixed(1)} cm\n` +
        `Dist Shell:    ${distToShellCm.toFixed(1)} cm\n` +
        `Dist Plasma:   ${distToCoreCm.toFixed(1)} cm`;

      this.hud.setAttribute("value", text);
    }
  },

  remove: function () {
    if (this.hud && this.hud.parentNode) {
      this.hud.parentNode.removeChild(this.hud);
    }
  },
});
