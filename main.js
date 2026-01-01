// ================== SETUP ==================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ================== LIGHT ==================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// ================== BLOCKS ==================
const blocks = [];

function addBlock(x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0x55aa55 })
  );
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  scene.add(mesh);
  blocks.push({ mesh, x, y, z });
}

// Boden
for (let x = -10; x <= 10; x++) {
  for (let z = -10; z <= 10; z++) {
    addBlock(x, 0, z);
  }
}

// ================== RAYCAST ==================
const raycaster = new THREE.Raycaster();

function getTarget() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(blocks.map(b => b.mesh));
  if (!hits.length) return null;
  return blocks.find(b => b.mesh === hits[0].object);
}

// ================== MINE / BUILD ==================
document.getElementById("mine").ontouchstart = () => {
  const t = getTarget();
  if (!t || t.y === 0) return; // Boden nicht abbauen
  scene.remove(t.mesh);
  blocks.splice(blocks.indexOf(t), 1);
};

document.getElementById("build").ontouchstart = () => {
  const t = getTarget();
  if (!t) return;
  addBlock(t.x, t.y + 1, t.z);
};

// ================== TOUCH LOOK ==================
let lookX = 0, lookY = 0;
let lastX = null, lastY = null;

document.addEventListener("touchstart", e => {
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
});

document.addEventListener("touchmove", e => {
  const t = e.touches[0];
  if (lastX === null) return;

  lookX += (t.clientX - lastX) * 0.003;
  lookY += (t.clientY - lastY) * 0.003;
  lookY = Math.max(-1.3, Math.min(1.3, lookY));

  lastX = t.clientX;
  lastY = t.clientY;
});

// ================== JOYSTICK ==================
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

let moveX = 0;
let moveZ = 0;

joystick.addEventListener("touchmove", e => {
  const r = joystick.getBoundingClientRect();
  const t = e.touches[0];

  const dx = t.clientX - (r.left + r.width / 2);
  const dy = t.clientY - (r.top + r.height / 2);

  const dist = Math.min(40, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);

  moveX = Math.cos(angle) * (dist / 40);
  moveZ = Math.sin(angle) * (dist / 40);

  stick.style.left = 35 + moveX * 40 + "px";
  stick.style.top = 35 + moveZ * 40 + "px";
});

joystick.addEventListener("touchend", () => {
  moveX = 0;
  moveZ = 0;
  stick.style.left = "35px";
  stick.style.top = "35px";
});

// ================== LOOP ==================
function animate() {
  requestAnimationFrame(animate);

  camera.rotation.y = -lookX;
  camera.rotation.x = -lookY;

  camera.position.x += moveX * 0.1;
  camera.position.z += moveZ * 0.1;

  // einfache Boden-Kollision
  if (camera.position.y < 2) camera.position.y = 2;

  renderer.render(scene, camera);
}
animate();
