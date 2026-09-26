import { solve2x2 } from './solver2x2.js';

// Her boyut için ayrı bir çözücü modülü: ortak arayüz solve(state) -> hamle dizisi.
// Yeni bir boyut eklemek burada bir kayıt eklemekten ibarettir; arayüz/render/animasyon
// kodu değişmeden kalır.
const REGISTRY = {
  2: { solve: solve2x2, label: '2x2', ready: true },
  3: { solve: null, label: '3x3', ready: false },
  4: { solve: null, label: '4x4', ready: false },
};

export function getSolverInfo(n) {
  return REGISTRY[n] ?? { solve: null, label: `${n}x${n}`, ready: false };
}

export function isSizeReady(n) {
  return Boolean(REGISTRY[n]?.ready);
}

export function solve(state) {
  const info = getSolverInfo(state.n);
  if (!info.ready || !info.solve) {
    throw new Error(`${info.label} çözücüsü henüz hazır değil.`);
  }
  return info.solve(state);
}

export const SUPPORTED_SIZES = Object.keys(REGISTRY).map(Number).sort((a, b) => a - b);
