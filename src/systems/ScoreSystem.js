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
    this.eventMultiplier = 1;
    this.riskChain = 0;
  }

  update(dt, speed, shieldActive, boosting = false) {
    this.distance += speed * dt * 6;
    const base = (speed * 4 + (shieldActive ? 1.5 : 1)) * dt * 8;
    const overdriveBonus = boosting ? speed * dt * 4 : 0;
    this.overdriveScore += overdriveBonus;
    this.score += (base + overdriveBonus) * this.eventMultiplier;

    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;
  }

  _chainBonus(base) {
    this.combo = Math.min(20, this.combo + 1);
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = GAME_CONFIG.comboWindow;
    const multiplier = 1 + Math.min(4, Math.floor(this.combo / 4));
    const points = base * multiplier * this.eventMultiplier;
    this.score += points;
    return { points, multiplier, combo: this.combo };
  }

  collectCore() {
    this.cores += 1;
    return this._chainBonus(80);
  }

  collectBonusCore() {
    this.cores += 1;
    this.riskChain += 1;
    const bonus = this._chainBonus(GAME_CONFIG.bonusCoreScore);
    if (this.riskChain >= GAME_CONFIG.riskChainTarget) {
      this.riskChain = 0;
      const reward = GAME_CONFIG.riskChainScore * this.eventMultiplier;
      this.score += reward;
      return { ...bonus, riskChainComplete: true, riskReward: reward };
    }
    return { ...bonus, riskChainComplete: false, riskReward: 0 };
  }

  breakRiskChain() {
    this.riskChain = 0;
  }

  setEventMultiplier(multiplier = 1) {
    this.eventMultiplier = Math.max(1, multiplier);
  }

  nearMiss() {
    return this._chainBonus(GAME_CONFIG.nearMissScore);
  }

  hunterBreak() {
    return this._chainBonus(100);
  }

  hackNode() {
    return this._chainBonus(GAME_CONFIG.hackNodeScore);
  }

  ghostBreak() {
    const points = 50 * this.eventMultiplier;
    this.score += points;
    return points;
  }
}
