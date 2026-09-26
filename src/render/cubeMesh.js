import * as THREE from 'three';

// BoxGeometry yüz grubu sırası: 0:+X 1:-X 2:+Y 3:-Y 4:+Z 5:-Z -> R,L,U,D,F,B ile birebir eşleşir.
const MATERIAL_FACE_ORDER = ['R', 'L', 'U', 'D', 'F', 'B'];
const PLASTIC_COLOR = 0x1b1b22;

export function buildCubieMeshes(state, colorHex) {
  const n = state.n;
  const spacing = 1.02;
  const cubieSize = 0.95;
  const offset = (n - 1) / 2;
  const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
  const meshes = [];

  for (const cubie of state.cubies) {
    const materials = MATERIAL_FACE_ORDER.map((face) => {
      const color = cubie.stickers[face];
      return new THREE.MeshStandardMaterial({
        color: color ? colorHex[color] : PLASTIC_COLOR,
        roughness: color ? 0.32 : 0.8,
        metalness: 0.04,
      });
    });
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.userData.gridPos = [...cubie.pos];
    setMeshPositionFromGrid(mesh, cubie.pos, offset, spacing);
    meshes.push(mesh);
  }

  return { meshes, offset, spacing, geometry };
}

export function setMeshPositionFromGrid(mesh, gridPos, offset, spacing) {
  mesh.position.set(
    (gridPos[0] - offset) * spacing,
    (gridPos[1] - offset) * spacing,
    (gridPos[2] - offset) * spacing
  );
}

export function gridPosFromMeshPosition(mesh, offset, spacing) {
  return [
    Math.round(mesh.position.x / spacing + offset),
    Math.round(mesh.position.y / spacing + offset),
    Math.round(mesh.position.z / spacing + offset),
  ];
}

/** Mesh materyallerini state'teki güncel sticker renklerine göre yeniden boyar (render/reset için). */
export function repaintCubeGroup(meshes, state, colorHex) {
  meshes.forEach((mesh, i) => {
    const cubie = state.cubies[i];
    MATERIAL_FACE_ORDER.forEach((face, matIdx) => {
      const color = cubie.stickers[face];
      const material = mesh.material[matIdx];
      material.color.set(color ? colorHex[color] : PLASTIC_COLOR);
      material.roughness = color ? 0.32 : 0.8;
    });
    mesh.userData.gridPos = [...cubie.pos];
  });
}
