import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

let user;

// ---------- LOGIN ----------
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const msg = document.getElementById("loginMsg");

loginBtn.onclick = () => {
  const u = username.value.trim();
  const p = password.value.trim();
  if(!u||!p){ msg.textContent="Daten fehlen"; return; }

  const users = JSON.parse(localStorage.getItem("users")) || {};
  if(users[u] && users[u].password!==p){
    msg.textContent="Falsches Passwort"; return;
  }
  users[u] = {password:p};
  localStorage.setItem("users",JSON.stringify(users));
  user=u;
  loginForm.style.display="none";
  startGame();
};

// ---------- GAME ----------
function startGame(){

// BASIC
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

// LIGHT
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(50,100,50);
scene.add(sun);

// TEXTURES
const loader=new THREE.TextureLoader();
const tex={
 grass:loader.load("grass.png"),
 dirt:loader.load("dirt.png"),
 stone:loader.load("stone.png"),
 sand:loader.load("sand.png"),
 wood:loader.load("wood.png"),
 leaves:loader.load("leaves.png")
};

// PLAYER
const player={
 pos:new THREE.Vector3(0,5,0),
 vel:new THREE.Vector3(),
 yaw:0,pitch:0,
 onGround:false,
 thirdPerson:false
};

// INVENTORY
let inventory=JSON.parse(localStorage.getItem(user+"_inv"))||
{grass:10,dirt:10,stone:10,sand:10,wood:5,leaves:5};

let selected="grass";
const hotbar=document.getElementById("hotbar");

function updateHotbar(){
 hotbar.innerHTML="";
 for(const k in inventory){
  const b=document.createElement("button");
  b.textContent=`${k} (${inventory[k]})`;
  if(k===selected) b.style.border="2px solid yellow";
  b.onclick=()=>{selected=k; updateHotbar();};
  hotbar.appendChild(b);
 }
}
updateHotbar();

function save(){
 localStorage.setItem(user+"_inv",JSON.stringify(inventory));
 localStorage.setItem(user+"_world",JSON.stringify(worldData));
}

// BLOCKS + WORLD SAVE
const blocks=[];
const worldData=JSON.parse(localStorage.getItem(user+"_world"))||{};

function addBlock(x,y,z,type,saveBlock=true){
 const geo=new THREE.BoxGeometry(1,1,1);
 const mat=new THREE.MeshStandardMaterial({map:tex[type]});
 const mesh=new THREE.Mesh(geo,mat);
 mesh.position.set(x+0.5,y+0.5,z+0.5);
 scene.add(mesh);
 blocks.push({x,y,z,type,mesh});
 if(saveBlock){
   worldData[`${x},${y},${z}`]=type;
   save();
 }
}

function removeBlock(b){
 scene.remove(b.mesh);
 delete worldData[`${b.x},${b.y},${b.z}`];
 blocks.splice(blocks.indexOf(b),1);
 save();
}

// LOAD WORLD
for(const k in worldData){
 const [x,y,z]=k.split(",").map(Number);
 addBlock(x,y,z,worldData[k],false);
}

// GENERATE CHUNKS
const chunks=new Set();
function genChunk(cx,cz){
 for(let x=cx;x<cx+10;x++){
  for(let z=cz;z<cz+10;z++){
   for(let y=0;y<3;y++){
    if(!worldData[`${x},${y},${z}`])
      addBlock(x,y,z,y<2?"stone":"grass");
   }
  }
 }
}

function loadChunks(){
 const cx=Math.floor(player.pos.x/10)*10;
 const cz=Math.floor(player.pos.z/10)*10;
 for(let dx=-20;dx<=20;dx+=10){
  for(let dz=-20;dz<=20;dz+=10){
   const k=`${cx+dx},${cz+dz}`;
   if(!chunks.has(k)){ genChunk(cx+dx,cz+dz); chunks.add(k); }
  }
 }
}
loadChunks();

// RAYCAST
const ray=new THREE.Raycaster();
function getTarget(){
 ray.setFromCamera({x:0,y:0},camera);
 const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
 return hit?blocks.find(b=>b.mesh===hit.object):null;
}

// INPUT
addEventListener("mousedown",e=>{
 const t=getTarget();
 if(!t) return;
 if(e.button===0){ // mine
   removeBlock(t);
   inventory[t.type]++;
 } else if(e.button===2 && inventory[selected]>0){
   addBlock(t.x,t.y+1,t.z,selected);
   inventory[selected]--;
 }
 updateHotbar();
});

// CAMERA LOOK
addEventListener("mousemove",e=>{
 if(document.pointerLockElement!==renderer.domElement) return;
 player.yaw -= e.movementX*0.002;
 player.pitch -= e.movementY*0.002;
 player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
});

renderer.domElement.onclick=()=>renderer.domElement.requestPointerLock();

// FIRST / THIRD PERSON
addEventListener("keydown",e=>{
 if(e.key==="v") player.thirdPerson=!player.thirdPerson;
});

// LOOP
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=clock.getDelta();

 player.vel.y-=9.8*dt;
 player.pos.addScaledVector(player.vel,dt);
 if(player.pos.y<2){player.pos.y=2;player.vel.y=0;}

 loadChunks();

 const camDist=player.thirdPerson?4:0;
 const dir=new THREE.Vector3(
  Math.sin(player.yaw)*Math.cos(player.pitch),
  Math.sin(player.pitch),
 -Math.cos(player.yaw)*Math.cos(player.pitch)
 );

 camera.position.copy(player.pos).addScaledVector(dir,-camDist).add(new THREE.Vector3(0,1.6,0));
 camera.lookAt(player.pos.clone().add(dir));

 renderer.render(scene,camera);
}
animate();
}
