import AFRAME from "aframe";

AFRAME.registerComponent("intersection-marker", {
  schema: {
    position_event_entity: { type: "selector" },
  },

  init: function () {
    // Bind the function so 'this' refers to the component inside the event handler
    this.onPositionUpdate = this.onPositionUpdate.bind(this);

    // Check if the target entity is available
    if (this.data.position_event_entity) {
      this.addListeners();
    } else {
      console.warn("Intersection Marker: Target entity not found.");
    }
  },

  update: function (oldData) {
    // Handle case where the target entity changes dynamically
    if (oldData.position_event_entity !== this.data.position_event_entity) {
      if (oldData.position_event_entity) {
        oldData.position_event_entity.removeEventListener(
          "position-updated",
          this.onPositionUpdate
        );
      }
      if (this.data.position_event_entity) {
        this.addListeners();
      }
    }
  },

  addListeners: function () {
    this.data.position_event_entity.addEventListener(
      "position-updated",
      this.onPositionUpdate
    );
  },

  onPositionUpdate: function (evt) {
    // 1. Extract the two points from the event detail
    const shellPos = evt.detail.shell;
    const plasmaPos = evt.detail.plasma;

    if (!shellPos || !plasmaPos) return;

    // 2. Calculate the Mean (Midpoint)
    const meanX = (shellPos.x + plasmaPos.x) / 2;
    const meanY = (shellPos.y + plasmaPos.y) / 2;
    const meanZ = (shellPos.z + plasmaPos.z) / 2;

    // 3. Set this entity's position
    this.el.object3D.position.set(meanX, meanY, meanZ);
  },

  remove: function () {
    // Cleanup listener
    if (this.data.position_event_entity) {
      this.data.position_event_entity.removeEventListener(
        "position-updated",
        this.onPositionUpdate
      );
    }
  },
});
