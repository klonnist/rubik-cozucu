import { solve, isSizeReady } from '../solvers/index.js';
import { warmUp } from '../solvers/solver2x2.js';

// 2x2 budama tablosunu sayfa yüklenir yüklenmez, kullanıcı henüz "Çöz"e basmadan ısıt.
// Bu senkron ve birkaç saniye sürebilir; ancak bu bir Worker olduğu için arayüz donmaz.
setTimeout(() => {
  warmUp();
  postMessage({ type: 'ready', size: 2 });
}, 0);

onmessage = (event) => {
  const { id, type, state } = event.data;
  if (type !== 'solve') return;
  try {
    if (!isSizeReady(state.n)) {
      throw new Error(`${state.n}x${state.n} çözücüsü henüz hazır değil. Yakında eklenecek.`);
    }
    const moves = solve(state);
    postMessage({ id, type: 'result', moves });
  } catch (err) {
    postMessage({ id, type: 'error', message: err.message });
  }
};
