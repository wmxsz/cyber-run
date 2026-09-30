import * as THREE from "three";
import { GAME_CONFIG, LANES, COLORS } from "../config/gameConfig.js";

export class PickupManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  spawn(safeLanes) {
    if (!safeLanes.length || Math.random() > 0.65) return;
    const lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
    const shield = Math.random() < 0.18;
    const obj = shield
      ? new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: COLORS.green, wireframe: true }))
      : new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.7, 0.7),
          new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.1 }),
        );

    obj.userData.type = shield ? "shield" : "core";
    obj.userData.picked = false;
    obj.position.set(LANES[lane], shield ? 1.4 : 1.2, GAME_CONFIG.spawnZ - 5 - Math.random() * 25);
    this.scene.add(obj);
    this.active.push(obj);
  }

  update(dt, speed) {
    const advance = speed * dt * 60;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.position.z += advance;
      p.rotation.y += dt * 2.5;
      p.rotation.x += dt * 1.2;
      if (p.position.z > GAME_CONFIG.cullZ) this._removeAt(i);
    }
  }

  markPicked(obj) {
    const i = this.active.indexOf(obj);
    if (i >= 0) this._removeAt(i);
  }

  forEachActive(fn) { for (const obj of this.active) fn(obj); }

  _removeAt(i) {
    const obj = this.active[i];
    this.scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
    this.active.splice(i, 1);
  }

  clear() {
    for (let i = this.active.length - 1; i >= 0; i--) this._removeAt(i);
  }
}
