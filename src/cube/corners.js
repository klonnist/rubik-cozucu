import { COLORS } from './constants.js';

export function cornerPositions(n) {
  const hi = n - 1;
  const positions = [];
  for (const sx of [0, hi]) {
    for (const sy of [0, hi]) {
      for (const sz of [0, hi]) positions.push([sx, sy, sz]);
    }
  }
  return positions;
}

export function findCubieAt(state, pos) {
  return state.cubies.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1] && c.pos[2] === pos[2]);
}

export function colorSetKey(stickers) {
  return Object.values(stickers).slice().sort().join('|');
}

/**
 * Bir köşe parçasının yönelimini (0/1/2) hesaplar: parçanın Beyaz/Sarı yüzeyi bulunduğu
 * pozisyonun dikey (U/D) yüzeyinde mi yoksa 1 ya da 2 çeyrek kaymış mı olduğunu bulur.
 * chi = sx*sy*sz üçlü çarpımı, köşenin kiralite (el yönü) sınıfını verir; iki karşıt
 * kiralite sınıfı için sayım yönü ters çevrilmezse yönelim toplamı değişmez kalmaz.
 */
export function cornerOrientation(pos, n, stickers) {
  const hi = n - 1;
  const sx = pos[0] === hi ? 1 : -1;
  const sy = pos[1] === hi ? 1 : -1;
  const sz = pos[2] === hi ? 1 : -1;
  const uFace = sy === 1 ? 'U' : 'D';
  const fFace = sz === 1 ? 'F' : 'B';
  const rFace = sx === 1 ? 'R' : 'L';
  const chi = sx * sy * sz;

  let idx = null;
  if (stickers[uFace] === COLORS.U || stickers[uFace] === COLORS.D) idx = 0;
  else if (stickers[fFace] === COLORS.U || stickers[fFace] === COLORS.D) idx = 1;
  else if (stickers[rFace] === COLORS.U || stickers[rFace] === COLORS.D) idx = 2;

  if (idx === null) return null;
  return chi === 1 ? idx : (3 - idx) % 3;
}
