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
    this.scene = scene;
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
    this._empTimer = GAME_CONFIG.empCooldown;
    this._empTime = 0;
    this._hunterTimer = 22;
    this._hunterTime = 0;
    this._hunterLane = 1;
    this._hunterLaneTimer = 0;
    this._hunterX = 0;
    this._hunter = null;
    this._hunterNormalModel = this._makeHunter(false);
    this._hunterEliteModel = this._makeHunter(true);
    this._hunterElite = false;
    this._sectorHunterGap = 3.8;
    this._comboMilestones = new Set();
    this._hackNodes = 0;
    this._ghostTime = 0;
    this._ui = null;
    this._started = false;
    this._disposed = false;
    this._rafId = 0;
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this._onVisibilityChange);

    this.input.onAction((action, payload) => this._onAction(action, payload));
  }

  setUI(ui) {
    this._ui = ui;
    ui.setHp(this.hp);
    ui.setPaused(false);
  }

  start() {
    if (this._started || this._disposed) return;
    this._started = true;
    let previous = performance.now();
    const loop = (now) => {
      if (this._disposed) return;
      const dt = Math.min((now - previous) / 1000, 1 / 30);
      previous = now;
      this.update(dt);
      this.sceneMgr.render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  startGame() {
    this.audio.init();
    this.audio.startBgm();
    this.sceneMgr.resetView?.();

    this.obstacles.clear();
    this.pickups.clear();
    if (this._hunter) this._removeHunter();
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
    this._exhaustTimer = 0;
    this._eventTimer = 18;
    this._eventTime = 0;
    this._empTimer = GAME_CONFIG.empCooldown;
    this._empTime = 0;
    this._hunterTimer = 22;
    this._hunterTime = 0;
    this._hunterLane = 1;
    this._hunterLaneTimer = 0;
    this._hunterX = 0;
    this._hunter = null;
    this._hunterNormalModel.visible = false;
    this._hunterEliteModel.visible = false;
    this._hunterNormalModel.position.set(0, 0, 0);
    this._hunterEliteModel.position.set(0, 0, 0);
    this._hunterElite = false;
    this._sectorHunterGap = 3.8;
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
      this.city.update(0.12, this._lastPhase, dt, this._elapsed);
      this.particles.update(dt);
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
      const gap = this._hunterElite ? GAME_CONFIG.eliteHunterGap : this._sectorHunterGap;
      const duration = this._hunterElite ? GAME_CONFIG.eliteHunterDuration : GAME_CONFIG.hunterDuration;
      const approach = this._hunterElite ? 0.48 : 0.42;
      this._hunter.position.z = Math.max(0.6, gap - (duration - this._hunterTime) * approach) + Math.sin(this._hunterTime * 5) * 0.12;
      this._hunter.rotation.y += dt * (this._hunterElite ? 2.4 : 1.7);
      this._hunter.rotation.z = Math.sin(this._elapsed * 8) * 0.055;
      if (this._hunter.userData.ring) {
        this._hunter.userData.ring.rotation.z += dt * 3.2;
        this._hunter.userData.ring.scale.setScalar(1 + Math.sin(this._elapsed * 10) * 0.08);
      }
      if (this._hunterTime <= 0) {
        this._removeHunter();
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
        this._hunter = this._hunterElite ? this._hunterEliteModel : this._hunterNormalModel;
        this._hunter.visible = true;
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
        const stormPressure = GAME_CONFIG.phaseStormPressure?.[this._lastPhase] || 0;
        const stormBase = 18 - stormPressure * 12;
        this._eventTimer = stormBase + Math.random() * 8;
        this._refreshEventMultiplier();
        this.audio.playPowerup();
        const p = this.player.group.position;
        this.particles.burst(p.x, p.y + 1, p.z, 0xff00aa, 36);
        this.particles.shockwave(p.x, p.y + 0.8, p.z, 0xff00aa, 3.2);
        this.particles.flash(p.x, p.y + 0.9, p.z, 0xff66dd, 1.8);
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

    if (this._empTime > 0) {
      this._empTime -= dt;
      this.boosting = false;
      this.player.setBoost(false);
      if (this._empTime <= 0) {
        this._ui?.announce("EMP // BOOST LINK RESTORED");
      }
    } else {
      this._empTimer -= dt;
      if (this._empTimer <= 0 && this._lastPhase >= 3) {
        this._empTime = GAME_CONFIG.empDuration;
        this._empTimer = GAME_CONFIG.empCooldown + Math.random() * 12;
        this.boosting = false;
        this.player.setBoost(false);
        this.boostEnergy = Math.max(0, this.boostEnergy - GAME_CONFIG.empBoostDrain);
        this.audio.playHit();
        const p = this.player.group.position;
        this.particles.burst(p.x, p.y + 0.7, p.z, 0x8a2be2, 42);
        this.particles.shockwave(p.x, p.y + 0.7, p.z, 0x8a2be2, 2.8);
        this.particles.flash(p.x, p.y + 0.7, p.z, 0xc56cff, 1.6);
        this.sceneMgr.shake(0.2);
        this._ui?.announce("EMP BLACKOUT // BOOST OFFLINE // " + GAME_CONFIG.empDuration.toFixed(1) + " SEC");
      }
    }

    if (this.boosting && this._empTime <= 0) {
      this.boostEnergy = Math.max(0, this.boostEnergy - GAME_CONFIG.boostDrain * dt);
      if (this.boostEnergy <= 0) { this.boosting = false; this.player.setBoost(false); }
    }

    const spawn = this.difficulty.update(dt, this.score.score);
    if (spawn.phase !== this._lastPhase) {
      this._lastPhase = spawn.phase;
      this._sectorHunterGap = spawn.hunterGap || 3.8;
      if (spawn.phase > 0) {
        this.audio.playPowerup();
        this.sceneMgr.shake(0.18 + spawn.phase * 0.035);
        const p = this.player.group.position;
        this.particles.burst(p.x, p.y + 0.5, p.z, 0x00f0ff, 18);
        this.particles.shockwave(p.x, p.y + 0.5, p.z, 0x00f0ff, 2.2);
        this._ui?.announce("SECTOR // " + spawn.phaseName);
      }
    }

    if (spawn.shouldSpawn) {
      const occupied = this.obstacles.spawnRow(this.score.score, spawn.phase);
      const safe = [0, 1, 2].filter((lane) => !occupied.includes(lane));
      this.pickups.spawn(safe, occupied, spawn.phase);
      const stormDensity = this._eventTime > 0 ? 0.86 : 1;
      const empDensity = this._empTime > 0 ? 0.9 : 1;
      this.difficulty.armSpawn(spawn.interval * stormDensity * empDensity);
    }

    const speed = this._effectiveSpeed();
    this.sceneMgr.setSpeedFeel(this.difficulty.speed, this.boosting, spawn.phase, dt);
    this.score.update(dt, speed, this.hasShield, this.boosting);
    const missionProgress = this.missions.update(this.score.score);
    if (missionProgress) this._completeMission(missionProgress);
    this.road.update(speed, spawn.phase, dt, this._elapsed);
    this.city.update(speed, spawn.phase, dt, this._elapsed);
    this.player.update(dt, this._elapsed);
    this.obstacles.update(dt, speed, this._elapsed);
    this.pickups.update(dt, speed, this._elapsed);
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

    if (result.obstacleHits?.length) {
      for (const obstacleHit of result.obstacleHits) this.obstacles.remove(obstacleHit);
      if (this._ghostTime > 0) {
        const p = this.player.group.position;
        const ghostPoints = 50 * this.score.eventMultiplier * result.obstacleHits.length;
        this.score.score += ghostPoints;
        this.particles.burst(p.x, p.y + 0.5, p.z, 0x8a2be2, 20 + result.obstacleHits.length * 6);
        this._ui?.announce("GHOST PHASE // BYPASSED x" + result.obstacleHits.length + " // +" + Math.floor(ghostPoints));
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
      this.particles.streak(p.x, 1.0, p.z, 0xffe600, 4, 1.2);
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
        this._checkComboMilestone(bonus);
        this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + GAME_CONFIG.hackNodeBoostGain);
        this.audio.playCollect();
        this.particles.burst(x, y, z, 0x8a2be2, 22);
        this.particles.shockwave(x, y, z, 0x8a2be2, 1.8);
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
        this.particles.shockwave(x, y, z, 0x00ffaa, 2.0);
        this._ui?.announce("SHIELD ONLINE");
      } else if (pickup.userData.type === "bonusCore") {
        const bonus = this.score.collectBonusCore();
        this._checkComboMilestone(bonus);
        this.missions.recordCore();
        this.boostEnergy = Math.min(GAME_CONFIG.maxBoostEnergy, this.boostEnergy + GAME_CONFIG.bonusCoreBoostGain);
        this.audio.playPowerup();
        this.particles.burst(x, y, z, 0xff8800, bonus.riskChainComplete ? 48 : 28);
        this.particles.shockwave(x, y, z, 0xff8800, bonus.riskChainComplete ? 3.0 : 2.1);
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
        this.particles.shockwave(x, y, z, 0x00f0ff, 1.6);
        this._ui?.announce("CORE +" + bonus.points);
      }
      this.pickups.markPicked(pickup);
    }

    this.particles.update(dt);
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
      this._removeHunter();
      this._hunterTime = 0;
      this._refreshEventMultiplier();
      this._ui?.announce(this._hunterElite ? "PURSUER DESTROYED // +100 // +15 BOOST" : "HUNTER DESTROYED // +100 // +15 BOOST");
      this._hunterElite = false;
    } else {
      this._removeHunter();
      this._hunterTime = 0;
      this._refreshEventMultiplier();
      this._ui?.announce(this._hunterElite ? "PURSUER STRIKE // EVADE FASTER" : "HUNTER STRIKE // EVADE FASTER");
      this._hunterElite = false;
      this.takeDamage();
    }
  }

  _removeHunter() {
    if (!this._hunter) return;
    this.scene.remove(this._hunter);
    this._hunter.visible = false;
    this._hunter.position.set(0, 0, 0);
    this._hunter = null;
  }

  _makeHunter(elite = false) {
    const g = new THREE.Group();
    const size = elite ? 0.9 : 0.7;
    const accent = elite ? 0x8a2be2 : 0xff006e;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0c0820,
      emissive: accent,
      emissiveIntensity: elite ? 2.4 : 1.8,
      metalness: 0.9,
      roughness: 0.16,
      flatShading: true,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: elite ? 0x8a2be2 : 0xff006e });
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(size, elite ? 1 : 0), bodyMat);
    g.add(body);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(elite ? 0.28 : 0.22, 0),
      new THREE.MeshBasicMaterial({ color: 0xffe600 }),
    );
    core.position.z = size * 0.92;
    g.add(core);

    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(elite ? 2.35 : 1.8, 0.08, elite ? 0.5 : 0.38),
      bodyMat,
    );
    wing.position.y = -0.08;
    g.add(wing);

    // Distinct hunter silhouette: forward sensor housing + split stabilizers.
    const sensor = new THREE.Mesh(
      new THREE.ConeGeometry(elite ? 0.24 : 0.19, elite ? 0.62 : 0.5, 5),
      glowMat,
    );
    sensor.rotation.x = -Math.PI / 2;
    sensor.position.z = -size * 1.02;
    g.add(sensor);

    const finGeo = new THREE.BoxGeometry(elite ? 0.16 : 0.12, elite ? 0.32 : 0.25, elite ? 0.62 : 0.48);
    for (const x of [-size * 0.72, size * 0.72]) {
      const fin = new THREE.Mesh(finGeo, bodyMat);
      fin.position.set(x, 0.06, size * 0.08);
      fin.rotation.z = x < 0 ? -0.22 : 0.22;
      g.add(fin);
    }

    const armorPlate = new THREE.Mesh(
      new THREE.BoxGeometry(elite ? 1.25 : 0.95, 0.11, elite ? 0.5 : 0.4),
      bodyMat,
    );
    armorPlate.position.set(0, 0.16, -0.08);
    armorPlate.rotation.x = elite ? -0.12 : -0.08;
    g.add(armorPlate);

    const sensorCollar = new THREE.Mesh(
      new THREE.TorusGeometry(elite ? 0.27 : 0.22, 0.035, 6, 12),
      glowMat,
    );
    sensorCollar.rotation.y = Math.PI / 2;
    sensorCollar.position.z = -size * 1.02;
    g.add(sensorCollar);

    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(elite ? 1.8 : 1.35, 0.055, 0.06),
      glowMat,
    );
    edge.position.set(0, -0.18, 0);
    g.add(edge);

    const thruster = new THREE.Mesh(
      new THREE.TorusGeometry(elite ? 0.62 : 0.45, 0.045, 6, 20),
      glowMat,
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.z = size * 0.55;
    g.add(thruster);

    const rearHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(elite ? 0.28 : 0.22, elite ? 0.34 : 0.27, 0.28, 8),
      bodyMat,
    );
    rearHousing.rotation.x = Math.PI / 2;
    rearHousing.position.z = size * 0.66;
    g.add(rearHousing);

    if (elite) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.06, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x8a2be2, transparent: true, opacity: 0.85 }),
      );
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

  _onVisibilityChange() {
    if (document.hidden && this.active && !this.over && !this.paused) {
      this.paused = true;
      this.boosting = false;
      this.player.setBoost(false);
      this.audio.pause();
      this._ui?.setPaused(true);
      this._ui?.announce("PAUSED // APP BACKGROUND");
    }
  }

  togglePause() {
    if (!this.active || this.over) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.boosting = false;
      this.player.setBoost(false);
      this.audio.pause();
    } else {
      this.audio.resume();
    }
    this._ui?.setPaused(this.paused);
    this._ui?.announce(this.paused ? "PAUSED" : "RESUMED");
  }

  toggleBoost() {
    if (!this.active || this.over || this.paused) return;
    if (this.boosting) { this.boosting = false; this.player.setBoost(false); return; }
    if (this.boostEnergy < 10) { this._ui?.announce("BOOST CHARGE LOW"); return; }
    this.boosting = true;
    this.player.setBoost(true);
    const p = this.player.group.position;
    this.particles.flash(p.x, p.y + 0.45, p.z, 0xff6be5, 1.35);
    this.particles.shockwave(p.x, p.y + 0.45, p.z, 0xff2bd6, 2.4);
    this.particles.streak(p.x, p.y + 0.35, p.z + 0.8, 0xff2bd6, 7, 2.4);
    this.sceneMgr.shake(0.12);
    this.audio.playPowerup();
    this._ui?.announce("OVERDRIVE ONLINE");
  }

  takeDamage() {
    if (this.invulnerable > 0) return;
    this.boosting = false;
    this.player.setBoost(false);
    this.score.breakRiskChain();

    const p = this.player.group.position;
    if (this.hasShield) {
      this.hasShield = false;
      this.player.setShield(false);
      this.audio.playHit();
      this.sceneMgr.shake(0.35);
      this.particles.burst(p.x, p.y + 0.8, p.z, 0x00ffaa, 25);
      this.particles.shockwave(p.x, p.y + 0.65, p.z, 0x00ffaa, 2.8);
      this.particles.flash(p.x, p.y + 0.65, p.z, 0x7affdd, 1.7);
      this._ui?.announce("SHIELD BROKEN!");
      this.invulnerable = 1;
      return;
    }

    this.hp -= 1;
    this._ui?.setHp(this.hp);
    this.audio.playHit();
    this.sceneMgr.shake(0.4);
    this.particles.burst(p.x, p.y + 0.5, p.z, 0xff0055, 30);
    this.particles.shockwave(p.x, p.y + 0.5, p.z, 0xff0055, 3.0);
    this.particles.flash(p.x, p.y + 0.5, p.z, 0xff6688, 1.8);

    if (this.hp <= 0) this.gameOver();
    else this.invulnerable = 1.5;
  }

  gameOver() {
    this.active = false;
    this.over = true;
    this.boosting = false;
    this.player.setBoost(false);
    if (this._hunter) this._removeHunter();
    this._hunterTime = 0;
    this._hunterElite = false;
    this._eventTime = 0;
    this._empTime = 0;
    this._ghostTime = 0;
    this.score.setEventMultiplier(1);
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

    if (action === ACTIONS.BOOST && this._empTime <= 0) this.toggleBoost();
    else if (action === ACTIONS.LEFT) this.player.moveLane(-1);
    else if (action === ACTIONS.RIGHT) this.player.moveLane(1);
    else if (action === ACTIONS.JUMP && this.player.jump()) this.audio.playJump();
    else if (action === ACTIONS.SLIDE && this.player.slide()) this.audio.playJump();
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    this.input.dispose();
    this.audio.dispose();
    this.obstacles.dispose?.();
    this.pickups.dispose?.();
    this.particles.dispose?.();
    this.player.dispose?.();
    this.road.dispose?.();
    this.city.dispose?.();
    this._hunterNormalModel?.traverse?.((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      const material = node.material;
      if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
      else material?.dispose?.();
    });
    this._hunterEliteModel?.traverse?.((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      const material = node.material;
      if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
      else material?.dispose?.();
    });
    this._hunterNormalModel = null;
    this._hunterEliteModel = null;
    this.sceneMgr.dispose();
  }
}
