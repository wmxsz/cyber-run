export class ObjectPool {
  constructor(factory, initialSize = 0) {
    this.factory = factory;
    this.items = [];
    for (let i = 0; i < initialSize; i++) this.items.push(factory());
  }

  acquire() {
    return this.items.pop() || this.factory();
  }

  release(item) {
    item.userData.hit = false;
    item.userData.passed = false;
    this.items.push(item);
  }

  dispose(disposeItem) {
    for (const item of this.items) disposeItem(item);
    this.items.length = 0;
  }
}
