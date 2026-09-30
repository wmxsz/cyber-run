export const LANES = [-4, 0, 4];

export const GAME_CONFIG = {
  baseSpeed: 1.2,
  maxSpeed: 3.2,
  speedRamp: 0.018,
  maxHp: 3,
  spawnZ: -320,
  cullZ: 22,
  spawnStartMs: 1100,
  spawnMinMs: 560,
  spawnRampScore: 2400,
  laneChangeLerp: 0.16,
  gravity: 0.018,
  jumpForce: 0.38,
  slideDuration: 0.58,
  collisionZ: 2.5,
  pickupRadius: 1.8,
  nearMissDistance: 3.2,
  nearMissScore: 35,
  comboWindow: 2.8,
  coreBoostGain: 25,
  maxBoostEnergy: 100,
  boostDrain: 42,
  boostSpeedMultiplier: 1.48,
};

export const COLORS = {
  bg: 0x060414,
  cyan: 0x00f0ff,
  pink: 0xff0077,
  orange: 0xff8800,
  yellow: 0xffea00,
  red: 0xff0055,
  green: 0x00ffaa,
};

export const STORAGE_KEYS = {
  highScore: "neon_runner_highscore",
};
