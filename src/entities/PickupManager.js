import * as THREE from "three";
import { GAME_CONFIG, LANES, COLORS } from "../config/gameConfig.js";
import { ObjectPool } from "../core/ObjectPool.js";

function makeCore() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 1),
    new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 1.45, metalness: 0.92, roughness: 0.08 }),
  );
  const shell = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.045, 6, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.5 }),
  );
  shell.rotation.x = Math.PI / 2;
  const shellCross = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.72, 0.08),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.46 }),
  );
  shellCross.rotation.z = Math.PI / 4;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.045, 6, 24),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.72 }),
  );
  halo.rotation.x = Math.PI / 2;
  g.add(core, shell, shellCross, halo);
  g.userData.halo = halo;
  g.userData.shell = shell;
  g.userData.shellCross = shellCross;
  g.userData.core = core;

  // A compact containment collar gives the core a manufactured device silhouette.
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 0.12, 8),
    new THREE.MeshStandardMaterial({
      color: 0x10182b, metalness: 0.88, roughness: 0.18,
      emissive: COLORS.cyan, emissiveIntensity: 0.18,
    }),
  );
  collar.position.y = -0.34;
  g.add(collar);
  g.userData.collar = collar;

  const antennaGeo = new THREE.BoxGeometry(0.045, 0.34, 0.045);
  const antennaMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.72 });
  const antennaLeft = new THREE.Mesh(antennaGeo, antennaMat);
  const antennaRight = new THREE.Mesh(antennaGeo, antennaMat);
  antennaLeft.position.set(-0.34, 0.42, 0);
  antennaRight.position.set(0.34, 0.42, 0);
  antennaLeft.rotation.z = -0.35;
  antennaRight.rotation.z = 0.35;
  g.add(antennaLeft, antennaRight);

  const dataBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.7, 6),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.18 }),
  );
  dataBeam.position.y = 0.15;
  g.add(dataBeam);

  g.userData.antennaLeft = antennaLeft;
  g.userData.antennaRight = antennaRight;
  g.userData.dataBeam = dataBeam;
  return g;
}
function makeBonusCore() {
  const g = makeCore();
  const core = g.children[0];
  const shell = g.userData.shell;
  const shellCross = g.userData.shellCross;
  const halo = g.userData.halo;
  core.geometry.dispose();
  core.material.dispose();
  core.geometry = new THREE.IcosahedronGeometry(0.58, 0);
  core.material = new THREE.MeshStandardMaterial({ color: COLORS.orange, emissive: COLORS.orange, emissiveIntensity: 1.9, metalness: 0.92, roughness: 0.08 });
  shell.material.dispose();
  shellCross.material.dispose();
  halo.material.dispose();
  shell.material = new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.56 });
  shellCross.material = new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.52 });
  halo.material = new THREE.MeshBasicMaterial({ color: COLORS.orange, transparent: true, opacity: 0.84 });
  if (g.userData.dataBeam) {
    g.userData.dataBeam.material.dispose();
    g.userData.dataBeam.material = new THREE.MeshBasicMaterial({ color: COLORS.orange, transparent: true, opacity: 0.2 });
  }
  if (g.userData.antennaLeft) {
    g.userData.antennaLeft.material.dispose();
    g.userData.antennaLeft.material = new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.78 });
  }
  if (g.userData.antennaRight) {
    g.userData.antennaRight.material.dispose();
    g.userData.antennaRight.material = g.userData.antennaLeft.material;
  }
  if (g.userData.collar) {
    g.userData.collar.material.dispose();
    g.userData.collar.material = new THREE.MeshStandardMaterial({
      color: 0x24180b, metalness: 0.9, roughness: 0.16,
      emissive: COLORS.orange, emissiveIntensity: 0.2,
    });
  }
  return g;
}
function makeHackNode() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.68, 0),
    new THREE.MeshStandardMaterial({ color: COLORS.violet, emissive: COLORS.violet, emissiveIntensity: 2.25, metalness: 0.82, roughness: 0.07 }),
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.055, 8, 28),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.86 }),
  );
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.035, 6, 24),
    new THREE.MeshBasicMaterial({ color: COLORS.pink, transparent: true, opacity: 0.65 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring2.rotation.y = Math.PI / 2;
  g.add(core, ring, ring2);
  g.userData.core = core;
  g.userData.ring = ring;
  g.userData.ring2 = ring2;
  const glyphs = new THREE.Group();
  const glyphGeo = new THREE.BoxGeometry(0.07, 0.26, 0.025);
  const glyphMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.66 });
  for (let i = 0; i < 5; i++) {
    const glyph = new THREE.Mesh(glyphGeo, glyphMat);
    const a = (i / 5) * Math.PI * 2;
    glyph.position.set(Math.cos(a) * 0.78, 0.08 + (i % 2) * 0.14, Math.sin(a) * 0.78);
    glyph.lookAt(0, glyph.position.y, 0);
    glyphs.add(glyph);
  }
  g.add(glyphs);
  g.userData.glyphs = glyphs;
  return g;
}
function makeShield() {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 1), new THREE.MeshBasicMaterial({ color: COLORS.green, wireframe: true, transparent: true, opacity: 0.8 }));
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 1), new THREE.MeshStandardMaterial({ color: COLORS.green, emissive: COLORS.green, emissiveIntensity: 1.4, metalness: 0.55, roughness: 0.12 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: COLORS.green, transparent: true, opacity: 0.6 }));
  ring.rotation.x = Math.PI / 2;
  g.add(outer, inner, ring);
  g.userData.outer = outer;
  g.userData.inner = inner;
  g.userData.ring = ring;
  return g;
}

export class PickupManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pools = { core: new ObjectPool(makeCore, 4), bonusCore: new ObjectPool(makeBonusCore, 3), hackNode: new ObjectPool(makeHackNode, 4), shield: new ObjectPool(makeShield, 2) };
  }
  spawn(safeLanes, occupiedLanes = [], phase = 0) {
    if (!safeLanes.length || Math.random() > 0.68) return;

    const spawnOne = (lane, type, zOffset = null) => {
      const obj = this.pools[type].acquire();
      obj.userData.type = type;
      obj.userData.picked = false;
      obj.position.set(
        LANES[lane],
        type === "shield" ? 1.4 : 1.2,
        zOffset ?? (GAME_CONFIG.spawnZ - 5 - Math.random() * 25),
      );
      obj.rotation.set(0, 0, 0);
      obj.scale.set(1, 1, 1);
      this.scene.add(obj);
      this.active.push(obj);
    };

    const safeLane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
    const nextSafeLane = safeLanes.length > 1
      ? safeLanes[(safeLanes.indexOf(safeLane) + 1) % safeLanes.length]
      : safeLane;
    const riskyLane = occupiedLanes.length
      ? occupiedLanes[Math.floor(Math.random() * occupiedLanes.length)]
      : null;
    const routeChoice = phase >= 2
      && riskyLane !== null
      && Math.random() < GAME_CONFIG.routeChoiceChance;

    if (routeChoice) {
      // Risk/reward line: a safe core advertises the route, then a bonus node
      // sits just off the route so the player can consciously take the risk.
      spawnOne(safeLane, "core", GAME_CONFIG.spawnZ - 6);
      spawnOne(riskyLane, "bonusCore", GAME_CONFIG.spawnZ - 19);
      if (phase >= 3) spawnOne(safeLane, "core", GAME_CONFIG.spawnZ - 32);
      return;
    }

    // Coins/cores form an actual movement guide rather than isolated loot.
    // The last pickup is allowed to move one lane so the player reads the next action.
    if (phase >= 1 && Math.random() < 0.34) {
      spawnOne(safeLane, "core", GAME_CONFIG.spawnZ - 5);
      spawnOne(safeLane, phase >= 3 && Math.random() < 0.2 ? "hackNode" : "core", GAME_CONFIG.spawnZ - 16);
      spawnOne(nextSafeLane, "core", GAME_CONFIG.spawnZ - 27);
      return;
    }

    const riskReward = phase >= 2 && riskyLane !== null && Math.random() < 0.42;
    const lane = riskReward ? riskyLane : safeLane;
    const hackRoute = phase >= 1 && !riskReward && Math.random() < 0.24;
    const type = riskReward
      ? "bonusCore"
      : (hackRoute ? "hackNode" : (Math.random() < 0.18 ? "shield" : "core"));
    spawnOne(lane, type);
  }
  update(dt, speed, elapsed = performance.now() * 0.001) {
    const advance = speed * dt * 60;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.position.z += advance;
      p.rotation.y += dt * 2.5;
      p.rotation.x += dt * 1.2;
      if (p.userData.type === "core" || p.userData.type === "bonusCore") {
        const pulse = 0.5 + Math.sin(elapsed * 8 + p.position.z * 0.06) * 0.24;
        if (p.userData.dataBeam) {
          p.userData.dataBeam.scale.y = 0.72 + pulse * 0.5;
          p.userData.dataBeam.material.opacity = 0.12 + pulse * 0.14;
        }
        if (p.userData.antennaLeft && p.userData.antennaRight) {
          p.userData.antennaLeft.rotation.z = -0.35 + Math.sin(elapsed * 7) * 0.08;
          p.userData.antennaRight.rotation.z = 0.35 - Math.sin(elapsed * 7) * 0.08;
        }
      }
      if (p.userData.type === "hackNode") {
        if (p.userData.glyphs) {
          p.userData.glyphs.rotation.y += dt * 1.8;
          p.userData.glyphs.rotation.x = Math.sin(elapsed * 2.5) * 0.08;
        }
        p.userData.ring.material.opacity = 0.68 + Math.sin(elapsed * 11 + p.position.z * 0.05) * 0.16;
        p.userData.ring2.material.opacity = 0.48 + Math.sin(elapsed * 14) * 0.14;
        p.userData.core.rotation.y += dt * 4.5;
        p.userData.ring.rotation.z += dt * 3.5;
        if (p.userData.ring2) p.userData.ring2.rotation.y -= dt * 2.8;
        const pulse = 1 + Math.sin(elapsed * 12) * 0.16;
        p.scale.setScalar(pulse);
        p.userData.ring.scale.setScalar(1 + Math.sin(elapsed * 15) * 0.05);
      }
      if ((p.userData.type === "core" || p.userData.type === "bonusCore") && p.userData.halo) {
        p.userData.halo.rotation.z += dt * 3.5;
        const haloPulse = 1 + Math.sin(elapsed * 10 + p.position.z * 0.08) * 0.13;
        p.userData.halo.scale.setScalar(haloPulse);
        p.userData.halo.material.opacity = 0.58 + Math.sin(elapsed * 8 + p.position.x) * 0.12;
      }
      if (p.userData.type === "shield") {
        const pulse = 1 + Math.sin(elapsed * 8 + p.position.z * 0.04) * 0.12;
        if (p.userData.outer) p.userData.outer.material.opacity = 0.62 + Math.sin(elapsed * 9) * 0.16;
        if (p.userData.ring) p.userData.ring.material.opacity = 0.48 + Math.sin(elapsed * 12) * 0.14;
        p.scale.setScalar(pulse);
        if (p.userData.outer) p.userData.outer.rotation.z -= dt * 1.8;
        if (p.userData.ring) p.userData.ring.rotation.z += dt * 2.2;
        if (p.userData.inner) p.userData.inner.rotation.y += dt * 2.6;
      } else {
        p.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.08);
      }
      if (p.position.z > GAME_CONFIG.cullZ) this._removeAt(i);
    }
  }
  markPicked(obj) {
    const i = this.active.indexOf(obj);
    if (i >= 0) this._removeAt(i);
  }
  forEachActive(fn) { for (const obj of this.active) fn(obj); }
  _removeAt(i) {
    const obj = this.active[i];
    this.scene.remove(obj);
    this.pools[obj.userData.type].release(obj);
    this.active.splice(i, 1);
  }
  clear() { for (let i = this.active.length - 1; i >= 0; i--) this._removeAt(i); }

  dispose() {
    this.clear();
    const disposed = new Set();
    const disposeItem = (item) => {
      item?.traverse?.((node) => {
        if (!node.isMesh) return;
        if (node.geometry && !disposed.has(node.geometry)) {
          node.geometry.dispose();
          disposed.add(node.geometry);
        }
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          if (material && !disposed.has(material)) {
            material.dispose();
            disposed.add(material);
          }
        }
      });
    };
    for (const pool of Object.values(this.pools)) pool.dispose(disposeItem);
    this.pools = {};
  }
}
