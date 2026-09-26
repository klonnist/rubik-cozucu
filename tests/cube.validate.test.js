import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolvedState } from '../src/cube/state.js';
import { applyMoveString } from '../src/cube/moves.js';
import { randomScramble } from '../src/cube/scramble.js';
import { validate } from '../src/cube/validate.js';

test('çözülmüş küp geçerlidir', () => {
  for (const n of [2, 3, 4]) {
    const result = validate(createSolvedState(n));
    assert.equal(result.valid, true, `n=${n}: ${JSON.stringify(result.errors)}`);
  }
});

test('rastgele karıştırılmış küp hâlâ fiziksel olarak geçerlidir', () => {
  for (let trial = 0; trial < 30; trial++) {
    const n = 2 + (trial % 3);
    const state = createSolvedState(n);
    applyMoveString(state, randomScramble(n, 20));
    const result = validate(state);
    assert.equal(result.valid, true, `n=${n}: ${JSON.stringify(result.errors)}`);
  }
});

test('tek bir köşenin elle bozulması (renk döngüsü) geçersiz sayılır', () => {
  const state = createSolvedState(2);
  const corner = state.cubies.find((c) => c.pos[0] === 1 && c.pos[1] === 1 && c.pos[2] === 1);
  // Bu köşenin 3 rengini kendi arasında döngüsel kaydır: fiziksel olarak imkansız bir "tek köşe twist"i simüle eder.
  const { U, F, R } = corner.stickers;
  corner.stickers = { U: F, F: R, R: U };
  const result = validate(state);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === 'KOSE_YONELIMI'));
});

test('bir köşede karşıt renklerin bir arada olması geçersiz sayılır', () => {
  const state = createSolvedState(3);
  const corner = state.cubies.find((c) => c.pos[0] === 2 && c.pos[1] === 2 && c.pos[2] === 2);
  corner.stickers.F = corner.stickers.U; // U ve F'ye aynı (karşıt çift) rengi ata
  const result = validate(state);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === 'GECERSIZ_KOSE'));
});

test('eksik renk sayısı geçersiz sayılır', () => {
  const state = createSolvedState(2);
  state.cubies[0].stickers[Object.keys(state.cubies[0].stickers)[0]] = 'Y';
  const result = validate(state);
  assert.equal(result.valid, false);
});
