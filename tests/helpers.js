// テスト用のインメモリ Storage（localStorage 互換の最小実装）
export class MemoryStorage {
  constructor(initial = {}) {
    /** @type {Map<string, string>} */
    this.map = new Map(Object.entries(initial));
    this.failWrites = false;
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(key, String(value));
  }
  keys() {
    return [...this.map.keys()];
  }
}
