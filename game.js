import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

document.addEventListener("DOMContentLoaded",()=>{

/* ================= LOGIN ================= */
const login=document.getElementById("login");
const startBtn=document.getElementById("startBtn");
const nameInput=document.getElementById("nameInput");
let playerName=null;

startBtn.onclick=()=>{
  if(!nameInput.value.trim()) return alert("Name eingeben");
  playerName=nameInput.value.trim();
  login.style.display="none";
  init();
};

const key=k=>`${playerName}_${k}`;

/* ================= GAME ================= */
function init(){

/* ===== SCENE ===== */
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

/* ===== LIGHT ===== */
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const sun=new THREE.DirectionalLight(0xffffff,0.6);
sun.position.set(100,200,100);
scene.add(sun);

/* ===== UI ===== */
const hpUI=health, hungerUI=hunger, coinsUI=coins, foodUI=food, weaponsUI=weapons;
const cross=document.createElement("div");
cross.style="position:fixed;top:50%;left:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20";
document.body.appendChild(cross);

/* ===== PLAYER ===== */
const player={
 pos:new THREE.Vector3(0,5,0),
 vel:new THREE.Vector3(),
 yaw:0,pitch:0,onGround:false,
 hp:+localStorage.getItem(key("hp"))||100,
 hunger:+localStorage.getItem(key("hunger"))||100,
 coins:+localStorage.getItem(key("coins"))||0,
 speed:10
};

/* ===== TEXTURES ===== */
const loader=new THREE.TextureLoader();
const tex=n=>{const t=loader.load(n);t.magFilter=t.minFilter=THREE.NearestFilter;return t;}
const textures={grass:tex("grass.png"),dirt:tex("dirt.png"),wood:tex("wood.png"),leaves:tex("leaves.png")};

/* ===== WORLD + COLLISION ===== */
const blockGeo=new THREE.BoxGeometry(1,1,1);
const blocks=[],world=JSON.parse(localStorage.getItem(key("world"))||"{}");
const chunks=new Set();

function addBlock(x,y,z,type){
 if(world[`${x},${y},${z}`])return;
 const m=new THREE.Mesh(blockGeo,new THREE.MeshLambertMaterial({map:textures[type]}));
 m.position.set(x+.5,y+.5,z+.5);
 scene.add(m); blocks.push({x,y,z,mesh:m});
 world[`${x},${y},${z}`]=type;
}

function genChunk(cx,cz){
 for(let x=cx;x<cx+16;x++)for(let z=cz;z<cz+16;z++){
  let h=2+Math.floor(Math.sin(x*.2+z*.2)*2)+Math.random()*2;
  for(let y=0;y<=h;y++) addBlock(x,y,z,y<h?"dirt":"grass");
  if(Math.random()<.1){
   addBlock(x,h+1,z,"wood"); addBlock(x,h+2,z,"wood");
   for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) addBlock(x+dx,h+3,z+dz,"leaves");
  }
 }
}

function loadChunks(){
 const cx=Math.floor(player.pos.x/16)*16, cz=Math.floor(player.pos.z/16)*16;
 for(let dx=-32;dx<=32;dx+=16)for(let dz=-32;dz<=32;dz+=16){
  const k=`${cx+dx},${cz+dz}`;
  if(!chunks.has(k)){genChunk(cx+dx,cz+dz);chunks.add(k);}
 }
}

/* ===== COLLISION CHECK ===== */
function collide(nx,ny,nz){
 for(const b of blocks){
  if(Math.abs(b.x+.5-nx)<.45 && Math.abs(b.z+.5-nz)<.45 && ny<b.y+1 && ny+1>b.y) return true;
 }
 return false;
}

/* ===== JOYSTICK ===== */
let joy={x:0,y:0},active=false;
joystick.ontouchstart=()=>active=true;
joystick.ontouchend=()=>{active=false;joy={x:0,y:0};stick.style.left="40px";stick.style.top="40px";}
joystick.ontouchmove=e=>{
 if(!active)return;
 const r=joystick.getBoundingClientRect(),t=e.touches[0];
 let x=t.clientX-r.left-60,y=t.clientY-r.top-60;
 const d=Math.min(40,Math.hypot(x,y)),a=Math.atan2(y,x);
 joy.x=Math.cos(a)*d/40; joy.y=Math.sin(a)*d/40;
 stick.style.left=40+joy.x*40+"px"; stick.style.top=40+joy.y*40+"px";
};

/* ===== LOOK ===== */
let look=false,last={x:0,y:0};
addEventListener("touchstart",e=>{for(const t of e.touches)if(t.clientX>innerWidth/2){look=true;last={x:t.clientX,y:t.clientY};}});
addEventListener("touchmove",e=>{
 if(!look)return;
 for(const t of e.touches)if(t.clientX>innerWidth/2){
  player.yaw-= (t.clientX-last.x)*.004;
  player.pitch-= (t.clientY-last.y)*.004;
  player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
  last={x:t.clientX,y:t.clientY};
 }
});
addEventListener("touchend",()=>look=false);

/* ===== MOBS (MULTI TYPE) ===== */
const mobs=[];
const mobTypes={
 cow:{hp:20,color:0xffffff,drop:1},
 pig:{hp:15,color:0xff9999,drop:1},
 zombie:{hp:30,color:0x00ff00,drop:2}
};

function spawnMob(){
 const types=Object.keys(mobTypes);
 const type=types[Math.floor(Math.random()*types.length)];
 const g=new THREE.BoxGeometry(.8,.8,.8);
 const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:mobTypes[type].color}));
 m.position.set(player.pos.x+Math.random()*20-10,3,player.pos.z+Math.random()*20-10);
 scene.add(m);
 mobs.push({mesh:m,type,hp:mobTypes[type].hp,state:"idle",dir:new THREE.Vector3(Math.random(),0,Math.random()).normalize()});
}

/* ===== FOOD + WEAPONS ===== */
let food=+localStorage.getItem(key("food"))||0;
let weapons=JSON.parse(localStorage.getItem(key("weapons"))||'{"knife":true}');
let currentWeapon=localStorage.getItem(key("cw"))||"knife";

foodUI.onclick=()=>{if(food>0&&player.hunger<100){food--;player.hunger+=30;}};

weaponsUI.onclick=()=>{
 if(!weapons.sword&&player.coins>=100){weapons.sword=true;player.coins-=100;}
 currentWeapon=Object.keys(weapons)[Object.keys(weapons).length-1];
};

/* ===== PROJECTILES ===== */
const projectiles=[];
shoot.onclick=()=>{
 let dmg=5,speed=15;
 if(currentWeapon==="sword")dmg=15;
 const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
 const m=new THREE.Mesh(new THREE.SphereGeometry(.1),new THREE.MeshBasicMaterial({color:0xff0}));
 m.position.copy(camera.position);
 scene.add(m);
 projectiles.push({mesh:m,vel:dir.multiplyScalar(speed),dmg});
};

/* ===== LOOP ===== */
const clock=new THREE.Clock(); let mobTimer=0;
function animate(){
 requestAnimationFrame(animate);
 const dt=clock.getDelta();

 loadChunks();

 const f=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
 const r=new THREE.Vector3(-f.z,0,f.x);
 let nx=player.pos.x+(f.x*-joy.y+r.x*joy.x)*player.speed*dt;
 let nz=player.pos.z+(f.z*-joy.y+r.z*joy.x)*player.speed*dt;
 if(!collide(nx,player.pos.y,nz)){player.pos.x=nx;player.pos.z=nz;}

 player.vel.y-=9.8*dt;
 let ny=player.pos.y+player.vel.y*dt;
 if(ny<2){ny=2;player.vel.y=0;player.onGround=true;}
 player.pos.y=ny;

 camera.position.copy(player.pos).add(new THREE.Vector3(0,1.6,0));
 camera.lookAt(camera.position.clone().add(f));

 mobTimer+=dt;
 if(mobTimer>5){spawnMob();mobTimer=0;}

 for(const m of mobs){
  if(m.mesh.position.distanceTo(player.pos)<6){
   const d=player.pos.clone().sub(m.mesh.position).normalize();
   m.mesh.position.addScaledVector(d,dt*2);
  }
 }

 for(let i=projectiles.length-1;i>=0;i--){
  const p=projectiles[i];
  p.mesh.position.addScaledVector(p.vel,dt);
  for(const m of mobs){
   if(p.mesh.position.distanceTo(m.mesh.position)<.5){
    m.hp-=p.dmg;
    scene.remove(p.mesh);projectiles.splice(i,1);
    if(m.hp<=0){scene.remove(m.mesh);food+=mobTypes[m.type].drop;player.coins+=10;}
    break;
   }
  }
 }

 player.hunger-=dt*(100/300);
 if(player.hunger<=0){player.hunger=0;player.hp-=dt*2;}

 hpUI.textContent=`❤️ ${player.hp|0}`;
 hungerUI.textContent=`🍖 ${player.hunger|0}%`;
 coinsUI.textContent=`🪙 ${player.coins}`;
 foodUI.textContent=`🍖 Fleisch: ${food}`;

 renderer.render(scene,camera);

 localStorage.setItem(key("hp"),player.hp);
 localStorage.setItem(key("hunger"),player.hunger);
 localStorage.setItem(key("coins"),player.coins);
 localStorage.setItem(key("food"),food);
 localStorage.setItem(key("weapons"),JSON.stringify(weapons));
 localStorage.setItem(key("cw"),currentWeapon);
}
animate();
}
});
