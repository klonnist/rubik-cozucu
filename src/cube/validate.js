import { COLORS } from './constants.js';
import { cornerPositions, findCubieAt, cornerOrientation } from './corners.js';

const AXIS_OF_COLOR = new Map([
  [COLORS.U, 'y'], [COLORS.D, 'y'],
  [COLORS.F, 'z'], [COLORS.B, 'z'],
  [COLORS.R, 'x'], [COLORS.L, 'x'],
]);

function validateColorCounts(state) {
  const n = state.n;
  const expected = n * n;
  const counts = {};
  const positionsByColor = {};
  for (const color of Object.values(COLORS)) {
    counts[color] = 0;
    positionsByColor[color] = [];
  }
  for (const c of state.cubies) {
    for (const color of Object.values(c.stickers)) {
      counts[color] = (counts[color] ?? 0) + 1;
      positionsByColor[color]?.push(c.pos);
    }
  }
  const errors = [];
  for (const color of Object.values(COLORS)) {
    if (counts[color] !== expected) {
      errors.push({
        code: 'RENK_SAYISI',
        message: `${color} rengi ${counts[color]} kez kullanılmış, ${expected} olmalıydı. Her renk küpün bir yüzünü tam olarak kaplamalı.`,
        // Bu rengin şu an kullanıldığı tüm konumlar (arayüzde vurgulamak için); "doğru"
        // ya da "yanlış" belirli bir kareyi kesin olarak işaret etmez, sayım hatasını
        // gösterir.
        positions: positionsByColor[color],
      });
    }
  }
  return errors;
}

function validateCorners(state) {
  const n = state.n;
  const errors = [];
  let orientationSum = 0;
  let badCorner = false;
  const badPositions = [];
  const allCornerPositions = cornerPositions(n);

  for (const pos of allCornerPositions) {
    const cubie = findCubieAt(state, pos);
    if (!cubie) continue;
    const colors = Object.values(cubie.stickers);
    if (colors.length !== 3) {
      badCorner = true;
      badPositions.push(pos);
      continue;
    }
    const axes = new Set(colors.map((c) => AXIS_OF_COLOR.get(c)));
    if (axes.size !== 3) {
      badCorner = true;
      badPositions.push(pos);
      continue;
    }
    const orient = cornerOrientation(pos, n, cubie.stickers);
    if (orient === null) {
      badCorner = true;
      badPositions.push(pos);
      continue;
    }
    orientationSum += orient;
  }

  if (badCorner) {
    errors.push({
      code: 'GECERSIZ_KOSE',
      message: 'Bir köşe parçasında aynı yüzeyin karşılıklı iki rengi (ör. beyaz ve sarı) bir arada kullanılmış. Bu fiziksel olarak mümkün değil; renkleri kontrol edin.',
      positions: badPositions,
    });
  } else if (orientationSum % 3 !== 0) {
    errors.push({
      code: 'KOSE_YONELIMI',
      message: 'Bu küp fiziksel olarak mümkün değil: bir köşe ters çevrilmiş olabilir. Köşe parçalarının yönünü kontrol edin.',
      // Hangi köşenin ters çevrildiği tek başına belirlenemez (bu global bir parite
      // hatasıdır); kullanıcıya kontrol etmesi için tüm köşe konumları verilir.
      positions: allCornerPositions,
    });
  }

  return errors;
}

export function validate(state) {
  const errors = [...validateColorCounts(state), ...validateCorners(state)];
  return { valid: errors.length === 0, errors };
}
