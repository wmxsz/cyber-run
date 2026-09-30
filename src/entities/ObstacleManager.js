import { GAME_CONFIG, LANES } from "../config/gameConfig.js";
import { ObjectPool } from "../core/ObjectPool.js";
import { OBSTACLE_TYPES } from "./obstacleTypes.js";

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.lastSafeLane = 1;
    this._patternStep = 0;
    this._recentTypes = [];
    this.pools = Object.fromEntries(
      Object.entries(OBSTACLE_TYPES).map(([name, def]) => [name, new ObjectPool(def.build, 2)]),
    );
  }

  _pickType(phase, slot = 0, pair = false) {
    if (pair && phase >= 3) {
      const patterns = phase >= 4
        ? [
            ["barrier", "highLaser"],
            ["highLaser", "pulseGate"],
            ["mine", "barrier"],
            ["pulseGate", "mine"],
          ]
        : [
            ["barrier", "highLaser"],
            ["highLaser", "mine"],
            ["block", "barrier"],
            ["mine", "block"],
          ];
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      return pattern[slot % pattern.length];
    }

    const r = Math.random();
    if (phase >= 4) {
      return r < 0.26 ? "mine" : r < 0.46 ? "pulseGate" : r < 0.66 ? "highLaser" : r < 0.84 ? "barrier" : "block";
    }
    if (phase >= 2) {
      return r < 0.25 ? "barrier" : r < 0.48 ? "highLaser" : r < 0.70 ? "mine" : r < 0.86 ? "pulseGate" : "block";
    }
    return r < 0.28 ? "barrier" : r < 0.48 ? "highLaser" : r < 0.73 ? "mine" : "block";
  }

  spawnRow(score, phase = 0) {
    const ramp = Math.min(1, score / GAME_CONFIG.spawnRampScore);
    const count = phase >= 4
      ? 2
      : phase >= 3
        ? (Math.random() < 0.82 ? 2 : 1)
        : (Math.random() < 0.35 + ramp * 0.35 ? 2 : 1);
    // Mature runner pacing: the safe lane moves predictably enough to be readable,
    // but not so predictably that the route becomes automatic. Every few rows we
    // deliberately ask for a one-lane transition instead of a random teleport.
    const direction = this._patternStep % 3 === 0
      ? (this.lastSafeLane === 0 ? 1 : this.lastSafeLane === 2 ? -1 : (Math.random() < 0.5 ? -1 : 1))
      : 0;
    const preferredSafe = Math.max(0, Math.min(2, this.lastSafeLane + direction));
    const safeChoices = [preferredSafe, this.lastSafeLane]
      .concat(phase >= 3 ? [preferredSafe - 1, preferredSafe + 1] : [])
      .filter((lane) => lane >= 0 && lane <= 2);
    const uniqueSafeChoices = [...new Set(safeChoices)];
    const safeLane = uniqueSafeChoices[Math.floor(Math.random() * uniqueSafeChoices.length)];
    const candidates = [0, 1, 2].filter((lane) => lane !== safeLane);
    const placed = [];

    for (let i = 0; i < count; i++) {
      const lane = count === 2 ? candidates[i] : candidates[Math.floor(Math.random() * candidates.length)];
      let type = this._pickType(phase, i, count === 2);
      // Avoid repeating the same visual threat too many rows in a row.
      if (this._recentTypes.length >= 2 && this._recentTypes.every((t) => t === type)) {
        type = type === "barrier" ? "mine" : type === "mine" ? "block" : "barrier";
      }
      const obj = this.pools[type].acquire();
      obj.position.set(LANES[lane], 0, GAME_CONFIG.spawnZ);
      obj.rotation.set(0, 0, 0);
      obj.scale.set(1, 1, 1);
      obj.userData.hit = false;
      obj.userData.passed = false;
      obj.userData.lane = lane;
      this.scene.add(obj);
      this.active.push({ obj, type, lane, def: OBSTACLE_TYPES[type] });
      placed.push(lane);
      this._recentTypes.push(type);
      if (this._recentTypes.length > 4) this._recentTypes.shift();
    }

    this._patternStep++;
    this.lastSafeLane = safeLane;
    return placed;
  }

  update(dt, speed, time) {
    const advance = speed * dt * 60;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.obj.position.z += advance;
      item.def.update?.(item.obj, time, dt);
      if (item.obj.position.z > GAME_CONFIG.cullZ) this._removeAt(i);
    }
  }

  forEachActive(fn) {
    for (const item of this.active) fn(item);
  }

  remove(item) {
    const i = this.active.indexOf(item);
    if (i >= 0) this._removeAt(i);
  }

  _removeAt(i) {
    const item = this.active[i];
    this.scene.remove(item.obj);
    this.pools[item.type].release(item.obj);
    this.active.splice(i, 1);
  }

  clear() {
    for (let i = this.active.length - 1; i >= 0; i--) this._removeAt(i);
    this.lastSafeLane = 1;
    this._patternStep = 0;
    this._recentTypes.length = 0;
  }

  dispose() {
    this.clear();
    const disposed = new Set();
    const disposeItem = (item) => {
      item?.traverse?.((node) => {
        if (!node.isMesh) return;
        if (node.geometry && !disposed.has(node.geometry)) {
          node.geometry.dispose();
          disposed.add(node.geometry);
        }
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          if (material && !disposed.has(material)) {
            material.dispose();
            disposed.add(material);
          }
        }
      });
    };
    for (const pool of Object.values(this.pools)) pool.dispose(disposeItem);
    this.pools = {};
  }
}
