/* ================= BASIC SETUP ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/* ================= PLAYER ================= */
const player = new THREE.Object3D();
player.position.set(0, 1.8, 5); // player height
scene.add(player);
player.add(camera);

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(30, 100, 30);
scene.add(sun);

/* ================= TEXTURES ================= */
const loader = new THREE.TextureLoader();
const textures = {
  grass: loader.load("https://threejs.org/examples/textures/terrain/grasslight-big.jpg"),
  dirt: loader.load("https://threejs.org/examples/textures/terrain/backgrounddetailed6.jpg")
};

/* ================= WORLD ================= */
const blocks = [];
const blockGeo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type = "grass") {
  const mat = new THREE.MeshStandardMaterial({ map: textures[type] });
  const block = new THREE.Mesh(blockGeo, mat);
  block.position.set(
    Math.round(x),
    Math.round(y),
    Math.round(z)
  );
  scene.add(block);
  blocks.push(block);
}

// flat world
for (let x = -10; x <= 10; x++) {
  for (let z = -10; z <= 10; z++) {
    addBlock(x, 0, z, "grass");
  }
}

/* ================= SMOOTH CAMERA LOOK ================= */
let yaw = 0, pitch = 0;
let targetYaw = 0, targetPitch = 0;

let looking = false;
let lx = 0, ly = 0;

const LOOK_SENS = 0.0012;   // lower = lighter
const SMOOTHING = 0.15;     // 0.1–0.2 good for touch

window.addEventListener("touchstart", e => {
  if (e.target.closest("#joystick")) return;
  looking = true;
  lx = e.touches[0].clientX;
  ly = e.touches[0].clientY;
});

window.addEventListener("touchend", () => {
  looking = false;
});

window.addEventListener("touchmove", e => {
  if (!looking) return;

  const dx = e.touches[0].clientX - lx;
  const dy = e.touches[0].clientY - ly;

  targetYaw   -= dx * LOOK_SENS;
  targetPitch -= dy * LOOK_SENS;

  targetPitch = Math.max(-1.4, Math.min(1.4, targetPitch));

  lx = e.touches[0].clientX;
  ly = e.touches[0].clientY;
});

/* ================= JOYSTICK MOVE ================= */
let moveX = 0, moveZ = 0;
const stick = document.getElementById("stick");

let joy = false;
let sx = 0, sy = 0;

document.getElementById("joystick").addEventListener("touchstart", e => {
  joy = true;
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
});

window.addEventListener("touchend", () => {
  joy = false;
  moveX = moveZ = 0;
  stick.style.left = "50px";
  stick.style.top = "50px";
});

window.addEventListener("touchmove", e => {
  if (!joy) return;

  const dx = e.touches[0].clientX - sx;
  const dy = e.touches[0].clientY - sy;
  const max = 40;

  const x = Math.max(-max, Math.min(max, dx));
  const y = Math.max(-max, Math.min(max, dy));

  stick.style.left = 50 + x + "px";
  stick.style.top = 50 + y + "px";

  moveX = x / max;
  moveZ = y / max;
});

/* ================= RAYCAST ================= */
const raycaster = new THREE.Raycaster();
raycaster.far = 5;

function getTarget() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);

  raycaster.set(origin, dir);
  const hits = raycaster.intersectObjects(blocks);
  return hits.length ? hits[0] : null;
}

/* ================= ACTIONS ================= */
document.getElementById("mineBtn").onclick = () => {
  const hit = getTarget();
  if (!hit) return;

  scene.remove(hit.object);
  blocks.splice(blocks.indexOf(hit.object), 1);
};

document.getElementById("buildBtn").onclick = () => {
  const hit = getTarget();
  if (!hit) return;

  const pos = hit.object.position.clone().add(hit.face.normal);
  addBlock(pos.x, pos.y, pos.z, "dirt");
};

/* ================= GAME LOOP ================= */
function animate() {
  requestAnimationFrame(animate);

  // smooth camera
  yaw   += (targetYaw   - yaw)   * SMOOTHING;
  pitch += (targetPitch - pitch) * SMOOTHING;

  player.rotation.y = yaw;
  camera.rotation.x = pitch;

  // movement
  const speed = 0.08;

  const forward = new THREE.Vector3(
    Math.sin(yaw),
    0,
    Math.cos(yaw)
  );
  const right = new THREE.Vector3(
    Math.cos(yaw),
    0,
    -Math.sin(yaw)
  );

  player.position.add(forward.multiplyScalar(-moveZ * speed));
  player.position.add(right.multiplyScalar(moveX * speed));

  renderer.render(scene, camera);
}
animate();
