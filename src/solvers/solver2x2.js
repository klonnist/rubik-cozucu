import { createSolvedState, cloneState } from '../cube/state.js';
import { applyMove, applyMoveString, parseMove, invertMovesString } from '../cube/moves.js';
import { cornerPositions, findCubieAt, colorSetKey, cornerOrientation } from '../cube/corners.js';

/**
 * 2x2 çözücü: klasik "bir köşeyi referans olarak sabitle" tekniği.
 *
 * Referans köşe (pozisyon 0) yalnızca U/R/F hamleleriyle asla yerinden oynamaz (bu üç
 * yüzün katmanları o köşeyi içermez). Bütün-küp simetrisi sayesinde herhangi bir karışık
 * durum, uygun bir "yeniden tutuş" (x/y/z bütün-küp döndürmesi) ile referans köşe doğru
 * konum ve yönelimde olacak şekilde eşdeğer bir gösterime taşınabilir. Böylece arama
 * uzayı 7 köşenin permütasyonu × yönelimi = 7! x 3^6 = 3.674.160 duruma iner.
 *
 * Bu küçük uzay üzerinde TAM (yaklaşık değil) bir BFS mesafe tablosu bir kez kurulur;
 * çözüm daha sonra bu tabloyu izleyen açgözlü bir inişle (arama yapmadan) bulunur, bu da
 * "1 saniyenin altında" hedefini rahatça karşılar. Sonuç, referans köşeyi bulmak için
 * kullanılan döndürme, her hamleyi orijinal küp çerçevesine geri çeviren bir konjügasyon
 * tablosuyla "tercüme edilerek" yalnızca gerçek yüz hamleleri (U/D/F/B/R/L) olarak
 * döndürülür; kullanıcıya bütün-küp döndürmesi gösterilmez.
 */

const N = 2;
const POSITIONS = cornerPositions(N); // sabit sıralı 8 pozisyon
const ANCHOR_POS_INDEX = 0;

const FREE_MOVE_NAMES = [];
for (const face of ['U', 'R', 'F']) {
  for (const suffix of ['', "'", '2']) FREE_MOVE_NAMES.push(face + suffix);
}

const ALL_MOVE_NAMES = [];
for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
  for (const suffix of ['', "'", '2']) ALL_MOVE_NAMES.push(face + suffix);
}

// 24 bütün-küp yönü: hangi yüzün "yukarı" olduğu (6 seçim) x o eksende hangi çeyrek
// döndürmenin uygulandığı (4 seçim). x/y/z zaten test edilmiş bütün-küp hamleleridir.
const REORIENTATIONS = [
  '', 'y', 'y2', "y'",
  'x', 'x y', 'x y2', "x y'",
  "x'", "x' y", "x' y2", "x' y'",
  'x2', 'x2 y', 'x2 y2', "x2 y'",
  'z', 'z y', 'z y2', "z y'",
  "z'", "z' y", "z' y2", "z' y'",
];

const PERM7_SIZE = 5040; // 7!
const ORIENT6_SIZE = 729; // 3^6
const TABLE_SIZE = PERM7_SIZE * ORIENT6_SIZE; // 3.674.160
const UNVISITED = 255;

const POPCOUNT7 = new Uint8Array(128);
for (let m = 0; m < 128; m++) {
  let c = 0;
  let x = m;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  POPCOUNT7[m] = c;
}
const FACT7 = [720, 120, 24, 6, 2, 1, 1];

let freeMoveTables = null;
let conjugationTable = null;
let pruneTable = null;
let readyPromise = null;

function serializeState(state) {
  return POSITIONS.map((pos) => {
    const s = findCubieAt(state, pos).stickers;
    return ['U', 'D', 'F', 'B', 'R', 'L'].map((f) => s[f] ?? '.').join('');
  }).join('|');
}

function buildFreeMoveTables() {
  const solved = createSolvedState(N);
  const identityOf = new Map();
  POSITIONS.forEach((pos, idx) => identityOf.set(colorSetKey(findCubieAt(solved, pos).stickers), idx));

  const tables = {};
  for (const name of FREE_MOVE_NAMES) {
    const state = createSolvedState(N);
    applyMove(state, parseMove(name, N));
    const permFrom = new Array(8);
    const orientDelta = new Array(8);
    POSITIONS.forEach((pos, j) => {
      const cubie = findCubieAt(state, pos);
      permFrom[j] = identityOf.get(colorSetKey(cubie.stickers));
      orientDelta[j] = cornerOrientation(pos, N, cubie.stickers);
    });
    tables[name] = { permFrom, orientDelta };
  }
  return { tables, identityOf };
}

function buildConjugationTable() {
  const table = {};
  for (const g of REORIENTATIONS) {
    table[g] = {};
    for (const m of FREE_MOVE_NAMES) {
      const target = createSolvedState(N);
      if (g) applyMoveString(target, g);
      applyMoveString(target, m);
      if (g) applyMoveString(target, invertMovesString(g));
      const targetSig = serializeState(target);

      let found = null;
      for (const cand of ALL_MOVE_NAMES) {
        const test = createSolvedState(N);
        applyMoveString(test, cand);
        if (serializeState(test) === targetSig) {
          found = cand;
          break;
        }
      }
      if (!found) throw new Error(`Konjügasyon hamlesi bulunamadı: g="${g}" m="${m}"`);
      table[g][m] = found;
    }
  }
  return table;
}

function encodeCombined(perm, orient) {
  let remaining = 0b1111111;
  let permIdx = 0;
  let orientIdx = 0;
  let oi = 0;
  for (let posIdx = 0; posIdx < 8; posIdx++) {
    if (posIdx === ANCHOR_POS_INDEX) continue;
    const v = perm[posIdx] - 1; // kimlik 1..7 -> rütbe 0..6
    const mask = (1 << v) - 1;
    const smaller = POPCOUNT7[remaining & mask];
    permIdx += smaller * FACT7[oi];
    remaining &= ~(1 << v);
    if (oi < 6) orientIdx = orientIdx * 3 + orient[posIdx];
    oi++;
  }
  return permIdx * ORIENT6_SIZE + orientIdx;
}

// Hamle tablolarını düz (flat) Int8Array'lere dönüştürür: BFS'in iç döngüsünde nesne
// erişimi yerine ardışık bellek erişimi kullanılır (önemli ölçüde daha hızlı).
function flattenMoveTables() {
  const permFromFlat = new Int8Array(FREE_MOVE_NAMES.length * 8);
  const orientDeltaFlat = new Int8Array(FREE_MOVE_NAMES.length * 8);
  FREE_MOVE_NAMES.forEach((name, m) => {
    const mv = freeMoveTables[name];
    for (let j = 0; j < 8; j++) {
      permFromFlat[m * 8 + j] = mv.permFrom[j];
      orientDeltaFlat[m * 8 + j] = mv.orientDelta[j];
    }
  });
  return { permFromFlat, orientDeltaFlat };
}

function buildPruneTable() {
  const { permFromFlat, orientDeltaFlat } = flattenMoveTables();
  const numMoves = FREE_MOVE_NAMES.length;
  const table = new Uint8Array(TABLE_SIZE).fill(UNVISITED);

  // Her durum, BFS kuyruğunda 16 bayt (8 perm + 8 orient) olarak düz bir buffer'da tutulur.
  let capacity = 1 << 16;
  let queuePerm = new Uint8Array(capacity * 8);
  let queueOrient = new Uint8Array(capacity * 8);
  let queueDepth = new Uint8Array(capacity);

  function ensureCapacity(need) {
    if (need <= capacity) return;
    while (capacity < need) capacity *= 2;
    const newPerm = new Uint8Array(capacity * 8);
    newPerm.set(queuePerm);
    queuePerm = newPerm;
    const newOrient = new Uint8Array(capacity * 8);
    newOrient.set(queueOrient);
    queueOrient = newOrient;
    const newDepth = new Uint8Array(capacity);
    newDepth.set(queueDepth);
    queueDepth = newDepth;
  }

  for (let j = 0; j < 8; j++) {
    queuePerm[j] = j;
    queueOrient[j] = 0;
  }
  queueDepth[0] = 0;
  table[encodeCombined(queuePerm.subarray(0, 8), queueOrient.subarray(0, 8))] = 0;

  let head = 0;
  let tail = 1;
  let visited = 1;
  const newPerm = new Uint8Array(8);
  const newOrient = new Uint8Array(8);

  while (head < tail && visited < TABLE_SIZE) {
    const base = head * 8;
    const depth = queueDepth[head];
    head++;
    for (let m = 0; m < numMoves; m++) {
      const mBase = m * 8;
      for (let j = 0; j < 8; j++) {
        const from = permFromFlat[mBase + j];
        newPerm[j] = queuePerm[base + from];
        newOrient[j] = (queueOrient[base + from] + orientDeltaFlat[mBase + j]) % 3;
      }
      const idx = encodeCombined(newPerm, newOrient);
      if (table[idx] === UNVISITED) {
        table[idx] = depth + 1;
        ensureCapacity(tail + 1);
        const outBase = tail * 8;
        for (let j = 0; j < 8; j++) {
          queuePerm[outBase + j] = newPerm[j];
          queueOrient[outBase + j] = newOrient[j];
        }
        queueDepth[tail] = depth + 1;
        tail++;
        visited++;
      }
    }
  }

  if (visited !== TABLE_SIZE) {
    throw new Error(`2x2 budama tablosu eksik oluştu: ${visited}/${TABLE_SIZE} durum bulundu.`);
  }
  return table;
}

function ensureTablesSync() {
  if (pruneTable) return;
  const { tables } = buildFreeMoveTables();
  freeMoveTables = tables;
  conjugationTable = buildConjugationTable();
  pruneTable = buildPruneTable();
}

/**
 * Tabloları arka planda (event loop'u bloklamadan, kademeli olarak) ısıtır. Worker
 * başlatılır başlatılmaz çağrılması önerilir; kullanıcı "Çöz"e bastığında tablo zaten
 * hazır olur. Senkron sürüm (solve2x2 içinde çağrılan ensureTablesSync) her durumda
 * güvenlik ağı olarak kalır.
 */
export function warmUp() {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve) => {
    ensureTablesSync();
    resolve();
  });
  return readyPromise;
}

function stateToCoords(state) {
  const perm = new Array(8);
  const orient = new Array(8);
  POSITIONS.forEach((pos, j) => {
    const cubie = findCubieAt(state, pos);
    perm[j] = freeMoveIdentity(cubie);
    orient[j] = cornerOrientation(pos, N, cubie.stickers);
  });
  return { perm, orient };
}

let identityOfCache = null;
function freeMoveIdentity(cubie) {
  if (!identityOfCache) {
    const solved = createSolvedState(N);
    identityOfCache = new Map();
    POSITIONS.forEach((pos, idx) => identityOfCache.set(colorSetKey(findCubieAt(solved, pos).stickers), idx));
  }
  return identityOfCache.get(colorSetKey(cubie.stickers));
}

function findSetupRotation(state) {
  const solvedAnchorKey = colorSetKey(findCubieAt(createSolvedState(N), POSITIONS[ANCHOR_POS_INDEX]).stickers);
  for (const g of REORIENTATIONS) {
    const clone = cloneState(state);
    if (g) applyMoveString(clone, g);
    const cubie = findCubieAt(clone, POSITIONS[ANCHOR_POS_INDEX]);
    if (colorSetKey(cubie.stickers) !== solvedAnchorKey) continue;
    if (cornerOrientation(POSITIONS[ANCHOR_POS_INDEX], N, cubie.stickers) !== 0) continue;
    return { g, rotated: clone };
  }
  throw new Error('Küp için geçerli bir referans köşe yönü bulunamadı (beklenmeyen durum).');
}

export function solve2x2(state) {
  if (state.n !== 2) throw new Error('solve2x2 yalnızca 2x2 küpler için kullanılabilir.');
  ensureTablesSync();

  const { g, rotated } = findSetupRotation(state);
  let { perm, orient } = stateToCoords(rotated);
  let idx = encodeCombined(perm, orient);
  let dist = pruneTable[idx];
  if (dist === UNVISITED) throw new Error('Bu küp durumu çözücü tarafından tanınamadı (beklenmeyen).');

  const reducedSolution = [];
  const conj = conjugationTable[g];

  while (dist > 0) {
    let advanced = false;
    for (const name of FREE_MOVE_NAMES) {
      const mv = freeMoveTables[name];
      const newPerm = new Array(8);
      const newOrient = new Array(8);
      for (let j = 0; j < 8; j++) {
        const from = mv.permFrom[j];
        newPerm[j] = perm[from];
        newOrient[j] = (orient[from] + mv.orientDelta[j]) % 3;
      }
      const newIdx = encodeCombined(newPerm, newOrient);
      const newDist = pruneTable[newIdx];
      if (newDist === dist - 1) {
        reducedSolution.push(name);
        perm = newPerm;
        orient = newOrient;
        idx = newIdx;
        dist = newDist;
        advanced = true;
        break;
      }
    }
    if (!advanced) throw new Error('Çözüm adımı bulunamadı (beklenmeyen tutarsızlık).');
  }

  return reducedSolution.map((m) => conj[m]);
}
