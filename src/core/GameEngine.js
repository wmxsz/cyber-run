import * as THREE from "three";
import { ACTIONS } from "./InputManager.js";
import { GAME_CONFIG } from "../config/gameConfig.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { AudioManager } from "./AudioManager.js";
import { RoadManager } from "../world/RoadManager.js";
import { CityManager } from "../world/CityManager.js";
import { ParticleSystem } from "../world/ParticleSystem.js";
import { PlayerObject } from "../entities/PlayerObject.js";
import { ObstacleManager } from "../entities/ObstacleManager.js";
import { PickupManager } from "../entities/PickupManager.js";
import { CollisionSystem } from "../systems/CollisionSystem.js";
import { ScoreSystem } from "../systems/ScoreSystem.js";
import { DifficultySystem } from "../systems/DifficultySystem.js";
import { PersistenceSystem } from "../systems/PersistenceSystem.js";
import { MissionSystem } from "../systems/MissionSystem.js";
import { LANES } from "../config/gameConfig.js";

export class GameEngine {
  constructor(canvas) {
    this.sceneMgr = new SceneManager(canvas);
    this.sceneMgr.addLighting();

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.persistence = new PersistenceSystem();
    this.missions = new MissionSystem();

    const scene = this.sceneMgr.scene;
    this.road = new RoadManager(scene);
    this.city = new CityManager(scene);
    this.particles = new ParticleSystem(scene);
    this.player = new PlayerObject(scene);
    this.obstacles = new ObstacleManager(scene);
    this.pickups = new PickupManager(scene);
    this.collision = new CollisionSystem();
    this.score = new ScoreSystem();
    this.difficulty = new DifficultySystem();

    this.hp = GAME_CONFIG.maxHp;
    this.hasShield = false;
    this.boostEnergy = 0;
    this.boosting = false;
    this.player.setBoost(false);
    this.paused = false;
    this.active = false;
    this.over = false;
    this.invulnerable = 0;
    this._elapsed = 0;
    this._lastPhase = 0;
    this._exhaustTimer = 0;
    this._eventTimer = 18;
    this._eventTime = 0;
    this._hunterTimer = 22;
    this._hunterTime = 0;
    this._hunterLane = 1;
    this._hunterLaneTimer = 0;
    this._hunterX = 0;
    this._hunter = null;
    this._hunterElite = false;
    this._comboMilestones = new Set();
    this._hackNodes = 0;
    this._ghostTime = 0;
    this._ui = null;

    this.input.onAction((action, payload) => this._onAction(action, payload));
  }

  setUI(ui) {
    this._ui = ui;
    ui.setHp(this.hp);
    ui.setPaused(false);
  }

  start() {
    let previous = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - previous) / 1000, 1 / 30);
      previous = now;
      this.update(dt);
      this.sceneMgr.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  startGame() {
    this.audio.init();
    this.audio.startBgm();

    this.obstacles.clear();
    this.pickups.clear();
    if (this._hunter) this.scene.remove(this._hunter);
    this.particles.clear?.();

    this.score.reset();
    this.missions.reset();
    this.difficulty.reset();
    this.player.reset();
    this.hp = GAME_CONFIG.maxHp;
    this.hasShield = false;
    this.boostEnergy = 0;
    this.boosting = false;
    this.paused = false;
    this.invulnerable = 0;
    this.active = true;
    this.over = false;
    this._elapsed = 0;
    this._lastPhase = 0;
    this._eventTimer = 18;
    this._eventTime = 0;
    this._hunterTimer = 22;
    this._hunterTime = 0;
    this._hunterLane = 1;
    this._hunterLaneTimer = 0;
    this._hunterX = 0;
    this._hunter = null;
    this._hunterElite = false;
    this._comboMilestones.clear();
    this._hackNodes = 0;
    this._ghostTime = 0;
    this.score.setEventMultiplier(1);

    this._ui?.hideStart();
    this._ui?.hideGameOver();
    this._ui?.setHp(this.hp);
    this._ui?.setPaused(false);
    this._ui?.setHighScore?.(this.persistence.getHighScore());
  }

  _effectiveSpeed() {
    return this.difficulty.speed * (this.boosting ? GAME_CONFIG.boostSpeedMultiplier : 1);
  }

  update(dt) {
    this._elapsed += dt;
    this.sceneMgr.update(dt);

    if (!this.active || this.over) {
      this.city.update(0.12, this._lastPhase);
      this.particles.update();
      this._ui?.update(this);
      return;
    }

    if (this.paused) {
      this._ui?.update(this);
      return;
    }

    if (this._hunterTime > 0) {
      this._hunterTime -= dt;
      this._hunterLaneTimer -= dt;
      if (this._hunterLaneTimer <= 0) {
        this._hunterLaneTimer = this._hunterElite ? GAME_CONFIG.eliteHunterLaneInterval : GAME_CONFIG.hunterLaneInterval;
        this._hunterLane = this.player.currentLane;
      }
      const target = LANES[this._hunterLane];
      this._hunterX += (target - this._hunterX) * 0.08;
      this._hunter.position.x = this._hunterX;
      const gap = this._hunterElite ? GAME_CONFIG.eliteHunterGap : (this._lastPhase >= 3 ? 4.5 : 3.8);
      const duration = this._hunterElite ? GAME_CONFIG.eliteHunterDuration : GAME_CONFIG.hunterDuration;
      const approach = this._hunterElite ? 0.48 : 0.42;
      this._hunter.position.z = Math.max(0.6, gap - (duration - this._hunterTime) * approach) + Math.sin(this._hunterTime * 5) * 0.12;
      if (this._hunterTime <= 0) {
        this.scene.remove(this._hunter);
        this._hunter = null;
        this._refreshEventMultiplier();
        this._ui?.announce(this._hunterElite ? "PURSUER // EVADED" : "HUNTER DRONE // ESCAPED");
        this._hunterElite = false;
      }
    } else {
      this._hunterTimer -= dt;
      if (this._hunterTimer <= 0 && this._lastPhase >= 2) {
        this._hunterElite = this._lastPhase >= 4;
        this._hunterTime = this._hunterElite ? GAME_CONFIG.eliteHunterDuration : GAME_CONFIG.hunterDuration;
        this._hunterTimer = (this._hunterElite ? 18 : 20) + Math.random() * (this._hunterElite ? 8 : 12);
        this._hunterLane = Math.floor(Math.random() * 3);
        this._hunterLaneTimer = 0;
        this._hunterX = this.player.group.position.x;
        this._hunter = this._makeHunter(this._hunterElite);
        this.scene.add(this._hunter);
        this._ui?.announce(this._hunterElite ? "PURSUER // LOCKED" : "HUNTER DRONE // LOCKED");
        this._refreshEventMultiplier();
        this._ui?.announce(this._hunterElite ? "PURSUER // OVERDRIVE REQUIRED // SCORE x1.20" : "HUNTER DRONE // EVADE // SCORE x1.20");
      }
    }

    if (this._eventTime > 0) {
      this._eventTime -= dt;
      if (this._eventTime <= 0) {
        this._refreshEventMultiplier();
        this._ui?.announce("DATA STORM // OFFLINE");
      }
    } else {
      this._eventTimer -= dt;
      if (this._eventTimer <= 0 && this._lastPhase >= 1) {
        this._eventTime = 5;
        const stormChance = GAME_CONFIG.phaseStormChance?.[this._lastPhase] || 0;
        this._eventTimer = (stormChance > 0 ? 13 : 16) + Math.random() * (stormChance > 0 ? 7 : 8);
        this._refreshEventMultiplier();
        this.audio.playPowerup();
        const p = this.player.group.position;
        this.particles.burst(p.x, p.y + 1, p.z, 0xff00aa, 36);
        this._ui?.announce("DATA STORM // SCORE x1.50 // 5 SEC");
      }
    }

    if (this._ghostTime > 0) {
      this._ghostTime -= dt;
      if (this._ghostTime <= 0) {
        this._refreshEventMultiplier();
        this._ui?.announce("GHOST PROTOCOL // OFFLINE");
      }
    }

    if (this.boosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - GAME_CONFIG.boostDrain * dt);
      if (this.boostEnergy <= 0) { this.boosting = false; this.player.setBoost(false); }
    }

    const spawn = this.difficulty.update(dt, this.score.score);
    if (spawn.phase !== this._lastPhase) {
      this._lastPhase = spawn.phase;
      if (spawn.phase > 0) {
        this.audio.playPowerup();
        this.sceneMgr.shake(0.18 + spawn.phase * 0.035);
        const p = this.player.group.position;
        this.particles.burst(p.x, p.y + 0.5, p.z, 0x00f0ff, 18);
        this._ui?.announce("SECTOR // " + spawn.phaseName);
      }
    }

    if (spawn.shouldSpawn) {
      const occupied = this.obstacles.spawnRow(this.score.score, spawn.phase);
      const safe = [0, 1, 2].filter((lane) => !occupied.includes(lane));
      this.pickups.spawn(safe, occupied, spawn.phase);
      const stormDensity = this._eventTime > 0 ? 0.86 : 1;
      this.difficulty.armSpawn(spawn.interval * stormDensity);
    }

    const speed = this._effectiveSpeed();
    this.sceneMgr.setSpeedFeel(this.difficulty.speed, this.boosting, spawn.phase);
    this.score.update(dt, speed, this.hasShield, this.boosting);
    const missionProgress = this.missions.update(this.score.score);
    if (missionProgress) this._completeMission(missionProgress);
    this.road.update(speed, spawn.phase);
    this.city.update(speed, spawn.phase);
    this.player.update(dt, this._elapsed);
    this.obstacles.update(dt, speed, this._elapsed);
    this.pickups.update(dt, speed);
    this._resolveHunterEncounter();

    this._exhaustTimer -= dt;
    if (this._exhaustTimer <= 0) {
      const p = this.player.group.position;
      this.particles.exhaust(p.x, p.y + 0.4, p.z, speed);
      this._exhaustTimer = 0.05;
    }

    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
      this.player.group.visible = Math.floor(this._elapsed * 20) % 2 === 0;
      if (this.invulnerable <= 0) this.player.group.visible = true;
    }

    const result = this.collision.check(this.player, this.obstacles, this.pickups);

    if (result.obstacleHit) {
      this.obstacles.remove(result.obstacleHit);
      if (this._ghostTime > 0) {
        const p = this.player.group.position;
        this.score.ghostBreak();
        this.particles.burst(p.x, p.y + 0.5, p.z, 0x8a2be2, 20);
        this._ui?.announce("GHOST PHASE // BYPASSED");
      } else {
        this.takeDamage();
      }
    }

    for (const item of result.nearMisses) {
      const bonus = this.score.nearMiss();
      this._checkComboMilestone(bonus);
      this.missions.recordNearMiss();
      this.boostEnergy = Math.min(
        GAME_CONFIG.maxBoostEnergy,
        this.boostEnergy + GAME_CONFIG.nearMissBoostGain,
      );
      this.audio.playCollect();
      const p = item.obj.position;
      this.particles.burst(p.x, 1.0, p.z, 0xffe600, 8);
      const comboText = bonus.multiplier > 1 ? " // COMBO x" + bonus.multiplier : "";
      this._ui?.announce(
        "NEAR MISS +" + bonus.points + " // +" + GAME_CONFIG.nearMissBoostGain + " BOOST" + comboText,
      );
    }

    for (const pickup of result.picked) {
      const x = pickup.position.x;
      const y = pickup.position.y;
      const z = pickup.position.z;
      if (pickup.userData.type === "hackNode") {
        this._hackNodes += 1;
        const bonus = this.score.hackNode();
        this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + GAME_CONFIG.hackNodeBoostGain);
        this.audio.playCollect();
        this.particles.burst(x, y, z, 0x8a2be2, 22);
        if (this._hackNodes >= GAME_CONFIG.ghostProtocolTarget) {
          this._hackNodes = 0;
          this._ghostTime = GAME_CONFIG.ghostProtocolDuration;
          this._refreshEventMultiplier();
          this.audio.playPowerup();
          this._ui?.announce("GHOST PROTOCOL // " + GAME_CONFIG.ghostProtocolDuration + " SEC // SCORE x" + GAME_CONFIG.ghostProtocolMultiplier);
        } else {
          this._ui?.announce("HACK NODE +" + Math.floor(bonus.points) + " // LINK " + this._hackNodes + "/" + GAME_CONFIG.ghostProtocolTarget);
        }
      } else if (pickup.userData.type === "shield") {
        this.hasShield = true;
        this.player.setShield(true);
        this.audio.playPowerup();
        this.particles.burst(x, y, z, 0x00ffaa, 20);
        this._ui?.announce("SHIELD ONLINE");
      } else if (pickup.userData.type === "bonusCore") {
        const bonus = this.score.collectBonusCore();
        this._checkComboMilestone(bonus);
        this.missions.recordCore();
        this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + GAME_CONFIG.bonusCoreBoostGain);
        this.audio.playPowerup();
        this.particles.burst(x, y, z, 0xff8800, bonus.riskChainComplete ? 48 : 28);
        if (bonus.riskChainComplete) {
          this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + GAME_CONFIG.riskChainBoost);
          this.audio.playPowerup();
          this._ui?.announce("RISK ROUTE COMPLETE // +" + Math.floor(bonus.riskReward) + " SCORE // +" + GAME_CONFIG.riskChainBoost + " BOOST");
        } else {
          this._ui?.announce("BONUS CORE +" + bonus.points + " // RISK " + this.score.riskChain + "/" + GAME_CONFIG.riskChainTarget);
        }
      } else {
        const bonus = this.score.collectCore();
        this._checkComboMilestone(bonus);
        this.missions.recordCore();
        this.score.breakRiskChain();
        this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + GAME_CONFIG.coreBoostGain);
        this.audio.playCollect();
        this.particles.burst(x, y, z, 0x00f0ff, 15);
        this._ui?.announce("CORE +" + bonus.points);
      }
      this.pickups.markPicked(pickup);
    }

    this.particles.update();
    this._ui?.update(this);
  }

  _refreshEventMultiplier() {
    const storm = this._eventTime > 0 ? GAME_CONFIG.dataStormMultiplier : 1;
    const hunter = this._hunterTime > 0 ? GAME_CONFIG.hunterMultiplier : 1;
    const ghost = this._ghostTime > 0 ? GAME_CONFIG.ghostProtocolMultiplier : 1;
    this.score.setEventMultiplier(Math.min(GAME_CONFIG.eventMultiplierCap || 2.25, storm * hunter * ghost));
  }

  _resolveHunterEncounter() {
    if (!this._hunter || this._hunterTime <= 0) return;
    const p = this.player.group.position;
    const h = this._hunter.position;
    const sameLane = Math.abs(p.x - h.x) < 1.65;
    const close = Math.abs(h.z - p.z) < 1.65;
    if (!sameLane || !close) return;

    if (this.boosting) {
      const bonus = this.score.hunterBreak();
      this._checkComboMilestone(bonus);
      this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + 15);
      this.particles.burst(h.x, h.y, h.z, 0xffe600, 32);
      this.audio.playPowerup();
      this.scene.remove(this._hunter);
      this._hunter = null;
      this._hunterTime = 0;
      this._refreshEventMultiplier();
      this._ui?.announce(this._hunterElite ? "PURSUER DESTROYED // +100 // +15 BOOST" : "HUNTER DESTROYED // +100 // +15 BOOST");
      this._hunterElite = false;
    } else {
      this.scene.remove(this._hunter);
      this._hunter = null;
      this._hunterTime = 0;
      this._refreshEventMultiplier();
      this._ui?.announce(this._hunterElite ? "PURSUER STRIKE // EVADE FASTER" : "HUNTER STRIKE // EVADE FASTER");
      this._hunterElite = false;
      this.takeDamage();
    }
  }

  _makeHunter(elite = false) {
    const g = new THREE.Group();
    const size = elite ? 0.9 : 0.7;
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(size, elite ? 1 : 0), new THREE.MeshStandardMaterial({color:0x14002a, emissive:elite ? 0x8a2be2 : 0xff006e, emissiveIntensity:elite ? 2.8 : 2}));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(elite ? 0.23 : 0.18, 10, 10), new THREE.MeshBasicMaterial({color:0xffe600}));
    eye.position.z = size * 0.92;
    g.add(body, eye);
    if (elite) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 8, 32), new THREE.MeshBasicMaterial({color:0x8a2be2, transparent:true, opacity:0.85}));
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      g.userData.ring = ring;
    }
    g.userData.hit = false;
    return g;
  }

  _checkComboMilestone(bonus) {
    const thresholds = GAME_CONFIG.comboMilestones || [];
    const index = thresholds.indexOf(bonus.combo);
    if (index < 0 || this._comboMilestones.has(bonus.combo)) return;
    this._comboMilestones.add(bonus.combo);
    const reward = GAME_CONFIG.comboBoostRewards?.[index] || 0;
    this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + reward);
    const p = this.player.group.position;
    this.particles.burst(p.x, p.y + 0.7, p.z, 0xffe600, 18 + index * 4);
    this.audio.playPowerup();
    this.sceneMgr.shake(0.08 + index * 0.015);
    this._ui?.announce("COMBO " + bonus.combo + " // x" + bonus.multiplier + " // +" + reward + " BOOST");
  }

  _completeMission(mission) {
    this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + mission.reward);
    const p = this.player.group.position;
    this.particles.burst(p.x, p.y + 0.6, p.z, 0xffe600, 28);
    this.audio.playPowerup();
    this._ui?.announce("OBJECTIVE COMPLETE // +" + mission.reward + " BOOST");
  }

  togglePause() {
    if (!this.active || this.over) return;
    this.paused = !this.paused;
    if (this.paused) this.boosting = false;
    this._ui?.setPaused(this.paused);
    this._ui?.announce(this.paused ? "PAUSED" : "RESUMED");
  }

  toggleBoost() {
    if (!this.active || this.over || this.paused) return;
    if (this.boosting) { this.boosting = false; this.player.setBoost(false); return; }
    if (this.boostEnergy < 10) { this._ui?.announce("BOOST CHARGE LOW"); return; }
    this.boosting = true;
    this.player.setBoost(true);
    this.sceneMgr.shake(0.12);
    this.audio.playPowerup();
    this._ui?.announce("OVERDRIVE ONLINE");
  }

  takeDamage() {
    if (this.invulnerable > 0) return;
    this.score.breakRiskChain();

    const p = this.player.group.position;
    if (this.hasShield) {
      this.hasShield = false;
      this.player.setShield(false);
      this.audio.playHit();
      this.sceneMgr.shake(0.35);
      this.particles.burst(p.x, p.y + 0.8, p.z, 0x00ffaa, 25);
      this._ui?.announce("SHIELD BROKEN!");
      this.invulnerable = 1;
      return;
    }

    this.hp -= 1;
    this._ui?.setHp(this.hp);
    this.audio.playHit();
    this.sceneMgr.shake(0.4);
    this.particles.burst(p.x, p.y + 0.5, p.z, 0xff0055, 30);

    if (this.hp <= 0) this.gameOver();
    else this.invulnerable = 1.5;
  }

  gameOver() {
    this.active = false;
    this.over = true;
    this.boosting = false;
    this.player.group.visible = true;
    this.audio.stopBgm();
    this.audio.playGameOver();

    const newRecord = this.persistence.saveHighScore(this.score.score);
    const high = this.persistence.getHighScore();
    this._ui?.showGameOver({
      score: this.score.score,
      distance: this.score.distance,
      cores: this.score.cores,
      maxCombo: this.score.maxCombo,
      newRecord,
    });
    this._ui?.setHighScore?.(high);
  }

  _onAction(action, payload) {
    if (action === "pointer") {
      if (this.active && !this.over) this.sceneMgr.setMouseOffset(payload);
      return;
    }
    if (action === ACTIONS.MUTE) {
      const muted = this.audio.toggleMute();
      this._ui?.setMuted?.(muted);
      return;
    }
    if (action === ACTIONS.PAUSE) {
      this.togglePause();
      return;
    }
    if (!this.active || this.over || this.paused) return;

    if (action === ACTIONS.BOOST) this.toggleBoost();
    else if (action === ACTIONS.LEFT) this.player.moveLane(-1);
    else if (action === ACTIONS.RIGHT) this.player.moveLane(1);
    else if (action === ACTIONS.JUMP && this.player.jump()) this.audio.playJump();
    else if (action === ACTIONS.SLIDE && this.player.slide()) this.audio.playJump();
  }

  dispose() {
    this.input.dispose();
    this.audio.dispose();
    this.sceneMgr.dispose();
  }
}
