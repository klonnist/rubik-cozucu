import { COLOR_HEX } from '../cube/constants.js';
import { faceGrid } from '../cube/state.js';

const FACE_ORIGIN = {
  U: (n) => [0, n],
  L: (n) => [n, 0],
  F: (n) => [n, n],
  R: (n) => [n, 2 * n],
  B: (n) => [n, 3 * n],
  D: (n) => [2 * n, n],
};

export function renderNet(container, state, onCellClick) {
  const n = state.n;
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${4 * n}, 1fr)`;

  const totalRows = 3 * n;
  const totalCols = 4 * n;
  const cellInfo = new Map();

  for (const face of Object.keys(FACE_ORIGIN)) {
    const [originRow, originCol] = FACE_ORIGIN[face](n);
    const grid = faceGrid(state, face);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        cellInfo.set(`${originRow + r},${originCol + c}`, { face, row: r, col: c, color: grid[r][c] });
      }
    }
  }

  const fragment = document.createDocumentFragment();
  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const info = cellInfo.get(`${row},${col}`);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'net-cell';
      if (!info) {
        btn.disabled = true;
        btn.tabIndex = -1;
      } else {
        btn.style.background = COLOR_HEX[info.color] ?? '#888888';
        btn.setAttribute('aria-label', `${info.face} yüzü, satır ${info.row + 1}, sütun ${info.col + 1}`);
        btn.addEventListener('click', () => onCellClick(info.face, info.row, info.col));
      }
      fragment.appendChild(btn);
    }
  }
  container.appendChild(fragment);
}
