// Keyboard and mouse input for the chef: WASD/arrows walk, E uses the nearest
// station, 1-4 grab pantry ingredients, Q drops what is held, and a mouse click
// on the floor or a station walks the chef there and uses it on arrival.
import * as THREE from 'three';

export class ChefInput {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.keys = new Set();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clickTarget = null;
    this.onInteract = null;
    this.onPantryKey = null;
    this.onDrop = null;
    this.onServeKey = null;
    this.onRestartKey = null;
    this.onAnyKey = null;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      if (this.onAnyKey) this.onAnyKey(event.code);
      if (event.code === 'KeyE' && this.onInteract) this.onInteract();
      if (event.code === 'KeyQ' && this.onDrop) this.onDrop();
      if (event.code === 'Space' && this.onServeKey) { this.onServeKey(); event.preventDefault(); }
      if ((event.code === 'Enter' || event.code === 'KeyR') && this.onRestartKey) this.onRestartKey();
      if (event.code.startsWith('Digit')) {
        const n = Number(event.code.slice(5));
        if (n >= 1 && n <= 4 && this.onPantryKey) this.onPantryKey(n - 1);
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.clickTarget = { x: this.pointer.x, y: this.pointer.y };
    });
  }

  /** Normalised WASD/arrow walk direction for this frame. */
  moveDirection() {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    const length = Math.hypot(x, z);
    return length === 0 ? { x: 0, z: 0 } : { x: x / length, z: z / length };
  }

  /** Raycast the last click against meshes; returns {point, object} or null. */
  pick(click, meshes) {
    this.raycaster.setFromCamera(new THREE.Vector2(click.x, click.y), this.camera);
    const hits = this.raycaster.intersectObjects(meshes, true);
    return hits.length > 0 ? hits[0] : null;
  }

  consumeClick() {
    const click = this.clickTarget;
    this.clickTarget = null;
    return click;
  }
}
