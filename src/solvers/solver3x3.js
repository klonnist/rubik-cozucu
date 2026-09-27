import { cubieStateFromGenericState } from './kociemba/moveTables.js';
import { solveTwoPhase } from './kociemba/search.js';
import { warmUp3x3 } from './kociemba/search.js';

export { warmUp3x3 };

/**
 * Kociemba iki-aşamalı algoritmasıyla 3x3 küpü çözer. `state`, genel (facelet tabanlı)
 * NxN küp durumudur (n=3 olmalı).
 */
export function solve3x3(state) {
  if (state.n !== 3) throw new Error('solve3x3 yalnızca 3x3 küpler için kullanılabilir.');
  const cubieState = cubieStateFromGenericState(state);
  return solveTwoPhase(cubieState);
}
