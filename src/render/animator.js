import * as THREE from 'three';
import { gridPosFromMeshPosition } from './cubeMesh.js';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Küp mesh'lerinin hamle animasyonlarını yönetir: hamleler bir kuyrukta bekler, aynı anda
 * yalnızca biri oynatılır. Etkilenen mesh'ler geçici bir pivot gruba (dünya dönüşümü
 * korunarak) taşınır, pivot döndürülür, animasyon bitince mesh'ler ana gruba geri
 * ebeveynlenir ve mantıksal ızgara konumu güncellenir.
 */
export class CubeAnimator {
  constructor({ group, meshes, offset, spacing, baseDurationMs = 260 }) {
    this.group = group;
    this.meshes = meshes;
    this.offset = offset;
    this.spacing = spacing;
    this.baseDurationMs = baseDurationMs;
    this.speedMultiplier = 1;
    this.queue = [];
    this.current = null;
    this.paused = false;
    this.onMoveStart = null;
    this.onMoveEnd = null;
    this.onQueueEmpty = null;
  }

  get isAnimating() {
    return Boolean(this.current);
  }

  get queueLength() {
    return this.queue.length + (this.current ? 1 : 0);
  }

  enqueue(move) {
    this.queue.push(move);
    if (!this.paused) this._tryStartNext();
  }

  clear() {
    if (this.current) this._finishMove(true);
    this.queue = [];
  }

  setPaused(paused) {
    this.paused = paused;
    if (!paused) this._tryStartNext();
  }

  _tryStartNext() {
    if (this.current || this.queue.length === 0 || this.paused) return;
    this._startMove(this.queue.shift());
  }

  _startMove(move) {
    const { axis, layers, quarters } = move;
    const layerSet = new Set(layers);
    const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const pivot = new THREE.Group();
    this.group.add(pivot);
    const movingMeshes = [];
    for (const mesh of this.meshes) {
      if (layerSet.has(mesh.userData.gridPos[axisIdx])) {
        pivot.attach(mesh);
        movingMeshes.push(mesh);
      }
    }
    const totalAngle = quarters * (Math.PI / 2);
    this.current = { pivot, movingMeshes, axis, totalAngle, elapsed: 0, move };
    this.onMoveStart?.(move);
  }

  /** requestAnimationFrame döngüsünden her karede çağrılır. deltaMs: geçen süre (ms). */
  tick(deltaMs) {
    if (!this.current) {
      this._tryStartNext();
      return;
    }
    const cur = this.current;
    cur.elapsed += deltaMs * this.speedMultiplier;
    const duration = this.baseDurationMs * (Math.abs(cur.totalAngle) / (Math.PI / 2));
    const t = Math.min(1, duration <= 0 ? 1 : cur.elapsed / duration);
    const eased = easeInOutCubic(t);
    cur.pivot.rotation.set(0, 0, 0);
    cur.pivot.rotation[cur.axis] = cur.totalAngle * eased;

    if (t >= 1) this._finishMove(false);
  }

  _finishMove(skipToEnd) {
    const cur = this.current;
    if (!cur) return;
    if (skipToEnd) {
      cur.pivot.rotation.set(0, 0, 0);
      cur.pivot.rotation[cur.axis] = cur.totalAngle;
    }
    for (const mesh of cur.movingMeshes) {
      this.group.attach(mesh);
      mesh.position.x = Math.round(mesh.position.x / this.spacing) * this.spacing;
      mesh.position.y = Math.round(mesh.position.y / this.spacing) * this.spacing;
      mesh.position.z = Math.round(mesh.position.z / this.spacing) * this.spacing;
      mesh.userData.gridPos = gridPosFromMeshPosition(mesh, this.offset, this.spacing);
    }
    this.group.remove(cur.pivot);
    const finishedMove = cur.move;
    this.current = null;
    this.onMoveEnd?.(finishedMove);
    if (this.queue.length === 0) this.onQueueEmpty?.();
    this._tryStartNext();
  }
}
