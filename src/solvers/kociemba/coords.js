// Kociemba iki-aşamalı algoritması için koordinat kodlama fonksiyonları.

export const TWIST_SIZE = 2187; // 3^7 (8. köşenin yönelimi diğerlerinden belirlenir)
export const FLIP_SIZE = 2048; // 2^11 (12. kenarın yönelimi diğerlerinden belirlenir)
export const SLICE_COMB_SIZE = 495; // C(12,4)
export const PERM8_SIZE = 40320; // 8!
export const SLICE_PERM_SIZE = 24; // 4!

const BINOM = (() => {
  const table = [];
  for (let n = 0; n <= 12; n++) {
    table.push(new Array(13).fill(0));
    table[n][0] = 1;
    for (let k = 1; k <= n; k++) {
      table[n][k] = (table[n - 1][k - 1] ?? 0) + (n - 1 >= k ? table[n - 1][k] : 0);
    }
  }
  return table;
})();
function binom(n, k) {
  if (k < 0 || n < 0 || k > n) return 0;
  return BINOM[n][k];
}

export function encodeTwist(co) {
  let idx = 0;
  for (let i = 0; i < 7; i++) idx = idx * 3 + co[i];
  return idx;
}

export function encodeFlip(eo) {
  let idx = 0;
  for (let i = 0; i < 11; i++) idx = idx * 2 + eo[i];
  return idx;
}

/**
 * "Hangi 4 pozisyon dilim kenarı taşıyor" bilgisini standart kombinatorik sıralama
 * (combinadic) ile 0..494 arası bir indekse kodlar.
 */
export function encodeSliceCombination(ep) {
  const chosen = [];
  for (let i = 0; i < 12; i++) if (ep[i] >= 8) chosen.push(i);
  let idx = 0;
  for (let j = 0; j < chosen.length; j++) idx += binom(chosen[j], j + 1);
  return idx;
}

/** Uzunluğu `len` olan bir permütasyon dizisini (değerler 0..len-1) Lehmer koduna çevirir. */
export function encodePermutation(perm) {
  const len = perm.length;
  let idx = 0;
  const used = new Array(len).fill(false);
  for (let i = 0; i < len; i++) {
    let smaller = 0;
    for (let v = 0; v < perm[i]; v++) if (!used[v]) smaller++;
    let fact = 1;
    for (let f = 2; f <= len - 1 - i; f++) fact *= f;
    idx += smaller * fact;
    used[perm[i]] = true;
  }
  return idx;
}

/** 8 köşenin permütasyonunu 0..40319 arası bir indekse kodlar. */
export function encodeCornerPerm(cp) {
  return encodePermutation(cp);
}

/** Faz 2'ye özgü: 8 dilim-dışı kenarın (kimlik 0..7) kendi 8 pozisyonu içindeki
 * permütasyonunu 0..40319 arası bir indekse kodlar. `ep` 12 uzunluğunda tam diziden
 * yalnızca dilim-dışı pozisyonlar (0..7) alınır; bu pozisyonlar faz 1 tamamlandıktan
 * sonra her zaman kimlik 0..7'yi taşır. */
export function encodeEdge8Perm(ep) {
  return encodePermutation(ep.slice(0, 8));
}

/** Faz 2'ye özgü: 4 dilim kenarının (kimlik 8..11) kendi 4 pozisyonu (8..11) içindeki
 * permütasyonunu 0..23 arası bir indekse kodlar. */
export function encodeSlicePerm(ep) {
  const rel = ep.slice(8, 12).map((v) => v - 8);
  return encodePermutation(rel);
}
