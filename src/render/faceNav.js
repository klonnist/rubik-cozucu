import * as THREE from 'three';

// 6 kanonik "yüze tam karşıdan bakış" konumu (birim yön vektörü) ve o bakışta ekranda
// "yukarı" sayılacak dünya yönü. U/D için bakış ekseni Y olduğundan yukarı vektörü F/B
// ekseninden seçilir (aksi halde kamera "up" vektörü bakış yönüyle çakışır).
const FACE_VIEWS = {
  F: { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
  B: { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
  R: { dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
  L: { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
  U: { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
  D: { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
};

// Ok tuşu navigasyonu için komşuluk çizelgesi: her yüzden yukarı/aşağı/sol/sağ hangi
// yüze geçileceğini tanımlar (bir küpün etrafında "dört yöne bakma" sezgisiyle tutarlı).
const NAV_ADJACENCY = {
  F: { up: 'U', down: 'D', left: 'L', right: 'R' },
  U: { up: 'B', down: 'F', left: 'L', right: 'R' },
  D: { up: 'F', down: 'B', left: 'L', right: 'R' },
  R: { up: 'U', down: 'D', left: 'F', right: 'B' },
  L: { up: 'U', down: 'D', left: 'B', right: 'F' },
  B: { up: 'U', down: 'D', left: 'R', right: 'L' },
};

export const FACE_LABEL_TR = {
  U: 'Üst yüz',
  D: 'Alt yüz',
  F: 'Ön yüz',
  B: 'Arka yüz',
  R: 'Sağ yüz',
  L: 'Sol yüz',
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function nearestFace(camera, target) {
  const dir = camera.position.clone().sub(target).normalize();
  let best = 'F';
  let bestDot = -Infinity;
  for (const [face, view] of Object.entries(FACE_VIEWS)) {
    const dot = dir.dot(view.dir);
    if (dot > bestDot) {
      bestDot = dot;
      best = face;
    }
  }
  return best;
}

/**
 * Kamera için yüze-tam-karşıdan-bakış (face-snap) navigasyonu kurar. Serbest sürükleme
 * bittiğinde en yakın yüze; ok tuşlarıyla komşu yüze yumuşak biçimde oturtur (animasyonlu).
 */
export function createFaceNav({ camera, controls, onTick, onFaceChange }) {
  let animating = false;
  let currentFace = nearestFace(camera, controls.target);

  function notifyFaceChange() {
    onFaceChange?.(currentFace);
  }

  function animateTo(face, durationMs = 380) {
    animating = true;
    controls.enabled = false;
    // OrbitControls, damping'den kalan açısal hızı (sphericalDelta) her update()
    // çağrısında konuma eklemeye devam eder; bu, biz kamerayı elle konumlandırırken
    // sürüklemeden kalan bir kaymaya (hafif yanlış açıya oturma) yol açar. Damping'i
    // bir kare için kapatıp update() çağırmak bu kalan hızı sıfırlar, animasyon
    // başlamadan önce.
    const wasDamping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = wasDamping;

    const view = FACE_VIEWS[face];
    const radius = camera.position.distanceTo(controls.target) || 6;
    const startPos = camera.position.clone();
    const startUp = camera.up.clone();
    const endPos = view.dir.clone().multiplyScalar(radius).add(controls.target);
    const endUp = view.up.clone();
    const startTime = performance.now();

    function step() {
      const t = Math.min(1, (performance.now() - startTime) / durationMs);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(startPos, endPos, eased);
      camera.up.copy(startUp).lerp(endUp, eased).normalize();
      camera.lookAt(controls.target);
      if (t >= 1) {
        animating = false;
        controls.enabled = true;
        currentFace = face;
        notifyFaceChange();
        unsubscribe();
      }
    }
    const unsubscribe = onTick(step);
  }

  function snapToNearest() {
    if (animating) return;
    const face = nearestFace(camera, controls.target);
    if (face === currentFace) {
      // Zaten en yakın yüzdeyiz ama küçük bir kayma olabilir; tam hizaya nazikçe oturt.
      animateTo(face, 220);
      return;
    }
    animateTo(face);
  }

  function goToFace(face, durationMs) {
    if (animating || face === currentFace) return;
    animateTo(face, durationMs);
  }

  function navigate(direction) {
    if (animating) return;
    const next = NAV_ADJACENCY[currentFace]?.[direction];
    if (next) animateTo(next);
  }

  function getCurrentFace() {
    return currentFace;
  }

  function isAnimating() {
    return animating;
  }

  // Başlangıçta mevcut kamera açısını en yakın yüze nazikçe oturt (tutarlı bir başlangıç
  // durumu için), ama animasyonsuz (anında).
  function snapImmediate(face) {
    const view = FACE_VIEWS[face ?? currentFace];
    const radius = camera.position.distanceTo(controls.target) || 6;
    camera.position.copy(view.dir.clone().multiplyScalar(radius).add(controls.target));
    camera.up.copy(view.up);
    camera.lookAt(controls.target);
    currentFace = face ?? currentFace;
    notifyFaceChange();
  }

  return { snapToNearest, goToFace, navigate, getCurrentFace, isAnimating, snapImmediate };
}
