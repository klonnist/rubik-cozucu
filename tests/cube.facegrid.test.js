import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolvedState, faceGrid, positionForFaceCell, cubieAt } from '../src/cube/state.js';

test('faceGrid <-> positionForFaceCell birbirinin tam tersidir', () => {
  for (const n of [2, 3, 4]) {
    const state = createSolvedState(n);
    for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
      const grid = faceGrid(state, face);
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const [x, y, z] = positionForFaceCell(n, face, row, col);
          const cubie = cubieAt(state, x, y, z);
          assert.ok(cubie, `n=${n} ${face} (${row},${col}) -> pozisyon bulunamadı`);
          assert.equal(cubie.stickers[face], grid[row][col], `n=${n} ${face} (${row},${col}) renk uyuşmuyor`);
        }
      }
    }
  }
});
