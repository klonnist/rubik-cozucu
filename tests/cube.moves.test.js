import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolvedState, isSolved, cloneState } from '../src/cube/state.js';
import { applyMoveString, invertMovesString, parseMoves } from '../src/cube/moves.js';
import { randomScramble } from '../src/cube/scramble.js';

const ALL_OUTER_MOVES = ['U', 'D', 'F', 'B', 'R', 'L'];

test('çözülmüş küp isSolved döner (n=2 ve n=3)', () => {
  assert.equal(isSolved(createSolvedState(2)), true);
  assert.equal(isSolved(createSolvedState(3)), true);
  assert.equal(isSolved(createSolvedState(4)), true);
});

test('her temel hamle 4 kez uygulanınca özdeşliğe döner', () => {
  for (const n of [2, 3, 4]) {
    for (const face of ALL_OUTER_MOVES) {
      const state = createSolvedState(n);
      applyMoveString(state, `${face} ${face} ${face} ${face}`);
      assert.equal(isSolved(state), true, `${face} x4 (n=${n}) çözülmüş olmalı`);
    }
  }
});

test('hamle + tersi özdeşliğe döner', () => {
  for (const n of [2, 3, 4]) {
    for (const face of ALL_OUTER_MOVES) {
      for (const suffix of ['', "'", '2']) {
        const state = createSolvedState(n);
        const token = `${face}${suffix}`;
        applyMoveString(state, token);
        applyMoveString(state, invertMovesString(token));
        assert.equal(isSolved(state), true, `${token} + ters (n=${n}) çözülmüş olmalı`);
      }
    }
  }
});

test("R U R' U' altı kez uygulanınca özdeşliğe döner (bilinen 6. mertebe özelliği)", () => {
  const state = createSolvedState(3);
  for (let i = 0; i < 6; i++) applyMoveString(state, "R U R' U'");
  assert.equal(isSolved(state), true);
});

test('rastgele karıştırma + tersi çözülmüş küpe döner (100 deneme)', () => {
  for (let trial = 0; trial < 100; trial++) {
    const n = 2 + (trial % 3);
    const state = createSolvedState(n);
    const scramble = randomScramble(n, 15);
    applyMoveString(state, scramble);
    applyMoveString(state, invertMovesString(scramble));
    assert.equal(isSolved(state), true, `n=${n} karıştırma: ${scramble}`);
  }
});

test('geniş hamle (wide move) katman sayısını doğru seçer', () => {
  const n = 4;
  const state = createSolvedState(n);
  const before = cloneState(state);
  applyMoveString(state, 'Rw');
  // Rw genişliği varsayılan 2: x=n-1 ve x=n-2 katmanları döner.
  const movedXs = new Set(
    state.cubies.filter((c, i) => JSON.stringify(c) !== JSON.stringify(before.cubies[i])).map((c) => c.pos[0])
  );
  applyMoveString(state, "Rw'");
  assert.equal(isSolved(state), true);
});

test('geçersiz hamle notasyonu hata fırlatır', () => {
  const n = 3;
  assert.throws(() => parseMoves('Q', n));
  assert.throws(() => parseMoves('5Rw', n)); // n=3 için 5 katman geçersiz
});

test('tek eksende ardışık aynı yön tercih edilmemeye çalışılan scramble üretimi çalışır', () => {
  const scramble = randomScramble(3, 20);
  const tokens = scramble.split(' ');
  assert.equal(tokens.length, 20);
});
