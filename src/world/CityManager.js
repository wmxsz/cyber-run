import * as THREE from "three";
import { COLORS } from "../config/gameConfig.js";

function buildingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#09071b";
  ctx.fillRect(0, 0, 256, 512);
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

export class CityManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.speedLines = null;
    this._build();
  }

  _build() {
    const tex = buildingTexture();
    const box = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 70; i++) {
      const left = Math.random() > 0.5;
      const x = (left ? -1 : 1) * (12 + Math.random() * 35);
      const z = -Math.random() * 480;
      const w = 8 + Math.random() * 12;
      const d = 8 + Math.random() * 12;
      const h = 25 + Math.random() * 70;
      const b = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.7 }));
      b.scale.set(w, h, d);
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      b.receiveShadow = true;
      this.scene.add(b);
      this.buildings.push(b);

      if (Math.random() > 0.4) {
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.6, 12, 4),
          new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? COLORS.cyan : COLORS.pink }),
        );
        spire.position.set(x, h + 6, z);
        this.scene.add(spire);
        this.buildings.push(spire);
      }
    }

    const sun = new THREE.Mesh(new THREE.CircleGeometry(45, 32), new THREE.MeshBasicMaterial({ color: 0xff0055, fog: false }));
    sun.position.set(0, 30, -320);
    this.scene.add(sun);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(55, 1.2, 16, 64),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, wireframe: true, fog: false }),
    );
    ring.position.set(0, 30, -315);
    ring.rotation.x = Math.PI / 4;
    this.scene.add(ring);

    const count = 260;
    const positions = new Float32Array(count * 6);
    const colors = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = Math.random() * 25 + 0.5;
      const z = -Math.random() * 400;
      const len = 4 + Math.random() * 8;
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
      geo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4 }),
    );
    this.scene.add(this.speedLines);
  }

  update(speed) {
    if (!this.speedLines) return;
    const positions = this.speedLines.geometry.attributes.position.array;
    for (let i = 2; i < positions.length; i += 6) {
      positions[i] += speed * 2.8;
      positions[i + 3] += speed * 2.8;
      if (positions[i] > 10) {
        const z = -380 - Math.random() * 40;
        positions[i] = z;
        positions[i + 3] = z + 8;
      }
    }
    this.speedLines.geometry.attributes.position.needsUpdate = true;
  }
}
