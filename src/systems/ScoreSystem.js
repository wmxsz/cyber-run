export class ScoreSystem {
  constructor() { this.reset(); }
  reset() {
    this.score = 0;
    this.distance = 0;
    this.cores = 0;
  }
  update(dt, speed, shieldActive) {
    this.distance += speed * dt * 6;
    this.score += (speed * 8 + (shieldActive ? 2 : 1)) * dt * 15;
  }
  collectCore() {
    this.cores += 1;
    this.score += 150;
  }
  nearMiss() { this.score += 30; }
}
