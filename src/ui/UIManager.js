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

    this._last = Object.create(null);
    this._lastThreatAt = 0;
    this._setHighScore();
    this._el("btn-start")?.addEventListener("click", () => this.engine.startGame());
    this._el("btn-restart")?.addEventListener("click", () => this.engine.startGame());
    this._el("btn-resume")?.addEventListener("click", () => this.engine.togglePause());
    this._el("btn-audio")?.addEventListener("click", () => {
      const muted = this.engine.audio.toggleMute();
      this.setMuted(muted);
    });
  }

  _setText(el, value, key) {
    if (!el || this._last[key] === value) return;
    el.textContent = value;
    this._last[key] = value;
  }

  _setClass(el, className, value, key) {
    if (!el || this._last[key] === value) return;
    el.classList.toggle(className, value);
    this._last[key] = value;
  }

  _setStyle(el, property, value, key) {
    if (!el || this._last[key] === value) return;
    el.style[property] = value;
    this._last[key] = value;
  }

  update(engine) {
    const score = String(Math.floor(engine.score.score)).padStart(5, "0");
    this._setText(this.score, score, "score");

    const displaySpeed = String(Math.floor(140 + engine.difficulty.speed * 60 + (engine.boosting ? 35 : 0)));
    this._setText(this.speed, displaySpeed, "speed");
    this._setClass(this.speed, "overdrive", engine.boosting, "speedBoost");

    this._setClass(this.shield, "visible", engine.hasShield, "shield");

    this._setStyle(this.boost, "width", `${engine.boostEnergy}%`, "boostWidth");

    const comboText = engine.score.combo > 1
      ? `x${Math.min(5, 1 + Math.floor(engine.score.combo / 4))} COMBO`
      : (engine.score.combo === 1 ? "CHAIN 1" : "COMBO READY");
    this._setText(this.combo, comboText, "combo");

    const ratio = engine.score.combo > 0 ? Math.max(0, Math.min(1, engine.score.comboTimer / GAME_CONFIG.comboWindow)) : 0;
    this._setStyle(this.comboTimer, "width", `${ratio * 100}%`, "comboTimerWidth");
    this._setClass(this.comboTimer, "active", ratio > 0, "comboTimerActive");

    this._setText(this.pauseButton, engine.paused ? "▶" : "Ⅱ", "pause");
    this._setText(this.phase, engine.difficulty.phaseName || "NIGHT CITY", "phase");

    if (this.eventPanel) {
      const elite = Boolean(engine._hunterElite && engine._hunterTime > 0);
      this._setClass(this.eventPanel, "elite", elite, "eventElite");
      let eventText = "";
      if (engine._empTime > 0) eventText = "EMP BLACKOUT // BOOST OFFLINE // " + engine._empTime.toFixed(1) + "s";
      else if (engine._hunterTime > 0 && engine._eventTime > 0) eventText = (elite ? "PURSUER" : "HUNTER") + " // EVADE // STORM x" + GAME_CONFIG.dataStormMultiplier.toFixed(2);
      else if (engine._hunterTime > 0) eventText = (elite ? "PURSUER" : "HUNTER") + " // EVADE // x" + GAME_CONFIG.hunterMultiplier.toFixed(2);
      else if (engine._eventTime > 0) eventText = "DATA STORM // x" + GAME_CONFIG.dataStormMultiplier.toFixed(2);
      else if (engine.difficulty.phase >= 3) eventText = "SECTOR SURGE // THREAT DENSITY HIGH";
      this._setText(this.eventPanel, eventText, "eventText");
    }

    const risk = engine.score.riskChain || 0;
    this._setText(this.risk, "RISK " + risk + "/" + (GAME_CONFIG.riskChainTarget || 3), "riskText");
    this._setClass(this.risk, "active", risk > 0, "riskActive");

    if (this.ghost) {
      const nodes = engine._hackNodes || 0;
      const target = GAME_CONFIG.ghostProtocolTarget || 3;
      const ghostText = engine._ghostTime > 0
        ? "GHOST " + engine._ghostTime.toFixed(1) + "s"
        : "HACK " + nodes + "/" + target;
      this._setText(this.ghost, ghostText, "ghostText");
      this._setClass(this.ghost, "active", engine._ghostTime > 0 || nodes > 0, "ghostActive");
    }

    const multiplier = Number(engine.score.eventMultiplier || 1);
    this._setText(this.multiplier, "x" + multiplier.toFixed(2), "multiplierText");
    this._setClass(this.multiplier, "boosted", multiplier > 1, "multiplierBoosted");

    const mission = engine.missions?.getStatus?.();
    if (mission) {
      this._setText(this.mission, mission.label, "missionLabel");
      this._setStyle(this.missionFill, "width", `${mission.progress * 100}%`, "missionFill");
      this._setText(this.missionProgress, `${mission.value} / ${mission.target}`, "missionProgress");
    }

    const now = performance.now();
    if (now - this._lastThreatAt >= 100 || this._lastThreatAt === 0) {
      this._lastThreatAt = now;
      this._updateThreatScan(engine);
    }
  }

  _updateThreatScan(engine) {
    const threat = [null, null, null];
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
      this._setClass(el, "danger", danger, `threatDanger${lane}`);
      this._setClass(el, "imminent", Boolean(hit && hit.z > -18), `threatImminent${lane}`);
      const label = danger
        ? (hit.type === "highLaser" ? "SLIDE" : hit.type === "barrier" ? "JUMP" : "CHANGE")
        : "SAFE";
      const b = el.querySelector("b");
      this._setText(b, label, `threatLabel${lane}`);
      this._setClass(el, "elite", Boolean(hit && (hit.type === "pulseGate" || hit.type === "mine") && engine.difficulty.phase >= 4), `threatElite${lane}`);
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

  setMuted(muted) {
    if (this.audioIcon) this.audioIcon.textContent = muted ? "🔇" : "🔊";
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
