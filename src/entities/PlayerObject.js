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
    this._build();
    scene.add(this.group);
  }
  _build() {
    const body = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 5), new THREE.MeshStandardMaterial({ color: 0x121528, metalness: 0.9, roughness: 0.2, flatShading: true }));
    body.rotation.x = -Math.PI / 2; body.rotation.y = Math.PI; body.position.set(0, 0.5, 0); body.castShadow = true; this.group.add(body);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.2), new THREE.MeshStandardMaterial({ color: 0x0a0c16, metalness: 0.8, roughness: 0.3 }));
    wings.position.set(0, 0.45, 0.4); this.group.add(wings);
    const trimGeo = new THREE.BoxGeometry(0.1, 0.15, 2.6); const trimMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
    for (const x of [-0.7, 0.7]) { const trim = new THREE.Mesh(trimGeo, trimMat); trim.position.set(x, 0.5, 0); this.group.add(trim); }
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), new THREE.MeshStandardMaterial({ color: COLORS.pink, emissive: COLORS.pink, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.85 }));
    cockpit.scale.set(0.9, 0.6, 1.6); cockpit.position.set(0, 0.75, -0.2); this.group.add(cockpit);
    const engineGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.5, 8); const engineMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
    for (const x of [-0.55, 0.55]) { const engine = new THREE.Mesh(engineGeo, engineMat); engine.rotation.x = Math.PI / 2; engine.position.set(x, 0.45, 1.4); this.group.add(engine); }
    this.thrusterLight = new THREE.PointLight(COLORS.cyan, 2, 8); this.thrusterLight.position.set(0, 0.5, 2); this.group.add(this.thrusterLight);
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: COLORS.green, wireframe: true, transparent: true, opacity: 0.5 }));
    this.shield.position.set(0, 0.6, 0); this.shield.visible = false; this.group.add(this.shield);
  }
  moveLane(direction) { const next = this.currentLane + direction; if (next < 0 || next > 2) return; this.currentLane = next; this.targetX = LANES[next]; }
  jump() { if (this.isJumping || this.isSliding) return false; this.isJumping = true; this.jumpVelocity = GAME_CONFIG.jumpForce; return true; }
  slide() { if (this.isJumping) return false; this.isSliding = true; this.slideTimer = GAME_CONFIG.slideDuration; return true; }
  update(dt, elapsed) {
    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, this.targetX, 1 - Math.pow(1 - GAME_CONFIG.laneChangeLerp, dt * 60));
    const offset = this.targetX - this.group.position.x;
    this.group.rotation.z = -offset * 0.18; this.group.rotation.y = offset * 0.1;
    if (this.isJumping) {
      this.group.position.y += this.jumpVelocity * dt * 60;
      this.jumpVelocity -= GAME_CONFIG.gravity * dt * 60;
      if (this.group.position.y <= 0) { this.group.position.y = 0; this.isJumping = false; this.jumpVelocity = 0; }
    } else if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.isSliding = false;
    }
    const targetY = this.isJumping ? this.group.position.y : (this.isSliding ? 0.15 : Math.sin(elapsed * 6) * 0.08);
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetY, 0.18);
    this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, this.isSliding ? 0.62 : 1, 0.25);
    if (this.shield.visible) { this.shield.rotation.y += dt * 1.8; this.shield.rotation.x += dt * 1.2; }
  }
  reset() {
    this.currentLane = 1; this.targetX = LANES[1]; this.isJumping = false; this.isSliding = false; this.jumpVelocity = 0; this.slideTimer = 0;
    this.group.position.set(0, 0, 0); this.group.rotation.set(0, 0, 0); this.group.scale.set(1, 1, 1); this.shield.visible = false; this.group.visible = true;
  }
  getHitbox() { return { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z, halfX: 1.1, halfY: this.isSliding ? 0.48 : 0.8, halfZ: 1.2, isJumping: this.isJumping, isSliding: this.isSliding }; }
  setShield(active) { this.shield.visible = active; }
}
