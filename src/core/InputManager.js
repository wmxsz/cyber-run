export const ACTIONS = Object.freeze({
  LEFT: "left",
  RIGHT: "right",
  JUMP: "jump",
  SLIDE: "slide",
  BOOST: "boost",
  PAUSE: "pause",
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
  KeyS: ACTIONS.SLIDE,
  ArrowDown: ACTIONS.SLIDE,
  ShiftLeft: ACTIONS.BOOST,
  ShiftRight: ACTIONS.BOOST,
  KeyE: ACTIONS.BOOST,
  KeyP: ACTIONS.PAUSE,
  Escape: ACTIONS.PAUSE,
  KeyM: ACTIONS.MUTE,
};

export class InputManager {
  constructor() {
    this.listeners = new Set();
    this._buttonHandlers = new Map();
    this._touch = null;
    this._touches = new Set();
    this._onKey = this._onKey.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onTouchCancel = this._onTouchCancel.bind(this);
    this._onContextMenu = (e) => e.preventDefault();
    this._onMouseMove = this._onMouseMove.bind(this);
    window.addEventListener("keydown", this._onKey, { passive: false });
    window.addEventListener("touchstart", this._onTouchStart, { passive: false });
    window.addEventListener("touchend", this._onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", this._onTouchCancel, { passive: false });
    window.addEventListener("contextmenu", this._onContextMenu, { passive: false });
    window.addEventListener("mousemove", this._onMouseMove, { passive: true });
    this.bindButton("btn-left", ACTIONS.LEFT);
    this.bindButton("btn-right", ACTIONS.RIGHT);
    this.bindButton("btn-jump", ACTIONS.JUMP);
    this.bindButton("btn-slide", ACTIONS.SLIDE);
    this.bindButton("btn-boost", ACTIONS.BOOST);
    this.bindButton("btn-pause", ACTIONS.PAUSE);
  }
  onAction(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(action, payload) { for (const fn of this.listeners) fn(action, payload); }
  bindButton(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = (e) => { e.preventDefault(); this.emit(action); };
    this._buttonHandlers.set(el, handler);
    el.addEventListener("pointerdown", handler);
  }
  _onKey(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (e.repeat && [ACTIONS.PAUSE, ACTIONS.BOOST].includes(action)) return;
    this.emit(action);
  }
  _onTouchStart(e) {
    const target = e.target;
    if (target instanceof Element && target.closest("button, a, input, select, textarea")) return;
    if (this._touch) return;
    const t = e.changedTouches[0];
    this._touch = { identifier: t.identifier, x: t.clientX, y: t.clientY, time: performance.now() };
  }
  _onTouchEnd(e) {
    if (!this._touch || !e.changedTouches.length) return;
    const target = e.target;
    if (target instanceof Element && target.closest("button, a, input, select, textarea")) { this._touch = null; return; }
    e.preventDefault();
    const t = Array.from(e.changedTouches).find((touch) => touch.identifier === this._touch.identifier);
    if (!t) return;
    const dx = t.clientX - this._touch.x;
    const dy = t.clientY - this._touch.y;
    const duration = performance.now() - this._touch.time;
    this._touch = null;
    const threshold = 30;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < threshold && duration < 250) { this.emit(ACTIONS.JUMP); return; }
    if (ax > ay * 1.12) this.emit(dx > 0 ? ACTIONS.RIGHT : ACTIONS.LEFT);
    else if (dy < -threshold) this.emit(ACTIONS.JUMP);
    else if (dy > threshold) this.emit(ACTIONS.SLIDE);
  }
  _onTouchCancel() {
    this._touch = null;
  }

  _onMouseMove(e) {
    const normalized = (e.clientX / window.innerWidth) * 2 - 1;
    this.emit("pointer", normalized);
  }
  dispose() {
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("touchstart", this._onTouchStart);
    window.removeEventListener("touchend", this._onTouchEnd);
    window.removeEventListener("touchcancel", this._onTouchCancel);
    window.removeEventListener("contextmenu", this._onContextMenu);
    window.removeEventListener("mousemove", this._onMouseMove);
    for (const [el, handler] of this._buttonHandlers) el.removeEventListener("pointerdown", handler);
    this._buttonHandlers.clear();
    this._touch = null;
    this.listeners.clear();
  }
}
