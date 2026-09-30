import * as THREE from "three";
import { COLORS, GAME_CONFIG } from "../config/gameConfig.js";

export class SceneManager {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this._isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    this._pixelRatioCap = this._isMobile ? 1.75 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this._pixelRatioCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(COLORS.bg, 1);
    this.renderer.shadowMap.enabled = !this._isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(COLORS.bg, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 4.5, 7.5);
    this.camera.lookAt(0, 1.5, -10);

    this._baseX = 0;
    this._baseY = 4.5;
    this._baseZ = 7.5;
    this._shake = 0;
    this._speedFeel = 0;
    this._eventVisual = 0;
    this._eventVisualTarget = 0;
    this._shakeBase = this.camera.position.clone();
    this._lastFov = this.camera.fov;

    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
  }

  addLighting() {
    const ambient = new THREE.AmbientLight(0x3a1d5a, 1.2);
    this.scene.add(ambient);

    const cyan = new THREE.DirectionalLight(COLORS.cyan, 1.5);
    cyan.position.set(20, 40, 20);
    cyan.castShadow = !this._isMobile;
    cyan.shadow.mapSize.width = 512;
    cyan.shadow.mapSize.height = 512;
    this.scene.add(cyan);

    const pink = new THREE.DirectionalLight(COLORS.pink, 1.2);
    pink.position.set(-20, 30, -30);
    this.scene.add(pink);

    // Low-frequency neon fill lights give the player, obstacles and road-side metal
    // a readable cyberpunk color separation without relying on heavy post-processing.
    const cyanFill = new THREE.PointLight(COLORS.cyan, 3.2, 24, 2);
    cyanFill.position.set(-7, 5, -8);
    this.scene.add(cyanFill);
    const pinkFill = new THREE.PointLight(COLORS.pink, 2.8, 24, 2);
    pinkFill.position.set(7, 4, -14);
    this.scene.add(pinkFill);
    const topFill = new THREE.PointLight(0x7b5cff, 1.35, 30, 2);
    topFill.position.set(0, 14, -35);
    this.scene.add(topFill);
    this._neonLights = [cyanFill, pinkFill, topFill];
    this._baseExposure = 1.3;
    this._eventVisual = 0;
    this._eventVisualTarget = 0;
  }

  setMouseOffset(x) {
    this._baseX = THREE.MathUtils.lerp(this._baseX, x * 1.5, 0.05);
  }

  shake(intensity = 0.4) {
    this._shake = Math.max(this._shake, intensity);
    this._shakeBase.copy(this.camera.position);
  }

  setEventVisual(intensity = 0) {
    this._eventVisualTarget = THREE.MathUtils.clamp(intensity, 0, 1);
  }

  setSpeedFeel(speed, boosting = false, phase = 0, dt = 1 / 60) {
    const target = Math.min(1, Math.max(0, (speed - 1.2) / 2)) + (boosting ? 0.28 : 0) + phase * 0.025;
    const alpha = 1 - Math.pow(1 - 0.12, Math.max(0, dt) * 60);
    this._speedFeel = THREE.MathUtils.lerp(this._speedFeel, Math.min(1.25, target), alpha);
    this._eventVisual = THREE.MathUtils.lerp(this._eventVisual, this._eventVisualTarget, 1 - Math.pow(1 - 0.1, Math.max(0, dt) * 60));
    const eventPulse = Math.sin(performance.now() * 0.008) * this._eventVisual;
    this.scene.fog.density = 0.015 + this._eventVisual * 0.004 + Math.max(0, eventPulse) * 0.002;
    if (this._neonLights) {
      const surge = this._speedFeel;
      this._neonLights[0].intensity = 3.2 + surge * 2.4;
      this._neonLights[1].intensity = 2.8 + surge * 2.8;
      this._neonLights[2].intensity = 1.35 + surge * 0.8;
    }
    this.renderer.toneMappingExposure = this._baseExposure + this._speedFeel * 0.12;
  }

  update(dt) {
    const cameraAlpha = 1 - Math.pow(1 - 0.08, dt * 60);
    const targetY = this._baseY - this._speedFeel * 0.08;
    const targetZ = this._baseZ + this._speedFeel * 0.18;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this._baseX, cameraAlpha);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, cameraAlpha);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, cameraAlpha);

    const baseFov = GAME_CONFIG.baseFov || 65;
    const maxFov = Math.max(baseFov, GAME_CONFIG.boostFov || 78);
    const targetFov = THREE.MathUtils.clamp(
      baseFov + this._speedFeel * (maxFov - baseFov),
      baseFov,
      maxFov,
    );
    const nextFov = THREE.MathUtils.lerp(
      this.camera.fov,
      targetFov,
      1 - Math.pow(1 - 0.05, dt * 60),
    );
    if (Math.abs(nextFov - this._lastFov) > 0.0005) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
      this._lastFov = nextFov;
    }

    if (this._shake > 0) {
      this._shake *= Math.pow(0.08, dt);
      this.camera.position.x += (Math.random() - 0.5) * this._shake;
      this.camera.position.y += (Math.random() - 0.5) * this._shake;
      this.camera.position.z += (Math.random() - 0.5) * this._shake * 0.45;
      if (this._shake < 0.008) {
        this._shake = 0;
        this.camera.position.x = this._baseX;
        this.camera.position.y = this._baseY - this._speedFeel * 0.08;
        this.camera.position.z = this._baseZ + this._speedFeel * 0.18;
      }
    }
  }

  resetView() {
    this._baseX = 0;
    this._baseY = 4.5;
    this._baseZ = 7.5;
    this._shake = 0;
    this._speedFeel = 0;
    this._shakeBase.set(0, this._baseY, this._baseZ);
    this.camera.position.set(0, this._baseY, this._baseZ);
    this.camera.fov = GAME_CONFIG.baseFov || 65;
    this.camera.updateProjectionMatrix();
    this._lastFov = this.camera.fov;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this._pixelRatioCap));
    this._lastFov = this.camera.fov;
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    if (this._neonLights) {
      for (const light of this._neonLights) light.removeFromParent();
      this._neonLights.length = 0;
      this._neonLights = null;
    }
    this.renderer.dispose();
  }
}
