import assert from "node:assert/strict";
import { ScoreSystem } from "../src/systems/ScoreSystem.js";
import { DifficultySystem } from "../src/systems/DifficultySystem.js";
import { MissionSystem } from "../src/systems/MissionSystem.js";
import { CollisionSystem } from "../src/systems/CollisionSystem.js";
import { ObjectPool } from "../src/core/ObjectPool.js";
import { GAME_CONFIG } from "../src/config/gameConfig.js";

const finite = (value, label) => assert.ok(Number.isFinite(value), label + " must stay finite");

// Score invariants.
{
  const score = new ScoreSystem();
  score.update(1 / 60, GAME_CONFIG.baseSpeed, false, false);
  finite(score.score, "score");
  score.setEventMultiplier(99);
  assert.equal(score.eventMultiplier, GAME_CONFIG.eventMultiplierCap);
  for (let i = 0; i < GAME_CONFIG.riskChainTarget; i++) score.collectBonusCore();
  assert.equal(score.riskChain, 0, "risk chain should reset at completion");
  assert.ok(score.maxCombo >= GAME_CONFIG.riskChainTarget);
}

// Difficulty invariants and bounded spawn interval.
{
  const difficulty = new DifficultySystem();
  difficulty.reset();
  for (let i = 0; i < 600; i++) {
    const state = difficulty.update(1 / 60, i * 25);
    finite(difficulty.speed, "difficulty speed");
    assert.ok(state.interval > 0, "spawn interval must stay positive");
    assert.ok(state.phase >= 0 && state.phase < GAME_CONFIG.phaseThresholds.length);
  }
  assert.ok(difficulty.speed <= GAME_CONFIG.maxSpeed);
}

// Mission sequence.
{
  const missions = new MissionSystem();
  for (let i = 0; i < 3; i++) missions.recordNearMiss();
  assert.equal(missions.update(0).reward, 20);
  for (let i = 0; i < 4; i++) missions.recordCore();
  assert.equal(missions.update(0).reward, 20);
  assert.equal(missions.update(2500).reward, 25);
  assert.equal(missions.update(2500), null);
}

// Object pool must clear collision flags when reused.
{
  const pool = new ObjectPool(() => ({ userData: {} }), 1);
  const item = pool.acquire();
  item.userData.hit = true;
  item.userData.passed = true;
  pool.release(item);
  const reused = pool.acquire();
  assert.equal(reused.userData.hit, false);
  assert.equal(reused.userData.passed, false);
}

// Collision rules: ground barrier hits; jumping barrier passes; sliding high laser passes.
{
  const collision = new CollisionSystem();
  const player = {
    isJumping: false,
    isSliding: false,
    getHitbox: () => ({ x: 0, y: 0, z: 0, halfX: 1.1, halfY: 0.8, halfZ: 1.2 }),
  };
  const barrier = { obj: { position: { x: 0, z: 0 }, userData: {} }, def: { hitbox: { x: 1.55, y: 1.25 }, blocksAir: true, blocksGround: false, hitCenterY: 1.25 } };
  const obstacles = { forEachActive(fn) { fn(barrier); } };
  const pickups = { forEachActive() {} };
  assert.equal(collision.check(player, obstacles, pickups).obstacleHits.length, 1);

  player.isJumping = true;
  barrier.obj.userData = {};
  assert.equal(collision.check(player, obstacles, pickups).obstacleHits.length, 0);

  player.isJumping = false;
  player.isSliding = false;
  const laser = { obj: { position: { x: 0, z: 0 }, userData: {} }, def: { hitbox: { x: 1.55, y: 0.7 }, blocksAir: false, blocksGround: true, requiresSlide: true } };
  obstacles.forEachActive = (fn) => fn(laser);
  assert.equal(collision.check(player, obstacles, pickups).obstacleHits.length, 1);
  player.isSliding = true;
  laser.obj.userData = {};
  assert.equal(collision.check(player, obstacles, pickups).obstacleHits.length, 0);
}

console.log("Cyber Run smoke checks passed.");
