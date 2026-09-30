export const ACTIONS = Object.freeze({
  LEFT: "left",
  RIGHT: "right",
  JUMP: "jump",
  MUTE: "mute",
});

const KEY_MAP = {
  KeyA: ACTIONS.LEFT,
  ArrowLeft: ACTIONS.LEFT,
  KeyD: ACTIONS.RIGHT,
  ArrowRight: ACTIONS.RIGHT,
  KeyW: ACTIONS.JUMP,
  ArrowUp: ACTIONS.JUMP,
  Space: ACTIONS.JUMP,
  KeyM: ACTIONS.MUTE,
};

export class InputManager {
  constructor() {
    this.listeners = new Set();
    this._touch = null;

    this._onKey = this._onKey.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);

    window.addEventListener("keydown", this._onKey, { passive: false });
    window.addEventListener("touchstart", this._onTouchStart, { passive: true });
    window.addEventListener("touchend", this._onTouchEnd, { passive: true });
    window.addEventListener("mousemove", this._onMouseMove, { passive: true });

    this.bindButton("btn-left", ACTIONS.LEFT);
    this.bindButton("btn-right", ACTIONS.RIGHT);
    this.bindButton("btn-jump", ACTIONS.JUMP);
  }

  onAction(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(action, payload) {
    for (const fn of this.listeners) fn(action, payload);
  }

  bindButton(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.emit(action);
    });
  }

  _onKey(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    this.emit(action);
  }

  _onTouchStart(e) {
    const target = e.target;
    if (target instanceof Element && target.closest(".mobile-touch-btn")) return;
    const t = e.changedTouches[0];
    this._touch = { x: t.clientX, y: t.clientY, time: performance.now() };
  }

  _onTouchEnd(e) {
    if (!this._touch) return;
    const target = e.target;
    if (target instanceof Element && target.closest(".mobile-touch-btn")) {
      this._touch = null;
      return;
    }

    const t = e.changedTouches[0];
    const dx = t.clientX - this._touch.x;
    const dy = t.clientY - this._touch.y;
    const duration = performance.now() - this._touch.time;
    this._touch = null;

    const threshold = 30;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold && duration < 250) {
      this.emit(ACTIONS.JUMP);
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.emit(dx > 0 ? ACTIONS.RIGHT : ACTIONS.LEFT);
    } else if (dy < -threshold) {
      this.emit(ACTIONS.JUMP);
    }
  }

  _onMouseMove(e) {
    const normalized = (e.clientX / window.innerWidth) * 2 - 1;
    this.emit("pointer", normalized);
  }

  dispose() {
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("touchstart", this._onTouchStart);
    window.removeEventListener("touchend", this._onTouchEnd);
    window.removeEventListener("mousemove", this._onMouseMove);
    this.listeners.clear();
  }
}
