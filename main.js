// ================== SCENE ==================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// ================== LIGHT ==================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50,100,50);
scene.add(sun);

// ================== CONTROLS ==================
const controls = new THREE.PointerLockControls(camera, document.body);
document.body.addEventListener('click', ()=>controls.lock());
scene.add(controls.getObject());
controls.getObject().position.set(0,2,5);

// ================== CROSSHAIR ==================
const cross = document.createElement("div");
cross.innerHTML="+";
cross.style.cssText="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:24px;user-select:none;";
document.body.appendChild(cross);

// ================== TEXTURES =================
const loader = new THREE.TextureLoader();
const textures = {
  grass: loader.load("textures/grass.png"),
  dirt: loader.load("textures/dirt.png"),
  stone: loader.load("textures/stone.png"),
  wood: loader.load("textures/wood.png"),
  leaves: loader.load("textures/leaves.png"),
  sand: loader.load("textures/sand.png")
};

// ================== BLOCK SYSTEM ==================
const blocks = [];
const BLOCK = 1;

function addBlock(x,y,z,type){
  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshStandardMaterial({map:textures[type]});
  const mesh = new THREE.Mesh(geo,mat);
  mesh.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(mesh);
  blocks.push({mesh,x,y,z,type});
}

// ================== WORLD ==================
for(let x=-15;x<=15;x++){
  for(let z=-15;z<=15;z++){
    addBlock(x,0,z,"grass");
  }
}

// ================== INVENTORY ==================
const inventory={grass:99,dirt:99,stone:99,wood:99,leaves:99,sand:99};
let selected="grass";
const hotbar=document.getElementById("hotbar");

function updateHotbar(){
  hotbar.innerHTML="";
  for(const k in inventory){
    const b=document.createElement("button");
    b.textContent=k;
    if(k===selected) b.classList.add("active");
    b.onclick=()=>{selected=k;updateHotbar();}
    hotbar.appendChild(b);
  }
}
updateHotbar();

// ================== AUDIO ==================
const listener=new THREE.AudioListener();
camera.add(listener);
const audioLoader=new THREE.AudioLoader();

const mineSound=new THREE.Audio(listener);
audioLoader.load("sounds/mining.mp3",b=>mineSound.setBuffer(b));

const buildSound=new THREE.Audio(listener);
audioLoader.load("sounds/build.mp3",b=>buildSound.setBuffer(b));

// ================== RAYCAST ==================
const raycaster=new THREE.Raycaster();
function getTarget(){
  raycaster.setFromCamera({x:0,y:0},camera);
  const hits=raycaster.intersectObjects(blocks.map(b=>b.mesh));
  if(!hits.length) return null;
  return blocks.find(b=>b.mesh===hits[0].object);
}

// ================== ACTIONS ==================
function mine(){
  const t=getTarget();
  if(!t) return;
  scene.remove(t.mesh);
  blocks.splice(blocks.indexOf(t),1);
  mineSound.play();
}

function build(){
  const t=getTarget();
  if(!t) return;
  const x=t.x;
  const y=t.y+1;
  const z=t.z;
  if(blocks.find(b=>b.x===x&&b.y===y&&b.z===z)) return;
  addBlock(x,y,z,selected);
  buildSound.play();
}

window.addEventListener("mousedown",e=>{
  if(e.button===0) mine();
  if(e.button===2) build();
});
window.addEventListener("contextmenu",e=>e.preventDefault());

// ================== MOVEMENT ==================
const keys={};
window.addEventListener("keydown",e=>keys[e.code]=true);
window.addEventListener("keyup",e=>keys[e.code]=false);

let velocity=new THREE.Vector3();
let canJump=true;
const clock=new THREE.Clock();

function collide(pos){
  for(const b of blocks){
    if(pos.x+0.3>b.x&&pos.x-0.3<b.x+1&&
       pos.y+1.8>b.y&&pos.y<b.y+1&&
       pos.z+0.3>b.z&&pos.z-0.3<b.z+1) return true;
  }
  return false;
}

// ================== TOUCH CONTROLS ==================
const touch={f:false,b:false,l:false,r:false,j:false};
function mkBtn(txt,x,y,cb){
  const d=document.createElement("div");
  d.innerText=txt;
  d.style.cssText=`position:absolute;${x}:${y}px;width:60px;height:60px;border-radius:50%;
  background:rgba(0,0,0,.5);color:white;text-align:center;line-height:60px;`;
  document.body.appendChild(d);
  d.ontouchstart=e=>{e.preventDefault();cb(true);}
  d.ontouchend=e=>{e.preventDefault();cb(false);}
}

mkBtn("↑","left",80,v=>touch.f=v);
mkBtn("↓","left",20,v=>touch.b=v);
mkBtn("←","left",20,v=>touch.l=v);
mkBtn("→","left",140,v=>touch.r=v);
mkBtn("J","right",80,v=>touch.j=v);

// ================== ANIMATE (NUR EINMAL!) ==================
function animate(){
  requestAnimationFrame(animate);
  const d=clock.getDelta();
  const speed=6;

  const f=(keys.KeyW||touch.f?1:0)-(keys.KeyS||touch.b?1:0);
  const r=(keys.KeyD||touch.r?1:0)-(keys.KeyA||touch.l?1:0);

  const dir=new THREE.Vector3();
  controls.getDirection(dir);
  dir.y=0;dir.normalize();

  const side=new THREE.Vector3();
  side.crossVectors(camera.up,dir).normalize();

  velocity.x+=(dir.x*f+side.x*r)*speed*d;
  velocity.z+=(dir.z*f+side.z*r)*speed*d;

  if((keys.Space||touch.j)&&canJump){
    velocity.y=7;
    canJump=false;
  }

  velocity.y-=9.8*d;

  const pos=controls.getObject().position.clone();
  pos.addScaledVector(velocity,d);

  if(!collide(pos)){
    controls.getObject().position.copy(pos);
  }else{
    velocity.x=velocity.z=0;
  }

  if(controls.getObject().position.y<2){
    controls.getObject().position.y=2;
    velocity.y=0;
    canJump=true;
  }

  velocity.multiplyScalar(0.9);
  renderer.render(scene,camera);
}
animate();
