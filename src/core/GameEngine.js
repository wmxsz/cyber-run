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

export class GameEngine {
  constructor(canvas) {
    this.sceneMgr = new SceneManager(canvas);
    this.sceneMgr.addLighting();

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.persistence = new PersistenceSystem();

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
    this.particles.clear?.();

    this.score.reset();
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
      this.city.update(0.12);
      this.particles.update();
      this._ui?.update(this);
      return;
    }

    if (this.paused) {
      this._ui?.update(this);
      return;
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
        const p = this.player.group.position;
        this.particles.burst(p.x, p.y + 0.5, p.z, 0x00f0ff, 18);
        this._ui?.announce("SECTOR // " + spawn.phaseName);
      }
    }

    if (spawn.shouldSpawn) {
      const occupied = this.obstacles.spawnRow(this.score.score, spawn.phase);
      const safe = [0, 1, 2].filter((lane) => !occupied.includes(lane));
      this.pickups.spawn(safe);
      this.difficulty.armSpawn(spawn.interval);
    }

    const speed = this._effectiveSpeed();
    this.score.update(dt, speed, this.hasShield, this.boosting);
    this.road.update(speed);
    this.city.update(speed);
    this.player.update(dt, this._elapsed);
    this.obstacles.update(dt, speed, this._elapsed);
    this.pickups.update(dt, speed);

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
      this.takeDamage();
    }

    for (const item of result.nearMisses) {
      const bonus = this.score.nearMiss();
      this.audio.playCollect();
      const p = item.obj.position;
      this.particles.burst(p.x, 1.0, p.z, 0xffe600, 8);
      this._ui?.announce("NEAR MISS +" + bonus.points);
    }

    for (const pickup of result.picked) {
      const x = pickup.position.x;
      const y = pickup.position.y;
      const z = pickup.position.z;
      if (pickup.userData.type === "shield") {
        this.hasShield = true;
        this.player.setShield(true);
        this.audio.playPowerup();
        this.particles.burst(x, y, z, 0x00ffaa, 20);
        this._ui?.announce("SHIELD ONLINE");
      } else {
        const bonus = this.score.collectCore();
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
    this.audio.playPowerup();
    this._ui?.announce("OVERDRIVE ONLINE");
  }

  takeDamage() {
    if (this.invulnerable > 0) return;

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
