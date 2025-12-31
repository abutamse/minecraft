// ================== BASIC SETUP ==================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================== LIGHT ==================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// ================== TOUCH LOOK (KAMERA) ==================
let lookX = 0;
let lookY = 0;
let lastX = null;
let lastY = null;

document.addEventListener("touchstart", e => {
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
});

document.addEventListener("touchmove", e => {
  const t = e.touches[0];
  if (lastX === null) return;

  lookX += (t.clientX - lastX) * 0.003;
  lookY += (t.clientY - lastY) * 0.003;

  lookY = Math.max(-1.4, Math.min(1.4, lookY));

  lastX = t.clientX;
  lastY = t.clientY;
});

// ================== TEXTURES ==================
const loader = new THREE.TextureLoader();
const textures = {
  grass: loader.load("textures/grass.png"),
  dirt: loader.load("textures/dirt.png"),
  stone: loader.load("textures/stone.png")
};

// ================== BLOCK SYSTEM ==================
const blocks = [];
const BLOCK_SIZE = 1;

function addBlock(x, y, z, type) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ map: textures[type] });
  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  scene.add(mesh);

  blocks.push({ mesh, x, y, z, type });
}

// ================== WORLD GENERATION ==================
for (let x = -10; x <= 10; x++) {
  for (let z = -10; z <= 10; z++) {
    addBlock(x, 0, z, "grass");
    addBlock(x, -1, z, "dirt");
    addBlock(x, -2, z, "stone");
  }
}

// ================== BASIC LOOP ==================
function animate() {
  requestAnimationFrame(animate);

  // Kamera-Rotation
  camera.rotation.y = -lookX;
  camera.rotation.x = -lookY;

  renderer.render(scene, camera);
}

animate();
