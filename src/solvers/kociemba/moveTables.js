import { createSolvedState } from '../../cube/state.js';
import { applyMove, parseMove } from '../../cube/moves.js';
import { cornerPositions, findCubieAt as findCornerAt, colorSetKey as cornerKey, cornerOrientation } from '../../cube/corners.js';
import { edgeDefsForState, findCubieAt as findEdgeAt, colorSetKey as edgeKey, edgeOrientation } from '../../cube/edges3x3.js';

const N = 3;
export const CORNER_POSITIONS = cornerPositions(N); // sabit sıralı 8 pozisyon
export const EDGE_DEFS = edgeDefsForState(); // sabit sıralı 12 pozisyon (UR,UF,UL,UB,DR,DF,DL,DB,FR,FL,BL,BR)
export const SLICE_EDGE_IDS = new Set([8, 9, 10, 11]);

export const ALL_MOVE_NAMES = [];
for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
  for (const suffix of ['', "'", '2']) ALL_MOVE_NAMES.push(face + suffix);
}

// Faz 2'de küpü G1 alt grubunda tutan 10 hamle.
export const PHASE2_MOVE_NAMES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R2', 'L2', 'F2', 'B2'];

let cachedTables = null;
let cachedCornerIdentityOf = null;
let cachedEdgeIdentityOf = null;

function buildIdentityMaps() {
  const solved = createSolvedState(N);
  const cornerIdentityOf = new Map();
  CORNER_POSITIONS.forEach((pos, idx) => {
    cornerIdentityOf.set(cornerKey(findCornerAt(solved, pos).stickers), idx);
  });
  const edgeIdentityOf = new Map();
  EDGE_DEFS.forEach((def, idx) => {
    edgeIdentityOf.set(edgeKey(findEdgeAt(solved, def.pos).stickers), idx);
  });
  return { cornerIdentityOf, edgeIdentityOf };
}

/**
 * 18 hamlenin her biri için köşe ve kenar permütasyon/yönelim tablolarını, test edilmiş
 * genel küp motorunu çözülmüş bir 3x3 durumuna bir kez uygulayıp sonucu okuyarak kurar
 * (2x2 çözücüdeki ile aynı "önyükleme" tekniği).
 */
export function buildMoveTables() {
  if (cachedTables) return cachedTables;
  const { cornerIdentityOf, edgeIdentityOf } = buildIdentityMaps();
  cachedCornerIdentityOf = cornerIdentityOf;
  cachedEdgeIdentityOf = edgeIdentityOf;

  const tables = {};
  for (const name of ALL_MOVE_NAMES) {
    const state = createSolvedState(N);
    applyMove(state, parseMove(name, N));

    const cpFrom = new Array(8);
    const coDelta = new Array(8);
    CORNER_POSITIONS.forEach((pos, j) => {
      const cubie = findCornerAt(state, pos);
      cpFrom[j] = cornerIdentityOf.get(cornerKey(cubie.stickers));
      coDelta[j] = cornerOrientation(pos, N, cubie.stickers);
    });

    const epFrom = new Array(12);
    const eoDelta = new Array(12);
    EDGE_DEFS.forEach((def, j) => {
      const cubie = findEdgeAt(state, def.pos);
      epFrom[j] = edgeIdentityOf.get(edgeKey(cubie.stickers));
      eoDelta[j] = edgeOrientation(def.pos, 3, cubie.stickers);
    });

    tables[name] = { cpFrom, coDelta, epFrom, eoDelta };
  }
  cachedTables = tables;
  return tables;
}

export function getIdentityMaps() {
  if (!cachedCornerIdentityOf) buildMoveTables();
  return { cornerIdentityOf: cachedCornerIdentityOf, edgeIdentityOf: cachedEdgeIdentityOf };
}

export function solvedCubieState() {
  return {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

export function applyMoveToCubieState(state, moveName) {
  const mv = buildMoveTables()[moveName];
  const cp = new Array(8);
  const co = new Array(8);
  for (let j = 0; j < 8; j++) {
    const from = mv.cpFrom[j];
    cp[j] = state.cp[from];
    co[j] = (state.co[from] + mv.coDelta[j]) % 3;
  }
  const ep = new Array(12);
  const eo = new Array(12);
  for (let j = 0; j < 12; j++) {
    const from = mv.epFrom[j];
    ep[j] = state.ep[from];
    eo[j] = (state.eo[from] + mv.eoDelta[j]) % 2;
  }
  return { cp, co, ep, eo };
}

/** Genel (facelet tabanlı) bir NxN küp durumunu (n=3) köşe/kenar permütasyon+yönelim gösterimine çevirir. */
export function cubieStateFromGenericState(genericState) {
  const { cornerIdentityOf, edgeIdentityOf } = getIdentityMaps();
  const cp = new Array(8);
  const co = new Array(8);
  CORNER_POSITIONS.forEach((pos, j) => {
    const cubie = findCornerAt(genericState, pos);
    cp[j] = cornerIdentityOf.get(cornerKey(cubie.stickers));
    co[j] = cornerOrientation(pos, N, cubie.stickers);
  });
  const ep = new Array(12);
  const eo = new Array(12);
  EDGE_DEFS.forEach((def, j) => {
    const cubie = findEdgeAt(genericState, def.pos);
    ep[j] = edgeIdentityOf.get(edgeKey(cubie.stickers));
    eo[j] = edgeOrientation(def.pos, 3, cubie.stickers);
  });
  return { cp, co, ep, eo };
}
