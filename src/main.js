import { COLORS, COLOR_HEX, COLOR_LABEL_TR, EMPTY_COLOR } from './cube/constants.js';
import {
  createSolvedState, createBlankState, cloneState, isSolved,
  isFullyPainted, countUnpainted, colorUsageCounts, centerColorOfFace,
  positionForFaceCell,
} from './cube/state.js';
import { parseMoves, applyMove, invertMoveToken } from './cube/moves.js';
import { randomScramble, defaultScrambleLength } from './cube/scramble.js';
import { validate } from './cube/validate.js';
import { isSizeReady } from './solvers/index.js';
import { createScene } from './render/scene.js';
import { buildCubieMeshes, repaintCubeGroup } from './render/cubeMesh.js';
import { CubeAnimator } from './render/animator.js';
import { createFaceNav, FACE_LABEL_TR } from './render/faceNav.js';
import { createPaint3D, popCubie, blinkCubieInvalid } from './ui/paint3d.js';
import { SolverClient } from './worker/solverClient.js';
import { initTheme } from './ui/theme.js';
import { createToaster } from './ui/toast.js';
import { renderNet } from './ui/paintNet.js';
import { celebrate } from './ui/celebration.js';

// ---------- DOM referansları ----------
const $ = (id) => document.getElementById(id);
const canvas = $('kup-canvas');
const celebrationLayer = $('kutlama-katmani');
const temaBtn = $('tema-btn');
const yardimBtn = $('yardim-btn');
const onboardingDialog = $('onboarding-dialog');
const notasyonYardimBtn = $('notasyon-yardim-btn');
const notasyonDialog = $('notasyon-dialog');
const karistirBtn = $('karistir-btn');
const sifirlaBtn = $('sifirla-btn');
const hamleGirisi = $('hamle-girisi');
const hamleUygulaBtn = $('hamle-uygula-btn');
const mod3dBtn = $('mod-3d-btn');
const modBoyamaBtn = $('mod-boyama-btn');
const boyamaAlani = $('boyama-alani');
const boyamaYonerge = $('boyama-yonerge');
const boyamaTemizBtn = $('boyama-temiz-btn');
const boyamaCozulmusBtn = $('boyama-cozulmus-btn');
const boyamaGeriBtn = $('boyama-geri-btn');
const boyamaIleriBtn = $('boyama-ileri-btn');
const boyamaDurum = $('boyama-durum');
const paletEl = $('palet');
const net2dEl = $('net-2d');
const yuzNav = $('yuz-nav');
const yuzGostergeMetin = $('yuz-gosterge-metin');
const yuzGostergeRenk = $('yuz-gosterge-renk');
const dogrulamaMesaji = $('dogrulama-mesaji');
const cozBtn = $('coz-btn');
const cozBtnMetin = $('coz-btn-metin');
const cozDurumMesaji = $('coz-durum-mesaji');
const cozumSonuc = $('cozum-sonuc');
const hamleSayisiEl = $('hamle-sayisi');
const hamleListesiEl = $('hamle-listesi');
const oynatmaCubugu = $('oynatma-cubugu');
const pbBasaDon = $('pb-basa-don');
const pbGeri = $('pb-geri');
const pbOynat = $('pb-oynat');
const pbOynatIcon = $('pb-oynat-icon');
const pbIleri = $('pb-ileri');
const pbHiz = $('pb-hiz');
const pbAdim = $('pb-adim');
const toastAlani = $('toast-alani');

const toast = createToaster(toastAlani);
initTheme(temaBtn);

// ---------- Basit kalıcı depolama ----------
function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* yok sayılır */ }
}

if (!safeGet('rubik-onboarding-gorundu')) {
  onboardingDialog.showModal();
  safeSet('rubik-onboarding-gorundu', '1');
}
yardimBtn.addEventListener('click', () => onboardingDialog.showModal());
notasyonYardimBtn.addEventListener('click', () => notasyonDialog.showModal());

// ---------- Uygulama durumu ----------
let currentSize = 2;
let cubeState = createSolvedState(currentSize);
let preSolveSnapshot = null;
let solutionMoves = [];
let playerCursor = 0;
let animatingIndex = null;
let celebrated = false;
let paintMode = false;
let selectedPaintColor = COLORS.U;

// Boyama modu geri al/yinele geçmişi: her biri cloneState() ile alınmış bağımsız
// anlık görüntüler. paintHistoryIndex şu an gösterilen durumu işaret eder.
let paintHistory = [];
let paintHistoryIndex = -1;
// Aynı geçersizlik durumunu (aynı hatalı konumlar) tekrar tekrar yanıp söndürmemek
// için son gösterilen hatanın imzasını tutar.
let lastInvalidSignature = null;

const solverClient = new SolverClient();

// ---------- 3B sahne ----------
const { camera, controls, renderer, cubeGroup, start, onTick, resize } = createScene(canvas);
let cubeMeshes = [];
let meshGeometry = null;
let meshOffset = 0;
let meshSpacing = 1.02;
let animator = null;

function disposeMeshes() {
  for (const mesh of cubeMeshes) {
    // Bir hamle animasyonu yarım kalmışsa mesh, cubeGroup'un değil geçici bir
    // pivot grubunun çocuğu olabilir; her durumda mevcut ebeveyninden kaldır.
    mesh.parent?.remove(mesh);
    mesh.material.forEach((m) => m.dispose());
  }
  meshGeometry?.dispose();
  cubeMeshes = [];
}

/** Meshleri sıfırdan kurar (anında, animasyonsuz): ilk yükleme, sıfırlama, başa dönme, boyama. */
function mountCube(state) {
  // Yarım kalmış bir animasyon varsa (pivot grubu + döndürme ortasındaki parçalar),
  // önce onu düzgünce bitirip parçaları ana gruba geri al; aksi halde terk edilmiş
  // pivot grupları sahnede kalır ve küp dağılmış görünür.
  animator?.clear();
  disposeMeshes();
  const built = buildCubieMeshes(state, COLOR_HEX);
  cubeMeshes = built.meshes;
  meshGeometry = built.geometry;
  meshOffset = built.offset;
  meshSpacing = built.spacing;
  for (const mesh of cubeMeshes) cubeGroup.add(mesh);

  animator = new CubeAnimator({ group: cubeGroup, meshes: cubeMeshes, offset: meshOffset, spacing: meshSpacing });
  animator.speedMultiplier = Number(pbHiz.value);
  animator.onMoveStart = (move) => {
    animatingIndex = move.__solutionIndex ?? null;
    updateMoveListHighlight();
  };
  animator.onMoveEnd = () => {
    animatingIndex = null;
    updateMoveListHighlight();
    checkCelebration();
  };
  animator.onQueueEmpty = () => {
    if (playerCursor >= solutionMoves.length && isPlaying) {
      isPlaying = false;
      setPlayIcon(false);
    }
  };
}

// ---------- Yüz navigasyonu ve 3D boyama girişi ----------
const faceNav = createFaceNav({
  camera,
  controls,
  onTick,
  onFaceChange: (face) => updateFaceIndicator(face),
});

createPaint3D({
  domElement: renderer.domElement,
  camera,
  getMeshes: () => cubeMeshes,
  onTap: (hit) => handle3DTap(hit),
  onDragEnd: () => faceNav.snapToNearest(),
  isEnabled: () => paintMode,
});

mountCube(cubeState);
onTick((deltaMs) => animator?.tick(deltaMs));
start();

// ---------- Yardımcılar ----------
function clearSolutionUI() {
  solutionMoves = [];
  playerCursor = 0;
  animatingIndex = null;
  celebrated = false;
  cozumSonuc.hidden = true;
  oynatmaCubugu.hidden = true;
  hamleListesiEl.innerHTML = '';
  cozDurumMesaji.textContent = '';
}

function highlightInvalidPieces(errors) {
  const positions = errors[0]?.positions ?? [];
  let rotateFace = null;
  for (const pos of positions) {
    const idx = cubeState.cubies.findIndex((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);
    if (idx === -1) continue;
    const mesh = cubeMeshes[idx];
    if (mesh) blinkCubieInvalid(mesh, onTick);
    if (!rotateFace) rotateFace = Object.keys(cubeState.cubies[idx].stickers)[0];
  }
  if (rotateFace) faceNav.goToFace(rotateFace);
}

function runValidation() {
  if (paintMode && !isFullyPainted(cubeState)) {
    lastInvalidSignature = null;
    cozBtn.disabled = true;
    dogrulamaMesaji.hidden = true;
    boyamaDurum.textContent = `Çöz'e basabilmek için ${countUnpainted(cubeState)} kare daha boyayın.`;
    return { valid: false, errors: [], incomplete: true };
  }
  cozBtn.disabled = false;
  const result = validate(cubeState);
  if (result.valid) {
    dogrulamaMesaji.hidden = true;
    lastInvalidSignature = null;
    if (paintMode) boyamaDurum.textContent = 'Tüm kareler dolduruldu.';
  } else {
    dogrulamaMesaji.hidden = false;
    dogrulamaMesaji.textContent = result.errors[0].message;
    if (paintMode) {
      boyamaDurum.textContent = 'Tüm kareler dolduruldu, ama bir sorun var (yukarıya bakın).';
      const sig = JSON.stringify(result.errors[0].positions);
      if (sig !== lastInvalidSignature) {
        lastInvalidSignature = sig;
        highlightInvalidPieces(result.errors);
      }
    }
  }
  return result;
}

function refreshPaintUI() {
  if (!paintMode) return;
  renderNet(net2dEl, cubeState, handleNetCellClick);
  renderPalette();
  runValidation();
}

function updatePaintGuidanceText() {
  if (cubeState.n % 2 === 1) {
    boyamaYonerge.textContent = "İpucu: Standart düzende Yeşil merkezli yüzü kendinize, Beyaz merkezli yüzü yukarı çevirip oradan başlayın. Küpü çevirmek için sürükleyin, boyamak için bir kareye kısaca dokunun.";
  } else {
    boyamaYonerge.textContent = `${cubeState.n}x${cubeState.n} küpte sabit merkez yoktur; yönü siz belirlersiniz. Elinizdeki küpte bir köşeyi seçin ve o köşenin renklerini aynı sırayla girin. Küpü çevirmek için sürükleyin, boyamak için bir kareye kısaca dokunun.`;
  }
}

function updateFaceIndicator(face) {
  const label = FACE_LABEL_TR[face] ?? face;
  const center = centerColorOfFace(cubeState, face);
  if (center && center !== EMPTY_COLOR) {
    yuzGostergeMetin.textContent = `${label} – ${COLOR_LABEL_TR[center]}`;
    yuzGostergeRenk.style.background = COLOR_HEX[center];
    yuzGostergeRenk.classList.remove('is-unknown');
  } else {
    yuzGostergeMetin.textContent = label;
    yuzGostergeRenk.style.background = '';
    yuzGostergeRenk.classList.add('is-unknown');
  }
}

function pushPaintHistory() {
  paintHistory = paintHistory.slice(0, paintHistoryIndex + 1);
  paintHistory.push(cloneState(cubeState));
  paintHistoryIndex = paintHistory.length - 1;
  updateUndoRedoButtons();
}

function resetPaintHistory() {
  paintHistory = [cloneState(cubeState)];
  paintHistoryIndex = 0;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  boyamaGeriBtn.disabled = paintHistoryIndex <= 0;
  boyamaIleriBtn.disabled = paintHistoryIndex >= paintHistory.length - 1;
}

function undoPaint() {
  if (paintHistoryIndex <= 0) return;
  paintHistoryIndex--;
  cubeState = cloneState(paintHistory[paintHistoryIndex]);
  repaintCubeGroup(cubeMeshes, cubeState, COLOR_HEX);
  clearSolutionUI();
  refreshPaintUI();
  updateUndoRedoButtons();
}

function redoPaint() {
  if (paintHistoryIndex >= paintHistory.length - 1) return;
  paintHistoryIndex++;
  cubeState = cloneState(paintHistory[paintHistoryIndex]);
  repaintCubeGroup(cubeMeshes, cubeState, COLOR_HEX);
  clearSolutionUI();
  refreshPaintUI();
  updateUndoRedoButtons();
}

/** Bir parçanın bir yüzünü seçili renkle boyar; aynı renk tekrar uygulanırsa boşa döner. */
function applyPaintAction(cubieIndex, face) {
  const cubie = cubeState.cubies[cubieIndex];
  if (!cubie || cubie.stickers[face] === undefined) return false;
  const current = cubie.stickers[face];
  cubie.stickers[face] = current === selectedPaintColor ? EMPTY_COLOR : selectedPaintColor;
  repaintCubeGroup(cubeMeshes, cubeState, COLOR_HEX);
  pushPaintHistory();
  clearSolutionUI();
  refreshPaintUI();
  return true;
}

function handle3DTap({ mesh, face, cubieIndex }) {
  if (!paintMode) return;
  if (!applyPaintAction(cubieIndex, face)) return;
  popCubie(mesh, onTick);
  navigator.vibrate?.(12);
}

function handleNetCellClick(face, row, col) {
  const [x, y, z] = positionForFaceCell(cubeState.n, face, row, col);
  const cubieIndex = cubeState.cubies.findIndex((c) => c.pos[0] === x && c.pos[1] === y && c.pos[2] === z);
  if (cubieIndex === -1) return;
  applyPaintAction(cubieIndex, face);
  faceNav.goToFace(face);
}

function renderPalette() {
  paletEl.innerHTML = '';
  const counts = colorUsageCounts(cubeState);
  const quota = cubeState.n * cubeState.n;
  for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
    const color = COLORS[face];
    const used = counts[color] ?? 0;
    const wrap = document.createElement('div');
    wrap.className = 'palette-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'palette-swatch';
    btn.style.background = COLOR_HEX[color];
    btn.setAttribute('aria-label', `${COLOR_LABEL_TR[color]}, ${used}/${quota} kullanıldı`);
    btn.title = COLOR_LABEL_TR[color];
    if (color === selectedPaintColor) btn.classList.add('is-selected');
    if (used === quota) btn.classList.add('is-full');
    if (used > quota) btn.classList.add('is-over');
    btn.addEventListener('click', () => {
      selectedPaintColor = color;
      renderPalette();
    });

    const countEl = document.createElement('span');
    countEl.className = 'palette-count';
    if (used === quota) countEl.classList.add('is-full');
    if (used > quota) countEl.classList.add('is-over');
    countEl.textContent = `${used}/${quota}`;

    wrap.appendChild(btn);
    wrap.appendChild(countEl);
    paletEl.appendChild(wrap);
  }
}
renderPalette();

/** Boyama modunu belirli bir durumdan (boş ya da çözülmüş) yeniden başlatır. */
function resetPaintState(useSolved) {
  cubeState = useSolved ? createSolvedState(currentSize) : createBlankState(currentSize);
  mountCube(cubeState);
  resetPaintHistory();
  clearSolutionUI();
  updatePaintGuidanceText();
  refreshPaintUI();
  updateFaceIndicator(faceNav.getCurrentFace());
}

// ---------- Boyut seçimi ----------
document.querySelectorAll('.size-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const size = Number(btn.dataset.size);
    if (size === currentSize || btn.disabled) return;
    if (!isSizeReady(size)) {
      toast(`${size}x${size} çözücüsü henüz hazır değil. Yakında eklenecek!`, 'error');
      return;
    }
    document.querySelectorAll('.size-btn').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    currentSize = size;
    if (paintMode) {
      resetPaintState(false);
    } else {
      cubeState = createSolvedState(currentSize);
      mountCube(cubeState);
      clearSolutionUI();
      resetPaintHistory();
      runValidation();
    }
  });
});

// ---------- Karıştır / manuel uygulama / sıfırla ----------
function applyScrambleToken(token) {
  const moves = parseMoves(token, cubeState.n);
  for (const move of moves) {
    applyMove(cubeState, move);
    animator.enqueue(move);
  }
}

function startFromSolvedAndApply(sequence) {
  cubeState = createSolvedState(currentSize);
  mountCube(cubeState);
  clearSolutionUI();
  try {
    applyScrambleToken(sequence);
  } catch (err) {
    toast(err.message, 'error');
    return;
  }
  resetPaintHistory();
  runValidation();
  if (paintMode) refreshPaintUI();
}

karistirBtn.addEventListener('click', () => {
  const sequence = randomScramble(currentSize, defaultScrambleLength(currentSize));
  hamleGirisi.value = sequence;
  startFromSolvedAndApply(sequence);
});

hamleUygulaBtn.addEventListener('click', () => {
  const sequence = hamleGirisi.value.trim();
  if (!sequence) {
    toast('Önce bir hamle dizisi yazın (ör. R U R\' F2).', 'error');
    return;
  }
  startFromSolvedAndApply(sequence);
});

hamleGirisi.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') hamleUygulaBtn.click();
});

sifirlaBtn.addEventListener('click', () => {
  cubeState = createSolvedState(currentSize);
  mountCube(cubeState);
  clearSolutionUI();
  resetPaintHistory();
  runValidation();
  hamleGirisi.value = '';
  if (paintMode) refreshPaintUI();
});

// ---------- Giriş modu (3D / boyama) ----------
mod3dBtn.addEventListener('click', () => setMode(false));
modBoyamaBtn.addEventListener('click', () => setMode(true));

function setMode(paint) {
  paintMode = paint;
  mod3dBtn.classList.toggle('is-active', !paint);
  mod3dBtn.setAttribute('aria-selected', String(!paint));
  modBoyamaBtn.classList.toggle('is-active', paint);
  modBoyamaBtn.setAttribute('aria-selected', String(paint));
  boyamaAlani.hidden = !paint;
  yuzNav.hidden = !paint;
  if (!paint) return;
  if (paintHistory.length === 0) {
    resetPaintState(false);
  } else {
    updatePaintGuidanceText();
    refreshPaintUI();
    updateFaceIndicator(faceNav.getCurrentFace());
  }
}

boyamaTemizBtn.addEventListener('click', () => resetPaintState(false));
boyamaCozulmusBtn.addEventListener('click', () => resetPaintState(true));
boyamaGeriBtn.addEventListener('click', () => undoPaint());
boyamaIleriBtn.addEventListener('click', () => redoPaint());

document.querySelectorAll('.face-nav-btn[data-dir]').forEach((btn) => {
  btn.addEventListener('click', () => faceNav.navigate(btn.dataset.dir));
});

// ---------- Çözüm ----------
function setSolveBusy(busy, label) {
  cozBtn.disabled = busy;
  cozBtnMetin.textContent = busy ? 'Çözülüyor…' : 'Çöz';
  cozDurumMesaji.textContent = label ?? '';
}

cozBtn.addEventListener('click', async () => {
  const result = runValidation();
  if (!result.valid) {
    if (result.incomplete) return;
    toast(result.errors[0].message, 'error');
    return;
  }
  if (!isSizeReady(cubeState.n)) {
    toast(`${cubeState.n}x${cubeState.n} çözücüsü henüz hazır değil. Yakında eklenecek!`, 'error');
    return;
  }
  if (isSolved(cubeState)) {
    toast('Küp zaten çözülü durumda.', 'success');
    return;
  }

  const notReadyYet = !solverClient.isReady(cubeState.n);
  setSolveBusy(true, notReadyYet ? 'İlk hazırlık yapılıyor, birkaç saniye sürebilir…' : 'Çözülüyor…');

  preSolveSnapshot = cloneState(cubeState);
  try {
    const t0 = performance.now();
    const moves = await solverClient.solve(cubeState);
    const elapsed = performance.now() - t0;
    solutionMoves = moves;
    playerCursor = 0;
    celebrated = false;
    renderSolutionList();
    oynatmaCubugu.hidden = false;
    setSolveBusy(false, `Çözüm ${moves.length} hamlede bulundu (${elapsed.toFixed(0)} ms).`);
  } catch (err) {
    setSolveBusy(false, '');
    toast(err.message, 'error');
  }
});

function renderSolutionList() {
  hamleListesiEl.innerHTML = '';
  solutionMoves.forEach((token, i) => {
    const li = document.createElement('li');
    li.textContent = token;
    li.dataset.index = String(i);
    hamleListesiEl.appendChild(li);
  });
  hamleSayisiEl.textContent = String(solutionMoves.length);
  cozumSonuc.hidden = solutionMoves.length === 0;
  updateMoveListHighlight();
}

function updateMoveListHighlight() {
  const items = hamleListesiEl.children;
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle('is-done', i < playerCursor);
    items[i].classList.toggle('is-active', i === animatingIndex);
  }
  pbAdim.textContent = `${playerCursor} / ${solutionMoves.length}`;
  pbGeri.disabled = playerCursor <= 0;
  pbIleri.disabled = playerCursor >= solutionMoves.length;
  pbBasaDon.disabled = !preSolveSnapshot;
}

function checkCelebration() {
  if (!celebrated && solutionMoves.length > 0 && playerCursor >= solutionMoves.length && isSolved(cubeState)) {
    celebrated = true;
    celebrate(celebrationLayer);
    toast('Küp çözüldü!', 'success');
  }
}

// ---------- Oynatma kontrolleri ----------
function enqueueSolutionMove(index) {
  const token = solutionMoves[index];
  const move = parseMoves(token, cubeState.n)[0];
  move.__solutionIndex = index;
  applyMove(cubeState, move);
  animator.enqueue(move);
}

function setPlayIcon(playing) {
  pbOynatIcon.innerHTML = playing
    ? '<path fill="currentColor" d="M7 5h4v14H7zm6 0h4v14h-4z"/>'
    : '<path fill="currentColor" d="M8 5v14l11-7z"/>';
  pbOynat.setAttribute('aria-label', playing ? 'Duraklat' : 'Oynat');
}

let isPlaying = false;

pbOynat.addEventListener('click', () => {
  if (playerCursor >= solutionMoves.length) return;
  isPlaying = !isPlaying;
  if (isPlaying) {
    animator.setPaused(false);
    while (playerCursor < solutionMoves.length) {
      enqueueSolutionMove(playerCursor);
      playerCursor++;
    }
    setPlayIcon(true);
    updateMoveListHighlight();
  } else {
    animator.setPaused(true);
    setPlayIcon(false);
  }
});

pbIleri.addEventListener('click', () => {
  if (playerCursor >= solutionMoves.length) return;
  isPlaying = false;
  setPlayIcon(false);
  animator.setPaused(true);
  enqueueSolutionMove(playerCursor);
  playerCursor++;
  updateMoveListHighlight();
});

pbGeri.addEventListener('click', () => {
  if (playerCursor <= 0 || animator.isAnimating) return;
  isPlaying = false;
  setPlayIcon(false);
  playerCursor--;
  const inverseToken = invertMoveToken(solutionMoves[playerCursor]);
  const move = parseMoves(inverseToken, cubeState.n)[0];
  applyMove(cubeState, move);
  animator.setPaused(true);
  animator.enqueue(move);
  updateMoveListHighlight();
});

pbBasaDon.addEventListener('click', () => {
  if (!preSolveSnapshot) return;
  isPlaying = false;
  setPlayIcon(false);
  animator.clear();
  cubeState = cloneState(preSolveSnapshot);
  mountCube(cubeState);
  playerCursor = 0;
  celebrated = false;
  updateMoveListHighlight();
});

pbHiz.addEventListener('input', () => {
  if (animator) animator.speedMultiplier = Number(pbHiz.value);
});

window.addEventListener('resize', () => resize());
