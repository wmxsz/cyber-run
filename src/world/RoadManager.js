import * as THREE from "three";
import { COLORS } from "../config/gameConfig.js";

export class RoadManager {
  constructor(scene) {
    this.scene = scene;
    this.track = null;
    this.laneStrips = [];
    this.edgeLights = [];
    this._phase = 0;
    this._surge = 0;
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
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.2, metalness: 0.8,
      emissive: 0x05020d, emissiveIntensity: 0.35,
    });
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

    for (const x of [-2, 2]) {
      for (let i = 0; i < 28; i++) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, 0.045, 5.5),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? COLORS.cyan : COLORS.violet,
            transparent: true, opacity: 0.72,
          }),
        );
        strip.position.set(x, 0.035, -i * 18 - 4);
        this.scene.add(strip);
        this.laneStrips.push(strip);
      }
    }

    for (const x of [-6.65, 6.65]) {
      for (let i = 0; i < 22; i++) {
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.28, 1.8),
          new THREE.MeshBasicMaterial({
            color: x < 0 ? COLORS.cyan : COLORS.pink,
            transparent: true, opacity: 0.85,
          }),
        );
        light.position.set(x, 0.18, -i * 22);
        this.scene.add(light);
        this.edgeLights.push(light);
      }
    }
  }

  update(speed, phase = this._phase) {
    this._phase = phase;
    const targetSurge = phase >= 4 ? 1 : phase >= 2 ? 0.65 : 0.25;
    this._surge += (targetSurge - this._surge) * 0.06;
    if (this.track?.material?.map) {
      this.track.material.map.offset.y -= speed * (0.015 + this._surge * 0.006);
    }
    const advance = speed * 60 * 0.016;
    const pulse = 0.55 + Math.sin(performance.now() * 0.004 + speed) * 0.2;
    const accent = phase >= 4 ? COLORS.yellow : phase >= 2 ? COLORS.pink : COLORS.cyan;
    const secondary = phase >= 4 ? COLORS.pink : COLORS.violet;
    const pulseColor = phase >= 4 ? COLORS.yellow : phase >= 2 ? COLORS.pink : COLORS.cyan;
    for (const strip of this.laneStrips) {
      strip.position.z += advance;
      strip.material.opacity = 0.55 + pulse * 0.28 + this._surge * 0.08;
      strip.scale.z = 1 + this._surge * 0.35;
      strip.material.color.setHex((this._phase >= 2 && strip.position.x < 0) ? accent : secondary);
      if (strip.position.z > 18) strip.position.z -= 28 * 18;
    }
    for (const light of this.edgeLights) {
      light.position.z += advance * 0.92;
      light.material.opacity = 0.62 + pulse * 0.3 + this._surge * 0.08;
      light.scale.z = 1 + this._surge * 0.28;
      light.material.color.setHex(light.position.x < 0 ? accent : secondary);
      if (light.position.z > 18) light.position.z -= 22 * 22;
    }
  }

  dispose() {
    this.track?.geometry.dispose();
    this.track?.material.dispose();
  }
}
