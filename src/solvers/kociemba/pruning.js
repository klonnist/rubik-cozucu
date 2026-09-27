import { buildMoveTables, ALL_MOVE_NAMES, PHASE2_MOVE_NAMES } from './moveTables.js';
import { TWIST_SIZE, FLIP_SIZE, SLICE_COMB_SIZE, PERM8_SIZE, SLICE_PERM_SIZE } from './coords.js';

const UNVISITED = 255;

// --- Hızlı (BFS-içi) kodlama yardımcıları: coords.js'deki mantığın aynısı ama döngü
// içinde tekrar tekrar çağrılacağı için önceden hesaplanmış sabitler kullanır. ---

const FACT8 = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];
const FACT4 = [1, 1, 2, 6, 24];

function permIndexFast(perm, len, fact) {
  let idx = 0;
  const used = 0;
  const usedArr = new Array(len).fill(false);
  for (let i = 0; i < len; i++) {
    let smaller = 0;
    for (let v = 0; v < perm[i]; v++) if (!usedArr[v]) smaller++;
    idx += smaller * fact[len - 1 - i];
    usedArr[perm[i]] = true;
  }
  return idx;
}

const BINOM = (() => {
  const table = [];
  for (let n = 0; n <= 12; n++) {
    table.push(new Array(13).fill(0));
    table[n][0] = 1;
    for (let k = 1; k <= n; k++) table[n][k] = (table[n - 1][k - 1] ?? 0) + (n - 1 >= k ? table[n - 1][k] : 0);
  }
  return table;
})();

function sliceCombIndex(sliceFlag) {
  let idx = 0;
  let j = 0;
  for (let i = 0; i < 12; i++) {
    if (sliceFlag[i]) {
      j++;
      idx += BINOM[i][j];
    }
  }
  return idx;
}

/**
 * Genel amaçlı BFS budama tablosu kurucu. `stepFns`: her hareket için
 * (vecA, vecB) -> [newVecA, newVecB] uygulayan fonksiyonların listesi.
 */
function buildPruneTable({ tableSize, encode, start, stepFns }) {
  const table = new Uint8Array(tableSize).fill(UNVISITED);
  let capacity = 1 << 16;
  const lenA = start[0].length;
  const lenB = start[1].length;
  let queueA = new Uint8Array(capacity * lenA);
  let queueB = new Uint8Array(capacity * lenB);
  let queueDepth = new Uint8Array(capacity);

  function ensureCapacity(need) {
    if (need <= capacity) return;
    while (capacity < need) capacity *= 2;
    const newA = new Uint8Array(capacity * lenA);
    newA.set(queueA);
    queueA = newA;
    const newB = new Uint8Array(capacity * lenB);
    newB.set(queueB);
    queueB = newB;
    const newDepth = new Uint8Array(capacity);
    newDepth.set(queueDepth);
    queueDepth = newDepth;
  }

  for (let i = 0; i < lenA; i++) queueA[i] = start[0][i];
  for (let i = 0; i < lenB; i++) queueB[i] = start[1][i];
  queueDepth[0] = 0;
  table[encode(start[0], start[1])] = 0;

  let head = 0;
  let tail = 1;
  let visited = 1;
  const vecA = new Uint8Array(lenA);
  const vecB = new Uint8Array(lenB);

  while (head < tail && visited < tableSize) {
    const baseA = head * lenA;
    const baseB = head * lenB;
    const depth = queueDepth[head];
    for (let i = 0; i < lenA; i++) vecA[i] = queueA[baseA + i];
    for (let i = 0; i < lenB; i++) vecB[i] = queueB[baseB + i];
    head++;

    for (const step of stepFns) {
      const [newA, newB] = step(vecA, vecB);
      const idx = encode(newA, newB);
      if (table[idx] === UNVISITED) {
        table[idx] = depth + 1;
        ensureCapacity(tail + 1);
        const outA = tail * lenA;
        const outB = tail * lenB;
        for (let i = 0; i < lenA; i++) queueA[outA + i] = newA[i];
        for (let i = 0; i < lenB; i++) queueB[outB + i] = newB[i];
        queueDepth[tail] = depth + 1;
        tail++;
        visited++;
      }
    }
  }

  if (visited !== tableSize) {
    throw new Error(`Budama tablosu eksik oluştu: ${visited}/${tableSize} durum bulundu.`);
  }
  return table;
}

function makeSliceFlag(ep) {
  const flag = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) if (ep[i] >= 8) flag[i] = 1;
  return flag;
}

export function buildTwistSlicePrune(moveTables) {
  const co0 = new Array(8).fill(0);
  const sliceFlag0 = makeSliceFlag([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const stepFns = ALL_MOVE_NAMES.map((name) => {
    const mv = moveTables[name];
    return (co, sliceFlag) => {
      const newCo = new Uint8Array(8);
      for (let j = 0; j < 8; j++) newCo[j] = (co[mv.cpFrom[j]] + mv.coDelta[j]) % 3;
      const newSlice = new Uint8Array(12);
      for (let j = 0; j < 12; j++) newSlice[j] = sliceFlag[mv.epFrom[j]];
      return [newCo, newSlice];
    };
  });
  return buildPruneTable({
    tableSize: TWIST_SIZE * SLICE_COMB_SIZE,
    encode: (co, sliceFlag) => {
      let t = 0;
      for (let i = 0; i < 7; i++) t = t * 3 + co[i];
      return t * SLICE_COMB_SIZE + sliceCombIndex(sliceFlag);
    },
    start: [co0, sliceFlag0],
    stepFns,
  });
}

export function buildFlipSlicePrune(moveTables) {
  const eo0 = new Array(12).fill(0);
  const sliceFlag0 = makeSliceFlag([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const stepFns = ALL_MOVE_NAMES.map((name) => {
    const mv = moveTables[name];
    return (eo, sliceFlag) => {
      const newEo = new Uint8Array(12);
      for (let j = 0; j < 12; j++) newEo[j] = (eo[mv.epFrom[j]] + mv.eoDelta[j]) % 2;
      const newSlice = new Uint8Array(12);
      for (let j = 0; j < 12; j++) newSlice[j] = sliceFlag[mv.epFrom[j]];
      return [newEo, newSlice];
    };
  });
  return buildPruneTable({
    tableSize: FLIP_SIZE * SLICE_COMB_SIZE,
    encode: (eo, sliceFlag) => {
      let f = 0;
      for (let i = 0; i < 11; i++) f = f * 2 + eo[i];
      return f * SLICE_COMB_SIZE + sliceCombIndex(sliceFlag);
    },
    start: [eo0, sliceFlag0],
    stepFns,
  });
}

export function buildCornerSlicePermPrune(moveTables) {
  const cp0 = [0, 1, 2, 3, 4, 5, 6, 7];
  const slicePerm0 = [0, 1, 2, 3];
  const stepFns = PHASE2_MOVE_NAMES.map((name) => {
    const mv = moveTables[name];
    const sliceFrom4 = mv.epFrom.slice(8, 12).map((v) => v - 8);
    return (cp, slicePerm) => {
      const newCp = new Uint8Array(8);
      for (let j = 0; j < 8; j++) newCp[j] = cp[mv.cpFrom[j]];
      const newSlice = new Uint8Array(4);
      for (let j = 0; j < 4; j++) newSlice[j] = slicePerm[sliceFrom4[j]];
      return [newCp, newSlice];
    };
  });
  return buildPruneTable({
    tableSize: PERM8_SIZE * SLICE_PERM_SIZE,
    encode: (cp, slicePerm) => permIndexFast(cp, 8, FACT8) * SLICE_PERM_SIZE + permIndexFast(slicePerm, 4, FACT4),
    start: [cp0, slicePerm0],
    stepFns,
  });
}

export function buildEdge8SlicePermPrune(moveTables) {
  const edge80 = [0, 1, 2, 3, 4, 5, 6, 7];
  const slicePerm0 = [0, 1, 2, 3];
  const stepFns = PHASE2_MOVE_NAMES.map((name) => {
    const mv = moveTables[name];
    const edge8From = mv.epFrom.slice(0, 8);
    const sliceFrom4 = mv.epFrom.slice(8, 12).map((v) => v - 8);
    return (edge8, slicePerm) => {
      const newEdge8 = new Uint8Array(8);
      for (let j = 0; j < 8; j++) newEdge8[j] = edge8[edge8From[j]];
      const newSlice = new Uint8Array(4);
      for (let j = 0; j < 4; j++) newSlice[j] = slicePerm[sliceFrom4[j]];
      return [newEdge8, newSlice];
    };
  });
  return buildPruneTable({
    tableSize: PERM8_SIZE * SLICE_PERM_SIZE,
    encode: (edge8, slicePerm) => permIndexFast(edge8, 8, FACT8) * SLICE_PERM_SIZE + permIndexFast(slicePerm, 4, FACT4),
    start: [edge80, slicePerm0],
    stepFns,
  });
}

let cachedPruning = null;

export function buildAllPruningTables() {
  if (cachedPruning) return cachedPruning;
  const moveTables = buildMoveTables();
  cachedPruning = {
    twistSlice: buildTwistSlicePrune(moveTables),
    flipSlice: buildFlipSlicePrune(moveTables),
    cornerSlicePerm: buildCornerSlicePermPrune(moveTables),
    edge8SlicePerm: buildEdge8SlicePermPrune(moveTables),
  };
  return cachedPruning;
}
