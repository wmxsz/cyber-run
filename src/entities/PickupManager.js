import * as THREE from "three";
import { GAME_CONFIG, LANES, COLORS } from "../config/gameConfig.js";
import { ObjectPool } from "../core/ObjectPool.js";

function makeCore() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 1.4, metalness: 0.9, roughness: 0.1 }),
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.07, 8, 24),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.7 }),
  );
  halo.rotation.x = Math.PI / 2;
  g.add(core, halo);
  g.userData.halo = halo;
  return g;
}
function makeBonusCore() {
  const g = makeCore();
  const core = g.children[0];
  const halo = g.children[1];
  core.material = new THREE.MeshStandardMaterial({ color: COLORS.orange, emissive: COLORS.orange, emissiveIntensity: 1.8, metalness: 0.9, roughness: 0.1 });
  halo.material = new THREE.MeshBasicMaterial({ color: COLORS.orange, transparent: true, opacity: 0.82 });
  return g;
}
function makeShield() {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: COLORS.green, wireframe: true }));
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshBasicMaterial({ color: COLORS.green, transparent: true, opacity: 0.55 }));
  g.add(outer, inner);
  g.userData.outer = outer;
  g.userData.inner = inner;
  return g;
}

export class PickupManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pools = { core: new ObjectPool(makeCore, 4), bonusCore: new ObjectPool(makeBonusCore, 3), shield: new ObjectPool(makeShield, 2) };
  }
  spawn(safeLanes, occupiedLanes = [], phase = 0) {
    if (!safeLanes.length || Math.random() > 0.68) return;
    const riskReward = phase >= 2 && occupiedLanes.length > 0 && Math.random() < 0.42;
    const lane = riskReward
      ? occupiedLanes[Math.floor(Math.random() * occupiedLanes.length)]
      : safeLanes[Math.floor(Math.random() * safeLanes.length)];
    const type = riskReward ? "bonusCore" : (Math.random() < 0.18 ? "shield" : "core");
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
      if ((p.userData.type === "core" || p.userData.type === "bonusCore") && p.userData.halo) {
        p.userData.halo.rotation.z += dt * 3.5;
        p.userData.halo.scale.setScalar(1 + Math.sin(performance.now() * 0.009) * 0.16);
        p.userData.halo.material.opacity = 0.48 + Math.sin(performance.now() * 0.012) * 0.22;
      }
      if (p.userData.type === "shield") {
        const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.12;
        p.scale.setScalar(pulse);
        if (p.userData.outer) p.userData.outer.rotation.z -= dt * 1.8;
        if (p.userData.inner) p.userData.inner.rotation.y += dt * 2.6;
      } else {
        p.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.08);
      }
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
