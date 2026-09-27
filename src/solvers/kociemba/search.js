import { buildMoveTables, ALL_MOVE_NAMES, PHASE2_MOVE_NAMES } from './moveTables.js';
import { buildAllPruningTables } from './pruning.js';
import { SLICE_COMB_SIZE, SLICE_PERM_SIZE } from './coords.js';

const FACT8 = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];
const FACT4 = [1, 1, 2, 6, 24];

function permIndex(perm, fact) {
  const len = perm.length;
  let idx = 0;
  const used = new Array(len).fill(false);
  for (let i = 0; i < len; i++) {
    let smaller = 0;
    for (let v = 0; v < perm[i]; v++) if (!used[v]) smaller++;
    idx += smaller * fact[len - 1 - i];
    used[perm[i]] = true;
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

function sliceCombIndexFromEp(ep) {
  let idx = 0;
  let j = 0;
  for (let i = 0; i < 12; i++) {
    if (ep[i] >= 8) {
      j++;
      idx += BINOM[i][j];
    }
  }
  return idx;
}

const FACE_ORDER = { U: 0, D: 1, F: 2, B: 3, R: 4, L: 5 };
const AXIS_GROUP = { U: 'y', D: 'y', F: 'z', B: 'z', R: 'x', L: 'x' };

function faceOf(moveName) {
  return moveName[0];
}

let cached = null;

function ensureBuilt() {
  if (cached) return cached;
  const moveTables = buildMoveTables();
  const pruning = buildAllPruningTables();
  cached = { moveTables, pruning };
  return cached;
}

export function warmUp3x3() {
  ensureBuilt();
}

/**
 * Faz 1: küpü G1 alt grubuna (twist=0, flip=0, dilim kenarları orta katmanda) indirger.
 * 18 hamlenin tamamını kullanır.
 */
function solvePhase1(state) {
  const { moveTables, pruning } = ensureBuilt();
  const { twistSlice, flipSlice } = pruning;

  function heuristic(co, ep, eo) {
    const slice = sliceCombIndexFromEp(ep);
    let twist = 0;
    for (let i = 0; i < 7; i++) twist = twist * 3 + co[i];
    let flip = 0;
    for (let i = 0; i < 11; i++) flip = flip * 2 + eo[i];
    const h1 = twistSlice[twist * SLICE_COMB_SIZE + slice];
    const h2 = flipSlice[flip * SLICE_COMB_SIZE + slice];
    return Math.max(h1, h2);
  }

  const path = [];
  let solution = null;
  let bound = heuristic(state.co, state.ep, state.eo);

  function dfs(cp, co, ep, eo, g, lastFace) {
    const h = heuristic(co, ep, eo);
    if (g + h > bound) return g + h;
    if (h === 0) {
      solution = { moves: [...path], cp, co, ep, eo };
      return -1;
    }
    let minNext = Infinity;
    for (const name of ALL_MOVE_NAMES) {
      const face = faceOf(name);
      if (lastFace) {
        if (face === lastFace) continue;
        if (AXIS_GROUP[face] === AXIS_GROUP[lastFace] && FACE_ORDER[face] < FACE_ORDER[lastFace]) continue;
      }
      const mv = moveTables[name];
      const newCp = new Array(8);
      const newCo = new Array(8);
      for (let j = 0; j < 8; j++) {
        newCp[j] = cp[mv.cpFrom[j]];
        newCo[j] = (co[mv.cpFrom[j]] + mv.coDelta[j]) % 3;
      }
      const newEp = new Array(12);
      const newEo = new Array(12);
      for (let j = 0; j < 12; j++) {
        newEp[j] = ep[mv.epFrom[j]];
        newEo[j] = (eo[mv.epFrom[j]] + mv.eoDelta[j]) % 2;
      }
      path.push(name);
      const result = dfs(newCp, newCo, newEp, newEo, g + 1, face);
      path.pop();
      if (result === -1) return -1;
      if (result < minNext) minNext = result;
    }
    return minNext;
  }

  if (bound === 0) return { moves: [], cp: state.cp, co: state.co, ep: state.ep, eo: state.eo };

  const MAX_BOUND = 13; // faz 1 için bilinen üst sınır (Tanrı'nın sayısı G1'e ~12'dir)
  while (bound <= MAX_BOUND) {
    const result = dfs(state.cp, state.co, state.ep, state.eo, 0, null);
    if (result === -1) return solution;
    if (result === Infinity) break;
    bound = result;
  }
  throw new Error('Faz 1 çözümü bulunamadı (beklenmeyen durum).');
}

/**
 * Faz 2: G1 alt grubu içinde, yalnızca 10 hamleyle (U,D,R2,L2,F2,B2) küpü tamamen çözer.
 */
function solvePhase2(state) {
  const { moveTables, pruning } = ensureBuilt();
  const { cornerSlicePerm, edge8SlicePerm } = pruning;

  function heuristic(cp, ep) {
    const cpIdx = permIndex(cp, FACT8);
    const edge8 = ep.slice(0, 8);
    const edge8Idx = permIndex(edge8, FACT8);
    const sliceRel = ep.slice(8, 12).map((v) => v - 8);
    const sliceIdx = permIndex(sliceRel, FACT4);
    const h1 = cornerSlicePerm[cpIdx * SLICE_PERM_SIZE + sliceIdx];
    const h2 = edge8SlicePerm[edge8Idx * SLICE_PERM_SIZE + sliceIdx];
    return Math.max(h1, h2);
  }

  const path = [];
  let solution = null;
  let bound = heuristic(state.cp, state.ep);

  function dfs(cp, ep, g, lastFace) {
    const h = heuristic(cp, ep);
    if (g + h > bound) return g + h;
    if (h === 0) {
      solution = [...path];
      return -1;
    }
    let minNext = Infinity;
    for (const name of PHASE2_MOVE_NAMES) {
      const face = faceOf(name);
      if (lastFace) {
        if (face === lastFace) continue;
        if (AXIS_GROUP[face] === AXIS_GROUP[lastFace] && FACE_ORDER[face] < FACE_ORDER[lastFace]) continue;
      }
      const mv = moveTables[name];
      const newCp = new Array(8);
      for (let j = 0; j < 8; j++) newCp[j] = cp[mv.cpFrom[j]];
      const newEp = new Array(12);
      for (let j = 0; j < 12; j++) newEp[j] = ep[mv.epFrom[j]];
      path.push(name);
      const result = dfs(newCp, newEp, g + 1, face);
      path.pop();
      if (result === -1) return -1;
      if (result < minNext) minNext = result;
    }
    return minNext;
  }

  if (bound === 0) return [];

  const MAX_BOUND = 18; // faz 2 için bilinen üst sınır
  while (bound <= MAX_BOUND) {
    const result = dfs(state.cp, state.ep, 0, null);
    if (result === -1) return solution;
    if (result === Infinity) break;
    bound = result;
  }
  throw new Error('Faz 2 çözümü bulunamadı (beklenmeyen durum).');
}

/** Tam iki-aşamalı çözüm: faz 1 + faz 2 hamlelerini birleştirip döndürür. */
export function solveTwoPhase(cubieState) {
  const phase1 = solvePhase1(cubieState);
  const phase2 = solvePhase2(phase1);
  return [...phase1.moves, ...phase2];
}
