import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

const $ = id => document.getElementById(id);

/* LOGIN */
$("startBtn").onclick = () => {
  if(!$("nameInput").value.trim()) return alert("Name eingeben!");
  $("login").style.display="none";
  initGame();
};

function initGame(){

/* SCENE */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth/window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});

/* FADENKREUZ */
const cross = document.createElement("div");
cross.style.cssText =
"position:fixed;left:50%;top:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20;pointer-events:none;";
document.body.appendChild(cross);

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* TEXTUREN */
const loader = new THREE.TextureLoader();
function tex(name){
  const t = loader.load(name);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  return t;
}

const textures = {
  grass: tex("grass.png"),
  dirt: tex("dirt.png"),
  stone: tex("stone.png"),
  sand: tex("sand.png"),
  water: tex("water.png"),
  wood: tex("wood.png"),
  leaves: tex("leaves.png")
};

/* PLAYER */
const player = {
  pos:new THREE.Vector3(0,10,0),
  vel:new THREE.Vector3(),
  yaw:0,
  pitch:0,
  width:0.6,
  height:1.8,
  onGround:false,
  hp:100,
  hunger:100,
  coins:0
};

/* WORLD */
const blocks=[];
const world={};
const geo=new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type){
  const k=`${x},${y},${z}`;
  if(world[k]) return;
  const m=new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({map:textures[type]})
  );
  m.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(m);
  blocks.push({x,y,z,mesh:m,type});
  world[k]=type;
}

function removeBlock(x,y,z){
  const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
  if(i<0) return;
  scene.remove(blocks[i].mesh);
  blocks.splice(i,1);
  delete world[`${x},${y},${z}`];
}

/* TERRAIN – ORIGINAL */
for(let x=-20;x<=20;x++)
for(let z=-20;z<=20;z++){
  const h=Math.floor(4+Math.sin(x*0.2)*2+Math.cos(z*0.2)*2);
  for(let y=0;y<=h;y++){
    if(y===h){
      addBlock(x,y,z,h<3?"sand":"grass");
    }else{
      addBlock(x,y,z,"dirt");
    }
  }
}

/* --- HIER STOP --- */
/* FIXES KOMMEN IN TEIL 2 */
/* ================= COLLISION (FIX) ================= */
function collides(pos){
  for(const b of blocks){
    if(
      pos.x + player.width/2 > b.x &&
      pos.x - player.width/2 < b.x + 1 &&
      pos.z + player.width/2 > b.z &&
      pos.z - player.width/2 < b.z + 1 &&
      pos.y < b.y + 1 &&
      pos.y + player.height > b.y
    ){
      return true;
    }
  }
  return false;
}

/* Boden-Garantie (NICHT runterfallen) */
if(player.pos.y < 2){
  player.pos.y = 2;
  player.vel.y = 0;
  player.onGround = true;
}

/* ================= RAYCAST (EXAKT GELBER PUNKT) ================= */
const ray = new THREE.Raycaster();
function getTarget(add){
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  ray.set(camera.position, dir);

  const hit = ray.intersectObjects(blocks.map(b=>b.mesh))[0];
  if(!hit) return null;

  const p = hit.object.position;
  const n = hit.face.normal;

  return add
    ? { x:p.x-0.5+n.x, y:p.y-0.5+n.y, z:p.z-0.5+n.z }
    : { x:p.x-0.5, y:p.y-0.5, z:p.z-0.5 };
}

/* ================= BUTTONS ================= */
$("mine").onclick = ()=>{
  const t = getTarget(false);
  if(t) removeBlock(t.x|0, t.y|0, t.z|0);
};

$("build").onclick = ()=>{
  const t = getTarget(true);
  if(t) addBlock(t.x|0, t.y|0, t.z|0, "dirt");
};

$("jump").onclick = ()=>{
  if(player.onGround){
    player.vel.y = 6;
    player.onGround = false;
  }
};

/* ================= JOYSTICK FIX ================= */
let joyX = 0, joyY = 0;
let joyActive = false;
let joyStartX = 0, joyStartY = 0;

const joyStick = $("joyStick");

joyStick.addEventListener("touchstart", e=>{
  joyActive = true;
  joyStartX = e.touches[0].clientX;
  joyStartY = e.touches[0].clientY;
},{passive:true});

joyStick.addEventListener("touchmove", e=>{
  if(!joyActive) return;

  const dx = e.touches[0].clientX - joyStartX;
  const dy = joyStartY - e.touches[0].clientY; // Y invertiert = vorwärts

  const max = 40;
  joyX = Math.max(-1, Math.min(1, dx / max));
  joyY = Math.max(-1, Math.min(1, dy / max));

  joyStick.style.transform =
    `translate(${joyX*30}px,${-joyY*30}px)`;
},{passive:true});

joyStick.addEventListener("touchend", ()=>{
  joyActive = false;
  joyX = joyY = 0;
  joyStick.style.transform = "translate(0,0)";
});

/* ================= LOOK ================= */
let dragging=false,lastX=0,lastY=0;
renderer.domElement.addEventListener("mousedown",e=>{
  dragging=true;lastX=e.clientX;lastY=e.clientY;
});
window.addEventListener("mouseup",()=>dragging=false);
window.addEventListener("mousemove",e=>{
  if(!dragging) return;
  player.yaw -= (e.clientX-lastX)*0.002;
  player.pitch -= (e.clientY-lastY)*0.002;
  player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
  lastX=e.clientX;lastY=e.clientY;
});

/* ================= HUNGER ================= */
let hungerTimer=0;

/* ================= ANIMATE LOOP ================= */
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  /* Bewegung – JOYSTICK RICHTIG */
  const forward = joyY;
  const side = joyX;

  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);

  let dx = (sin*forward + cos*side) * 6 * dt;
  let dz = (cos*forward - sin*side) * 6 * dt;

  player.pos.x += dx;
  if(collides(player.pos)) player.pos.x -= dx;

  player.pos.z += dz;
  if(collides(player.pos)) player.pos.z -= dz;

  /* Gravitation */
  player.vel.y -= 9.8 * dt;
  player.pos.y += player.vel.y * dt;

  if(collides(player.pos)){
    player.vel.y = 0;
    player.onGround = true;
    player.pos.y = Math.ceil(player.pos.y);
  }else{
    player.onGround = false;
  }

  /* Kamera */
  camera.position.set(
    player.pos.x,
    player.pos.y + 1.6,
    player.pos.z
  );
  camera.lookAt(
    camera.position.x + Math.sin(player.yaw),
    camera.position.y + Math.sin(player.pitch),
    camera.position.z + Math.cos(player.yaw)
  );

  /* Hunger sinkt */
  hungerTimer += dt;
  if(hungerTimer > 3){
    hungerTimer = 0;
    player.hunger--;
    if(player.hunger < 0){
      player.hunger = 0;
      player.hp--;
    }
  }

  $("health").textContent = "❤️ " + player.hp;
  $("hunger").textContent = "🍖 " + player.hunger + "%";

  renderer.render(scene,camera);
}
animate();

} // initGame Ende
