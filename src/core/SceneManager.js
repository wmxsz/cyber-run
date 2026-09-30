import * as THREE from "three";
import { COLORS, GAME_CONFIG } from "../config/gameConfig.js";

export class SceneManager {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(COLORS.bg, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

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
    this._shake = 0;
    this._speedFeel = 0;
    this._shakeBase = this.camera.position.clone();

    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
  }

  addLighting() {
    const ambient = new THREE.AmbientLight(0x3a1d5a, 1.2);
    this.scene.add(ambient);

    const cyan = new THREE.DirectionalLight(COLORS.cyan, 1.5);
    cyan.position.set(20, 40, 20);
    cyan.castShadow = true;
    cyan.shadow.mapSize.width = 1024;
    cyan.shadow.mapSize.height = 1024;
    this.scene.add(cyan);

    const pink = new THREE.DirectionalLight(COLORS.pink, 1.2);
    pink.position.set(-20, 30, -30);
    this.scene.add(pink);
  }

  setMouseOffset(x) {
    this._baseX = THREE.MathUtils.lerp(this._baseX, x * 1.5, 0.05);
  }

  shake(intensity = 0.4) {
    this._shake = Math.max(this._shake, intensity);
    this._shakeBase.copy(this.camera.position);
  }

  setSpeedFeel(speed, boosting = false, phase = 0) {
    const target = Math.min(1, Math.max(0, (speed - 1.2) / 2)) + (boosting ? 0.28 : 0) + phase * 0.025;
    this._speedFeel = THREE.MathUtils.lerp(this._speedFeel, Math.min(1.25, target), 1 - Math.pow(1 - 0.12, dt * 60));
  }

  update(dt) {
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this._baseX, 1 - Math.pow(1 - 0.08, dt * 60));

    const baseFov = GAME_CONFIG.baseFov || 65;
    const maxFov = Math.max(baseFov, GAME_CONFIG.boostFov || 78);
    const targetFov = THREE.MathUtils.clamp(
      baseFov + this._speedFeel * (maxFov - baseFov),
      baseFov,
      maxFov,
    );
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.pow(1 - 0.05, dt * 60));
    this.camera.updateProjectionMatrix();

    if (this._shake > 0) {
      this._shake *= Math.pow(0.08, dt);
      this.camera.position.x += (Math.random() - 0.5) * this._shake;
      this.camera.position.y += (Math.random() - 0.5) * this._shake;
      if (this._shake < 0.008) {
        this._shake = 0;
        this.camera.position.x = this._baseX;
        this.camera.position.y = this._shakeBase.y;
      }
    }
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this.renderer.dispose();
  }
}
