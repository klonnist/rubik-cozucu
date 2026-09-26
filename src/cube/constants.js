// Standart Batı renk şeması: Beyaz-Sarı, Yeşil-Mavi, Kırmızı-Turuncu karşılıklı yüzeyler.
export const FACES = ['U', 'D', 'F', 'B', 'R', 'L'];

export const COLORS = {
  U: 'W', // Beyaz
  D: 'Y', // Sarı
  F: 'G', // Yeşil
  B: 'BL', // Mavi
  R: 'R', // Kırmızı
  L: 'O', // Turuncu
};

export const COLOR_HEX = {
  W: '#f4f4f4',
  Y: '#ffd500',
  G: '#00a651',
  BL: '#0057b8',
  R: '#c8102e',
  O: '#ff6a13',
};

export const COLOR_LABEL_TR = {
  W: 'Beyaz',
  Y: 'Sarı',
  G: 'Yeşil',
  BL: 'Mavi',
  R: 'Kırmızı',
  O: 'Turuncu',
};

// Her yüzün dünya-uzayı normal yönü (three.js: +X sağ, +Y yukarı, +Z ön/kamera).
export const FACE_DIR = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

export const DIR_TO_FACE = new Map(
  Object.entries(FACE_DIR).map(([face, v]) => [v.join(','), face])
);

export const AXIS_OF_FACE = { R: 'x', L: 'x', U: 'y', D: 'y', F: 'z', B: 'z' };

// "hi" yüzler (R,U,F) pozitif eksen ucunda; primsiz hamlede -1 çeyrek dönüş uygular.
// "lo" yüzler (L,D,B) negatif eksen ucunda; primsiz hamlede +1 çeyrek dönüş uygular.
export const HI_FACES = new Set(['R', 'U', 'F']);
export const LO_FACES = new Set(['L', 'D', 'B']);
