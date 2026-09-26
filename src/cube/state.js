import { COLORS } from './constants.js';

/**
 * Küp durumu: { n, cubies: [{ pos:[x,y,z], stickers:{U?,D?,F?,B?,R?,L?: renkKodu} }] }
 * pos koordinatları 0..n-1 aralığında tam sayı. Sadece yüzeydeki (görünen) parçalar tutulur.
 * stickers, parçanın şu anki dünya yönü (U/D/F/B/R/L) -> boyalı renk eşlemesidir.
 */

export function createSolvedState(n) {
  const lo = 0;
  const hi = n - 1;
  const cubies = [];
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const onSurface = x === lo || x === hi || y === lo || y === hi || z === lo || z === hi;
        if (!onSurface) continue;
        const stickers = {};
        if (x === hi) stickers.R = COLORS.R;
        if (x === lo) stickers.L = COLORS.L;
        if (y === hi) stickers.U = COLORS.U;
        if (y === lo) stickers.D = COLORS.D;
        if (z === hi) stickers.F = COLORS.F;
        if (z === lo) stickers.B = COLORS.B;
        cubies.push({ pos: [x, y, z], stickers });
      }
    }
  }
  return { n, cubies };
}

export function cloneState(state) {
  return {
    n: state.n,
    cubies: state.cubies.map((c) => ({ pos: [...c.pos], stickers: { ...c.stickers } })),
  };
}

export function isSolved(state) {
  const perFace = { U: new Set(), D: new Set(), F: new Set(), B: new Set(), R: new Set(), L: new Set() };
  for (const c of state.cubies) {
    for (const [face, color] of Object.entries(c.stickers)) {
      perFace[face].add(color);
    }
  }
  return Object.values(perFace).every((set) => set.size === 1);
}

export function cubieAt(state, x, y, z) {
  return state.cubies.find((c) => c.pos[0] === x && c.pos[1] === y && c.pos[2] === z);
}

// Doğrulama ve render için: her yüzün n x n ızgarasını renk matrisi olarak döndürür.
// row 0 en üstte / en solda olacak şekilde tutarlı bir yerel eksene göre sıralanır.
export function faceGrid(state, face) {
  const n = state.n;
  const hi = n - 1;
  const grid = [];
  for (let r = 0; r < n; r++) grid.push(new Array(n).fill(null));

  for (const c of state.cubies) {
    const color = c.stickers[face];
    if (color === undefined) continue;
    const [x, y, z] = c.pos;
    let row, col;
    switch (face) {
      case 'U': row = hi - z; col = x; break;
      case 'D': row = z; col = x; break;
      case 'F': row = hi - y; col = x; break;
      case 'B': row = hi - y; col = hi - x; break;
      case 'R': row = hi - y; col = hi - z; break;
      case 'L': row = hi - y; col = z; break;
      default: throw new Error(`Bilinmeyen yüz: ${face}`);
    }
    grid[row][col] = color;
  }
  return grid;
}
