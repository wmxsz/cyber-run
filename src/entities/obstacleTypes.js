import * as THREE from "three";
import { COLORS } from "../config/gameConfig.js";

const disc = (radius, color) => {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.05;
  return m;
};

function makeBarrier() {
  const g = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.22, 0.28, 3.4, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2030, emissive: 0xff6600, emissiveIntensity: 0.45, metalness: 0.55, roughness: 0.3 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: COLORS.red });
  for (const x of [-1.5, 1.5]) {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 1.7, 0);
    g.add(pole);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.18, 8), poleMat);
    foot.position.set(x, 0.1, 0);
    g.add(foot);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), beaconMat);
    beacon.position.set(x, 3.45, 0);
    g.add(beacon);
  }
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.5, 0.5), beamMat);
  beam.position.y = 1.25;
  const core = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  core.position.y = 1.25;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: COLORS.orange }));
  lower.position.set(0, 0.98, 0);
  const braceGeo = new THREE.BoxGeometry(0.1, 1.45, 0.1);
  for (const x of [-1.1, 1.1]) {
    const brace = new THREE.Mesh(braceGeo, poleMat);
    brace.position.set(x, 1.12, 0);
    brace.rotation.z = x < 0 ? -0.38 : 0.38;
    g.add(brace);
  }
  const centerHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 0.32, 8),
    poleMat,
  );
  centerHousing.rotation.x = Math.PI / 2;
  centerHousing.position.set(0, 1.25, 0.25);
  g.add(beam, core, lower, centerHousing, disc(1.7, COLORS.red));
  g.userData.pulse = beam;
  return g;
}
function makeHighLaser() {
  const g = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.9, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x24104a, emissive: COLORS.pink, emissiveIntensity: 0.65, metalness: 0.65, roughness: 0.24 });
  const baseGeo = new THREE.CylinderGeometry(0.38, 0.5, 0.18, 8);
  for (const x of [-1.5, 1.5]) {
    const pole = new THREE.Mesh(poleGeo, mat);
    pole.position.set(x, 2.7, 0);
    g.add(pole);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.set(x, 0.09, 0);
    g.add(base);
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.42, 8), new THREE.MeshBasicMaterial({ color: COLORS.pink }));
    emitter.rotation.z = Math.PI / 2;
    emitter.position.set(x, 2.45, 0);
    g.add(emitter);
  }
  const brace = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.1, 0.12),
    new THREE.MeshBasicMaterial({ color: COLORS.pink }),
  );
  brace.position.set(0, 1.35, 0);
  brace.rotation.z = Math.PI / 2.9;
  g.add(brace);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.25, 0.35), new THREE.MeshBasicMaterial({ color: COLORS.pink }));
  beam.position.y = 2.45;
  const core = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  core.position.y = 2.45;
  g.add(beam, core, disc(1.7, COLORS.pink));
  g.userData.pulse = beam;
  return g;
}
function makeMine() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.82, 1),
    new THREE.MeshStandardMaterial({ color: 0x40101a, emissive: 0xff5500, emissiveIntensity: 1.15, metalness: 0.7, roughness: 0.2, flatShading: true }),
  );
  core.position.y = 1.25;
  g.add(core);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 6, 18), new THREE.MeshBasicMaterial({ color: COLORS.yellow }));
  cap.rotation.x = Math.PI / 2;
  cap.position.y = 1.25;
  g.add(cap);
  const spikeGeo = new THREE.ConeGeometry(0.2, 1, 6);
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0x3b2430, emissive: COLORS.yellow, emissiveIntensity: 0.4, metalness: 0.55, roughness: 0.25 });
  for (const [rx, ry] of [[0,0],[Math.PI,0],[0,Math.PI/2],[0,-Math.PI/2],[Math.PI/2,0],[-Math.PI/2,0]]) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.rotation.set(rx, ry, 0);
    spike.position.set(0, 1.25, 0);
    spike.translateY(0.75);
    g.add(spike);
  }
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 0.24, 8),
    new THREE.MeshStandardMaterial({ color: 0x15111d, metalness: 0.86, roughness: 0.22, emissive: COLORS.pink, emissiveIntensity: 0.18 }),
  );
  base.position.y = 0.12;
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.32, 0.7, 8),
    spikeMat,
  );
  neck.position.y = 0.52;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: COLORS.pink }));
  ring.position.y = 1.25;
  g.add(base, neck, ring, disc(1.55, COLORS.orange));
  g.userData.ring = ring;
  g.userData.pulse = core;
  return g;
}
function makeBlock() {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(2.7, 3.2, 1.8);
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x25201a, emissive: 0x553300, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.55 }),
  );
  body.position.y = 1.6;
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: COLORS.yellow }));
  frame.position.y = 1.6;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.55, 0.06), new THREE.MeshBasicMaterial({ color: COLORS.red }));
  panel.position.set(0, 1.62, 0.93);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.07), new THREE.MeshBasicMaterial({ color: COLORS.yellow }));
  stripe.position.set(0, 1.62, 0.98);
  const footGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.2, 8);
  const footMat = new THREE.MeshStandardMaterial({
    color: 0x17140f, metalness: 0.8, roughness: 0.25,
    emissive: COLORS.orange, emissiveIntensity: 0.18,
  });
  const ventMat = new THREE.MeshBasicMaterial({ color: COLORS.orange });
  for (const x of [-0.95, 0.95]) {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(x, 0.1, 0);
    g.add(foot);
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.04), ventMat);
    vent.position.set(x, 1.0, 0.93);
    g.add(vent);
  }
  g.add(body, frame, panel, stripe, disc(1.7, COLORS.orange));
  g.userData.pulse = panel;
  return g;
}
function makePulseGate() {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.14, 10, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.78 }),
  );
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.045, 8, 28),
    new THREE.MeshBasicMaterial({ color: COLORS.pink, transparent: true, opacity: 0.68 }),
  );
  outer.position.y = 1.15;
  inner.position.y = 1.15;
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshStandardMaterial({ color: COLORS.pink, emissive: COLORS.pink, emissiveIntensity: 1.35, metalness: 0.65, roughness: 0.12 }),
  );
  core.position.y = 1.15;
  const supportMat = new THREE.MeshStandardMaterial({
    color: 0x10162b, metalness: 0.88, roughness: 0.2,
    emissive: COLORS.cyan, emissiveIntensity: 0.2,
  });
  const supportGeo = new THREE.BoxGeometry(0.22, 2.35, 0.22);
  const baseGeo = new THREE.CylinderGeometry(0.34, 0.42, 0.18, 8);
  for (const x of [-1.38, 1.38]) {
    const support = new THREE.Mesh(supportGeo, supportMat);
    support.position.set(x, 1.15, 0);
    g.add(support);
    const base = new THREE.Mesh(baseGeo, supportMat);
    base.position.set(x, 0.09, 0);
    g.add(base);
  }
  const topLink = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.12, 0.22),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan }),
  );
  topLink.position.y = 2.28;
  const sideCaps = new THREE.Group();
  for (const x of [-1.38, 1.38]) {
    const cap = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: COLORS.pink }),
    );
    cap.position.set(x, 2.18, 0);
    sideCaps.add(cap);
  }
  g.add(outer, inner, core, topLink, sideCaps, disc(1.45, COLORS.cyan));
  g.userData.ring = outer;
  g.userData.innerRing = inner;
  g.userData.pulse = core;
  return g;
}
export const OBSTACLE_TYPES = {
  pulseGate: {
    build: makePulseGate,
    requiredAction: "change",
    hitbox: { x: 1.65, y: 1.2, z: 1.15 },
    blocksAir: true,
    blocksGround: true,
    hitCenterY: 1.15,
    update(obj, time) {
      obj.rotation.y += 0.012;
      const pulse = 1 + Math.sin(time * 9) * 0.08;
      if (obj.userData.ring) obj.userData.ring.scale.setScalar(pulse);
      if (obj.userData.innerRing) obj.userData.innerRing.scale.setScalar(2 - pulse);
      if (obj.userData.pulse) obj.userData.pulse.scale.setScalar(1 + Math.sin(time * 12) * 0.12);
    },
  },

  barrier: {
    build: makeBarrier,
    requiredAction: "jump",
    hitbox: { x: 1.55, y: 1.25, z: 0.45 },
    blocksAir: true,
    blocksGround: false,
    hitCenterY: 1.25,
    update(obj, time) {
      obj.position.y = Math.sin(time * 8) * 0.04;
      if (obj.userData.pulse) obj.userData.pulse.material.opacity = 0.7 + Math.sin(time * 10) * 0.25;
    },
  },
  highLaser: {
    build: makeHighLaser,
    requiredAction: "slide",
    hitbox: { x: 1.55, y: 0.7, z: 0.45 },
    blocksAir: false,
    blocksGround: true,
    requiresSlide: true,
    hitCenterY: 2.45,
    update(obj, time) {
      obj.position.y = Math.sin(time * 5) * 0.03;
      if (obj.userData.pulse) obj.userData.pulse.material.opacity = 0.55 + Math.sin(time * 12) * 0.4;
    },
  },
  mine: {
    build: makeMine,
    requiredAction: "change",
    hitbox: { x: 1.45, y: 1.25, z: 1.2 },
    blocksAir: false,
    blocksGround: true,
    update(obj, time, dt) {
      obj.rotation.y += dt * 1.5;
      if (obj.userData.ring) {
        obj.userData.ring.rotation.z += dt * 1.8;
        obj.userData.ring.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
      }
      if (obj.userData.pulse) obj.userData.pulse.scale.setScalar(1 + Math.sin(time * 10) * 0.05);
    },
  },
  block: {
    build: makeBlock,
    requiredAction: "change",
    hitbox: { x: 1.5, y: 1.6, z: 0.9 },
    blocksAir: false,
    blocksGround: true,
    update(obj, time) {
      obj.rotation.y = Math.sin(time * 2) * 0.04;
      if (obj.userData.pulse) obj.userData.pulse.material.opacity = 0.55 + Math.sin(time * 9) * 0.35;
    },
  },
};
