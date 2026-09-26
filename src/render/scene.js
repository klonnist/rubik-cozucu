import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Küpün altına, gerçek zamanlı gölge haritalama kullanmadan yumuşak bir "temas gölgesi"
// izlenimi veren, canvas ile üretilmiş radyal gradyanlı sabit bir doku.
function createFakeShadow() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.32)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.14)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1.05;
  return mesh;
}

/**
 * Sahneyi, kamerayı, ışıkları ve dokunmatik/fare orbit kontrollerini kurar. Düşük güçlü
 * cihazlarda kare süresi uzarsa piksel oranını kademeli olarak düşürür.
 */
export function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(3.6, 3.2, 4.6);

  // Antialiasing ve gerçek zamanlı gölge haritalama kapalı: düşük güçlü cihazlarda
  // (ve yazılım tabanlı render ortamlarında) WebGL bağlamının aşırı yüklenmesini önler.
  // Yumuşak gölge izlenimi, aşağıdaki sabit "sahte gölge" dokusuyla verilir.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(maxPixelRatio);

  // Sekme arka plana alındığında/GPU kaynakları geri çağrıldığında WebGL bağlamı
  // kaybolabilir; varsayılanı engelleyip tarayıcının otomatik geri yüklemesine izin ver.
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault(), false);

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(5, 8, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbcd2ff, 0.35);
  fill.position.set(-6, 3, -4);
  scene.add(fill);

  scene.add(createFakeShadow());

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.enablePan = false;
  controls.minDistance = 2.8;
  controls.maxDistance = 10;
  controls.target.set(0, 0, 0);

  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  let pixelRatio = maxPixelRatio;
  let frameSamples = [];

  function resize() {
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);
  resize();

  function adaptQuality(deltaMs) {
    frameSamples.push(deltaMs);
    if (frameSamples.length < 40) return;
    const avg = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length;
    frameSamples = [];
    if (avg > 30 && pixelRatio > 0.75) {
      pixelRatio = Math.max(0.75, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
    } else if (avg < 16 && pixelRatio < maxPixelRatio) {
      pixelRatio = Math.min(maxPixelRatio, pixelRatio + 0.25);
      renderer.setPixelRatio(pixelRatio);
    }
  }

  let lastTime = performance.now();
  let animationHandle = null;
  const tickListeners = new Set();

  function frame(now) {
    const deltaMs = Math.min(64, now - lastTime);
    lastTime = now;
    try {
      adaptQuality(deltaMs);
      controls.update();
      for (const listener of tickListeners) listener(deltaMs);
      if (!renderer.getContext().isContextLost()) renderer.render(scene, camera);
    } catch (err) {
      console.error('Render karesi atlandı:', err);
    }
    animationHandle = requestAnimationFrame(frame);
  }

  function start() {
    if (animationHandle) return;
    lastTime = performance.now();
    animationHandle = requestAnimationFrame(frame);
  }

  function stop() {
    if (animationHandle) cancelAnimationFrame(animationHandle);
    animationHandle = null;
  }

  function onTick(listener) {
    tickListeners.add(listener);
    return () => tickListeners.delete(listener);
  }

  function dispose() {
    stop();
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
  }

  return { scene, camera, renderer, controls, cubeGroup, start, stop, onTick, resize, dispose };
}
