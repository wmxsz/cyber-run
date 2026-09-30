export class PerformanceMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.frames = 0;
    this.elapsed = 0;
    this.fps = 60;
    this.frameTime = 16.67;
    this.maxFrameTime = 16.67;
    this.minFps = 60;
    this._windowMaxFrameTime = 0;
    this._windowMinFps = Infinity;
    this._warned = new Set();
    this.enabled = true;
    this.metrics = {
      fps: 60, frameTime: 16.67, maxFrameTime: 16.67, minFps: 60,
      drawCalls: 0, triangles: 0, points: 0, lines: 0,
      textures: 0, geometries: 0, programs: 0,
    };
  }

  sample(dt) {
    if (!this.enabled || !Number.isFinite(dt) || dt <= 0) return;

    this.frames += 1;
    this.elapsed += dt;
    const frameMs = dt * 1000;
    this._windowMaxFrameTime = Math.max(this._windowMaxFrameTime, frameMs);

    if (this.elapsed < 1) return;

    this.fps = this.frames / this.elapsed;
    this.frameTime = 1000 / Math.max(1, this.fps);
    this.minFps = Math.min(this.minFps, this.fps);
    this._windowMinFps = Math.min(this._windowMinFps, this.fps);

    const info = this.renderer?.info;
    const render = info?.render;
    const memory = info?.memory;
    this.maxFrameTime = Math.max(this.maxFrameTime, this._windowMaxFrameTime);
    this.metrics = {
      fps: this.fps,
      frameTime: this.frameTime,
      maxFrameTime: this._windowMaxFrameTime,
      minFps: this._windowMinFps === Infinity ? this.fps : this._windowMinFps,
      drawCalls: render?.calls || 0,
      triangles: render?.triangles || 0,
      points: render?.points || 0,
      lines: render?.lines || 0,
      textures: memory?.textures || 0,
      geometries: memory?.geometries || 0,
      programs: memory?.programs || 0,
    };

    this.frames = 0;
    this.elapsed = 0;
    this._windowMaxFrameTime = 0;
    this._windowMinFps = Infinity;

    this._checkBudget("fps", this.fps < 45, "FPS below 45");
    this._checkBudget("frameTime", this.metrics.maxFrameTime > 50, "frame spike above 50ms");
    this._checkBudget("drawCalls", this.metrics.drawCalls > 180, "draw calls above 180");
    this._checkBudget("triangles", this.metrics.triangles > 180000, "triangles above 180k");
  }

  _checkBudget(key, exceeded, message) {
    if (!exceeded) {
      this._warned.delete(key);
      return;
    }
    if (this._warned.has(key)) return;
    this._warned.add(key);
    if (typeof console !== "undefined" && console.warn) console.warn("[Cyber Run performance]", message);
  }

  getSnapshot() {
    return { ...this.metrics };
  }

  dispose() {
    this.enabled = false;
    this.renderer = null;
    this._warned.clear();
  }
}
