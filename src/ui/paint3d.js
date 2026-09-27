import * as THREE from 'three';
import { MATERIAL_FACE_ORDER } from '../render/cubeMesh.js';

const TAP_MAX_DISTANCE_PX = 8;
const TAP_MAX_DURATION_MS = 250;
const FRONT_FACING_THRESHOLD = 0.2;

/**
 * 3D küp üzerinde dokunarak boyama için sürükleme/dokunma ayrımı ve raycasting kurar.
 * Sürükleme (döndürme) her zaman OrbitControls'a bırakılır; bu yalnızca "bu bir dokunma
 * mıydı" sorusunu izleyip, öyleyse hangi kübün hangi yüzüne dokunulduğunu bulur.
 */
export function createPaint3D({ domElement, camera, getMeshes, onTap, onDragEnd, isEnabled }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const activePointers = new Map();
  let dragMoved = false;

  function toNDC(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function handlePointerDown(e) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, time: performance.now() });
    if (activePointers.size === 1) dragMoved = false;
  }

  function handlePointerMove(e) {
    const start = activePointers.get(e.pointerId);
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MAX_DISTANCE_PX) dragMoved = true;
  }

  function handlePointerUp(e) {
    const start = activePointers.get(e.pointerId);
    activePointers.delete(e.pointerId);
    if (!start || !isEnabled()) return;
    const wasSinglePointerGesture = activePointers.size === 0;
    const duration = performance.now() - start.time;
    const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);

    if (!dragMoved && distance <= TAP_MAX_DISTANCE_PX && duration <= TAP_MAX_DURATION_MS && wasSinglePointerGesture) {
      performRaycastPaint(e.clientX, e.clientY);
    } else if (wasSinglePointerGesture) {
      onDragEnd?.();
    }
  }

  function handlePointerCancel() {
    activePointers.clear();
  }

  function performRaycastPaint(clientX, clientY) {
    toNDC(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    const meshes = getMeshes();
    const hits = raycaster.intersectObjects(meshes, false);
    for (const hit of hits) {
      if (!hit.face) continue;
      const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const toCamera = camera.position.clone().sub(hit.point).normalize();
      if (worldNormal.dot(toCamera) <= FRONT_FACING_THRESHOLD) continue; // kenardan görünen yüzey, tam karşıdan değil
      const face = MATERIAL_FACE_ORDER[hit.face.materialIndex];
      onTap?.({ mesh: hit.object, face, cubieIndex: hit.object.userData.cubieIndex });
      return;
    }
  }

  domElement.addEventListener('pointerdown', handlePointerDown);
  domElement.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerCancel);

  function dispose() {
    domElement.removeEventListener('pointerdown', handlePointerDown);
    domElement.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  }

  return { dispose };
}

/** Bir küp parçasını kısaca büyütüp küçülterek boyama geri bildirimi ("pop") verir. */
export function popCubie(mesh, onTick, durationMs = 200) {
  const start = performance.now();
  const unsubscribe = onTick(() => {
    const t = Math.min(1, (performance.now() - start) / durationMs);
    const bump = t < 0.5 ? t * 2 : 2 - t * 2; // 0 -> 1 -> 0 üçgen dalga
    const scale = 1 + 0.12 * bump;
    mesh.scale.setScalar(scale);
    if (t >= 1) {
      mesh.scale.setScalar(1);
      unsubscribe();
    }
  });
}

/** Geçersiz bir parçayı birkaç kez kırmızı parlatarak (emissive) uyarır. */
export function blinkCubieInvalid(mesh, onTick, durationMs = 1600) {
  const start = performance.now();
  const originalEmissive = mesh.material.map((m) => m.emissive.getHex());
  const unsubscribe = onTick(() => {
    const elapsed = performance.now() - start;
    const t = Math.min(1, elapsed / durationMs);
    const phase = (elapsed / 180) % 1;
    const intensity = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    mesh.material.forEach((m) => m.emissive.setRGB(intensity * 0.8, 0, 0));
    if (t >= 1) {
      mesh.material.forEach((m, i) => m.emissive.setHex(originalEmissive[i]));
      unsubscribe();
    }
  });
}
