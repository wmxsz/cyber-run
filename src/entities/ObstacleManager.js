import { GAME_CONFIG, LANES } from "../config/gameConfig.js";
import { ObjectPool } from "../core/ObjectPool.js";
import { OBSTACLE_TYPES } from "./obstacleTypes.js";

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.lastSafeLane = 1;
    this.pools = Object.fromEntries(
      Object.entries(OBSTACLE_TYPES).map(([name, def]) => [name, new ObjectPool(def.build, 2)]),
    );
  }

  spawnRow(score) {
    const ramp = Math.min(1, score / GAME_CONFIG.spawnRampScore);
    const count = Math.random() < 0.35 + ramp * 0.35 ? 2 : 1;
    const safeChoices = [this.lastSafeLane - 1, this.lastSafeLane, this.lastSafeLane + 1]
      .filter((lane) => lane >= 0 && lane <= 2);
    const safeLane = safeChoices[Math.floor(Math.random() * safeChoices.length)];
    const candidates = [0, 1, 2].filter((lane) => lane !== safeLane);
    const placed = [];

    for (let i = 0; i < count; i++) {
      const lane = count === 2 ? candidates[i] : candidates[Math.floor(Math.random() * candidates.length)];
      const r = Math.random();
      const type = r < 0.28 ? "barrier" : r < 0.48 ? "highLaser" : r < 0.73 ? "mine" : "block";
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
    }

    this.lastSafeLane = safeLane;
    return placed;
  }

  update(dt, speed, time) {
    const advance = speed * dt * 60;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.obj.position.z += advance;
      item.def.update?.(item.obj, item.type === "mine" ? dt : time);
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
  }
}
