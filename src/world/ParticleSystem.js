import * as THREE from "three";

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  burst(x, y, z, color = 0xff0077, count = 25) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.18),
        new THREE.MeshBasicMaterial({ color }),
      );
      p.position.set(x, y, z);
      p.userData.life = 1;
      p.userData.decay = 0.025 + Math.random() * 0.02;
      p.userData.vx = (Math.random() - 0.5) * 0.45;
      p.userData.vy = Math.random() * 0.4 + 0.1;
      p.userData.vz = (Math.random() - 0.5) * 0.45;
      this.scene.add(p);
      this.items.push(p);
    }
  }

  exhaust(x, y, z, speed) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
    );
    p.position.set(x + (Math.random() - 0.5) * 0.4, y, z + 1.2);
    p.userData.life = 0.7;
    p.userData.decay = 0.05;
    p.userData.vx = (Math.random() - 0.5) * 0.05;
    p.userData.vy = (Math.random() - 0.5) * 0.05;
    p.userData.vz = speed * 0.8 + Math.random() * 0.2;
    this.scene.add(p);
    this.items.push(p);
  }

  update() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.position.x += p.userData.vx;
      p.position.y += p.userData.vy;
      p.position.z += p.userData.vz;
      p.userData.life -= p.userData.decay;
      const scale = Math.max(p.userData.life, 0.01);
      p.scale.setScalar(scale);
      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
