import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ---------- LOGIN ---------- */
let user;
loginBtn.onclick = () => {
 const u=username.value.trim(), p=password.value.trim();
 if(!u||!p){loginMsg.textContent="Fehlt";return;}
 const users=JSON.parse(localStorage.getItem("users"))||{};
 if(users[u] && users[u].password!==p){loginMsg.textContent="Falsch";return;}
 users[u]={password:p};
 localStorage.setItem("users",JSON.stringify(users));
 user=u;
 loginForm.style.display="none";
 startGame();
};

/* ---------- GAME ---------- */
function startGame(){

/* BASIC */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:false});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const sun=new THREE.DirectionalLight(0xffffff,0.6);
sun.position.set(100,200,100);
scene.add(sun);

/* TEXTURES (PIXEL LOOK!) */
const loader=new THREE.TextureLoader();
function loadTex(name){
 const t=loader.load(name);
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestFilter;
 return t;
}
const tex={
 grass:loadTex("grass.png"),
 dirt:loadTex("dirt.png"),
 stone:loadTex("stone.png"),
 sand:loadTex("sand.png"),
 wood:loadTex("wood.png"),
 leaves:loadTex("leaves.png")
};

/* PLAYER */
const player={
 pos:new THREE.Vector3(0,3,0),
 vel:new THREE.Vector3(),
 yaw:0,pitch:0,
 third:false
};

/* INVENTORY */
let inventory=JSON.parse(localStorage.getItem(user+"_inv"))||
{grass:20,dirt:20,stone:20,sand:10};
let selected="grass";

const hotbar=document.getElementById("hotbar");
function updateHotbar(){
 hotbar.innerHTML="";
 for(const k in inventory){
  const b=document.createElement("button");
  b.textContent=`${k} (${inventory[k]})`;
  if(k===selected) b.style.border="2px solid yellow";
  b.onclick=()=>{selected=k;updateHotbar();};
  hotbar.appendChild(b);
 }
}
updateHotbar();

/* BLOCKS */
const blocks=[];
const world=JSON.parse(localStorage.getItem(user+"_world"))||{};
const geo=new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type,save=true){
 const mat=new THREE.MeshLambertMaterial({map:tex[type]});
 const mesh=new THREE.Mesh(geo,mat);
 mesh.position.set(x+0.5,y+0.5,z+0.5);
 scene.add(mesh);
 blocks.push({x,y,z,type,mesh});
 if(save){world[`${x},${y},${z}`]=type;saveWorld();}
}

function removeBlock(b){
 scene.remove(b.mesh);
 delete world[`${b.x},${b.y},${b.z}`];
 blocks.splice(blocks.indexOf(b),1);
 saveWorld();
}

function saveWorld(){
 localStorage.setItem(user+"_world",JSON.stringify(world));
 localStorage.setItem(user+"_inv",JSON.stringify(inventory));
}

/* LOAD SAVED BLOCKS */
for(const k in world){
 const [x,y,z]=k.split(",").map(Number);
 addBlock(x,y,z,world[k],false);
}

/* CHUNKS */
const chunks=new Set();
function genChunk(cx,cz){
 for(let x=cx;x<cx+16;x++){
  for(let z=cz;z<cz+16;z++){
   const h=2+Math.floor(Math.random()*2);
   for(let y=0;y<=h;y++){
    if(!world[`${x},${y},${z}`])
     addBlock(x,y,z,y<h?"dirt":"grass");
   }
  }
 }
}
function loadChunks(){
 const cx=Math.floor(player.pos.x/16)*16;
 const cz=Math.floor(player.pos.z/16)*16;
 for(let dx=-32;dx<=32;dx+=16)
  for(let dz=-32;dz<=32;dz+=16){
   const k=`${cx+dx},${cz+dz}`;
   if(!chunks.has(k)){genChunk(cx+dx,cz+dz);chunks.add(k);}
  }
}
loadChunks();

/* RAYCAST */
const ray=new THREE.Raycaster();
function target(){
 ray.setFromCamera({x:0,y:0},camera);
 const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
 return hit?blocks.find(b=>b.mesh===hit.object):null;
}

/* INPUT */
renderer.domElement.onclick=()=>renderer.domElement.requestPointerLock();

addEventListener("mousemove",e=>{
 if(document.pointerLockElement!==renderer.domElement) return;
 player.yaw-=e.movementX*0.002;
 player.pitch-=e.movementY*0.002;
 player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
});

addEventListener("mousedown",e=>{
 const t=target(); if(!t) return;
 if(e.button===0){ removeBlock(t); inventory[t.type]++; }
 if(e.button===2 && inventory[selected]>0){
  addBlock(t.x,t.y+1,t.z,selected);
  inventory[selected]--;
 }
 updateHotbar(); saveWorld();
});

addEventListener("keydown",e=>{
 if(e.key==="v") player.third=!player.third;
});

/* LOOP */
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=clock.getDelta();

 player.vel.y-=9.8*dt;
 player.pos.addScaledVector(player.vel,dt);
 if(player.pos.y<2){player.pos.y=2;player.vel.y=0;}

 loadChunks();

 const dir=new THREE.Vector3(
  Math.sin(player.yaw)*Math.cos(player.pitch),
  Math.sin(player.pitch),
 -Math.cos(player.yaw)*Math.cos(player.pitch)
 );

 const camDist=player.third?4:0;
 camera.position.copy(player.pos)
  .add(new THREE.Vector3(0,1.62,0))
  .addScaledVector(dir,-camDist);
 camera.lookAt(player.pos.clone().add(new THREE.Vector3(0,1.62,0)).add(dir));

 renderer.render(scene,camera);
}
animate();
}
