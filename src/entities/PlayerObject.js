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
    // The protagonist is a human cyber-runner, not a vehicle.
    const armor = new THREE.MeshStandardMaterial({color:0x151b2e,metalness:0.9,roughness:0.2,emissive:0x07112d,emissiveIntensity:0.3,flatShading:true});
    const dark = new THREE.MeshStandardMaterial({color:0x070a13,metalness:0.82,roughness:0.28,flatShading:true});
    const joint = new THREE.MeshStandardMaterial({color:0x30384a,metalness:0.96,roughness:0.15,flatShading:true});
    const cyan = new THREE.MeshStandardMaterial({color:COLORS.cyan,emissive:COLORS.cyan,emissiveIntensity:2.3,metalness:0.15,roughness:0.2});
    const pink = new THREE.MeshStandardMaterial({color:COLORS.pink,emissive:COLORS.pink,emissiveIntensity:2.2,metalness:0.15,roughness:0.2});
    const visor = new THREE.MeshPhysicalMaterial({color:0x07101d,emissive:COLORS.cyan,emissiveIntensity:1.15,metalness:0.45,roughness:0.08,transparent:true,opacity:0.92,clearcoat:1,clearcoatRoughness:0.08});
    const skin = new THREE.MeshStandardMaterial({color:0x8d6b70,roughness:0.45,emissive:0x120b16,emissiveIntensity:0.15});
    const glow = new THREE.MeshBasicMaterial({color:COLORS.cyan,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false});
    const pglow = new THREE.MeshBasicMaterial({color:COLORS.pink,transparent:true,opacity:0.78,blending:THREE.AdditiveBlending,depthWrite:false});
    const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;this.group.add(m);return m;};

    this.torso=add(new THREE.CapsuleGeometry(.48,.72,5,10),armor,0,1.42,0,.9,1.05,.52);
    this.chest=add(new THREE.BoxGeometry(.78,.58,.16),armor,0,1.5,-.43);
    this.pelvis=add(new THREE.BoxGeometry(.66,.36,.42),dark,0,.98,0);
    this.neck=add(new THREE.CylinderGeometry(.16,.2,.24,8),joint,0,2.02,0);
    this.head=add(new THREE.SphereGeometry(.34,12,10),skin,0,2.34,0,.92,1.08,.82);
    this.helmet=add(new THREE.SphereGeometry(.37,12,8),dark,0,2.37,0,.98,1.04,.86);
    this.visor=add(new THREE.BoxGeometry(.48,.12,.08),visor,0,2.39,-.31);
    this.eyeLine=add(new THREE.BoxGeometry(.34,.018,.018),glow,0,2.36,-.365);
    this.facePlate=add(new THREE.BoxGeometry(.18,.07,.035),dark,.17,2.18,-.29,.8,1,1);
    this.templeNode=add(new THREE.SphereGeometry(.055,8,6),pglow,.31,2.22,-.18);
    add(new THREE.BoxGeometry(.37,.025,.025),glow,0,2.39,-.36);
    this.neuralLine = add(new THREE.BoxGeometry(.025,.28,.025),pglow,0.27,2.12,-.31);
    this.chestCore = new THREE.Mesh(new THREE.TorusGeometry(.16,.035,8,24),new THREE.MeshBasicMaterial({color:COLORS.cyan,transparent:true,opacity:.86}));
    this.chestCore.rotation.x=Math.PI/2;
    this.chestCore.position.set(0,1.48,-.53);
    this.group.add(this.chestCore);
    this.chestCoreInner = add(new THREE.SphereGeometry(.08,10,8),cyan,0,1.48,-.55);

    this.armBlades=[];
    this.armParts=[]; for(const side of [-1,1]){
      const accent=side<0?cyan:pink;
      const shoulder=add(new THREE.SphereGeometry(.25,8,6),armor,side*.58,1.74,0,1.15,.82,1);
      const shoulderPlate=add(new THREE.BoxGeometry(.26,.16,.24),joint,side*.62,1.72,-.06,1,.85,1);
      const upper=add(new THREE.CapsuleGeometry(.13,.38,4,7),dark,side*.72,1.4,.02);
      const elbow=add(new THREE.SphereGeometry(.14,8,6),joint,side*.76,1.12,0);
      const lower=add(new THREE.CapsuleGeometry(.12,.42,4,7),armor,side*.75,.88,-.06);
      const hand=add(new THREE.SphereGeometry(.13,8,6),skin,side*.74,.6,-.1,.82,1.15,.82);
      const strip=add(new THREE.BoxGeometry(.045,.42,.035),accent,side*.88,1.02,-.14);
      const blade=add(new THREE.BoxGeometry(.045,.3,.07),accent,side*.91,.82,-.23);
      blade.rotation.z=side*.12;
      this.armBlades.push(blade);
      const wristNode=add(new THREE.SphereGeometry(.045,7,5),accent,side*.77,.68,-.18);
      this.armParts.push({shoulder,shoulderPlate,upper,elbow,lower,hand,strip,wristNode,side});
    }

    this.legParts=[]; for(const side of [-1,1]){
      const accent=side<0?cyan:pink;
      const hip=add(new THREE.SphereGeometry(.2,8,6),joint,side*.25,.78,0);
      const thigh=add(new THREE.CapsuleGeometry(.18,.48,5,8),armor,side*.25,.43,0,1,1,.9);
      const knee=add(new THREE.SphereGeometry(.17,8,6),joint,side*.25,.08,-.02);
      const shin=add(new THREE.CapsuleGeometry(.15,.48,5,8),dark,side*.25,-.28,0,1,1,.9);
      const boot=add(new THREE.BoxGeometry(.32,.28,.68),armor,side*.25,-.68,-.16);
      const bootPlate=add(new THREE.BoxGeometry(.25,.1,.18),joint,side*.25,-.67,-.48);
      const sole=add(new THREE.BoxGeometry(.34,.055,.72),accent,side*.25,-.83,-.16);
      const calfLine=add(new THREE.BoxGeometry(.035,.28,.025),accent,side*.25,-.3,-.17);
      this.legParts.push({hip,thigh,knee,shin,boot,bootPlate,sole,calfLine,side});
    }

    this.spineSegments=[]; for(let i=0;i<6;i++) this.spineSegments.push(add(new THREE.BoxGeometry(.1,.13,.08),i%2?pglow:glow,0,.98+i*.19,.34));
    this.energyBack=add(new THREE.BoxGeometry(.08,1,.045),glow,0,1.46,.36);
    this.backFins=[]; for(const side of [-1,1]){const f=add(new THREE.BoxGeometry(.07,.34,.18),side<0?glow:pglow,side*.38,1.58,.28);f.rotation.z=side*-.24;this.backFins.push(f);}

    this.underGlow=new THREE.Mesh(new THREE.TorusGeometry(.58,.018,6,28),new THREE.MeshBasicMaterial({color:COLORS.cyan,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.underGlow.rotation.x=Math.PI/2;this.underGlow.position.y=-.78;this.group.add(this.underGlow);
    this.energyHalo=new THREE.Mesh(new THREE.TorusGeometry(.48,.025,6,24),new THREE.MeshBasicMaterial({color:COLORS.cyan,transparent:true,opacity:.48}));
    this.energyHalo.rotation.x=Math.PI/2;this.energyHalo.position.set(0,1.18,-.34);this.group.add(this.energyHalo);
    this.boostTrail=new THREE.Mesh(new THREE.ConeGeometry(.13,1.25,8,1,true),new THREE.MeshBasicMaterial({color:COLORS.pink,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.boostTrail.rotation.x=Math.PI/2;this.boostTrail.position.set(0,-.62,.78);this.boostTrail.visible=false;this.group.add(this.boostTrail);
    this.thrusterLight=new THREE.PointLight(COLORS.cyan,1.2,4.5);this.thrusterLight.position.set(0,-.35,.55);this.group.add(this.thrusterLight);
    this.shield=new THREE.Mesh(new THREE.SphereGeometry(1.45,24,18),new THREE.MeshBasicMaterial({color:COLORS.green,wireframe:true,transparent:true,opacity:.34}));
    this.shield.scale.set(.72,1.25,.62);this.shield.position.set(0,.65,0);this.shield.visible=false;this.group.add(this.shield);
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
    this.thrusterLight.intensity = active ? 3.4 : 1.2;
    this.boostTrail.visible = active;
    this.boostTrail.material.color.setHex(active ? COLORS.pink : COLORS.cyan);
    this.energyHalo.material.color.setHex(active ? COLORS.yellow : COLORS.cyan);
    this.energyHalo.material.opacity = active ? 0.9 : 0.48;
    this.visor.material.emissiveIntensity = active ? 1.8 : 1.05;
  }

  update(dt, elapsed) {
    const alpha = 1 - Math.pow(1 - GAME_CONFIG.laneChangeLerp, dt * 60);
    const prevX = this.group.position.x;
    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, this.targetX, alpha);
    const lateralVelocity = (this.group.position.x - prevX) / Math.max(dt, 0.001);
    const tilt = GAME_CONFIG.laneChangeTilt ?? 0.030;
    const yaw = GAME_CONFIG.laneChangeYaw ?? 0.020;
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -lateralVelocity * tilt, 0.22);
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, (this.targetX - this.group.position.x) * yaw, 0.22);

    if (this.isJumping) {
      this.group.position.y += this.jumpVelocity * dt * 60;
      this.jumpVelocity -= GAME_CONFIG.gravity * dt * 60;
      if (this.group.position.y <= 0.84) {
        this.group.position.y = 0.84;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    } else if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    if (!this.isJumping) {
      const baseY = this.isSliding ? 0.88 : 0.84 + Math.sin(elapsed * 11) * 0.025;
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, baseY, 1 - Math.pow(1 - 0.2, dt * 60));
    }

    const phase = elapsed * (this.boosting ? 18 : 12);
    const stride = Math.sin(phase);
    const counter = -stride;
    const amount = this.isJumping ? 0.12 : (this.isSliding ? 0.04 : 0.2);

    for (const part of this.legParts) {
      const s = part.side < 0 ? stride : counter;
      part.thigh.rotation.x = this.isSliding ? -0.9 : s * amount;
      part.shin.rotation.x = this.isSliding ? 0.7 : -s * amount * 1.2;
      part.boot.rotation.x = this.isSliding ? -0.22 : s * amount * 0.35;
      part.sole.material.opacity = this.boosting ? 0.95 : 0.7;
      part.sole.scale.z = this.boosting ? 1.25 : 1;
    }
    for (const part of this.armParts) {
      const s = part.side < 0 ? counter : stride;
      part.upper.rotation.x = -s * amount * 1.35;
      part.lower.rotation.x = s * amount * 0.9;
      part.shoulder.rotation.z = s * amount * 0.25;
    }

    const crouch = this.isSliding ? 0.58 : 1;
    this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, crouch, 1 - Math.pow(1 - 0.28, dt * 60));
    this.group.rotation.x = THREE.MathUtils.lerp(
      this.group.rotation.x,
      this.isSliding ? 0.55 : (this.isJumping ? -0.08 : 0),
      1 - Math.pow(1 - 0.2, dt * 60),
    );

    this.chestCore.rotation.z += dt * (this.boosting ? 7 : 2.2);
    this.chestCore.material.opacity = this.boosting ? 1 : 0.72 + Math.sin(elapsed * 8) * 0.12;
    this.chestCoreInner.material.emissiveIntensity = this.boosting ? 3.6 : 2.1;
    this.eyeLine.material.opacity = this.boosting ? 1 : 0.72 + Math.sin(elapsed * 7) * 0.16;
    this.templeNode.material.opacity = this.boosting ? 1 : 0.7 + Math.sin(elapsed * 9) * 0.18;
    this.neuralLine.material.emissiveIntensity = this.boosting ? 3.2 : 1.8;
    for (const blade of this.armBlades) blade.scale.y = this.boosting ? 1.2 + Math.sin(elapsed * 18) * 0.12 : 1;
    this.energyHalo.rotation.z += dt * (this.boosting ? 8 : 2.8);
    this.energyHalo.scale.setScalar(1 + Math.sin(elapsed * (this.boosting ? 18 : 9)) * (this.boosting ? 0.1 : 0.045));
    this.energyHalo.material.opacity = (this.boosting ? 0.78 : 0.42) + Math.sin(elapsed * 10) * 0.1;
    this.underGlow.material.color.setHex(this.boosting ? COLORS.pink : COLORS.cyan);
    this.underGlow.material.opacity = this.boosting ? 0.5 : 0.24 + Math.sin(elapsed * 8) * 0.04;
    this.underGlow.scale.setScalar(this.boosting ? 1.14 : 1);
    this.boostTrail.visible = this.boosting;
    this.boostTrail.scale.set(1, this.boosting ? 1.3 + Math.sin(elapsed * 20) * 0.18 : 0.8, 1);
    this.thrusterLight.intensity = this.boosting ? 3.4 + Math.sin(elapsed * 24) * 0.8 : 1.2;
    this.visor.material.emissiveIntensity = this.boosting ? 1.8 + Math.sin(elapsed * 16) * 0.3 : 1.05;
    this.energyBack.material.opacity = this.boosting ? 1 : 0.72;

    for (let i = 0; i < this.spineSegments.length; i++) {
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * (8 + i * 0.4) - i * 0.8);
      this.spineSegments[i].scale.x = this.boosting ? 1 + pulse * 0.8 : 0.8 + pulse * 0.25;
      this.spineSegments[i].scale.z = this.boosting ? 1 + pulse * 0.35 : 1;
    }

    if (this.shield.visible) {
      this.shield.rotation.y += dt * 1.8;
      this.shield.rotation.x += dt * 1.2;
      this.shield.material.opacity = 0.3 + Math.sin(elapsed * 9) * 0.06;
    }
  }
  reset() {
    this.currentLane = 1;
    this.targetX = LANES[1];
    this.isJumping = false;
    this.isSliding = false;
    this.jumpVelocity = 0;
    this.slideTimer = 0;
    this.group.position.set(0, 0.84, 0);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.set(1, 1, 1);
    this.shield.visible = false;
    this.group.visible = true;
    this.setBoost(false);
  }

  getHitbox() {
    return {
      x: this.group.position.x,
      y: this.group.position.y + 0.95,
      z: this.group.position.z,
      halfX: 0.58,
      halfY: this.isSliding ? 0.48 : 1.02,
      halfZ: 0.48,
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
