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
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0b1022,
      metalness: 0.92,
      roughness: 0.18,
      flatShading: true,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x070a14,
      metalness: 0.82,
      roughness: 0.24,
      flatShading: true,
    });
    const cyanMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
    const pinkMat = new THREE.MeshBasicMaterial({ color: COLORS.pink });

    const body = new THREE.Mesh(new THREE.ConeGeometry(1.05, 3.25, 6), hullMat);
    body.rotation.x = -Math.PI / 2;
    body.rotation.y = Math.PI / 6;
    body.position.set(0, 0.52, 0);
    body.scale.set(1, 1, 0.92);
    body.castShadow = true;
    this.group.add(body);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.25, 5), hullMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0.55, -1.65);
    nose.castShadow = true;
    this.group.add(nose);

    const wings = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.12, 0.82), darkMat);
    wings.position.set(0, 0.42, 0.35);
    wings.rotation.z = 0;
    wings.scale.x = 0.92;
    this.group.add(wings);
    this.wings = wings;

    const finGeo = new THREE.BoxGeometry(0.16, 0.22, 1.55);
    for (const x of [-1.18, 1.18]) {
      const fin = new THREE.Mesh(finGeo, hullMat);
      fin.position.set(x, 0.58, 0.5);
      fin.rotation.z = x < 0 ? -0.18 : 0.18;
      this.group.add(fin);
    }

    const trimGeo = new THREE.BoxGeometry(0.09, 0.12, 2.55);
    for (const x of [-0.68, 0.68]) {
      const trim = new THREE.Mesh(trimGeo, cyanMat);
      trim.position.set(x, 0.61, -0.05);
      trim.rotation.y = x < 0 ? -0.04 : 0.04;
      this.group.add(trim);
    }

    const armorGeo = new THREE.BoxGeometry(0.24, 0.16, 1.15);
    for (const x of [-1.02, 1.02]) {
      const armor = new THREE.Mesh(armorGeo, darkMat);
      armor.position.set(x, 0.66, -0.15);
      armor.rotation.z = x < 0 ? -0.18 : 0.18;
      armor.rotation.y = x < 0 ? -0.08 : 0.08;
      this.group.add(armor);
      const armorLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.05, 0.72),
        x < 0 ? cyanMat : pinkMat,
      );
      armorLight.position.set(x * 1.012, 0.75, -0.18);
      armorLight.rotation.y = x < 0 ? -0.08 : 0.08;
      this.group.add(armorLight);
    }

    const cockpitFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.045, 6, 16),
      cyanMat,
    );
    cockpitFrame.scale.set(0.92, 0.58, 1.45);
    cockpitFrame.rotation.x = Math.PI / 2;
    cockpitFrame.position.set(0, 0.79, -0.28);
    this.group.add(cockpitFrame);

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 10, 8),
      new THREE.MeshStandardMaterial({
        color: COLORS.pink,
        emissive: COLORS.pink,
        emissiveIntensity: 0.72,
        roughness: 0.08,
        metalness: 0.5,
        transparent: true,
        opacity: 0.88,
      }),
    );
    cockpit.scale.set(0.88, 0.58, 1.65);
    cockpit.position.set(0, 0.78, -0.28);
    this.group.add(cockpit);
    this.cockpit = cockpit;

    const enginePodGeo = new THREE.CylinderGeometry(0.28, 0.38, 0.72, 8);
    const engineGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.46, 8);
    const engineMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
    for (const x of [-0.58, 0.58]) {
      const pod = new THREE.Mesh(enginePodGeo, darkMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(x, 0.44, 1.18);
      this.group.add(pod);

      const engine = new THREE.Mesh(engineGeo, engineMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(x, 0.44, 1.52);
      this.group.add(engine);
    }

    // Rear spine and underside hover housings complete the craft silhouette from side/rear views.
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 1.35, 5),
      darkMat,
    );
    spine.rotation.x = Math.PI / 2;
    spine.position.set(0, 0.5, 1.18);
    spine.scale.z = 0.72;
    this.group.add(spine);

    const spineLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.07, 0.72),
      pinkMat,
    );
    spineLight.position.set(0, 0.64, 1.02);
    this.group.add(spineLight);

    const hoverHousingGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.58, 6);
    for (const x of [-0.9, 0.9]) {
      const housing = new THREE.Mesh(hoverHousingGeo, darkMat);
      housing.rotation.x = Math.PI / 2;
      housing.position.set(x, 0.22, 0.72);
      this.group.add(housing);
      const housingRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.025, 6, 12),
        x < 0 ? cyanMat : pinkMat,
      );
      housingRing.rotation.x = Math.PI / 2;
      housingRing.position.set(x, 0.22, 1.02);
      this.group.add(housingRing);
    }

    // Central keel visually ties the nose, cockpit and rear propulsion into one chassis.
    const keel = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.18, 2.25),
      darkMat,
    );
    keel.position.set(0, 0.34, -0.02);
    keel.rotation.x = 0.025;
    this.group.add(keel);

    const keelLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.035, 1.45),
      cyanMat,
    );
    keelLight.position.set(0, 0.45, -0.35);
    this.group.add(keelLight);

    const engineCollarGeo = new THREE.TorusGeometry(0.31, 0.045, 6, 12);
    for (const x of [-0.58, 0.58]) {
      const collar = new THREE.Mesh(engineCollarGeo, x < 0 ? cyanMat : pinkMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(x, 0.44, 1.27);
      this.group.add(collar);
    }

    this.thrusterLight = new THREE.PointLight(COLORS.cyan, 2, 8);
    this.thrusterLight.position.set(0, 0.5, 2);
    this.group.add(this.thrusterLight);

    this.hoverRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.8 }),
    );
    this.hoverRing.rotation.x = Math.PI / 2;
    this.hoverRing.position.y = 0.12;
    this.group.add(this.hoverRing);

    this.frontBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.055, 0.08),
      pinkMat,
    );
    this.frontBar.position.set(0, 0.73, -1.4);
    this.group.add(this.frontBar);

    this.energyHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.84, 0.025, 6, 28),
      new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.65 }),
    );
    this.energyHalo.rotation.x = Math.PI / 2;
    this.energyHalo.position.set(0, 0.7, -1.3);
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
    if (this.boosting === active) return;
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
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetY, 1 - Math.pow(1 - 0.18, dt * 60));
    this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, this.isSliding ? 0.62 : 1, 1 - Math.pow(1 - 0.25, dt * 60));

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

  dispose() {
    const geometries = new Set();
    const materials = new Set();
    this.group.traverse((node) => {
      if (!node.isMesh) return;
      if (node.geometry) geometries.add(node.geometry);
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((material) => material && materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.group.removeFromParent();
  }
}
