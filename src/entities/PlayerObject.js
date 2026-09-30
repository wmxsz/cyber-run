import * as THREE from "three";
import { COLORS, GAME_CONFIG, LANES } from "../config/gameConfig.js";

export class PlayerObject {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.currentLane = 1;
    this.targetX = LANES[1];
    this.isJumping = false;
    this.isSliding = false;
    this.jumpVelocity = 0;
    this.slideTimer = 0;
    this.boosting = false;
    this._build();
    scene.add(this.group);
  }

  _build() {
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 3.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x121528, metalness: 0.9, roughness: 0.2, flatShading: true }),
    );
    body.rotation.x = -Math.PI / 2;
    body.rotation.y = Math.PI;
    body.position.set(0, 0.5, 0);
    body.castShadow = true;
    this.group.add(body);

    const wings = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0a0c16, metalness: 0.8, roughness: 0.3 }),
    );
    wings.position.set(0, 0.45, 0.4);
    this.group.add(wings);
    this.wings = wings;

    const trimGeo = new THREE.BoxGeometry(0.1, 0.15, 2.6);
    const trimMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
    for (const x of [-0.7, 0.7]) {
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(x, 0.5, 0);
      this.group.add(trim);
    }

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshStandardMaterial({
        color: COLORS.pink,
        emissive: COLORS.pink,
        emissiveIntensity: 0.7,
        roughness: 0.1,
        metalness: 0.5,
        transparent: true,
        opacity: 0.85,
      }),
    );
    cockpit.scale.set(0.9, 0.6, 1.6);
    cockpit.position.set(0, 0.75, -0.2);
    this.group.add(cockpit);
    this.cockpit = cockpit;

    const engineGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.5, 8);
    const engineMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
    for (const x of [-0.55, 0.55]) {
      const engine = new THREE.Mesh(engineGeo, engineMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(x, 0.45, 1.4);
      this.group.add(engine);
    }

    this.thrusterLight = new THREE.PointLight(COLORS.cyan, 2, 8);
    this.thrusterLight.position.set(0, 0.5, 2);
    this.group.add(this.thrusterLight);

    this.hoverRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.8 }),
    );
    this.hoverRing.rotation.x = Math.PI / 2;
    this.hoverRing.position.y = 0.12;
    this.group.add(this.hoverRing);

    this.frontBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.055, 0.08),
      new THREE.MeshBasicMaterial({ color: COLORS.pink }),
    );
    this.frontBar.position.set(0, 0.7, -1.35);
    this.group.add(this.frontBar);

    this.energyHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.025, 6, 28),
      new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.65 }),
    );
    this.energyHalo.rotation.x = Math.PI / 2;
    this.energyHalo.position.set(0, 0.7, -1.28);
    this.group.add(this.energyHalo);

    this.shield = new THREE.Mesh(
      new THREE.SphereGeometry(2, 16, 16),
      new THREE.MeshBasicMaterial({ color: COLORS.green, wireframe: true, transparent: true, opacity: 0.5 }),
    );
    this.shield.position.set(0, 0.6, 0);
    this.shield.visible = false;
    this.group.add(this.shield);
  }

  moveLane(direction) {
    const next = this.currentLane + direction;
    if (next < 0 || next > 2) return;
    this.currentLane = next;
    this.targetX = LANES[next];
  }

  jump() {
    if (this.isJumping || this.isSliding) return false;
    this.isJumping = true;
    this.jumpVelocity = GAME_CONFIG.jumpForce;
    return true;
  }

  slide() {
    if (this.isJumping) return false;
    this.isSliding = true;
    this.slideTimer = GAME_CONFIG.slideDuration;
    return true;
  }

  setBoost(active) {
    this.boosting = active;
    this.thrusterLight.color.setHex(active ? COLORS.pink : COLORS.cyan);
    this.thrusterLight.intensity = active ? 5 : 2;
    this.hoverRing.material.color.setHex(active ? COLORS.pink : COLORS.cyan);
    this.frontBar.material.color.setHex(active ? COLORS.yellow : COLORS.pink);
    this.energyHalo.material.color.setHex(active ? COLORS.yellow : COLORS.cyan);
    this.energyHalo.material.opacity = active ? 0.95 : 0.45;
  }

  update(dt, elapsed) {
    this.group.position.x = THREE.MathUtils.lerp(
      this.group.position.x,
      this.targetX,
      1 - Math.pow(1 - GAME_CONFIG.laneChangeLerp, dt * 60),
    );
    const offset = this.targetX - this.group.position.x;
    this.group.rotation.z = -offset * 0.18;
    this.group.rotation.y = offset * 0.1;

    if (this.isJumping) {
      this.group.position.y += this.jumpVelocity * dt * 60;
      this.jumpVelocity -= GAME_CONFIG.gravity * dt * 60;
      if (this.group.position.y <= 0) {
        this.group.position.y = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    } else if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    const targetY = this.isJumping
      ? this.group.position.y
      : (this.isSliding ? 0.15 : Math.sin(elapsed * 6) * 0.08);
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetY, 0.18);
    this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, this.isSliding ? 0.62 : 1, 0.25);

    this.hoverRing.rotation.z += dt * (this.boosting ? 6 : 2.2);
    this.hoverRing.scale.setScalar(1 + Math.sin(elapsed * 8) * 0.05);
    this.energyHalo.rotation.z -= dt * (this.boosting ? 8 : 3);
    this.energyHalo.scale.setScalar(1 + Math.sin(elapsed * (this.boosting ? 18 : 9)) * (this.boosting ? 0.12 : 0.05));
    this.energyHalo.material.opacity = (this.boosting ? 0.72 : 0.42) + Math.sin(elapsed * 10) * 0.12;
    this.wings.rotation.z = Math.sin(elapsed * 4) * 0.035;
    this.cockpit.material.emissiveIntensity = this.boosting ? 1.8 + Math.sin(elapsed * 16) * 0.35 : 0.7;
    this.frontBar.scale.x = this.boosting ? 1.15 + Math.sin(elapsed * 14) * 0.08 : 1;

    if (this.shield.visible) {
      this.shield.rotation.y += dt * 1.8;
      this.shield.rotation.x += dt * 1.2;
    }
  }

  reset() {
    this.currentLane = 1;
    this.targetX = LANES[1];
    this.isJumping = false;
    this.isSliding = false;
    this.jumpVelocity = 0;
    this.slideTimer = 0;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.set(1, 1, 1);
    this.shield.visible = false;
    this.group.visible = true;
    this.setBoost(false);
  }

  getHitbox() {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      z: this.group.position.z,
      halfX: 1.1,
      halfY: this.isSliding ? 0.48 : 0.8,
      halfZ: 1.2,
      isJumping: this.isJumping,
      isSliding: this.isSliding,
    };
  }

  setShield(active) {
    this.shield.visible = active;
  }
}
