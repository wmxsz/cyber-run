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
  const poleGeo = new THREE.CylinderGeometry(0.22, 0.22, 3.4, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.6 });
  for (const x of [-1.5, 1.5]) {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 1.7, 0);
    g.add(pole);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: COLORS.red }));
    beacon.position.set(x, 3.45, 0);
    g.add(beacon);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
  beam.position.y = 1.25;
  const core = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  core.position.y = 1.25;
  g.add(beam, core, disc(1.7, COLORS.red));
  return g;
}

function makeMine() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.82, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff5500, emissiveIntensity: 1.2 }),
  );
  core.position.y = 1.25;
  g.add(core);
  const spikeGeo = new THREE.ConeGeometry(0.2, 1, 6);
  const spikeMat = new THREE.MeshBasicMaterial({ color: COLORS.yellow });
  for (const [rx, ry] of [[0,0],[Math.PI,0],[0,Math.PI/2],[0,-Math.PI/2],[Math.PI/2,0],[-Math.PI/2,0]]) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.rotation.set(rx, ry, 0);
    spike.position.set(0, 1.25, 0);
    spike.translateY(0.75);
    g.add(spike);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: COLORS.pink }));
  ring.position.y = 1.25;
  g.add(ring, disc(1.55, COLORS.orange));
  g.userData.ring = ring;
  return g;
}

function makeBlock() {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(2.7, 3.2, 1.8);
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0x553300,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.35,
    }),
  );
  body.position.y = 1.6;
  const wire = new THREE.LineSegments( new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: COLORS.yellow }));
  wire.position.y = 1.6;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0.95 }),
  );
  sign.position.set(0, 1.6, 0.95);
  g.add(body, wire, sign, disc(1.7, COLORS.orange));
  return g;
}

export const OBSTACLE_TYPES = {
  barrier: {
    build: makeBarrier,
    requiredAction: "jump",
    hitbox: { x: 1.55, y: 1.25, z: 0.45 },
    blocksAir: true,
    blocksGround: false,
    hitCenterY: 1.25,
    update(obj, time) { obj.position.y = Math.sin(time * 8) * 0.04; },
  },
  mine: {
    build: makeMine,
    requiredAction: "change",
    hitbox: { x: 1.45, y: 1.25, z: 1.2 },
    blocksAir: false,
    blocksGround: true,
    update(obj, dt) {
      obj.rotation.y += dt * 1.5;
      if (obj.userData.ring) obj.userData.ring.rotation.z += dt * 1.8;
    },
  },
  block: {
    build: makeBlock,
    requiredAction: "change",
    hitbox: { x: 1.5, y: 1.6, z: 0.9 },
    blocksAir: false,
    blocksGround: true,
    update(obj, time) { obj.rotation.y = Math.sin(time * 2) * 0.04; },
  },
};
