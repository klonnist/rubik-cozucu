import { FACE_DIR, DIR_TO_FACE, AXIS_OF_FACE, HI_FACES, LO_FACES } from './constants.js';

// +90 derece (saat yönünün tersi, sağ-el kuralı) döndürme matrisleri, eksen bazında.
function rotateVec90([x, y, z], axis) {
  switch (axis) {
    case 'x': return [x, -z, y];
    case 'y': return [z, y, -x];
    case 'z': return [-y, x, z];
    default: throw new Error(`Bilinmeyen eksen: ${axis}`);
  }
}

function rotateVecQuarters(v, axis, quarters) {
  let result = v;
  const n = ((quarters % 4) + 4) % 4;
  for (let i = 0; i < n; i++) result = rotateVec90(result, axis);
  return result;
}

// pos (0..n-1) -> merkeze göre 2 katı tam sayı koordinat (kesirsiz aritmetik için).
function toDoubled(pos, n) {
  const off = n - 1;
  return pos.map((p) => 2 * p - off);
}
function fromDoubled(pos2, n) {
  const off = n - 1;
  return pos2.map((p) => (p + off) / 2);
}

export function rotatePosition(pos, n, axis, quarters) {
  const doubled = toDoubled(pos, n);
  const rotated = rotateVecQuarters(doubled, axis, quarters);
  return fromDoubled(rotated, n);
}

export function rotateFaceLabel(face, axis, quarters) {
  const dir = FACE_DIR[face];
  const rotated = rotateVecQuarters(dir, axis, quarters);
  const key = rotated.join(',');
  const result = DIR_TO_FACE.get(key);
  if (!result) throw new Error(`Döndürme yön eşlemesi bulunamadı: ${key}`);
  return result;
}

/**
 * Bir dilim/katman grubunu döndürür.
 * layerIndices: bu eksende döndürülecek katmanların 0..n-1 indeks kümesi.
 */
export function applyLayerRotation(state, axis, layerIndices, quarters) {
  const n = state.n;
  const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const layerSet = new Set(layerIndices);
  for (const cubie of state.cubies) {
    if (!layerSet.has(cubie.pos[axisIdx])) continue;
    cubie.pos = rotatePosition(cubie.pos, n, axis, quarters);
    const newStickers = {};
    for (const [face, color] of Object.entries(cubie.stickers)) {
      newStickers[rotateFaceLabel(face, axis, quarters)] = color;
    }
    cubie.stickers = newStickers;
  }
  return state;
}

const BASE_SIGN = { R: -1, U: -1, F: -1, L: 1, D: 1, B: 1 };

function layerIndicesFor(face, n, width) {
  if (HI_FACES.has(face)) {
    const indices = [];
    for (let i = 0; i < width; i++) indices.push(n - 1 - i);
    return indices;
  }
  if (LO_FACES.has(face)) {
    const indices = [];
    for (let i = 0; i < width; i++) indices.push(i);
    return indices;
  }
  throw new Error(`Bilinmeyen yüz: ${face}`);
}

const MOVE_RE = /^(\d*)([UDFBRL])(w?)([2']?)$/;
const ROTATION_RE = /^([xyz])([2']?)$/;
const SLICE_RE = /^([MES])([2']?)$/;

/**
 * Tek bir hamle notasyonunu ayrıştırır ve { axis, layers, quarters, notation } döndürür.
 * Desteklenen biçimler: R, R', R2, Rw, Rw', Rw2, 2Rw, 3Rw2, x, y, z, M, E, S.
 */
export function parseMove(token, n) {
  let m = MOVE_RE.exec(token);
  if (m) {
    const [, digits, face, wide, suffix] = m;
    const width = wide ? (digits ? parseInt(digits, 10) : 2) : 1;
    if (width > n) throw new Error(`"${token}" hamlesi ${n}x${n} küp için geçersiz: katman sayısı küp boyutunu aşıyor.`);
    const axis = AXIS_OF_FACE[face];
    const layers = layerIndicesFor(face, n, width);
    const mult = suffix === '2' ? 2 : suffix === "'" ? -1 : 1;
    const quarters = BASE_SIGN[face] * mult;
    return { axis, layers, quarters, notation: token };
  }
  m = ROTATION_RE.exec(token);
  if (m) {
    const [, letter, suffix] = m;
    const axis = letter;
    const faceAnalog = letter === 'x' ? 'R' : letter === 'y' ? 'U' : 'F';
    const layers = Array.from({ length: n }, (_, i) => i);
    const mult = suffix === '2' ? 2 : suffix === "'" ? -1 : 1;
    const quarters = BASE_SIGN[faceAnalog] * mult;
    return { axis, layers, quarters, notation: token };
  }
  m = SLICE_RE.exec(token);
  if (m) {
    if (n % 2 === 0) throw new Error(`"${token}" dilim hamlesi yalnızca tek boyutlu küplerde tanımlıdır.`);
    const [, letter, suffix] = m;
    const mid = (n - 1) / 2;
    const axisMap = { M: 'x', E: 'y', S: 'z' };
    const faceAnalogMap = { M: 'L', E: 'D', S: 'F' };
    const axis = axisMap[letter];
    const mult = suffix === '2' ? 2 : suffix === "'" ? -1 : 1;
    const quarters = BASE_SIGN[faceAnalogMap[letter]] * mult;
    return { axis, layers: [mid], quarters, notation: token };
  }
  throw new Error(`"${token}" geçerli bir hamle notasyonu değil.`);
}

export function parseMoves(str, n) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => parseMove(tok, n));
}

export function applyMove(state, move) {
  applyLayerRotation(state, move.axis, move.layers, move.quarters);
  return state;
}

export function applyMoveString(state, str) {
  for (const move of parseMoves(str, state.n)) applyMove(state, move);
  return state;
}

export function invertMoveToken(token) {
  if (token.endsWith("'")) return token.slice(0, -1);
  if (token.endsWith('2')) return token;
  return `${token}'`;
}

export function invertMovesString(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map(invertMoveToken)
    .join(' ');
}
