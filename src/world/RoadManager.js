import * as THREE from "three";
import { COLORS } from "../config/gameConfig.js";

export class RoadManager {
  constructor(scene) {
    this.scene = scene;
    this.track = null;
    this._build();
  }

  _build() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#060414";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    ctx.strokeStyle = "#ff0077";
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 512); ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 40);

    const geo = new THREE.PlaneGeometry(14, 500);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, metalness: 0.8 });
    this.track = new THREE.Mesh(geo, mat);
    this.track.rotation.x = -Math.PI / 2;
    this.track.position.set(0, 0, -240);
    this.track.receiveShadow = true;
    this.scene.add(this.track);

    const railGeo = new THREE.CylinderGeometry(0.2, 0.2, 500, 8);
    for (const [x, color] of [[-7, COLORS.cyan], [7, COLORS.pink]]) {
      const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color }));
      rail.rotation.x = Math.PI / 2;
      rail.position.set(x, 0.3, -240);
      this.scene.add(rail);
    }
  }

  update(speed) {
    if (this.track?.material?.map) {
      this.track.material.map.offset.y -= speed * 0.015;
    }
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj !== this.track) return;
    });
    this.track?.geometry.dispose();
    this.track?.material.dispose();
  }
}
