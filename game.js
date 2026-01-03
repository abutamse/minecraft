import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ================== LOGIN ================== */
let playerName = null;
const login = document.getElementById("login");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("nameInput");

startBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) { alert("Bitte einen gültigen Namen eingeben!"); return; }
  playerName = name;
  login.style.display = "none";
  initGame();
};

function key(k){ 
  if(!playerName) return k+"_default"; 
  return `${k}_${playerName}`; 
}

/* ================== GAME ================== */
function initGame(){

/* ---------- BASIC ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0,2,5);
const renderer = new THREE.WebGLRenderer({antialias:false});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* ---------- LIGHT ---------- */
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const sun=new THREE.DirectionalLight(0xffffff,0.6);
sun.position.set(100,200,100);
scene.add(sun);

/* ---------- PLAYER ---------- */
const player={
  pos:new THREE.Vector3(0,3,0),
  vel:new THREE.Vector3(),
  yaw:0,pitch:0,
  hp:Number(localStorage.getItem(key("hp")))||100,
  hunger:Number(localStorage.getItem(key("hunger")))||100,
  coins:Number(localStorage.getItem(key("coins")))||0,
  onGround:false
};

/* ---------- UI ---------- */
const healthUI=document.getElementById("health");
const hungerUI=document.getElementById("hunger");
const coinsUI=document.getElementById("coins");
const foodUI=document.getElementById("food");
const weaponsUI=document.getElementById("weapons");
const hotbar=document.getElementById("hotbar");

function updateStats(){
  healthUI.textContent=`❤️ ${Math.floor(player.hp)}`;
  hungerUI.textContent=`🍖 ${Math.floor(player.hunger)}%`;
  coinsUI.textContent=`🪙 ${player.coins}`;
}

/* ---------- TEXTURES ---------- */
const loader=new THREE.TextureLoader();
function tex(n){
  const t=loader.load(n);
  t.magFilter=t.minFilter=THREE.NearestFilter;
  return t;
}
const textures={
  grass:tex("grass.png"),
  dirt:tex("dirt.png"),
  wood:tex("wood.png"),
  leaves:tex("leaves.png")
};

/* ---------- WORLD ---------- */
const geo=new THREE.BoxGeometry(1,1,1);
const blocks=[];
const world=JSON.parse(localStorage.getItem(key("world"))||"{}");

function saveWorld(){ localStorage.setItem(key("world"),JSON.stringify(world)); }

function addBlock(x,y,z,type,save=true){
  const mat=new THREE.MeshLambertMaterial({map:textures[type]});
  const mesh=new THREE.Mesh(geo,mat);
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

/* Load saved world */
for(const k in world){
  const [x,y,z]=k.split(",").map(Number);
  addBlock(x,y,z,world[k],false);
}

/* Ground */
for(let x=-20;x<20;x++)
  for(let z=-20;z<20;z++)
    if(!world[`${x},0,${z}`]){
      addBlock(x,0,z,"grass");
      addBlock(x,-1,z,"dirt");
    }

/* ---------- INVENTORY ---------- */
let food=Number(localStorage.getItem(key("food"))||0);
function updateFoodUI(){
  foodUI.innerHTML="";
  const btn=document.createElement("button");
  btn.textContent=`🍖 Fleisch (${food})`;
  btn.onclick=()=>{
    if(food<=0 || player.hunger>=100) return;
    food--; player.hunger=Math.min(100,player.hunger+25);
    localStorage.setItem(key("food"),food);
  };
  foodUI.appendChild(btn);
}
updateFoodUI();

/* ---------- WEAPONS ---------- */
const weapons=[
  {name:"Messer",dmg:5,price:0},
  {name:"Schwert I",dmg:10,price:100},
  {name:"Schwert II",dmg:20,price:300},
  {name:"Bogen",dmg:15,price:200},
  {name:"Gewehr",dmg:40,price:1000}
];

let ownedWeapons=JSON.parse(localStorage.getItem(key("weapons"))||'["Messer"]');
let currentWeapon=localStorage.getItem(key("currentWeapon"))||"Messer";

function updateWeaponsUI(){
  weaponsUI.innerHTML="";
  for(const w of weapons){
    const btn=document.createElement("button");
    if(ownedWeapons.includes(w.name)){
      btn.textContent=`⚔ ${w.name}`;
      if(w.name===currentWeapon) btn.style.border="2px solid yellow";
      btn.onclick=()=>{ currentWeapon=w.name; localStorage.setItem(key("currentWeapon"),currentWeapon); updateWeaponsUI(); };
    } else {
      btn.textContent=`🪙 ${w.name} (${w.price})`;
      btn.onclick=()=>{
        if(player.coins<w.price) return;
        player.coins-=w.price;
        ownedWeapons.push(w.name);
        currentWeapon=w.name;
        localStorage.setItem(key("weapons"),JSON.stringify(ownedWeapons));
        localStorage.setItem(key("currentWeapon"),currentWeapon);
        updateWeaponsUI();
      };
    }
    weaponsUI.appendChild(btn);
  }
}
updateWeaponsUI();

function weaponDamage(){ return weapons.find(w=>w.name===currentWeapon)?.dmg||5; }

/* ---------- MOBS ---------- */
const mobs=[];
const mobGeo=new THREE.BoxGeometry(0.8,0.8,0.8);
function spawnMob(type){
  const mat=new THREE.MeshLambertMaterial({color:type==="animal"?0x996633:0xaa0000});
  const mesh=new THREE.Mesh(mobGeo,mat);
  mesh.position.set(Math.random()*20-10,1,Math.random()*20-10);
  scene.add(mesh);
  mobs.push({type,mesh,hp:type==="animal"?20:40,vel:new THREE.Vector3()});
}
for(let i=0;i<5;i++) spawnMob("animal");

/* ---------- PROJECTILES ---------- */
const projectiles=[];
function shootProjectile(){
  const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw)).normalize();
  const proj=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,6), new THREE.MeshBasicMaterial({color:0xffff00}));
  proj.position.copy(player.pos).add(new THREE.Vector3(0,1.5,0));
  scene.add(proj);
  projectiles.push({mesh:proj,dir,damage:weaponDamage(),life:3});
}

/* ---------- RAYCAST ---------- */
const ray=new THREE.Raycaster();
function getTargetBlock(){
  ray.setFromCamera({x:0,y:0},camera);
  const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
  return hit?blocks.find(b=>b.mesh===hit.object):null;
}
function hitMob(){
  ray.setFromCamera({x:0,y:0},camera);
  const hit=ray.intersectObjects(mobs.map(m=>m.mesh))[0];
  if(!hit) return;
  const mob=mobs.find(m=>m.mesh===hit.object);
  if(!mob) return;
  mob.hp-=weaponDamage();
  if(mob.hp<=0){
    scene.remove(mob.mesh);
    mobs.splice(mobs.indexOf(mob),1);
    player.coins+=mob.type==="animal"?10:25;
    if(mob.type==="animal"){ food++; localStorage.setItem(key("food"),food); }
  }
}

/* ---------- CONTROLS ---------- */
const joystick=document.getElementById("joystick");
const stick=document.getElementById("stick");
let joy={x:0,y:0},active=false;
joystick.ontouchstart=()=>active=true;
joystick.ontouchend=()=>{ active=false; joy={x:0,y:0}; stick.style.left="40px"; stick.style.top="40px"; };
joystick.ontouchmove=e=>{
  if(!active) return;
  const r=joystick.getBoundingClientRect();
  const t=e.touches[0];
  let x=t.clientX-r.left-60;
  let y=t.clientY-r.top-60;
  const d=Math.min(40,Math.hypot(x,y));
  const a=Math.atan2(y,x);
  joy.x=Math.cos(a)*d/40; joy.y=Math.sin(a)*d/40;
  stick.style.left=40+joy.x*40+"px"; stick.style.top=40+joy.y*40+"px";
};

const jump=document.getElementById("jump");
const mine=document.getElementById("mine");
const build=document.getElementById("build");
const shootBtn=document.getElementById("shoot");
jump.onclick=()=>{ if(player.onGround) player.vel.y=6; };
mine.onclick=()=>{ const b=getTargetBlock(); if(b) removeBlock(b); else hitMob(); };
build.onclick=()=>{ const b=getTargetBlock(); if(!b) return; addBlock(b.x,b.y+1,b.z,"wood"); };
shootBtn.onclick=shootProjectile;

/* ---------- ANIMATE LOOP ---------- */
const clock=new THREE.Clock();
let time=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta(); time+=dt;

  // Tag/Nacht
  const day=Math.sin(time*0.05)*0.5+0.5;
  scene.background.setHSL(0.6,0.6,0.5*day+0.1);
  sun.intensity=day;

  // Hunger
  player.hunger-=dt*(100/300);
  if(player.hunger<=0) player.hp-=dt*5;

  // Bewegung + Kollisionsphysik
  const speed=5;
  const fwd=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
  const right=new THREE.Vector3(-fwd.z,0,fwd.x);

  player.vel.addScaledVector(fwd,-joy.y*speed*dt);
  player.vel.addScaledVector(right,joy.x*speed*dt);
  player.vel.y-=9.8*dt;

  // Kollisionsprüfung
  const newPos=player.pos.clone().addScaledVector(player.vel,dt);
  let onGround=false;
  for(const b of blocks){
    if(newPos.x+0.5>b.x && newPos.x-0.5<b.x+1 &&
       newPos.y+0.0>b.y && newPos.y-1< b.y+1 &&
       newPos.z+0.5>b.z && newPos.z-0.5<b.z+1){
      // Kollisionsreaktion
      if(player.vel.y<0) { newPos.y=b.y+1; player.vel.y=0; onGround=true; }
      else if(player.vel.y>0) newPos.y=b.y-1; player.vel.y=0;
    }
  }
  player.pos.copy(newPos);
  player.onGround=onGround;

  player.vel.multiplyScalar(0.85);

  camera.position.copy(player.pos).add(new THREE.Vector3(0,1.6,0));
  camera.lookAt(camera.position.clone().add(fwd));

  // Projektile
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];
    p.mesh.position.addScaledVector(p.dir,15*dt);
    p.life-=dt;
    for(const m of mobs){
      if(p.mesh.position.distanceTo(m.mesh.position)<0.5){
        m.hp-=p.damage;
        scene.remove(p.mesh);
        projectiles.splice(i,1);
        if(m.hp<=0){ scene.remove(m.mesh); mobs.splice(mobs.indexOf(m),1); if(m.type==="animal"){ food++; localStorage.setItem(key("food"),food); } player.coins+=m.type==="animal"?10:25; }
        break;
      }
    }
    if(p.life<=0){ scene.remove(p.mesh); projectiles.splice(i,1); }
  }

  // Spawn Tiere/Monster nachts
  if(day<0.3 && mobs.length<10) spawnMob("animal");
  if(day<0.3 && mobs.length<15) spawnMob("monster");

  // Update UI
  updateStats();
  updateFoodUI();

  renderer.render(scene,camera);

  // Save
  localStorage.setItem(key("hp"),player.hp);
  localStorage.setItem(key("hunger"),player.hunger);
  localStorage.setItem(key("coins"),player.coins);
}
animate();
