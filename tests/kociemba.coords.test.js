import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomScramble } from '../src/cube/scramble.js';
import { applyMoveToCubieState, solvedCubieState } from '../src/solvers/kociemba/moveTables.js';
import {
  encodeTwist,
  encodeFlip,
  encodeSliceCombination,
  encodeCornerPerm,
  encodeEdge8Perm,
  encodeSlicePerm,
  TWIST_SIZE,
  FLIP_SIZE,
  SLICE_COMB_SIZE,
  PERM8_SIZE,
  SLICE_PERM_SIZE,
} from '../src/solvers/kociemba/coords.js';

test('çözülmüş durumun twist ve flip kodu 0 dır', () => {
  const s = solvedCubieState();
  assert.equal(encodeTwist(s.co), 0);
  assert.equal(encodeFlip(s.eo), 0);
});

test('çözülmüş durumun köşe ve kenar permütasyon kodu 0 dır', () => {
  const s = solvedCubieState();
  assert.equal(encodeCornerPerm(s.cp), 0);
  assert.equal(encodeEdge8Perm(s.ep), 0);
  assert.equal(encodeSlicePerm(s.ep), 0);
});

test('tüm kodlar geçerli aralıkta kalır (200 rastgele durum)', () => {
  for (let trial = 0; trial < 200; trial++) {
    let state = solvedCubieState();
    for (const m of randomScramble(3, 15).split(' ')) state = applyMoveToCubieState(state, m);
    const twist = encodeTwist(state.co);
    const flip = encodeFlip(state.eo);
    const slice = encodeSliceCombination(state.ep);
    assert.ok(twist >= 0 && twist < TWIST_SIZE, `twist ${twist} aralık dışı`);
    assert.ok(flip >= 0 && flip < FLIP_SIZE, `flip ${flip} aralık dışı`);
    assert.ok(slice >= 0 && slice < SLICE_COMB_SIZE, `slice ${slice} aralık dışı`);
  }
});

test('faz 2 kodları (G1 durumuna ulaşıldığında varsayılan olarak) geçerli aralıkta kalır', () => {
  // Faz 2 kodları yalnızca G1 alt grubundaki durumlar için anlamlıdır (dilim kenarları
  // 8-11 pozisyonlarında); yalnızca 10 faz-2 hamlesini kullanarak bunu koruyalım.
  const phase2Moves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R2', 'L2', 'F2', 'B2'];
  for (let trial = 0; trial < 100; trial++) {
    let state = solvedCubieState();
    for (let i = 0; i < 15; i++) {
      const m = phase2Moves[Math.floor(Math.random() * phase2Moves.length)];
      state = applyMoveToCubieState(state, m);
    }
    const cp = encodeCornerPerm(state.cp);
    const ep8 = encodeEdge8Perm(state.ep);
    const slicePerm = encodeSlicePerm(state.ep);
    assert.ok(cp >= 0 && cp < PERM8_SIZE);
    assert.ok(ep8 >= 0 && ep8 < PERM8_SIZE);
    assert.ok(slicePerm >= 0 && slicePerm < SLICE_PERM_SIZE);
  }
});
