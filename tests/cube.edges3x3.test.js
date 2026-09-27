import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolvedState } from '../src/cube/state.js';
import { applyMoveString } from '../src/cube/moves.js';
import { randomScramble } from '../src/cube/scramble.js';
import { edgePositions, edgeDefsForState, findCubieAt, edgeOrientation } from '../src/cube/edges3x3.js';

function totalEdgeOrientation(state) {
  let sum = 0;
  for (const def of edgeDefsForState()) {
    const cubie = findCubieAt(state, def.pos);
    sum += edgeOrientation(def.pos, 3, cubie.stickers);
  }
  return sum;
}

test('çözülmüş 3x3 küpte tüm kenarların yönelimi 0 dır', () => {
  const state = createSolvedState(3);
  for (const def of edgeDefsForState()) {
    const cubie = findCubieAt(state, def.pos);
    assert.equal(edgeOrientation(def.pos, 3, cubie.stickers), 0);
  }
});

test('12 kenar pozisyonu birbirinden farklıdır ve state.cubies içinde bulunur', () => {
  const state = createSolvedState(3);
  const positions = edgePositions();
  assert.equal(positions.length, 12);
  const keys = new Set(positions.map((p) => p.join(',')));
  assert.equal(keys.size, 12);
  for (const pos of positions) {
    const cubie = findCubieAt(state, pos);
    assert.ok(cubie, `kenar pozisyonu bulunamadı: ${pos}`);
    assert.equal(Object.keys(cubie.stickers).length, 2, `${pos} tam olarak 2 boyalı yüzeye sahip olmalı`);
  }
});

test('rastgele karıştırma sonrası kenar yönelimi toplamı çift kalır (değişmez)', () => {
  for (let trial = 0; trial < 50; trial++) {
    const state = createSolvedState(3);
    applyMoveString(state, randomScramble(3, 25));
    const sum = totalEdgeOrientation(state);
    assert.equal(sum % 2, 0, `deneme ${trial}: kenar yönelim toplamı ${sum}, çift olmalıydı`);
  }
});

test('tek bir kenarın elle ters çevrilmesi tek toplam üretir', () => {
  const state = createSolvedState(3);
  const cubie = findCubieAt(state, [2, 2, 1]); // UR
  const faces = Object.keys(cubie.stickers);
  const tmp = cubie.stickers[faces[0]];
  cubie.stickers[faces[0]] = cubie.stickers[faces[1]];
  cubie.stickers[faces[1]] = tmp;
  const sum = totalEdgeOrientation(state);
  assert.equal(sum % 2, 1);
});
