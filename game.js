import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ---------- BASIC ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:false});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* ---------- LIGHT ---------- */
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const sun = new THREE.DirectionalLight(0xffffff,0.6);
sun.position.set(100,200,100);
scene.add(sun);

/* ---------- TEXTURES (PIXEL) ---------- */
const loader = new THREE.TextureLoader();
function tex(name){
  const t = loader.load(name);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}
const textures = {
  grass: tex("grass.png"),
  dirt: tex("dirt.png"),
  stone: tex("stone.png"),
  sand: tex("sand.png"),
  wood: tex("wood.png"),
  leaves: tex("leaves.png")
};

/* ---------- PLAYER ---------- */
const player = {
  pos: new THREE.Vector3(0,2,0),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0
};

/* ---------- WORLD ---------- */
const blocks = [];
const geo = new THREE.BoxGeometry(1,1,1);
const world = JSON.parse(localStorage.getItem("world")) || {};

function saveWorld(){
  localStorage.setItem("world", JSON.stringify(world));
  localStorage.setItem("inv", JSON.stringify(inventory));
}

function addBlock(x,y,z,type,save=true){
  const mat = new THREE.MeshLambertMaterial({map:textures[type]});
  const mesh = new THREE.Mesh(geo,mat);
  mesh.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(mesh);
  blocks.push({x,y,z,type,mesh});
  if(save){ world[`${x},${y},${z}`]=type; saveWorld(); }
}

function removeBlock(b){
  scene.remove(b.mesh);
  delete world[`${b.x},${b.y},${b.z}`];
  blocks.splice(blocks.indexOf(b),1);
  saveWorld();
}

/* ---------- LOAD SAVED WORLD ---------- */
for(const k in world){
  const [x,y,z] = k.split(",").map(Number);
  addBlock(x,y,z,world[k],false);
}

/* ---------- GENERATE CHUNKS ---------- */
const chunks = new Set();
function genChunk(cx,cz){
  for(let x=cx;x<cx+16;x++){
    for(let z=cz;z<cz+16;z++){
      const h = 2 + Math.floor(Math.random()*2);
      for(let y=0;y<=h;y++){
        if(!world[`${x},${y},${z}`]){
          addBlock(x,y,z,y<h?"dirt":"grass");
        }
      }
      if(Math.random()<0.05){
        addBlock(x,h+1,z,"wood");
        addBlock(x,h+2,z,"wood");
        for(let dx=-1;dx<=1;dx++)
          for(let dz=-1;dz<=1;dz++)
            addBlock(x+dx,h+3,z+dz,"leaves");
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
      if(!chunks.has(k)){ genChunk(cx+dx,cz+dz); chunks.add(k); }
    }
}
loadChunks();

/* ---------- INVENTORY ---------- */
let inventory = JSON.parse(localStorage.getItem("inv")) ||
{grass:20,dirt:20,stone:10,sand:10,wood:5,leaves:5};
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

/* ---------- RAYCAST ---------- */
const ray = new THREE.Raycaster();
function getTarget(){
  ray.setFromCamera({x:0,y:0},camera);
  const hit = ray.intersectObjects(blocks.map(b=>b.mesh))[0];
  return hit ? blocks.find(b=>b.mesh===hit.object) : null;
}

/* ---------- JOYSTICK ---------- */
const joystick=document.getElementById("joystick");
const stick=document.getElementById("stick");
let joy={x:0,y:0}, active=false;

joystick.ontouchstart=()=>active=true;
joystick.ontouchend=()=>{
  active=false; joy={x:0,y:0};
  stick.style.left="40px"; stick.style.top="40px";
};
joystick.ontouchmove=e=>{
  if(!active) return;
  const r=joystick.getBoundingClientRect();
  const t=e.touches[0];
  let x=t.clientX-r.left-60;
  let y=t.clientY-r.top-60;
  const d=Math.min(40,Math.hypot(x,y));
  const a=Math.atan2(y,x);
  x=Math.cos(a)*d; y=Math.sin(a)*d;
  joy.x=x/40; joy.y=y/40;
  stick.style.left=40+x+"px";
  stick.style.top=40+y+"px";
};

/* ---------- CAMERA LOOK ---------- */
let look=false,last={x:0,y:0};
addEventListener("touchstart",e=>{
  for(const t of e.touches){
    if(t.clientX>innerWidth/2){
      look=true; last={x:t.clientX,y:t.clientY};
    }
  }
});
addEventListener("touchmove",e=>{
  if(!look) return;
  for(const t of e.touches){
    if(t.clientX>innerWidth/2){
      const dx=t.clientX-last.x;
      const dy=t.clientY-last.y;
      player.yaw -= dx*0.004;
      player.pitch -= dy*0.004;
      player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
      last={x:t.clientX,y:t.clientY};
    }
  }
});
addEventListener("touchend",()=>look=false);

/* ---------- BUTTONS ---------- */
jump.onclick=()=>{ if(player.pos.y<=2.01) player.vel.y=6; };
mine.onclick=()=>{
  const t=getTarget(); if(!t) return;
  removeBlock(t);
  inventory[t.type]++; updateHotbar();
};

/* ---------- LOOP ---------- */
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta();

  const speed=5;
  const forward=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
  const right=new THREE.Vector3(-forward.z,0,forward.x);

  player.vel.addScaledVector(forward,-joy.y*speed*dt);
  player.vel.addScaledVector(right,joy.x*speed*dt);

  player.vel.y -= 9.8*dt;
  player.pos.addScaledVector(player.vel,dt);

  if(player.pos.y<2){
    player.pos.y=2; player.vel.y=0;
  }

  player.vel.multiplyScalar(0.85);
  loadChunks();

  const lookDir=new THREE.Vector3(
    Math.sin(player.yaw)*Math.cos(player.pitch),
    Math.sin(player.pitch),
    -Math.cos(player.yaw)*Math.cos(player.pitch)
  );

  camera.position.copy(player.pos).add(new THREE.Vector3(0,1.6,0));
  camera.lookAt(camera.position.clone().add(lookDir));

  renderer.render(scene,camera);
}
animate();
