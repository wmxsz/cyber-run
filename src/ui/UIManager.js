export class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.highScore = engine.persistence.getHighScore();
    this.score = this._el("hud-score");
    this.speed = this._el("hud-speed");
    this.high = this._el("hud-highscore");
    this.shield = this._el("hud-shield");
    this.announcement = this._el("announcement");
    this.startModal = this._el("start-modal");
    this.gameOverModal = this._el("gameover-modal");
    this.goScore = this._el("go-score");
    this.goDistance = this._el("go-distance");
    this.goCores = this._el("go-cores");
    this.goRecord = this._el("go-record");
    this.audioIcon = this._el("audio-icon");

    this._setHighScore();
    this._el("btn-start")?.addEventListener("click", () => this.engine.startGame());
    this._el("btn-restart")?.addEventListener("click", () => this.engine.startGame());
    this._el("btn-audio")?.addEventListener("click", () => {
      const muted = this.engine.audio.toggleMute();
      if (this.audioIcon) this.audioIcon.textContent = muted ? "🔇" : "🔊";
    });
  }

  update(engine) {
    if (this.score) this.score.textContent = String(Math.floor(engine.score.score)).padStart(5, "0");
    if (this.speed) this.speed.textContent = String(Math.floor(140 + engine.difficulty.speed * 60));
    if (this.shield) this.shield.classList.toggle("visible", engine.hasShield);
  }

  setHp(hp) {
    for (let i = 1; i <= 3; i++) this._el(`hp-${i}`)?.classList.toggle("active", i <= hp);
  }

  showGameOver(result) {
    this.goScore.textContent = String(Math.floor(result.score));
    this.goDistance.textContent = `${Math.floor(result.distance)}m`;
    this.goCores.textContent = String(result.cores);
    this.goRecord.textContent = result.newRecord ? "NEW RECORD!" : "COMPLETED";
    this.goRecord.style.color = result.newRecord ? "#00ffaa" : "#ffe600";
    this.gameOverModal.classList.remove("hidden");
  }

  hideGameOver() { this.gameOverModal.classList.add("hidden"); }
  hideStart() { this.startModal.classList.add("hidden"); }

  announce(message) {
    this.announcement.textContent = message;
    this.announcement.classList.add("show");
    clearTimeout(this._announceTimer);
    this._announceTimer = setTimeout(() => this.announcement.classList.remove("show"), 1100);
  }

  _setHighScore() {
    if (this.high) this.high.textContent = String(Math.floor(this.highScore)).padStart(5, "0");
  }

  _el(id) { return document.getElementById(id); }
}
