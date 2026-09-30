import * as THREE from "three";

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.pool = [];
    this.materials = new Map();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.burstGeometry = new THREE.TetrahedronGeometry(0.11, 0);
    this.exhaustGeometry = new THREE.ConeGeometry(0.075, 0.24, 6, 1, true);
    this.streakGeometry = new THREE.CylinderGeometry(0.018, 0.006, 1, 8, 1, true);
    this.shockwaveGeometry = new THREE.TorusGeometry(0.72, 0.045, 6, 24);
    this.flashGeometry = new THREE.SphereGeometry(0.26, 8, 6);
    this.maxItems = 180;
    this.kindLimits = { burst: 90, exhaust: 42, streak: 28, shockwave: 8, flash: 6 };
    this.kindCounts = { burst: 0, exhaust: 0, streak: 0, shockwave: 0, flash: 0 };
  }

  _material(color) {
    let material = this.materials.get(color);
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.materials.set(color, material);
    }
    return material;
  }

  _acquire(kind, color) {
    if ((this.kindCounts[kind] || 0) >= (this.kindLimits[kind] || this.maxItems)) return null;
    const p = this.pool.pop() || new THREE.Mesh();
    p.geometry =
      kind === "exhaust" ? this.exhaustGeometry
      : kind === "streak" ? this.streakGeometry
      : kind === "shockwave" ? this.shockwaveGeometry
      : kind === "flash" ? this.flashGeometry
      : this.burstGeometry;
    p.material = this._material(color);
    p.position.set(0, 0, 0);
    p.rotation.set(0, 0, 0);
    p.scale.set(1, 1, 1);
    p.userData.life = 0;
    p.userData.decay = 0;
    p.userData.vx = 0;
    p.userData.vy = 0;
    p.userData.vz = 0;
    p.userData.rx = 0;
    p.userData.ry = 0;
    p.userData.baseScale = 1;
    p.userData.baseScaleY = 1;
    p.userData.maxScale = 1;
    p.visible = true;
    p.scale.setScalar(1);
    this.group.add(p);
    this.items.push(p);
    this.kindCounts[kind] = (this.kindCounts[kind] || 0) + 1;
    p.userData.kind = kind;
    return p;
  }

  _releaseAt(index) {
    const p = this.items[index];
    p.visible = false;
    p.userData.life = 0;
    if (p.userData.kind) this.kindCounts[p.userData.kind] = Math.max(0, (this.kindCounts[p.userData.kind] || 1) - 1);
    p.userData.kind = null;
    p.userData.vx = 0;
    p.userData.vy = 0;
    p.userData.vz = 0;
    p.scale.set(1, 1, 1);
    this.pool.push(p);
    this.items.splice(index, 1);
  }

  burst(x, y, z, color = 0xff0077, count = 25) {
    const allowed = Math.max(0, this.maxItems - this.items.length);
    count = Math.min(count, allowed);
    for (let i = 0; i < count; i++) {
      const p = this._acquire("burst", color);
      if (!p) break;
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
      if (!p) break;
      p.position.set(x + (Math.random() - 0.5) * 2.2, y + (Math.random() - 0.5) * 0.45, z + (Math.random() - 0.5) * 0.8);
      p.rotation.set(Math.PI / 2, 0, 0);
      p.scale.set(0.9 + Math.random() * 0.45, length * (0.65 + Math.random() * 0.7), 0.9 + Math.random() * 0.3);
      p.userData.baseScaleY = p.scale.y;
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
    if (!p) return;
    p.position.set(x, y, z);
    p.rotation.set(0, 0, 0);
    p.scale.setScalar(size);
    p.userData.baseScale = size;
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
    if (!p) return;
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

  footTrail(x, y, z, speed, side = 0, boosting = false) {
    if (this.items.length >= this.maxItems) return;
    const p = this._acquire("exhaust", boosting ? 0xff2bd6 : 0x00f0ff);
    if (!p) return;
    const laneOffset = side * 0.22 + (Math.random() - 0.5) * 0.06;
    p.position.set(x + laneOffset, y - 0.72, z + 0.28 + Math.random() * 0.08);
    p.rotation.set(Math.PI / 2, 0, side * 0.12);
    p.scale.set(boosting ? 0.72 : 0.58, boosting ? 1.45 : 1.05, boosting ? 0.72 : 0.58);
    p.userData.life = boosting ? 0.52 : 0.42;
    p.userData.decay = boosting ? 0.06 : 0.075;
    p.userData.vx = side * 0.02 + (Math.random() - 0.5) * 0.025;
    p.userData.vy = 0.025 + Math.random() * 0.02;
    p.userData.vz = speed * (boosting ? 0.58 : 0.42) + Math.random() * 0.16;
  }

  exhaust(x, y, z, speed) {
    this.footTrail(x, y, z, speed, 0, false);
  }

  clear() {
    for (const p of this.items) {
      p.visible = false;
      p.userData.life = 0;
      if (p.userData.kind) this.kindCounts[p.userData.kind] = Math.max(0, (this.kindCounts[p.userData.kind] || 1) - 1);
      p.userData.kind = null;
      p.userData.vx = 0;
      p.userData.vy = 0;
      p.userData.vz = 0;
      p.scale.set(1, 1, 1);
      this.pool.push(p);
    }
    this.items.length = 0;
    for (const kind of Object.keys(this.kindCounts)) this.kindCounts[kind] = 0;
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
        const pulse = Math.max(p.userData.life, 0) * p.userData.baseScale * 1.8;
        p.scale.setScalar(pulse);
      } else if (p.geometry === this.shockwaveGeometry) {
        p.scale.setScalar((1 - p.userData.life) * p.userData.maxScale);
      } else if (p.geometry === this.streakGeometry) {
        p.scale.y = p.userData.baseScaleY * Math.max(0.05, p.userData.life / 0.45);
        p.scale.x *= 0.985;
        p.scale.z *= 0.985;
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
