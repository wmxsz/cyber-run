import * as THREE from "three";

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.pool = [];
    this.materials = new Map();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.burstGeometry = new THREE.IcosahedronGeometry(0.16, 0);
    this.exhaustGeometry = new THREE.TetrahedronGeometry(0.13, 0);
    this.maxItems = 160;
  }

  _material(color) {
    let material = this.materials.get(color);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ color });
      this.materials.set(color, material);
    }
    return material;
  }

  _acquire(kind, color) {
    const p = this.pool.pop() || new THREE.Mesh();
    p.geometry = kind === "exhaust" ? this.exhaustGeometry : this.burstGeometry;
    p.material = this._material(color);
    p.visible = true;
    p.scale.setScalar(1);
    this.group.add(p);
    this.items.push(p);
    return p;
  }

  _releaseAt(index) {
    const p = this.items[index];
    p.visible = false;
    this.pool.push(p);
    this.items.splice(index, 1);
  }

  burst(x, y, z, color = 0xff0077, count = 25) {
    const allowed = Math.max(0, this.maxItems - this.items.length);
    count = Math.min(count, allowed);
    for (let i = 0; i < count; i++) {
      const p = this._acquire("burst", color);
      p.position.set(x, y, z);
      p.scale.setScalar(1);
      p.userData.life = 1;
      p.userData.decay = 0.025 + Math.random() * 0.02;
      p.userData.vx = (Math.random() - 0.5) * 0.45;
      p.userData.vy = Math.random() * 0.4 + 0.1;
      p.userData.vz = (Math.random() - 0.5) * 0.45;
      p.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      p.userData.rx = (Math.random() - 0.5) * 0.16;
      p.userData.ry = (Math.random() - 0.5) * 0.2;
    }
  }

  exhaust(x, y, z, speed) {
    if (this.items.length >= this.maxItems) return;
    const p = this._acquire("exhaust", 0x00f0ff);
    p.position.set(x + (Math.random() - 0.5) * 0.4, y, z + 1.2);
    p.scale.set(1, 1, 1);
    p.userData.life = 0.7;
    p.userData.decay = 0.05;
    p.userData.vx = (Math.random() - 0.5) * 0.05;
    p.userData.vy = (Math.random() - 0.5) * 0.05;
    p.userData.vz = speed * 0.8 + Math.random() * 0.2;
  }

  clear() {
    for (const p of this.items) {
      p.visible = false;
      this.pool.push(p);
    }
    this.items.length = 0;
  }

  update(dt = 1 / 60) {
    const frameScale = dt * 60;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.position.x += p.userData.vx * frameScale;
      p.position.y += p.userData.vy * frameScale;
      p.position.z += p.userData.vz * frameScale;
      p.rotation.x += (p.userData.rx || 0) * frameScale;
      p.rotation.y += (p.userData.ry || 0) * frameScale;
      p.userData.life -= p.userData.decay * frameScale;
      p.scale.setScalar(Math.max(p.userData.life, 0.01));
      if (p.userData.life <= 0) this._releaseAt(i);
    }
  }

  dispose() {
    for (const p of this.items) p.visible = false;
    for (const p of this.pool) p.visible = false;
    this.items.length = 0;
    this.group.removeFromParent();
    this.burstGeometry.dispose();
    this.exhaustGeometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.group = null;
  }
}
