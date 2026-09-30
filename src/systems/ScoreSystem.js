import { GAME_CONFIG } from "../config/gameConfig.js";

export class ScoreSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.distance = 0;
    this.cores = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.overdriveScore = 0;
  }

  update(dt, speed, shieldActive, boosting = false) {
    this.distance += speed * dt * 6;
    const base = (speed * 8 + (shieldActive ? 2 : 1)) * dt * 15;
    const overdriveBonus = boosting ? speed * dt * 8 : 0;
    this.overdriveScore += overdriveBonus;
    this.score += base + overdriveBonus;

    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;
  }

  _chainBonus(base) {
    this.combo = Math.min(20, this.combo + 1);
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = GAME_CONFIG.comboWindow;
    const multiplier = 1 + Math.min(4, Math.floor(this.combo / 4));
    const points = base * multiplier;
    this.score += points;
    return { points, multiplier };
  }

  collectCore() {
    this.cores += 1;
    return this._chainBonus(150);
  }

  nearMiss() {
    return this._chainBonus(GAME_CONFIG.nearMissScore);
  }
}
