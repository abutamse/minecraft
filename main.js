// ---------------- SCENE & CAMERA ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------------- LIGHT ----------------
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(50,100,50);
scene.add(sun);

// ---------------- CONTROLS ----------------
const controls = new THREE.PointerLockControls(camera, document.body);
document.body.addEventListener('click', ()=>controls.lock());
scene.add(controls.getObject());
controls.getObject().position.set(0,2,5);

// ---------------- BLOCKS ----------------
const blocks = [];
const BLOCK = 1;

const colors = { grass:0x00ff00, dirt:0x8b4513, stone:0x808080 };
function addBlock(x,y,z,type){
  const geo = new THREE.BoxGeometry(BLOCK,BLOCK,BLOCK);
  const mat = new THREE.MeshStandardMaterial({ color: colors[type] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x+0.5, y+0.5, z+0.5);
  scene.add(mesh);
  blocks.push({mesh, x,y,z, type});
}

// ---------------- WORLD ----------------
for(let x=-10;x<=10;x++){
  for(let z=-10;z<=10;z++){
    addBlock(x,0,z,'grass');
  }
}

// ---------------- INVENTORY & HOTBAR ----------------
const inventory = { grass:10, dirt:10, stone:10 };
let selected = 'grass';
const hotbar = document.getElementById('hotbar');
function updateHotbar(){
  hotbar.innerHTML='';
  for(const k in inventory){
    const b = document.createElement('button');
    b.textContent=`${k} (${inventory[k]})`;
    if(k===selected) b.classList.add('active');
    b.onclick=()=>{selected=k; updateHotbar();};
    hotbar.appendChild(b);
  }
}
updateHotbar();

// ---------------- RAYCAST ----------------
const raycaster = new THREE.Raycaster();
function getTarget(){
  raycaster.setFromCamera({x:0,y:0},camera);
  const hits = raycaster.intersectObjects(blocks.map(b=>b.mesh));
  if(hits.length) return blocks.find(b=>b.mesh===hits[0].object);
  return null;
}

// ---------------- BUILD & MINE ----------------
function mine(){
  const t=getTarget();
  if(!t) return;
  scene.remove(t.mesh);
  blocks.splice(blocks.indexOf(t),1);
  inventory[t.type]++;
  updateHotbar();
}
function build(){
  const t=getTarget();
  if(!t || inventory[selected]<=0) return;
  const x=t.x, y=t.y+1, z=t.z;
  if(blocks.find(b=>b.x===x && b.y===y && b.z===z)) return;
  addBlock(x,y,z,selected);
  inventory[selected]--;
  updateHotbar();
}
window.addEventListener('mousedown', e=>{
  if(e.button===0) mine();
  if(e.button===2) build();
});
window.addEventListener('contextmenu', e=>e.preventDefault());

// ---------------- MOVEMENT ----------------
const keys={};
window.addEventListener('keydown',e=>keys[e.code]=true);
window.addEventListener('keyup',e=>keys[e.code]=false);

let velocity = new THREE.Vector3();
let canJump = true;
const clock = new THREE.Clock();

function checkCollisions(pos){
  for(const b of blocks){
    if(pos.x+0.3>b.x && pos.x-0.3<b.x+1 &&
       pos.y+1.8>b.y && pos.y<b.y+1 &&
       pos.z+0.3>b.z && pos.z-0.3<b.z+1){
         return true;
       }
  }
  return false;
}

// ---------------- ANIMATION ----------------
function animate(){
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const speed = 5;

  let forward = (keys.KeyW?1:0)-(keys.KeyS?1:0);
  let right = (keys.KeyD?1:0)-(keys.KeyA?1:0);

  const dir=new THREE.Vector3();
  controls.getDirection(dir);
  dir.y=0; dir.normalize();
  const side=new THREE.Vector3(); side.crossVectors(camera.up,dir).normalize();

  velocity.x += (dir.x*forward + side.x*right)*speed*delta;
  velocity.z += (dir.z*forward + side.z*right)*speed*delta;

  if(keys.Space && canJump){velocity.y=7; canJump=false;}
  velocity.y -= 9.8*delta;

  const pos = controls.getObject().position.clone();
  pos.addScaledVector(velocity, delta);
  if(checkCollisions(pos)){
    velocity.x=0; velocity.z=0; velocity.y=Math.min(0,velocity.y);
  } else {
    controls.getObject().position.copy(pos);
  }
  if(controls.getObject().position.y<2){velocity.y=0; controls.getObject().position.y=2; canJump=true;}
  velocity.multiplyScalar(0.9);
  renderer.render(scene,camera);
}
animate();
