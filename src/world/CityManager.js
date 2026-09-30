import * as THREE from "three";
import { COLORS } from "../config/gameConfig.js";

function buildingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#09071b"; ctx.fillRect(0, 0, 256, 512);
  const colors = ["#00f0ff", "#ff0077", "#ffe600", "#221133", "#110d29"];
  for (let y = 16; y < 500; y += 24) {
    for (let x = 16; x < 240; x += 20) {
      if (Math.random() > 0.4) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(x, y, 12, 14);
      }
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function hologramTexture(label, accent) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 256);
  ctx.strokeStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 18; ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.font = "900 42px Orbitron, monospace"; ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff"; ctx.fillText(label, 256, 112);
  ctx.font = "700 18px monospace"; ctx.fillStyle = accent;
  ctx.fillText("NEURAL // CITY NETWORK", 256, 154);
  ctx.fillText("LINK ESTABLISHED", 256, 185);
  return new THREE.CanvasTexture(canvas);
}

export class CityManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.holograms = [];
    this.drones = [];
    this.speedLines = null;
    this._phase = 0;
    this._build();
  }

  _build() {
    const tex = buildingTexture();
    const box = new THREE.BoxGeometry(1, 1, 1);
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
    const spireMats = {
      cyan: new THREE.MeshBasicMaterial({ color: COLORS.cyan }),
      pink: new THREE.MeshBasicMaterial({ color: COLORS.pink }),
    };
    for (let i = 0; i < 70; i++) {
      const left = Math.random() > 0.5;
      const x = (left ? -1 : 1) * (12 + Math.random() * 35);
      const z = -Math.random() * 480;
      const w = 8 + Math.random() * 12, d = 8 + Math.random() * 12, h = 25 + Math.random() * 70;
      const b = new THREE.Mesh(box, left ? buildingMats.left : buildingMats.right);
      b.scale.set(w, h, d); b.position.set(x, h / 2, z);
      b.castShadow = true; b.receiveShadow = true;
      this.scene.add(b); this.buildings.push(b);
      if (Math.random() > 0.4) {
        const spireColor = Math.random() > 0.5 ? "cyan" : "pink";
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.6, 12, 4),
          spireMats[spireColor],
        );
        spire.position.set(x, h + 6, z);
        this.scene.add(spire); this.buildings.push(spire);
      }
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

    for (let i = 0; i < 8; i++) {
      const drone = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.25, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x10152b, metalness: 0.9, roughness: 0.15 }),
      );
      drone.add(body);
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: i % 2 ? COLORS.pink : COLORS.cyan }),
      );
      light.position.y = -0.05; drone.add(light);
      drone.position.set((i % 2 ? 1 : -1) * (10 + Math.random() * 28), 8 + Math.random() * 28, -30 - i * 55);
      drone.userData.phase = Math.random() * Math.PI * 2;
      drone.userData.speed = 0.7 + Math.random() * 0.8;
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

  update(speed, phase = 0, dt = 1 / 60) {
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
    const t = performance.now() * 0.001;
    for (const panel of this.holograms) {
      panel.position.y = panel.userData.baseY + Math.sin(t * 2 + panel.userData.phase) * 0.12;
      panel.material.opacity = 0.55 + Math.sin(t * 4 + panel.userData.phase) * 0.15;
      panel.rotation.z = Math.sin(t * 1.4 + panel.userData.phase) * 0.015;
    }
    const droneBoost = 0.8 + Math.min(0.7, phase * 0.14);
    for (const drone of this.drones) {
      drone.position.z += speed * droneBoost * drone.userData.speed * dt * 60;
      const wave = Math.sin(t * (1.4 + phase * 0.12) + drone.userData.phase);
      drone.position.y += wave * 0.012 * dt * 60;
      drone.position.x += Math.cos(t * 0.7 + drone.userData.phase) * (0.012 + phase * 0.004) * dt * 60;
      if (drone.position.z > 15) {
        drone.position.z -= 470;
        drone.position.x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 28);
      }
      drone.rotation.z = wave * 0.08;
      drone.rotation.y = Math.cos(t * 1.1 + drone.userData.phase) * 0.06;
      const light = drone.children[1];
      if (light?.material) light.material.opacity = 0.65 + Math.sin(t * 5 + drone.userData.phase) * 0.25;
      if (phase >= 3) drone.scale.setScalar(1 + Math.sin(t * 3 + drone.userData.phase) * 0.035);
    }
    if (this.sunRing) {
      this.sunRing.rotation.z += (0.002 + speed * 0.0005 + phase * 0.0002) * dt * 60;
      this.sunRing.scale.setScalar(1 + Math.sin(t * 1.5) * (0.015 + phase * 0.003));
    }
  }
}
