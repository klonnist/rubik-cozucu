import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolvedState } from '../src/cube/state.js';
import { applyMoveString } from '../src/cube/moves.js';
import { randomScramble } from '../src/cube/scramble.js';
import {
  ALL_MOVE_NAMES,
  applyMoveToCubieState,
  cubieStateFromGenericState,
  solvedCubieState,
} from '../src/solvers/kociemba/moveTables.js';

function applySequence(seq) {
  let state = solvedCubieState();
  for (const name of seq) state = applyMoveToCubieState(state, name);
  return state;
}

test('her hamle 4 kez uygulanınca köşe/kenar durumu çözülmüşe döner', () => {
  for (const name of ALL_MOVE_NAMES) {
    const state = applySequence([name, name, name, name]);
    assert.deepEqual(state, solvedCubieState(), `${name} x4 çözülmüş olmalı`);
  }
});

test("R U R' U' altı kez uygulanınca çözülmüşe döner", () => {
  const seq = ["R", "U", "R'", "U'"];
  let state = solvedCubieState();
  for (let i = 0; i < 6; i++) for (const m of seq) state = applyMoveToCubieState(state, m);
  assert.deepEqual(state, solvedCubieState());
});

test('kübi tablolarından hesaplanan durum, genel motordan türetilen durumla birebir eşleşir (100 rastgele dizi)', () => {
  for (let trial = 0; trial < 100; trial++) {
    const seqStr = randomScramble(3, 20);
    const seq = seqStr.split(' ');

    const viaTables = applySequence(seq);

    const generic = createSolvedState(3);
    applyMoveString(generic, seqStr);
    const viaGeneric = cubieStateFromGenericState(generic);

    assert.deepEqual(viaTables, viaGeneric, `deneme ${trial} (${seqStr}) için durumlar eşleşmedi`);
  }
});

test('köşe yönelimi toplamı her zaman 3 ile tam bölünür', () => {
  for (let trial = 0; trial < 30; trial++) {
    const state = applySequence(randomScramble(3, 20).split(' '));
    const sum = state.co.reduce((a, b) => a + b, 0);
    assert.equal(sum % 3, 0);
  }
});

test('kenar yönelimi toplamı her zaman 2 ile tam bölünür', () => {
  for (let trial = 0; trial < 30; trial++) {
    const state = applySequence(randomScramble(3, 20).split(' '));
    const sum = state.eo.reduce((a, b) => a + b, 0);
    assert.equal(sum % 2, 0);
  }
});
