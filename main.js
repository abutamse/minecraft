// ---------------- SCENE & CAMERA ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Himmelblau

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------------- LIGHT ----------------
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// ---------------- POINTERLOCK CONTROLS ----------------
const controls = new THREE.PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());
scene.add(controls.getObject());
controls.getObject().position.set(0, 2, 5);

// ---------------- CROSSHAIR ----------------
const crosshair = document.createElement('div');
crosshair.style.position = 'absolute';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.fontSize = '24px';
crosshair.style.color = 'white';
crosshair.style.userSelect = 'none';
crosshair.innerText = '+';
document.body.appendChild(crosshair);

// ---------------- BLOCK SYSTEM ----------------
const blocks = [];
const BLOCK = 1;

const blockColors = {
  dirt: 0x8B4513,
  grass: 0x00FF00,
  stone: 0x808080,
  wood: 0xA0522D,
  leaves: 0x228B22,
  sand: 0xFFFF00
};

function addBlock(x, y, z, type){
  const geo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
  const mat = new THREE.MeshStandardMaterial({ color: blockColors[type] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  scene.add(mesh);
  blocks.push({ mesh, type, x, y, z });
}

// ---------------- WORLD GENERATION ----------------
for(let x=-10; x<=10; x++){
  for(let z=-10; z<=10; z++){
    addBlock(x, 0, z, 'grass');
  }
}

// ---------------- INVENTORY & HOTBAR ----------------
const inventory = { dirt: 10, grass: 10, stone: 10, wood: 10, leaves: 10, sand: 10 };
let selected = 'dirt';

const hotbar = document.createElement('div');
hotbar.style.position = 'absolute';
hotbar.style.bottom = '20px';
hotbar.style.left = '50%';
hotbar.style.transform = 'translateX(-50%)';
hotbar.style.display = 'flex';
hotbar.style.gap = '5px';
hotbar.style.background = 'rgba(0,0,0,0.6)';
hotbar.style.padding = '6px';
hotbar.style.borderRadius = '6px';
document.body.appendChild(hotbar);

function updateHotbar(){
  hotbar.innerHTML = '';
  for(const k in inventory){
    const b = document.createElement('button');
    b.textContent = `${k} (${inventory[k]})`;
    if(k === selected) b.style.border = '2px solid yellow';
    b.style.padding = '6px 10px';
    b.style.background = '#333';
    b.style.color = 'white';
    b.style.border = '1px solid #666';
    b.style.cursor = 'pointer';
    b.onclick = () => { selected = k; updateHotbar(); };
    hotbar.appendChild(b);
  }
}
updateHotbar();

// ---------------- RAYCAST & ACTIONS ----------------
const raycaster = new THREE.Raycaster();

function getTargetBlock(){
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(blocks.map(b => b.mesh));
  if(hits.length) return blocks.find(b => b.mesh === hits[0].object);
  return null;
}

function mineBlock(){
  const t = getTargetBlock();
  if(!t) return;
  scene.remove(t.mesh);
  blocks.splice(blocks.indexOf(t), 1);
  inventory[t.type]++;
  updateHotbar();
}

function buildBlock(){
  const t = getTargetBlock();
  if(!t || inventory[selected] <= 0) return;
  const x = t.x;
  const y = t.y + 1;
  const z = t.z;
  if(blocks.find(b => b.x === x && b.y === y && b.z === z)) return;
  addBlock(x, y, z, selected);
  inventory[selected]--;
  updateHotbar();
}

// Mouse events
window.addEventListener('mousedown', e=>{
  if(e.button === 0) mineBlock();
  if(e.button === 2) buildBlock();
});
window.addEventListener('contextmenu', e=>e.preventDefault());

// ---------------- MOVEMENT & COLLISION ----------------
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

let velocity = new THREE.Vector3();
let canJump = true;
const clock = new THREE.Clock();

function checkCollisions(pos){
  for(const b of blocks){
    if(pos.x + 0.3 > b.x && pos.x - 0.3 < b.x + 1 &&
       pos.y + 1.8 > b.y && pos.y < b.y + 1 &&
       pos.z + 0.3 > b.z && pos.z - 0.3 < b.z + 1){
      return true;
    }
  }
  return false;
}

// ---------------- TOUCH MOVEMENT ----------------
const touchContainer = document.createElement('div');
touchContainer.style.position = 'absolute';
touchContainer.style.bottom = '20px';
touchContainer.style.left = '50%';
touchContainer.style.transform = 'translateX(-50%)';
touchContainer.style.width = '200px';
touchContainer.style.height = '200px';
document.body.appendChild(touchContainer);

function createTouchButton(text, x, y){
  const btn = document.createElement('div');
  btn.className = 'touch-button';
  btn.style.left = x;
  btn.style.top = y;
  btn.innerText = text;
  touchContainer.appendChild(btn);
  return btn;
}

const btnUp = createTouchButton('↑','50%','0');
btnUp.style.transform = 'translate(-50%,0)';
const btnDown = createTouchButton('↓','50%','100%');
btnDown.style.transform = 'translate(-50%,-100%)';
const btnLeft = createTouchButton('←','0','50%');
btnLeft.style.transform = 'translate(0,-50%)';
const btnRight = createTouchButton('→','100%','50%');
btnRight.style.transform = 'translate(-100%,-50%)';
const btnJump = createTouchButton('J','50%','50%');
btnJump.style.transform = 'translate(-50%,-50%)';

const touchKeys = { forward:false, back:false, left:false, right:false, jump:false };
function addTouchEvents(btn,key){
  btn.addEventListener('touchstart', e=>{ e.preventDefault(); touchKeys[key]=true; });
  btn.addEventListener('touchend', e=>{ e.preventDefault(); touchKeys[key]=false; });
}
addTouchEvents(btnUp,'forward');
addTouchEvents(btnDown,'back');
addTouchEvents(btnLeft,'left');
addTouchEvents(btnRight,'right');
addTouchEvents(btnJump,'jump');

// ---------------- TOUCH BUILD/MINE ----------------
const actionContainer = document.createElement('div');
actionContainer.style.position = 'absolute';
actionContainer.style.bottom = '20px';
actionContainer.style.right = '20px';
actionContainer.style.display = 'flex';
actionContainer.style.flexDirection = 'column';
actionContainer.style.gap = '10px';
document.body.appendChild(actionContainer);

function createActionButton(text, callback){
  const btn = document.createElement('div');
  btn.className = 'action-btn';
  btn.innerText = text;
  actionContainer.appendChild(btn);
  btn.addEventListener('touchstart', e=>{ e.preventDefault(); callback(); });
}
createActionButton('MINE', mineBlock);
createActionButton('BUILD', buildBlock);

// ---------------- ANIMATION LOOP ----------------
function handleTouchMovement(delta){
  let forward = (touchKeys.forward ? 1 : 0) - (touchKeys.back ? 1 : 0);
  let right = (touchKeys.right ? 1 : 0) - (touchKeys.left ? 1 : 0);

  const dir = new THREE.Vector3();
  controls.getDirection(dir);
  dir.y = 0;
  dir.normalize();

  const side = new THREE.Vector3();
  side.crossVectors(camera.up, dir).normalize();

  const speed = 5;
  velocity.x += (dir.x * forward + side.x * right) * speed * delta;
  velocity.z += (dir.z * forward + side.z * right) * speed * delta;

  if(touchKeys.jump && canJump){
    velocity.y = 7;
    canJump = false;
  }
}

function animate(){
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Touch Movement
  handleTouchMovement(delta);

  // Keyboard Movement
  let forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  let right = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);

  const dir = new THREE.Vector3();
  controls.getDirection(dir);
  dir.y = 0;
  dir.normalize();
  const side = new THREE.Vector3();
  side.crossVectors(camera.up, dir).normalize();

  const speed = 5;
  velocity.x += (dir.x * forward + side.x * right) * speed * delta;
  velocity.z += (dir.z * forward + side.z * right) * speed * delta;

  // Jump & Gravity
  if(keys.Space && canJump){
    velocity.y = 7;
    canJump = false;
  }
  velocity.y -= 9.8 * delta;

  const pos = controls.getObject().position.clone();
  pos.addScaledVector(velocity, delta);

  if(checkCollisions(pos)){
    velocity.x = 0;
    velocity.z = 0;
    velocity.y = Math.min(0, velocity.y);
  } else {
    controls.getObject().position.copy(pos);
  }

  if(controls.getObject().position.y < 2){
    velocity.y = 0;
    controls.getObject().position.y = 2;
    canJump = true;
  }

  velocity.multiplyScalar(0.9);
  renderer.render(scene, camera);
}

animate();
