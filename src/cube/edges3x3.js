import { COLORS } from './constants.js';

/**
 * 3x3'e özgü kenar (edge) parça yardımcıları. NxN mimarisinin geri kalanının aksine bu
 * modül yalnızca n=3 için anlamlıdır: bir "kenar" tam olarak bir orta (mid) koordinat ve
 * iki uç (extreme) koordinat gerektirir.
 */

const HI = 2;
const MID = 1;

const EDGE_DEFS = [
  { pos: [HI, HI, MID], faces: ['R', 'U'] }, // UR
  { pos: [MID, HI, HI], faces: ['U', 'F'] }, // UF
  { pos: [0, HI, MID], faces: ['L', 'U'] }, // UL
  { pos: [MID, HI, 0], faces: ['B', 'U'] }, // UB
  { pos: [HI, 0, MID], faces: ['R', 'D'] }, // DR
  { pos: [MID, 0, HI], faces: ['D', 'F'] }, // DF
  { pos: [0, 0, MID], faces: ['L', 'D'] }, // DL
  { pos: [MID, 0, 0], faces: ['B', 'D'] }, // DB
  { pos: [HI, MID, HI], faces: ['R', 'F'] }, // FR
  { pos: [0, MID, HI], faces: ['L', 'F'] }, // FL
  { pos: [0, MID, 0], faces: ['L', 'B'] }, // BL
  { pos: [HI, MID, 0], faces: ['R', 'B'] }, // BR
];

export function edgePositions() {
  return EDGE_DEFS.map((e) => e.pos);
}

export const SLICE_EDGE_INDICES = [8, 9, 10, 11];

export function findCubieAt(state, pos) {
  return state.cubies.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);
}

export function colorSetKey(stickers) {
  return Object.values(stickers).slice().sort().join('|');
}

/**
 * Bir kenar parçasının yönelimini (0/1) hesaplar: bu pozisyonun U/D>F/B>R/L öncelik
 * sırasındaki İLK aktif yüzü (faceA) HER ZAMAN aynı hedef rengi (önce U/D, yoksa F/B)
 * için kontrol edilir; hedef renk faceA'da ise 0, faceB'de ise 1. Köşelerdeki 3 değerli
 * döngünün aksine burada bir kiralite (chi) düzeltmesi GEREKMEZ: arama hedefi zaten
 * eksen-rolü sırasıyla birebir örtüştüğünden "bulunduğu yüz" doğrudan sonucu verir.
 */
export function edgeOrientation(pos, n, stickers) {
  const hi = n - 1;
  const sx = pos[0] === hi ? 1 : pos[0] === 0 ? -1 : 0;
  const sy = pos[1] === hi ? 1 : pos[1] === 0 ? -1 : 0;
  const sz = pos[2] === hi ? 1 : pos[2] === 0 ? -1 : 0;

  let faceA;
  let faceB;
  if (sx === 0) {
    faceA = sy === 1 ? 'U' : 'D';
    faceB = sz === 1 ? 'F' : 'B';
  } else if (sy === 0) {
    faceA = sz === 1 ? 'F' : 'B';
    faceB = sx === 1 ? 'R' : 'L';
  } else {
    faceA = sy === 1 ? 'U' : 'D';
    faceB = sx === 1 ? 'R' : 'L';
  }

  if (stickers[faceA] === COLORS.U || stickers[faceA] === COLORS.D) return 0;
  if (stickers[faceB] === COLORS.U || stickers[faceB] === COLORS.D) return 1;
  if (stickers[faceA] === COLORS.F || stickers[faceA] === COLORS.B) return 0;
  if (stickers[faceB] === COLORS.F || stickers[faceB] === COLORS.B) return 1;
  return null;
}

export function edgeDefsForState() {
  return EDGE_DEFS;
}
