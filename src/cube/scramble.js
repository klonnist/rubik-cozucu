import { HI_FACES, LO_FACES } from './constants.js';
import { applyMoveString } from './moves.js';

const OUTER_FACES = [...HI_FACES, ...LO_FACES];
const AXIS_OF = { R: 'x', L: 'x', U: 'y', D: 'y', F: 'z', B: 'z' };
const SUFFIXES = ['', "'", '2'];

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

/**
 * Rastgele geçerli bir karıştırma dizisi üretir. Aynı ekseni art arda seçmemeye çalışır
 * (örn. R sonra R' gelip hamleyi iptal etmesin diye) böylece dizi gereksiz yere kısalmaz.
 */
export function randomScramble(n, length) {
  const tokens = [];
  let lastAxis = null;
  for (let i = 0; i < length; i++) {
    let face;
    let attempts = 0;
    do {
      face = OUTER_FACES[randomInt(OUTER_FACES.length)];
      attempts++;
    } while (AXIS_OF[face] === lastAxis && attempts < 20);
    lastAxis = AXIS_OF[face];
    const suffix = SUFFIXES[randomInt(SUFFIXES.length)];
    tokens.push(`${face}${suffix}`);
  }
  return tokens.join(' ');
}

export function defaultScrambleLength(n) {
  if (n <= 2) return 9;
  if (n === 3) return 20;
  return 30 + (n - 3) * 10;
}

export function scrambleState(state, length) {
  const moves = randomScramble(state.n, length ?? defaultScrambleLength(state.n));
  applyMoveString(state, moves);
  return moves;
}
