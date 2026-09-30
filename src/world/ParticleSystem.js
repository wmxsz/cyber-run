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
    this.streakGeometry = new THREE.BoxGeometry(0.055, 0.055, 1);
    this.shockwaveGeometry = new THREE.TorusGeometry(0.72, 0.045, 6, 24);
    this.flashGeometry = new THREE.OctahedronGeometry(0.42, 0);
    this.maxItems = 180;
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
    p.geometry =
      kind === "exhaust" ? this.exhaustGeometry
      : kind === "streak" ? this.streakGeometry
      : kind === "shockwave" ? this.shockwaveGeometry
      : kind === "flash" ? this.flashGeometry
      : this.burstGeometry;
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

  streak(x, y, z, color = 0x00f0ff, count = 6, length = 1.8) {
    const allowed = Math.min(count, this.maxItems - this.items.length);
    for (let i = 0; i < allowed; i++) {
      const p = this._acquire("streak", color);
      p.position.set(x + (Math.random() - 0.5) * 2.2, y + (Math.random() - 0.5) * 0.45, z + (Math.random() - 0.5) * 0.8);
      p.rotation.set(0, 0, 0);
      p.scale.set(0.7 + Math.random() * 0.8, 0.7 + Math.random() * 0.5, length * (0.65 + Math.random() * 0.7));
      p.userData.baseScaleZ = p.scale.z;
      p.userData.life = 0.34 + Math.random() * 0.12;
      p.userData.decay = 0.055;
      p.userData.vx = (Math.random() - 0.5) * 0.18;
      p.userData.vy = (Math.random() - 0.5) * 0.12;
      p.userData.vz = 0.55 + Math.random() * 0.5;
      p.userData.rx = 0;
      p.userData.ry = 0;
    }
  }

  flash(x, y, z, color = 0xffffff, size = 1.5) {
    if (this.items.length >= this.maxItems) return;
    const p = this._acquire("flash", color);
    p.position.set(x, y, z);
    p.rotation.set(0, 0, 0);
    p.scale.setScalar(size);
    p.userData.life = 0.16;
    p.userData.decay = 0.11;
    p.userData.vx = 0;
    p.userData.vy = 0;
    p.userData.vz = 0;
    p.userData.rx = 0;
    p.userData.ry = 0;
  }

  shockwave(x, y, z, color = 0x00f0ff, size = 2.2) {
    if (this.items.length >= this.maxItems) return;
    const p = this._acquire("shockwave", color);
    p.position.set(x, y, z);
    p.rotation.set(Math.PI / 2, 0, 0);
    p.scale.setScalar(0.15);
    p.userData.life = 1;
    p.userData.decay = 0.045;
    p.userData.vx = 0;
    p.userData.vy = 0;
    p.userData.vz = 0;
    p.userData.rx = 0;
    p.userData.ry = 0;
    p.userData.maxScale = size;
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
      if (p.geometry === this.flashGeometry) {
        const pulse = Math.max(p.userData.life, 0) * 1.8;
        p.scale.setScalar(pulse);
      } else if (p.geometry === this.shockwaveGeometry) {
        p.scale.setScalar((1 - p.userData.life) * p.userData.maxScale);
      } else if (p.geometry === this.streakGeometry) {
        p.scale.z = p.userData.baseScaleZ * Math.max(0.05, p.userData.life / 0.45);
        p.scale.x *= 0.985;
        p.scale.y *= 0.985;
      } else {
        p.scale.setScalar(Math.max(p.userData.life, 0.01));
      }
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
    this.streakGeometry.dispose();
    this.shockwaveGeometry.dispose();
    this.flashGeometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.group = null;
  }
}
