import { GAME_CONFIG } from "../config/gameConfig.js";

export class DifficultySystem {
  reset() {
    this.speed = GAME_CONFIG.baseSpeed;
    this.spawnTimer = 0;
  }

  update(dt, score) {
    this.speed = Math.min(GAME_CONFIG.maxSpeed, this.speed + GAME_CONFIG.speedRamp * dt);
    this.spawnTimer -= dt * 1000;
    const ramp = Math.min(1, score / GAME_CONFIG.spawnRampScore);
    const interval = GAME_CONFIG.spawnStartMs + (GAME_CONFIG.spawnMinMs - GAME_CONFIG.spawnStartMs) * ramp;
    return { shouldSpawn: this.spawnTimer <= 0, interval };
  }

  armSpawn(interval) { this.spawnTimer = interval; }
}
