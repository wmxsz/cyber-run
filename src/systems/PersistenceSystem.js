import { STORAGE_KEYS } from "../config/gameConfig.js";

export class PersistenceSystem {
  getHighScore() {
    return Number(localStorage.getItem(STORAGE_KEYS.highScore) || 0);
  }
  saveHighScore(score) {
    if (score <= this.getHighScore()) return false;
    localStorage.setItem(STORAGE_KEYS.highScore, String(Math.floor(score)));
    return true;
  }
}
