import AFRAME from "aframe";
import * as THREE from "three";

AFRAME.registerComponent("marker", {
  schema: {
    camera: { type: "selector", default: "#head" },
  },

  init: function () {
    // --- HUD SETUP ---
    this.cameraEl = this.data.camera;

    // Create the text entity
    this.hud = document.createElement("a-text");

    // Position: X=-0.7 (Left), Y=0.7 (Up), Z=-1 (1 meter forward)
    this.hud.setAttribute("position", "-0.7 0.7 -1");

    this.hud.setAttribute("width", 1.5); // Slightly smaller scale for cleaner look
    this.hud.setAttribute("color", "#ffffff");

    // Align left/Anchor left ensures text grows to the right (into the view)
    this.hud.setAttribute("align", "left");
    this.hud.setAttribute("anchor", "left");

    this.hud.setAttribute("font", "sourcecodepro");
    this.hud.setAttribute("value", "Initializing...");

    // Ensure it doesn't get occluded by the tornado or fog
    this.hud.setAttribute("material", "depthTest: false; shader: flat;");
    this.hud.setAttribute("render-order", "999");

    this.cameraEl.appendChild(this.hud);

    // Reusable objects to prevent GC
    this.tornadoPos = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.curve = new THREE.SplineCurve();
  },

  tick: function () {
    // 1. Get Tornado Component Reference
    const tornadoComp = this.el.components.tornado;

    // Safety check: wait for tornado to initialize
    if (!tornadoComp || !tornadoComp.params) return;
    const p = tornadoComp.params;

    // 2. Rebuild the spline curve based on current params (Live GUI support)
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

    // 3. Calculate Positions (World Space)
    this.el.object3D.getWorldPosition(this.tornadoPos);
    this.cameraEl.object3D.getWorldPosition(this.camPos);

    // 4. Calculate Cylindrical Coordinates
    // Vertical distance (Y) from tornado base
    const localY = this.camPos.y - this.tornadoPos.y;

    // Horizontal distance (Radius) from center line
    const dx = this.camPos.x - this.tornadoPos.x;
    const dz = this.camPos.z - this.tornadoPos.z;
    const distFromCenter = Math.sqrt(dx * dx + dz * dz);

    // 5. Calculate Radius of Core and Shell at this specific height
    const curvePoints = this.curve.getPoints(100);
    let radiusCore = 0;
    let radiusShell = 0;

    // Helper to find X (radius) given Y in the points array
    const getRadiusAtY = (targetY) => {
      if (targetY < 0) return points[0].x; // Below base, use base width
      if (targetY > p.totalHeight) return 0; // Above top

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

    // Get Core Radius
    radiusCore = getRadiusAtY(localY);

    // Get Shell Radius (Shell is scaled: Y/1.02 -> result * 1.05)
    const shellHeightUnscaled = localY / 1.02;
    const rawShellRadius = getRadiusAtY(shellHeightUnscaled);
    radiusShell = rawShellRadius * 1.05;

    // 6. Calculate Distances (in CM)
    const distToCoreCm = (distFromCenter - radiusCore) * 100;
    const distToShellCm = (distFromCenter - radiusShell) * 100;
    const distFromCenterCm = distFromCenter * 100;

    // 7. Update HUD
    const text =
      `Dist Center:   ${distFromCenterCm.toFixed(1)} cm\n` +
      `Dist Shell:    ${distToShellCm.toFixed(1)} cm\n` +
      `Dist Plasma:   ${distToCoreCm.toFixed(1)} cm`;

    this.hud.setAttribute("value", text);
  },

  remove: function () {
    if (this.hud && this.hud.parentNode) {
      this.hud.parentNode.removeChild(this.hud);
    }
  },
});
