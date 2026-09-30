import { GAME_CONFIG } from "../config/gameConfig.js";

export class DifficultySystem {
  reset() {
    this.speed = GAME_CONFIG.baseSpeed;
    this.spawnTimer = 0;
    this.phase = 0;
    this.phaseName = GAME_CONFIG.phaseNames[0];
  }

  update(dt, score) {
    this.speed = Math.min(GAME_CONFIG.maxSpeed, this.speed + GAME_CONFIG.speedRamp * dt);
    this.spawnTimer -= dt * 1000;

    let phase = 0;
    for (let i = 0; i < GAME_CONFIG.phaseThresholds.length; i++) {
      if (score >= GAME_CONFIG.phaseThresholds[i]) phase = i;
    }
    this.phase = phase;
    this.phaseName = GAME_CONFIG.phaseNames[phase];

    const ramp = Math.min(1, score / GAME_CONFIG.spawnRampScore);
    const interval = GAME_CONFIG.spawnStartMs + (GAME_CONFIG.spawnMinMs - GAME_CONFIG.spawnStartMs) * ramp;
    return { shouldSpawn: this.spawnTimer <= 0, interval, phase, phaseName: this.phaseName };
  }

  armSpawn(interval) {
    this.spawnTimer = interval;
  }
}
