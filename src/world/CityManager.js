import * as THREE from "three";
import { COLORS } from "../config/gameConfig.js";

function buildingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 512, 1024);
  g.addColorStop(0, "#050412");
  g.addColorStop(0.48, "#0b0920");
  g.addColorStop(1, "#02030d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 1024);

  // Dense architectural paneling: dark structure first, then sparse lit windows.
  ctx.strokeStyle = "rgba(95,120,180,.22)";
  ctx.lineWidth = 2;
  for (let x = 10; x < 512; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke();
  }
  for (let y = 16; y < 1024; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  const neon = ["#00f0ff", "#ff0077", "#ffe600", "#8a2be2"];
  let seed = 17;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let y = 28; y < 990; y += 48) {
    for (let x = 22; x < 500; x += 34) {
      if (rand() > 0.52) {
        const accent = neon[Math.floor(rand() * neon.length)];
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.16 + rand() * 0.38;
        ctx.fillRect(x, y, 17, 23);
        if (rand() > 0.82) {
          ctx.globalAlpha = 0.75;
          ctx.fillRect(x, y, 17, 2);
        }
      }
    }
  }
  ctx.globalAlpha = 1;

  // Large facade seams and occasional vertical light spines.
  for (const x of [78, 256, 434]) {
    ctx.fillStyle = "#00f0ff";
    ctx.globalAlpha = 0.18;
    ctx.fillRect(x, 0, 3, 1024);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ff0077";
  ctx.globalAlpha = 0.22;
  ctx.fillRect(344, 0, 4, 1024);
  ctx.globalAlpha = 1;

  // Sparse advertisement bands prevent the skyline from reading as plain boxes.
  for (const y of [238, 598, 862]) {
    ctx.fillStyle = rand() > 0.5 ? "#00f0ff" : "#ff0077";
    ctx.globalAlpha = 0.22;
    ctx.fillRect(0, y, 512, 8);
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function hologramTexture(label, accent) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 256);
  ctx.strokeStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 18; ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.font = "900 76px Orbitron, monospace"; ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff"; ctx.fillText(label, 512, 222);
  ctx.font = "700 30px monospace"; ctx.fillStyle = accent;
  ctx.fillText("NEURAL // CITY NETWORK", 512, 310);
  ctx.fillText("LINK ESTABLISHED", 512, 360);
  ctx.font = "700 18px monospace";
  ctx.globalAlpha = 0.72;
  ctx.fillText("NODE 07 // CYBER-RUN", 512, 406);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.32;
  for (let y = 22; y < 512; y += 16) {
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(1004, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < 18; i++) {
    const x = 42 + i * 51;
    ctx.fillRect(x, 444 + (i % 3) * 9, 24 + (i % 4) * 7, 3);
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

export class CityManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.holograms = [];
    this.drones = [];
    this.speedLines = null;
    this.cityGuides = [];
    this._phase = 0;
    this._build();
  }

  _build() {
    const tex = buildingTexture();
    // City towers use a small set of low-poly silhouettes instead of a wall of identical boxes.
    // Each archetype stays instanced so the skyline gains shape variety without multiplying draw calls.
    const towerGeos = {
      block: new THREE.BoxGeometry(1, 1, 1),
      hex: new THREE.CylinderGeometry(0.58, 0.7, 1, 6),
      crown: new THREE.ConeGeometry(0.62, 1, 4),
    };
    const buildingMats = {
      left: new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.3, metalness: 0.7,
        emissive: COLORS.cyan, emissiveIntensity: 0.045,
      }),
      right: new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.3, metalness: 0.7,
        emissive: COLORS.pink, emissiveIntensity: 0.045,
      }),
    };
    const buildingInstances = {};
    for (const side of ["left", "right"]) {
      for (const archetype of Object.keys(towerGeos)) {
        buildingInstances[side + archetype] = new THREE.InstancedMesh(
          towerGeos[archetype],
          buildingMats[side],
          70,
        );
        buildingInstances[side + archetype].count = 0;
        buildingInstances[side + archetype].castShadow = false;
        buildingInstances[side + archetype].receiveShadow = false;
      }
    }

    // Rooftop mechanical crowns add a readable second layer to the skyline.
    const crownGeo = new THREE.BoxGeometry(1, 1, 1);
    const crownMats = {
      left: new THREE.MeshBasicMaterial({ color: COLORS.cyan }),
      right: new THREE.MeshBasicMaterial({ color: COLORS.pink }),
    };
    const rooftopCoreGeo = new THREE.OctahedronGeometry(0.42, 0);
    const rooftopCoreMats = {
      left: new THREE.MeshBasicMaterial({ color: COLORS.yellow }),
      right: new THREE.MeshBasicMaterial({ color: COLORS.yellow }),
    };
    const rooftopCrests = {
      left: new THREE.InstancedMesh(crownGeo, crownMats.left, 36),
      right: new THREE.InstancedMesh(crownGeo, crownMats.right, 36),
    };
    const antennaGeo = new THREE.CylinderGeometry(0.035, 0.08, 1, 6);
    const antennaMats = {
      left: new THREE.MeshBasicMaterial({ color: COLORS.cyan }),
      right: new THREE.MeshBasicMaterial({ color: COLORS.pink }),
    };
    const rooftopAntennas = {
      left: new THREE.InstancedMesh(antennaGeo, antennaMats.left, 36),
      right: new THREE.InstancedMesh(antennaGeo, antennaMats.right, 36),
    };
    const rooftopCores = {
      left: new THREE.InstancedMesh(rooftopCoreGeo, rooftopCoreMats.left, 36),
      right: new THREE.InstancedMesh(rooftopCoreGeo, rooftopCoreMats.right, 36),
    };
    const dummy = new THREE.Object3D();
    const buildingCounts = { leftblock: 0, lefthex: 0, leftcrown: 0, rightblock: 0, righthex: 0, rightcrown: 0 };
    const towerAnchors = [];
    let leftCrestCount = 0;
    let rightCrestCount = 0;

    for (let i = 0; i < 70; i++) {
      const left = Math.random() > 0.5;
      const side = left ? "left" : "right";
      const x = (left ? -1 : 1) * (12 + Math.random() * 35);
      const z = -Math.random() * 480;
      const w = 7 + Math.random() * 13;
      const d = 7 + Math.random() * 13;
      const h = 25 + Math.random() * 70;
      towerAnchors.push({ x, z, h, w, d, side, archetype: null });
      const archetypes = ["block", "hex", "crown"];
      const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
      towerAnchors[towerAnchors.length - 1].archetype = archetype;
      const mesh = buildingInstances[side + archetype];
      const key = side + archetype;
      const index = buildingCounts[key]++;

      dummy.position.set(x, h / 2, z);
      dummy.rotation.set(0, archetype === "hex" ? Math.random() * Math.PI : Math.PI / 4, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);

      if (Math.random() > 0.48) {
        const crest = left ? rooftopCrests.left : rooftopCrests.right;
        const antenna = left ? rooftopAntennas.left : rooftopAntennas.right;
        const crestIndex = left ? leftCrestCount++ : rightCrestCount++;

        dummy.position.set(x, h + 0.7, z);
        dummy.rotation.set(0, Math.PI / 4, 0);
        dummy.scale.set(Math.min(w * 0.72, 8), 1.4, Math.min(d * 0.72, 8));
        dummy.updateMatrix();
        crest.setMatrixAt(crestIndex, dummy.matrix);

        const coreY = h + 1.35;
        dummy.position.set(x, coreY, z);
        dummy.rotation.set(0, Math.PI / 4, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        (left ? rooftopCores.left : rooftopCores.right).setMatrixAt(crestIndex, dummy.matrix);

        dummy.position.set(x, h + 1.8 + Math.random() * 2.5, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 3.2 + Math.random() * 2.5, 1);
        dummy.updateMatrix();
        antenna.setMatrixAt(crestIndex, dummy.matrix);
      }
    }

    for (const [key, mesh] of Object.entries(buildingInstances)) {
      mesh.count = buildingCounts[key];
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.buildings.push(mesh);
    }
    // Facade detailing follows the actual tower silhouette:
    // box towers get vertical spines/bands; hex towers get low-poly wrap rings;
    // crown towers keep detailing below the taper so nothing floats outside the mesh.
    const facadeRailGeo = new THREE.BoxGeometry(0.11, 1, 0.11);
    const facadeRails = {
      left: new THREE.InstancedMesh(facadeRailGeo, new THREE.MeshBasicMaterial({ color: COLORS.cyan }), 70),
      right: new THREE.InstancedMesh(facadeRailGeo, new THREE.MeshBasicMaterial({ color: COLORS.pink }), 70),
    };
    const railCounts = { left: 0, right: 0 };
    for (const anchor of towerAnchors) {
      if (anchor.archetype !== "block") continue;
      const side = anchor.side;
      const index = railCounts[side]++;
      dummy.position.set(
        anchor.x - (side === "left" ? -1 : 1) * anchor.w * 0.22,
        anchor.h * 0.5,
        anchor.z + anchor.d * 0.5 + 0.08,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, anchor.h * 0.86, 1);
      dummy.updateMatrix();
      facadeRails[side].setMatrixAt(index, dummy.matrix);
    }
    for (const side of ["left", "right"]) {
      facadeRails[side].count = railCounts[side];
      facadeRails[side].instanceMatrix.needsUpdate = true;
      this.scene.add(facadeRails[side]);
      this.buildings.push(facadeRails[side]);
    }

    const bandGeo = new THREE.BoxGeometry(1, 0.08, 0.08);
    const facadeBands = {
      left: new THREE.InstancedMesh(bandGeo, new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.72 }), 140),
      right: new THREE.InstancedMesh(bandGeo, new THREE.MeshBasicMaterial({ color: COLORS.pink, transparent: true, opacity: 0.72 }), 140),
    };
    const bandCounts = { left: 0, right: 0 };
    for (const anchor of towerAnchors) {
      if (anchor.archetype !== "block") continue;
      const bandTotal = anchor.h > 62 ? 3 : 2;
      for (let b = 1; b <= bandTotal; b++) {
        const index = bandCounts[anchor.side]++;
        dummy.position.set(
          anchor.x,
          (anchor.h / (bandTotal + 1)) * b,
          anchor.z + anchor.d * 0.5 + 0.11,
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(Math.min(anchor.w * 0.82, 10), 1, 1);
        dummy.updateMatrix();
        facadeBands[anchor.side].setMatrixAt(index, dummy.matrix);
      }
    }
    for (const side of ["left", "right"]) {
      facadeBands[side].count = bandCounts[side];
      facadeBands[side].instanceMatrix.needsUpdate = true;
      this.scene.add(facadeBands[side]);
      this.buildings.push(facadeBands[side]);
    }

    const wrapRingGeo = new THREE.TorusGeometry(1, 0.045, 6, 12);
    const wrapRings = {
      left: new THREE.InstancedMesh(wrapRingGeo, new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.66 }), 120),
      right: new THREE.InstancedMesh(wrapRingGeo, new THREE.MeshBasicMaterial({ color: COLORS.pink, transparent: true, opacity: 0.66 }), 120),
    };
    const wrapCounts = { left: 0, right: 0 };
    for (const anchor of towerAnchors) {
      if (anchor.archetype === "block") continue;
      const levels = anchor.archetype === "hex" ? 2 : 2;
      for (let b = 1; b <= levels; b++) {
        const ratio = b / (levels + 1);
        const index = wrapCounts[anchor.side]++;
        const taper = anchor.archetype === "crown" ? (1 - ratio * 0.46) : 1;
        dummy.position.set(anchor.x, anchor.h * ratio, anchor.z);
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.scale.set(
          Math.max(1.2, anchor.w * 0.46 * taper),
          Math.max(1.2, anchor.d * 0.46 * taper),
          1,
        );
        dummy.updateMatrix();
        wrapRings[anchor.side].setMatrixAt(index, dummy.matrix);
      }
    }
    for (const side of ["left", "right"]) {
      wrapRings[side].count = wrapCounts[side];
      wrapRings[side].instanceMatrix.needsUpdate = true;
      this.scene.add(wrapRings[side]);
      this.buildings.push(wrapRings[side]);
    }

    for (const side of ["left", "right"]) {
      rooftopCrests[side].count = side === "left" ? leftCrestCount : rightCrestCount;
      rooftopCrests[side].instanceMatrix.needsUpdate = true;
      rooftopAntennas[side].count = side === "left" ? leftCrestCount : rightCrestCount;
      rooftopAntennas[side].instanceMatrix.needsUpdate = true;
      rooftopCores[side].count = side === "left" ? leftCrestCount : rightCrestCount;
      rooftopCores[side].instanceMatrix.needsUpdate = true;
      this.scene.add(rooftopCrests[side], rooftopAntennas[side], rooftopCores[side]);
      this.buildings.push(rooftopCrests[side], rooftopAntennas[side], rooftopCores[side]);
    }

    // Spires are anchored to real tower coordinates so skyline accents never float.
    const spireGeo = new THREE.CylinderGeometry(0.1, 0.6, 12, 4);
    const spireMats = {
      cyan: new THREE.MeshBasicMaterial({ color: COLORS.cyan }),
      pink: new THREE.MeshBasicMaterial({ color: COLORS.pink }),
    };
    for (const anchor of towerAnchors) {
      if (Math.random() <= 0.68) continue;
      const spireColor = Math.random() > 0.5 ? "cyan" : "pink";
      const spire = new THREE.Mesh(spireGeo, spireMats[spireColor]);
      spire.position.set(anchor.x, anchor.h + 6, anchor.z);
      const base = Math.min(anchor.w, anchor.d);
      spire.scale.setScalar(Math.min(1.5, Math.max(0.65, base * 0.09)));
      spire.castShadow = false;
      spire.receiveShadow = false;
      this.scene.add(spire);
      this.buildings.push(spire);
    }

    const signs = [
      ["NOVA", COLORS.cyan], ["SYNTH", COLORS.pink], ["AETHER", COLORS.yellow],
      ["QUANTA", COLORS.green], ["NEXUS", COLORS.cyan], ["VOID", COLORS.pink],
    ];
    signs.forEach(([label, color], i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const panelMaterial = new THREE.MeshBasicMaterial({
        map: hologramTexture(label, "#" + color.toString(16).padStart(6, "0")),
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), panelMaterial);
      panel.position.set(side * (15 + (i % 3) * 4), 10 + (i % 3) * 5, -70 - i * 62);
      panel.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2;
      panel.userData.baseY = panel.position.y; panel.userData.phase = i * 0.9;
      this.scene.add(panel); this.holograms.push(panel);
    });

    // Elevated cyber-infrastructure: suspended conduits and maintenance pylons break up the skyline
    // while remaining instanced, so the extra visual density does not become a draw-call explosion.
    const pylonGeo = new THREE.CylinderGeometry(0.12, 0.2, 12, 6);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x11162b, metalness: 0.9, roughness: 0.2,
      emissive: COLORS.cyan, emissiveIntensity: 0.08,
    });
    const pylonMesh = new THREE.InstancedMesh(pylonGeo, pylonMat, 18);
    const conduitGeo = new THREE.BoxGeometry(1, 0.16, 0.16);
    const conduitMat = new THREE.MeshBasicMaterial({ color: COLORS.pink });
    const conduitMesh = new THREE.InstancedMesh(conduitGeo, conduitMat, 9);
    let pc = 0, cc = 0;
    for (let i = 0; i < 9; i++) {
      const z = -35 - i * 48;
      const side = i % 2 ? 1 : -1;
      for (const x of [side * 10.5, side * 17.5]) {
        dummy.position.set(x, 6 + (i % 3) * 2, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.scale.y = 1 + (i % 3) * 0.18;
        dummy.updateMatrix();
        pylonMesh.setMatrixAt(pc++, dummy.matrix);
      }
      dummy.position.set(0, 12 + (i % 2) * 2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(28 + (i % 3) * 3, 1, 1);
      dummy.updateMatrix();
      conduitMesh.setMatrixAt(cc++, dummy.matrix);
    }
    pylonMesh.count = pc;
    conduitMesh.count = cc;
    pylonMesh.instanceMatrix.needsUpdate = true;
    conduitMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(pylonMesh, conduitMesh);
    this.buildings.push(pylonMesh, conduitMesh);

    // Animated guide strips make the elevated infrastructure feel powered rather than static.
    const guideGeo = new THREE.BoxGeometry(0.055, 0.055, 10);
    const guideMats = [
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.7 }),
      new THREE.MeshBasicMaterial({ color: COLORS.pink, transparent: true, opacity: 0.7 }),
    ];
    this.cityGuides = [];
    for (let i = 0; i < 12; i++) {
      const guide = new THREE.Mesh(guideGeo, guideMats[i % 2]);
      guide.position.set((i % 2 ? 1 : -1) * (9.5 + (i % 3) * 3), 5.4 + (i % 4) * 0.65, -28 - i * 34);
      guide.userData.phase = i * 0.7;
      this.scene.add(guide);
      this.cityGuides.push(guide);
      this.buildings.push(guide);
    }

    // A small set of drone silhouettes prevents the skyline traffic from looking cloned.
    const droneBodyGeos = [
      new THREE.BoxGeometry(1.5, 0.25, 0.7),
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.CylinderGeometry(0.58, 0.72, 1.5, 6),
    ];
    const droneNoseGeo = new THREE.ConeGeometry(0.24, 0.65, 4);
    const droneWingGeos = [
      new THREE.BoxGeometry(2.25, 0.08, 0.42),
      new THREE.BoxGeometry(2.5, 0.08, 0.42),
      new THREE.BoxGeometry(2.25, 0.08, 0.55),
    ];
    const droneLightGeo = new THREE.BoxGeometry(1.2, 0.08, 0.08);
    const droneCoreGeo = new THREE.IcosahedronGeometry(0.12, 0);
    const droneRearGeo = new THREE.BoxGeometry(0.8, 0.06, 0.16);
    const droneEngineRingGeos = {
      wide: new THREE.TorusGeometry(0.38, 0.035, 6, 16),
      narrow: new THREE.TorusGeometry(0.32, 0.035, 6, 16),
    };
    const droneBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0b1022, metalness: 0.92, roughness: 0.16, flatShading: true,
    });
    const droneGlowMats = {
      cyan: new THREE.MeshBasicMaterial({ color: COLORS.cyan }),
      pink: new THREE.MeshBasicMaterial({ color: COLORS.pink }),
    };
    for (let i = 0; i < 8; i++) {
      const drone = new THREE.Group();
      const variant = i % droneBodyGeos.length;
      const accent = i % 2 ? "pink" : "cyan";
      const body = new THREE.Mesh(droneBodyGeos[variant], droneBodyMat);
      if (variant === 2) body.rotation.z = Math.PI / 2;
      body.castShadow = false;
      drone.add(body);

      const nose = new THREE.Mesh(droneNoseGeo, droneBodyMat);
      nose.rotation.x = -Math.PI / 2;
      nose.position.z = -0.55;
      drone.add(nose);

      const wing = new THREE.Mesh(droneWingGeos[variant], droneBodyMat);
      wing.rotation.z = variant === 1 ? Math.PI / 6 : 0;
      wing.position.y = 0.01;
      drone.add(wing);

      const glowMat = droneGlowMats[accent];
      const light = new THREE.Mesh(droneLightGeo, glowMat);
      light.position.y = -0.05;
      drone.add(light);

      const core = new THREE.Mesh(droneCoreGeo, glowMat);
      core.position.set(0, -0.13, 0.18);
      drone.add(core);

      const rear = new THREE.Mesh(droneRearGeo, glowMat);
      rear.position.z = 0.48;
      drone.add(rear);

      if (variant !== 0) {
        const engineRing = new THREE.Mesh(
          droneEngineRingGeos[variant === 1 ? "wide" : "narrow"],
          glowMat,
        );
        engineRing.rotation.x = Math.PI / 2;
        engineRing.position.z = 0.42;
        drone.add(engineRing);
      }

      drone.position.set((i % 2 ? 1 : -1) * (10 + Math.random() * 28), 8 + Math.random() * 28, -30 - i * 55);
      drone.userData.phase = Math.random() * Math.PI * 2;
      drone.userData.speed = 0.7 + Math.random() * 0.8;
      drone.userData.baseX = drone.position.x;
      drone.userData.baseY = drone.position.y;
      drone.userData.variant = variant;
      drone.userData.light = light;
      this.scene.add(drone); this.drones.push(drone);
    }

    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(45, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0055, fog: false }),
    );
    sun.position.set(0, 30, -320); this.scene.add(sun);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(55, 1.2, 16, 64),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, wireframe: true, fog: false }),
    );
    ring.position.set(0, 30, -315); ring.rotation.x = Math.PI / 4;
    this.scene.add(ring); this.sunRing = ring;

    const count = 260;
    const positions = new Float32Array(count * 6), colors = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 50, y = Math.random() * 25 + 0.5, z = -Math.random() * 400, len = 4 + Math.random() * 8;
      const a = i * 6;
      positions[a] = x; positions[a + 1] = y; positions[a + 2] = z;
      positions[a + 3] = x; positions[a + 4] = y; positions[a + 5] = z + len;
      const cyan = Math.random() > 0.5;
      for (let p = 0; p < 2; p++) {
        colors[a + p * 3] = cyan ? 0 : 1;
        colors[a + p * 3 + 1] = cyan ? 0.94 : 0;
        colors[a + p * 3 + 2] = cyan ? 1 : 0.47;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.speedLines = new THREE.LineSegments(
      geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4 }),
    );
    this.scene.add(this.speedLines);
  }

  dispose() {
    const nodes = [
      ...this.buildings,
      ...this.holograms,
      ...this.drones,
      this.sunRing,
      this.speedLines,
    ];
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    for (const node of nodes) {
      if (!node) continue;
      node.traverse?.((child) => {
        if (!child.isMesh && !child.isLineSegments) return;
        if (child.geometry) geometries.add(child.geometry);
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of mats) {
          if (!material) continue;
          materials.add(material);
          if (material.map) textures.add(material.map);
        }
      });
      node.removeFromParent?.();
    }
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    this.buildings = [];
    this.holograms = [];
    this.drones = [];
    this.sunRing = null;
    this.speedLines = null;
  }

  update(speed, phase = 0, dt = 1 / 60, elapsed = performance.now() * 0.001) {
    this._phase = phase;
    const positions = this.speedLines?.geometry.attributes.position.array;
    if (positions) {
      for (let i = 2; i < positions.length; i += 6) {
        const advance = speed * 2.8 * dt * 60;
        positions[i] += advance; positions[i + 3] += advance;
        if (positions[i] > 10) {
          const z = -380 - Math.random() * 40;
          positions[i] = z; positions[i + 3] = z + 8;
        }
      }
      this.speedLines.geometry.attributes.position.needsUpdate = true;
      this.speedLines.material.opacity = 0.32 + Math.min(0.24, phase * 0.045) + Math.min(0.12, speed * 0.03);
      this.speedLines.scale.z = 1 + Math.min(0.55, speed * 0.08 + phase * 0.05);
    }
    const t = elapsed;
    for (const panel of this.holograms) {
      panel.position.y = panel.userData.baseY + Math.sin(t * 2 + panel.userData.phase) * 0.12;
      panel.material.opacity = 0.55 + Math.sin(t * 4 + panel.userData.phase) * 0.15;
      panel.rotation.z = Math.sin(t * 1.4 + panel.userData.phase) * 0.015;
    }
    if (this.cityGuides) {
      for (const guide of this.cityGuides) {
        const pulse = 0.52 + Math.sin(t * 5 + guide.userData.phase) * 0.22;
        guide.material.opacity = pulse + Math.min(0.16, phase * 0.025);
        guide.scale.z = 0.72 + Math.min(0.38, speed * 0.035);
      }
    }
    const droneBoost = 0.8 + Math.min(0.7, phase * 0.14);
    for (const drone of this.drones) {
      drone.position.z += speed * droneBoost * drone.userData.speed * dt * 60;
      const wave = Math.sin(t * (1.4 + phase * 0.12) + drone.userData.phase);
      drone.position.y = drone.userData.baseY + wave * 0.7;
      drone.position.x = drone.userData.baseX + Math.cos(t * 0.7 + drone.userData.phase) * (0.7 + phase * 0.22);
      if (drone.position.z > 15) {
        drone.position.z -= 470;
        drone.position.x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 28);
        drone.userData.baseX = drone.position.x;
      }
      drone.rotation.z = wave * 0.08;
      drone.rotation.y = Math.cos(t * 1.1 + drone.userData.phase) * 0.06;
      const light = drone.userData.light;
      if (light) {
        const pulse = 1 + Math.sin(t * 5 + drone.userData.phase) * 0.16;
        light.scale.x = pulse;
      }
      if (phase >= 3) drone.scale.setScalar(1 + Math.sin(t * 3 + drone.userData.phase) * 0.035);
    }
    if (this.sunRing) {
      this.sunRing.rotation.z += (0.002 + speed * 0.0005 + phase * 0.0002) * dt * 60;
      this.sunRing.scale.setScalar(1 + Math.sin(t * 1.5) * (0.015 + phase * 0.003));
    }
  }
}
