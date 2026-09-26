/**
 * Ana iş parçacığından Web Worker'daki çözücüye erişim sağlayan istemci.
 * Ağır arama/BFS hesaplamaları burada değil, worker.js içinde çalışır.
 */
export class SolverClient {
  constructor() {
    this.worker = new Worker(new URL('./solver.worker.js', import.meta.url), { type: 'module' });
    this.pending = new Map();
    this.nextId = 1;
    this.ready = { 2: false, 3: false, 4: false };
    this.readyListeners = new Set();
    this.worker.onmessage = (event) => this._handleMessage(event.data);
  }

  _handleMessage(data) {
    if (data.type === 'ready') {
      this.ready[data.size] = true;
      for (const listener of this.readyListeners) listener(data.size);
      return;
    }
    const pending = this.pending.get(data.id);
    if (!pending) return;
    this.pending.delete(data.id);
    if (data.type === 'result') pending.resolve(data.moves);
    else pending.reject(new Error(data.message));
  }

  onReady(listener) {
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  isReady(n) {
    return Boolean(this.ready[n]);
  }

  solve(state) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type: 'solve', state });
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
