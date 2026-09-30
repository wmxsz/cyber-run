import { STORAGE_KEYS } from "../config/gameConfig.js";

export class PersistenceSystem {
  getHighScore() {
    try {
      return Number(localStorage.getItem(STORAGE_KEYS.highScore) || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveHighScore(score) {
    try {
      if (score <= this.getHighScore()) return false;
      localStorage.setItem(STORAGE_KEYS.highScore, String(Math.floor(score)));
      return true;
    } catch {
      return false;
    }
  }
}