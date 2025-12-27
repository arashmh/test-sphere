// Smart Height Adjuster Component
AFRAME.registerComponent('smart-height-adjuster', {
  schema: {
    targetHeight: { type: 'number', default: 1.75 }, 
    threshold: { type: 'number', default: 1.55 },    
    interval: { type: 'number', default: 5000 },
    sitting_to_standing_threshold_for_readjustment: { type: 'number', default: 0.4 }
  },

  init: function () {
    this.adjuster = this.el.querySelector('#camera-height-adjuster');
    this.camera = this.el.querySelector('[camera]');
    
    this.timer = 0;
    this.isActive = false;

    this.el.sceneEl.addEventListener('enter-vr', () => {
      this.isActive = true;
      setTimeout(() => { this.checkHeight(); }, 1000); 
    });

    this.el.sceneEl.addEventListener('exit-vr', () => {
      this.isActive = false;
    });
  },

  tick: function (time, timeDelta) {
    if (!this.isActive || !this.adjuster || !this.camera) return;

    this.timer += timeDelta;

    if (this.timer >= this.data.interval) {
      this.checkHeight();
      this.timer = 0;
    }
  },

  // --- NEW METHOD: Manually set target and force update ---
  set_target_height: function (newHeight) {
    if (typeof newHeight !== 'number') return;
    
    console.log(`>> Manual Target Set: ${newHeight}m`);
    
    // 1. Update the schema data directly so it persists
    this.data.targetHeight = newHeight;

    // 2. Immediately calculate and apply the offset needed
    if (this.adjuster && this.camera) {
        const currentCameraY = this.camera.object3D.position.y;
        
        // Formula: Adjuster + Camera = Target  =>  Adjuster = Target - Camera
        const newAdjusterY = newHeight - currentCameraY;
        
        this.adjuster.object3D.position.y = newAdjusterY;
        console.log(`>> Adjuster snapped to ${newAdjusterY.toFixed(2)}m`);
    }
  },

  checkHeight: function () {
    const currentAdjusterY = this.adjuster.object3D.position.y;
    const currentCameraY = this.camera.object3D.position.y;
    const totalHeightWRT_Rig = currentAdjusterY + currentCameraY;

    // CASE A: SITTING (Too Low)
    if (totalHeightWRT_Rig < this.data.threshold) {
      const difference = this.data.targetHeight - totalHeightWRT_Rig;
      this.adjuster.object3D.position.y = currentAdjusterY + difference;
    }

    // CASE B: STOOD UP (Too High)
    const maxAllowedHeight = this.data.targetHeight + this.data.sitting_to_standing_threshold_for_readjustment;
    if (totalHeightWRT_Rig > maxAllowedHeight) {
       const difference = totalHeightWRT_Rig - this.data.targetHeight;
       this.adjuster.object3D.position.y = currentAdjusterY - difference;
    }
  }
});
