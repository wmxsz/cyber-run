import { GAME_CONFIG } from "../config/gameConfig.js";
export class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.highScore = engine.persistence.getHighScore();
    this.score = this._el("hud-score");
    this.speed = this._el("hud-speed");
    this.high = this._el("hud-highscore");
    this.shield = this._el("hud-shield");
    this.boost = this._el("hud-boost");
    this.combo = this._el("hud-combo");
    this.comboTimer = this._el("hud-combo-timer");
    this.pauseButton = this._el("btn-pause");
    this.announcement = this._el("announcement");
    this.startModal = this._el("start-modal");
    this.gameOverModal = this._el("gameover-modal");
    this.goScore = this._el("go-score");
    this.goDistance = this._el("go-distance");
    this.goCores = this._el("go-cores");
    this.goCombo = this._el("go-combo");
    this.pauseOverlay = this._el("pause-overlay");
    this.goRecord = this._el("go-record");
    this.audioIcon = this._el("audio-icon");
    this.phase = this._el("hud-phase");
    this.mission = this._el("hud-mission");
    this.missionFill = this._el("hud-mission-fill");
    this.missionProgress = this._el("hud-mission-progress");
    this.eventPanel = this._el("event-status");
    this.multiplier = this._el("hud-multiplier");
    this.risk = this._el("hud-risk");
    this.ghost = this._el("hud-ghost");
    this.laneThreats = [0, 1, 2].map((lane) => this._el(`lane-threat-${lane}`));

    this._setHighScore();
    this._el("btn-start")?.addEventListener("click", () => this.engine.startGame());
    this._el("btn-restart")?.addEventListener("click", () => this.engine.startGame());
    this._el("btn-resume")?.addEventListener("click", () => this.engine.togglePause());
    this._el("btn-audio")?.addEventListener("click", () => {
      const muted = this.engine.audio.toggleMute();
      if (this.audioIcon) this.audioIcon.textContent = muted ? "🔇" : "🔊";
    });
  }

  update(engine) {
    if (this.score) this.score.textContent = String(Math.floor(engine.score.score)).padStart(5, "0");
    if (this.speed) {
      const displaySpeed = Math.floor(140 + engine.difficulty.speed * 60 + (engine.boosting ? 35 : 0));
      this.speed.textContent = String(displaySpeed);
      this.speed.classList.toggle("overdrive", engine.boosting);
    }
    if (this.shield) this.shield.classList.toggle("visible", engine.hasShield);
    if (this.boost) this.boost.style.width = `${engine.boostEnergy}%`;
    if (this.combo) this.combo.textContent = engine.score.combo > 1 ? `x${Math.min(5, 1 + Math.floor(engine.score.combo / 4))} COMBO` : (engine.score.combo === 1 ? "CHAIN 1" : "COMBO READY");
    if (this.comboTimer) {
      const ratio = engine.score.combo > 0 ? Math.max(0, Math.min(1, engine.score.comboTimer / 2.8)) : 0;
      this.comboTimer.style.width = `${ratio * 100}%`;
      this.comboTimer.classList.toggle("active", ratio > 0);
    }
    if (this.pauseButton) this.pauseButton.textContent = engine.paused ? "▶" : "Ⅱ";
    if (this.phase) this.phase.textContent = engine.difficulty.phaseName || "NIGHT CITY";
    if (this.eventPanel) {
      this.eventPanel.classList.toggle("elite", engine._hunterElite && engine._hunterTime > 0);
      if (engine._empTime > 0) this.eventPanel.textContent = "EMP BLACKOUT // BOOST OFFLINE // " + engine._empTime.toFixed(1) + "s";
      else if (engine._hunterTime > 0 && engine._eventTime > 0) this.eventPanel.textContent = (engine._hunterElite ? "PURSUER" : "HUNTER") + " // EVADE // STORM x" + GAME_CONFIG.dataStormMultiplier.toFixed(2);
      else if (engine._hunterTime > 0) this.eventPanel.textContent = (engine._hunterElite ? "PURSUER" : "HUNTER") + " // EVADE // x" + GAME_CONFIG.hunterMultiplier.toFixed(2);
      else if (engine._eventTime > 0) this.eventPanel.textContent = "DATA STORM // x" + GAME_CONFIG.dataStormMultiplier.toFixed(2);
      else if (engine.difficulty.phase >= 3) this.eventPanel.textContent = "SECTOR SURGE // THREAT DENSITY HIGH";
      else this.eventPanel.textContent = "";
    }
    if (this.risk) {
      const risk = engine.score.riskChain || 0;
      const target = GAME_CONFIG.riskChainTarget || 3;
      this.risk.textContent = "RISK " + risk + "/" + target;
      this.risk.classList.toggle("active", risk > 0);
    }
    if (this.ghost) {
      const nodes = engine._hackNodes || 0;
      const target = GAME_CONFIG.ghostProtocolTarget || 3;
      if (engine._ghostTime > 0) {
        this.ghost.textContent = "GHOST " + engine._ghostTime.toFixed(1) + "s";
        this.ghost.classList.add("active");
      } else {
        this.ghost.textContent = "HACK " + nodes + "/" + target;
        this.ghost.classList.toggle("active", nodes > 0);
      }
    }
    if (this.multiplier) {
      const multiplier = Number(engine.score.eventMultiplier || 1);
      this.multiplier.textContent = "x" + multiplier.toFixed(2);
      this.multiplier.classList.toggle("boosted", multiplier > 1);
    }
    const mission = engine.missions?.getStatus?.();
    if (mission) {
      if (this.mission) this.mission.textContent = mission.label;
      if (this.missionFill) this.missionFill.style.width = `${mission.progress * 100}%`;
      if (this.missionProgress) this.missionProgress.textContent = `${mission.value} / ${mission.target}`;
    }

    const threat = [0, 1, 2].map(() => null);
    engine.obstacles.forEachActive((item) => {
      const z = item.obj.position.z;
      if (z < -60 || z > 10) return;
      const lane = item.lane;
      if (threat[lane] === null || z > threat[lane].z) threat[lane] = { z, type: item.type };
    });
    this.laneThreats.forEach((el, lane) => {
      if (!el) return;
      const hit = threat[lane];
      const danger = Boolean(hit);
      el.classList.toggle("danger", danger);
      el.classList.toggle("imminent", Boolean(hit && hit.z > -18));
      const label = danger ? (hit.type === "highLaser" ? "SLIDE" : hit.type === "barrier" ? "JUMP" : "CHANGE") : "SAFE";
      const b = el.querySelector("b");
      if (b) b.textContent = label;
      el.classList.toggle("elite", Boolean(hit && (hit.type === "pulseGate" || hit.type === "mine") && engine.difficulty.phase >= 4));
    });
  }

  setHp(hp) {
    for (let i = 1; i <= 3; i++) this._el(`hp-${i}`)?.classList.toggle("active", i <= hp);
  }

  showGameOver(result) {
    this.goScore.textContent = String(Math.floor(result.score));
    this.goDistance.textContent = `${Math.floor(result.distance)}m`;
    this.goCores.textContent = String(result.cores);
    if (this.goCombo) this.goCombo.textContent = `x${result.maxCombo || 0}`;
    this.goRecord.textContent = result.newRecord ? "NEW RECORD!" : "COMPLETED";
    this.goRecord.style.color = result.newRecord ? "#00ffaa" : "#ffe600";
    this.gameOverModal.classList.remove("hidden");
  }

  hideGameOver() { this.gameOverModal.classList.add("hidden"); }
  hideStart() { this.startModal.classList.add("hidden"); }

  setPaused(paused) {
    this.pauseOverlay?.classList.toggle("hidden", !paused);
  }

  setHighScore(value) {
    if (this.high) this.high.textContent = String(Math.floor(value)).padStart(5, "0");
  }

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
