export class MissionSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.completed = 0;
    this.progress = 0;
    this.targets = [
      { id: "near", label: "近闪 3 次", target: 3, value: 0 },
      { id: "core", label: "收集 4 个核心", target: 4, value: 0 },
      { id: "score", label: "突破 2500 分", target: 2500, value: 0 },
    ];
    this.current = 0;
    this.reward = 0;
  }

  _current() {
    return this.targets[this.current] || null;
  }

  update(score) {
    const mission = this._current();
    if (!mission) return null;
    if (mission.id === "score") mission.value = Math.max(mission.value, score);
    this.progress = Math.min(1, mission.value / mission.target);
    if (mission.value >= mission.target) return this.complete();
    return null;
  }

  recordNearMiss() {
    const mission = this._current();
    if (mission?.id === "near") mission.value += 1;
  }

  recordCore() {
    const mission = this._current();
    if (mission?.id === "core") mission.value += 1;
  }

  complete() {
    const mission = this._current();
    if (!mission) return null;
    const reward = mission.id === "score" ? 25 : 20;
    const completed = { label: mission.label, reward };
    this.completed += 1;
    this.reward += reward;
    this.current += 1;
    this.progress = 0;
    return completed;
  }

  getStatus() {
    const mission = this._current();
    return mission
      ? { label: mission.label, value: Math.floor(mission.value), target: mission.target, progress: this.progress, completed: this.completed }
      : { label: "ALL OBJECTIVES COMPLETE", value: 1, target: 1, progress: 1, completed: this.completed };
  }
}
