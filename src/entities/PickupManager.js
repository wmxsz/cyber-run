import * as THREE from "three";
import { GAME_CONFIG, LANES, COLORS } from "../config/gameConfig.js";
import { ObjectPool } from "../core/ObjectPool.js";

function makeCore() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.1 }),
  );
}
function makeShield() {
  return new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: COLORS.green, wireframe: true }));
}

export class PickupManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pools = { core: new ObjectPool(makeCore, 4), shield: new ObjectPool(makeShield, 2) };
  }
  spawn(safeLanes) {
    if (!safeLanes.length || Math.random() > 0.68) return;
    const lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
    const type = Math.random() < 0.18 ? "shield" : "core";
    const obj = this.pools[type].acquire();
    obj.userData.type = type;
    obj.userData.picked = false;
    obj.position.set(LANES[lane], type === "shield" ? 1.4 : 1.2, GAME_CONFIG.spawnZ - 5 - Math.random() * 25);
    obj.rotation.set(0, 0, 0);
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
    this.pools[obj.userData.type].release(obj);
    this.active.splice(i, 1);
  }
  clear() { for (let i = this.active.length - 1; i >= 0; i--) this._removeAt(i); }
}
