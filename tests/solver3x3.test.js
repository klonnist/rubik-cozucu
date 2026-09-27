import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolvedState, isSolved, cloneState } from '../src/cube/state.js';
import { applyMoveString, applyMove, parseMoves } from '../src/cube/moves.js';
import { randomScramble } from '../src/cube/scramble.js';
import { solve3x3, warmUp3x3 } from '../src/solvers/solver3x3.js';

test('çözülmüş küp için boş çözüm döner', () => {
  warmUp3x3();
  const state = createSolvedState(3);
  const moves = solve3x3(state);
  assert.deepEqual(moves, []);
});

test('100 rastgele karıştırılmış 3x3 küp doğru şekilde çözülür, tipik 20-30 hamlede ve birkaç saniyenin altında', () => {
  const durations = [];
  const lengths = [];
  for (let trial = 0; trial < 100; trial++) {
    const state = createSolvedState(3);
    applyMoveString(state, randomScramble(3, 25));

    const t0 = performance.now();
    const moves = solve3x3(state);
    const elapsed = performance.now() - t0;
    durations.push(elapsed);
    lengths.push(moves.length);

    assert.ok(moves.length <= 32, `çözüm ${moves.length} hamle, 32'yi aşmamalı (deneme ${trial})`);
    assert.ok(elapsed < 5000, `çözüm ${elapsed}ms sürdü, 5000ms altında olmalı (deneme ${trial})`);

    const applied = cloneState(state);
    for (const tok of moves) applyMove(applied, parseMoves(tok, 3)[0]);
    assert.equal(isSolved(applied), true, `çözüm uygulanınca küp çözülmüş olmalı (deneme ${trial}): ${moves.join(' ')}`);
  }
  const maxDuration = Math.max(...durations);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  console.log(`[solver3x3] en yavaş: ${maxDuration.toFixed(1)}ms, ortalama: ${avgDuration.toFixed(1)}ms, ortalama hamle: ${avgLen.toFixed(1)}`);
});

test('elle girilen (renk boyama) bir çözülebilir durum çözülür', () => {
  const state = createSolvedState(3);
  applyMoveString(state, "R U R' U' F2 L D' B R2");
  const moves = solve3x3(state);
  const applied = cloneState(state);
  for (const tok of moves) applyMove(applied, parseMoves(tok, 3)[0]);
  assert.equal(isSolved(applied), true);
});
