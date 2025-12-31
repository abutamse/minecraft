// ---------------- SCENE & CAMERA ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth/window.innerHeight, 0.1, 1000
);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------------- LIGHT ----------------
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50,100,50);
scene.add(sun);

// ---------------- POINTERLOCK & CONTROLS ----------------
const controls = new THREE.PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());
scene.add(controls.getObject());
controls.getObject().position.set(0,2,5);

// ---------------- TARGET CROSSHAIR ----------------
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

// ---------------- TEXTURES ----------------
const loader = new THREE.TextureLoader();
const textures = {
  dirt: loader.load('textures/dirt.png'),
  grass: loader.load('textures/grass.png'),
  stone: loader.load('textures/stone.png'),
  wood: loader.load('textures/wood.png'),
  leaves: loader.load('textures/leaves.png'),
  sand: loader.load('textures/sand.png')
};

// ---------------- BLOCK SYSTEM ----------------
const blocks = [];
const BLOCK = 1;

function addBlock(x,y,z,type){
  const geo = new THREE.BoxGeometry(BLOCK,BLOCK,BLOCK);
  const mat = new THREE.MeshStandardMaterial({ map:textures[type] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  scene.add(mesh);
  blocks.push({ mesh, type, x, y, z });
}

// ---------------- WORLD GENERATION ----------------
for(let x=-10;x<=10;x++){
  for(let z=-10;z<=10;z++){
    addBlock(x,0,z,'grass');
  }
}

// ---------------- INVENTAR & HOTBAR ----------------
const inventory = { dirt:10, grass:10, stone:10, wood:10, leaves:10, sand:10 };
let selected = 'dirt';
const hotbar = document.getElementById('hotbar');

function updateHotbar(){
  hotbar.innerHTML='';
  for(const k in inventory){
    const b = document.createElement('button');
    b.textContent = `${k} (${inventory[k]})`;
    if(k===selected) b.classList.add('active');
    b.onclick=()=>{ selected=k; updateHotbar(); };
    hotbar.appendChild(b);
  }
}
updateHotbar();

// ---------------- AUDIO ----------------
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();

const mineSound = new THREE.Audio(listener);
audioLoader.load('sounds/mining.mp3', b=>mineSound.setBuffer(b));

const buildSound = new THREE.Audio(listener);
audioLoader.load('sounds/build.mp3', b=>buildSound.setBuffer(b));

// ---------------- RAYCAST ----------------
const raycaster = new THREE.Raycaster();

function getTarget(){
  raycaster.setFromCamera({x:0,y:0},camera);
  const hits = raycaster.intersectObjects(blocks.map(b=>b.mesh));
  if(hits.length) return blocks.find(b=>b.mesh===hits[0].object);
  return null;
}

// ---------------- ACTIONS ----------------
function mine(){
  const t = getTarget();
  if(!t) return;
  scene.remove(t.mesh);
  blocks.splice(blocks.indexOf(t),1);
  inventory[t.type]++;
  mineSound.play();
  updateHotbar();
}

function build(){
  const t = getTarget();
  if(!t || inventory[selected]<=0) return;
  const x = t.x;
  const y = t.y + 1;
  const z = t.z;
  if(blocks.find(b=>b.x===x && b.y===y && b.z===z)) return;
  addBlock(x, y, z, selected);
  inventory[selected]--;
  buildSound.play();
  updateHotbar();
}

// ---------------- MOUSE & TOUCH EVENTS ----------------
window.addEventListener('mousedown', e=>{
  if(e.button===0) mine();
  if(e.button===2) build();
});
window.addEventListener('contextmenu', e=>e.preventDefault());

document.getElementById('mine').onclick = mine;
document.getElementById('build').onclick = build;

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

// ---------------- ANIMATION & MOVEMENT ----------------
function animate(){
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const speed = 5;

  let forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  let right = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);

  const dir = new THREE.Vector3();
  controls.getDirection(dir);
  dir.y = 0;
  dir.normalize();

  const side = new THREE.Vector3();
  side.crossVectors(camera.up, dir).normalize();

  velocity.x += (dir.x * forward + side.x * right) * speed * delta;
  velocity.z += (dir.z * forward + side.z * right) * speed * delta;

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
// ---------------- TOUCH CONTROLS ----------------
const touchContainer = document.createElement('div');
touchContainer.style.position = 'absolute';
touchContainer.style.bottom = '20px';
touchContainer.style.width = '100%';
touchContainer.style.display = 'flex';
touchContainer.style.justifyContent = 'space-between';
touchContainer.style.padding = '0 20px';
document.body.appendChild(touchContainer);

function createTouchButton(text){
  const btn = document.createElement('div');
  btn.className = 'touch-button';
  btn.style.width = '60px';
  btn.style.height = '60px';
  btn.style.borderRadius = '50%';
  btn.style.background = 'rgba(0,0,0,0.5)';
  btn.style.color = 'white';
  btn.style.textAlign = 'center';
  btn.style.lineHeight = '60px';
  btn.style.userSelect = 'none';
  btn.innerText = text;
  touchContainer.appendChild(btn);
  return btn;
}

const btnForward = createTouchButton('↑');
const btnBack = createTouchButton('↓');
const btnLeft = createTouchButton('←');
const btnRight = createTouchButton('→');
const btnJump = createTouchButton('J');

// Button-Status
const touchKeys = { forward:false, back:false, left:false, right:false, jump:false };

function addTouchEvents(btn, key){
  btn.addEventListener('touchstart', e=>{ e.preventDefault(); touchKeys[key]=true; });
  btn.addEventListener('touchend', e=>{ e.preventDefault(); touchKeys[key]=false; });
}

addTouchEvents(btnForward,'forward');
addTouchEvents(btnBack,'back');
addTouchEvents(btnLeft,'left');
addTouchEvents(btnRight,'right');
addTouchEvents(btnJump,'jump');

// ---------------- TOUCH MOVEMENT IN ANIMATION ----------------
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

// Im Animationsloop aufrufen:
function animate(){
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  handleTouchMovement(delta); // <-- TOUCH MOVEMENT

  // bestehende Tastatur-Bewegung & Gravitation bleibt unverändert
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
// ---------------- TOUCH BUILD / MINE ----------------
const touchBuildMineContainer = document.createElement('div');
touchBuildMineContainer.style.position = 'absolute';
touchBuildMineContainer.style.bottom = '20px';
touchBuildMineContainer.style.right = '20px';
touchBuildMineContainer.style.display = 'flex';
touchBuildMineContainer.style.flexDirection = 'column';
touchBuildMineContainer.style.gap = '10px';
document.body.appendChild(touchBuildMineContainer);

function createTouchActionButton(text, callback){
  const btn = document.createElement('div');
  btn.className = 'touch-button';
  btn.style.width = '60px';
  btn.style.height = '60px';
  btn.style.borderRadius = '50%';
  btn.style.background = 'rgba(0,0,0,0.5)';
  btn.style.color = 'white';
  btn.style.textAlign = 'center';
  btn.style.lineHeight = '60px';
  btn.style.userSelect = 'none';
  btn.innerText = text;
  touchBuildMineContainer.appendChild(btn);

  btn.addEventListener('touchstart', e=>{ e.preventDefault(); callback(); });
}

createTouchActionButton('MINE', mine);
createTouchActionButton('BUILD', build);
