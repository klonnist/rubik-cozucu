import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_COLOR, COLORS } from '../src/cube/constants.js';
import {
  createBlankState,
  createSolvedState,
  isFullyPainted,
  countUnpainted,
  colorUsageCounts,
  centerColorOfFace,
  positionForFaceCell,
} from '../src/cube/state.js';

test('createBlankState: tüm stickerlar EMPTY_COLOR olur, isFullyPainted false döner', () => {
  for (const n of [2, 3, 4]) {
    const state = createBlankState(n);
    assert.equal(isFullyPainted(state), false);
    for (const c of state.cubies) {
      for (const color of Object.values(c.stickers)) assert.equal(color, EMPTY_COLOR);
    }
    assert.equal(countUnpainted(state), 6 * n * n);
  }
});

test('createSolvedState tamamen boyanmış sayılır ve boş kare yoktur', () => {
  for (const n of [2, 3, 4]) {
    const state = createSolvedState(n);
    assert.equal(isFullyPainted(state), true);
    assert.equal(countUnpainted(state), 0);
  }
});

test('boş küpte bir kareyi boyayınca kalan sayısı bir azalır ve renk sayımı doğru olur', () => {
  const state = createBlankState(3);
  const [x, y, z] = positionForFaceCell(3, 'U', 0, 0);
  const cubie = state.cubies.find((c) => c.pos[0] === x && c.pos[1] === y && c.pos[2] === z);
  cubie.stickers.U = COLORS.U;
  assert.equal(countUnpainted(state), 6 * 9 - 1);
  assert.deepEqual(colorUsageCounts(state), { [COLORS.U]: 1 });
});

test('centerColorOfFace: tek boyutlu küplerde merkez rengini verir, çift boyutlu küplerde null döner', () => {
  const state3 = createSolvedState(3);
  assert.equal(centerColorOfFace(state3, 'U'), COLORS.U);
  assert.equal(centerColorOfFace(state3, 'F'), COLORS.F);

  const state2 = createSolvedState(2);
  assert.equal(centerColorOfFace(state2, 'U'), null);

  const state4 = createSolvedState(4);
  assert.equal(centerColorOfFace(state4, 'U'), null);
});
