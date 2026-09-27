import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMoveTables, PHASE2_MOVE_NAMES, ALL_MOVE_NAMES } from '../src/solvers/kociemba/moveTables.js';
import {
  buildTwistSlicePrune,
  buildFlipSlicePrune,
  buildCornerSlicePermPrune,
  buildEdge8SlicePermPrune,
} from '../src/solvers/kociemba/pruning.js';

test('faz 2 hamleleri dilim/dilim-dışı kenar pozisyonlarını asla karıştırmaz', () => {
  const tables = buildMoveTables();
  for (const name of PHASE2_MOVE_NAMES) {
    const { epFrom } = tables[name];
    for (let j = 8; j < 12; j++) {
      assert.ok(epFrom[j] >= 8, `${name}: pozisyon ${j} (dilim) dilim-dışı bir kaynaktan geliyor (${epFrom[j]})`);
    }
    for (let j = 0; j < 8; j++) {
      assert.ok(epFrom[j] < 8, `${name}: pozisyon ${j} (dilim-dışı) bir dilim kaynağından geliyor (${epFrom[j]})`);
    }
  }
});

test('faz 1 hamle tabloları (18 hamle) tanımlıdır ve permFrom dizileri geçerli permütasyondur', () => {
  const tables = buildMoveTables();
  for (const name of ALL_MOVE_NAMES) {
    const { cpFrom, epFrom } = tables[name];
    assert.equal(new Set(cpFrom).size, 8, `${name}: cpFrom geçerli bir permütasyon değil`);
    assert.equal(new Set(epFrom).size, 12, `${name}: epFrom geçerli bir permütasyon değil`);
  }
});

test('twist+slice budama tablosu tam olarak kurulur (2187*495 durum)', () => {
  const tables = buildMoveTables();
  const table = buildTwistSlicePrune(tables);
  assert.equal(table.length, 2187 * 495);
  assert.equal(table[table.length - 1] === 255 ? 'eksik' : 'tam', 'tam');
});

test('flip+slice budama tablosu tam olarak kurulur (2048*495 durum)', () => {
  const tables = buildMoveTables();
  const table = buildFlipSlicePrune(tables);
  assert.equal(table.length, 2048 * 495);
});

test('faz 2 budama tabloları tam olarak kurulur (her biri 40320*24 durum)', () => {
  const tables = buildMoveTables();
  const t1 = buildCornerSlicePermPrune(tables);
  const t2 = buildEdge8SlicePermPrune(tables);
  assert.equal(t1.length, 40320 * 24);
  assert.equal(t2.length, 40320 * 24);
});
