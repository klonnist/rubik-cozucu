import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolvedState, isSolved, cloneState } from '../src/cube/state.js';
import { applyMoveString, parseMoves, applyMove } from '../src/cube/moves.js';
import { randomScramble } from '../src/cube/scramble.js';
import { validate } from '../src/cube/validate.js';
import { solve2x2 } from '../src/solvers/solver2x2.js';

test('çözülmüş küp için boş çözüm döner', () => {
  const state = createSolvedState(2);
  const moves = solve2x2(state);
  assert.deepEqual(moves, []);
});

test('100 rastgele karıştırılmış 2x2 küp doğru şekilde çözülür, en fazla 11 hamlede ve 1 saniyenin altında', () => {
  const durations = [];
  for (let trial = 0; trial < 100; trial++) {
    const state = createSolvedState(2);
    applyMoveString(state, randomScramble(2, 9));
    assert.equal(validate(state).valid, true, 'karıştırılmış küp fiziksel olarak geçerli olmalı');

    const t0 = performance.now();
    const moves = solve2x2(state);
    const elapsed = performance.now() - t0;
    durations.push(elapsed);

    assert.ok(moves.length <= 11, `çözüm ${moves.length} hamle, 11'i aşmamalı (deneme ${trial})`);
    assert.ok(elapsed < 1000, `çözüm ${elapsed}ms sürdü, 1000ms altında olmalı (deneme ${trial})`);

    const applied = cloneState(state);
    for (const token of moves) applyMove(applied, parseMoves(token, 2)[0]);
    assert.equal(isSolved(applied), true, `çözüm uygulanınca küp çözülmüş olmalı (deneme ${trial}): ${moves.join(' ')}`);
  }
  const maxDuration = Math.max(...durations);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  console.log(`[solver2x2] en yavaş: ${maxDuration.toFixed(1)}ms, ortalama: ${avgDuration.toFixed(1)}ms`);
});

test('elle girilen (renk boyama) bir çözülebilir durum çözülür', () => {
  const state = createSolvedState(2);
  applyMoveString(state, "R U R' U' R U R' U'");
  const moves = solve2x2(state);
  const applied = cloneState(state);
  for (const token of moves) applyMove(applied, parseMoves(token, 2)[0]);
  assert.equal(isSolved(applied), true);
});
