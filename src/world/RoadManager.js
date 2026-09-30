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
    this._lastAccent = null;
    this._lastSecondary = null;
    this._laneMaterials = new Map();
    this._edgeMaterials = new Map();
    this._build();
  }

  _material(cache, color, opacity) {
    const key = color.toString(16);
    let material = cache.get(key);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
      cache.set(key, material);
    }
    return material;
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
      rail.userData.cyberRunRoadRail = true;
      rail.rotation.x = Math.PI / 2;
      rail.position.set(x, 0.3, -240);
      this.scene.add(rail);
    }

    for (const x of [-2, 2]) {
      for (let i = 0; i < 28; i++) {
        const color = i % 2 ? COLORS.cyan : COLORS.violet;
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, 0.045, 5.5),
          this._material(this._laneMaterials, color, 0.72),
        );
        strip.position.set(x, 0.035, -i * 18 - 4);
        this.scene.add(strip);
        this.laneStrips.push(strip);
      }
    }

    for (const x of [-6.65, 6.65]) {
      const color = x < 0 ? COLORS.cyan : COLORS.pink;
      const material = this._material(this._edgeMaterials, color, 0.85);
      for (let i = 0; i < 22; i++) {
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.28, 1.8),
          material,
        );
        light.position.set(x, 0.18, -i * 22);
        this.scene.add(light);
        this.edgeLights.push(light);
      }
    }
    this._applyPhaseMaterials();
  }

  _applyPhaseMaterials() {
    const accent = this._phase >= 4 ? COLORS.yellow : this._phase >= 2 ? COLORS.pink : COLORS.cyan;
    const secondary = this._phase >= 4 ? COLORS.pink : COLORS.violet;
    if (accent === this._lastAccent && secondary === this._lastSecondary) return;
    this._lastAccent = accent;
    this._lastSecondary = secondary;

    const leftLaneMat = this._material(this._laneMaterials, this._phase >= 2 ? accent : secondary, 0.72);
    const rightLaneMat = this._material(this._laneMaterials, secondary, 0.72);
    for (const strip of this.laneStrips) {
      strip.material = strip.position.x < 0 ? leftLaneMat : rightLaneMat;
    }

    const leftEdgeMat = this._material(this._edgeMaterials, accent, 0.85);
    const rightEdgeMat = this._material(this._edgeMaterials, secondary, 0.85);
    for (const light of this.edgeLights) {
      light.material = light.position.x < 0 ? leftEdgeMat : rightEdgeMat;
    }
  }

  update(speed, phase = this._phase, dt = 1 / 60, elapsed = 0) {
    const phaseChanged = phase !== this._phase;
    this._phase = phase;
    const targetSurge = phase >= 4 ? 1 : phase >= 2 ? 0.65 : 0.25;
    this._surge += (targetSurge - this._surge) * (1 - Math.pow(0.94, dt * 60));
    if (phaseChanged) this._applyPhaseMaterials();

    if (this.track?.material?.map) {
      this.track.material.map.offset.y -= speed * (0.015 + this._surge * 0.006) * dt * 60;
    }

    const advance = speed * 60 * dt;
    const pulse = 0.55 + Math.sin(elapsed * 4 + speed) * 0.2;
    const laneOpacity = 0.55 + pulse * 0.28 + this._surge * 0.08;
    const edgeOpacity = 0.62 + pulse * 0.3 + this._surge * 0.08;
    const laneMaterials = new Set(this.laneStrips.map((strip) => strip.material));
    laneMaterials.forEach((material) => { material.opacity = laneOpacity; });
    const edgeMaterials = new Set(this.edgeLights.map((light) => light.material));
    edgeMaterials.forEach((material) => { material.opacity = edgeOpacity; });
    const laneScale = 1 + this._surge * 0.35;
    for (const strip of this.laneStrips) {
      strip.position.z += advance;
      strip.scale.z = laneScale;
      if (strip.position.z > 18) strip.position.z -= 28 * 18;
    }
    const edgeScale = 1 + this._surge * 0.28;
    for (const light of this.edgeLights) {
      light.position.z += advance * 0.92;
      light.scale.z = edgeScale;
      if (light.position.z > 18) light.position.z -= 22 * 22;
    }
  }

  dispose() {
    const nodes = [
      this.track,
      ...this.laneStrips,
      ...this.edgeLights,
      ...this.scene.children.filter((child) => child.userData?.cyberRunRoadRail),
    ];
    const geometries = new Set();
    const materials = new Set();
    for (const node of nodes) {
      if (!node) continue;
      if (node.geometry) geometries.add(node.geometry);
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((material) => material && materials.add(material));
      node.removeFromParent?.();
    }
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => {
      material.map?.dispose?.();
      material.dispose();
    });
    for (const material of this._laneMaterials.values()) material.dispose();
    for (const material of this._edgeMaterials.values()) material.dispose();
    this._laneMaterials.clear();
    this._edgeMaterials.clear();
    this.track = null;
    this.laneStrips = [];
    this.edgeLights = [];
  }
}
