import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ================= DOM ================= */
const $ = id => document.getElementById(id);
const jumpBtn = $("jump");
const mineBtn = $("mine");
const buildBtn = $("build");
const shootBtn = $("shoot");
const healthUI = $("health");
const hungerUI = $("hunger");
const coinsUI = $("coins");
const hotbar = $("hotbar");

/* ================= LOGIN ================= */
$("startBtn").onclick = () => {
  if (!$("nameInput").value.trim()) return alert("Bitte Namen eingeben!");
  $("login").style.display = "none";
  initGame();
};

function initGame() {

/* ================= SCENE ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.domElement.style.position="fixed";
renderer.domElement.style.inset="0";
document.body.appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});

/* ================= FADENKREUZ ================= */
const cross = document.createElement("div");
cross.style.cssText="position:fixed;left:50%;top:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20;pointer-events:none;";
document.body.appendChild(cross);

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ================= TEXTUREN ================= */
const loader = new THREE.TextureLoader();
function tex(name){const t=loader.load(name);t.magFilter=t.minFilter=THREE.NearestFilter;return t;}
const textures = {
  grass: tex("grass.png"),
  dirt: tex("dirt.png"),
  stone: tex("stone.png"),
  sand: tex("sand.png"),
  water: tex("water.png"),
  wood: tex("wood.png"),
  leaves: tex("leaves.png")
};

/* ================= PLAYER ================= */
const player = {pos:new THREE.Vector3(0,10,0),vel:new THREE.Vector3(),yaw:0,pitch:0,width:0.6,height:1.8,onGround:false,hp:100,hunger:100,coins:0};

/* ================= INPUT ================= */
const keys={w:0,a:0,s:0,d:0};
document.addEventListener("keydown",e=>{if(e.key==="w")keys.w=1;if(e.key==="s")keys.s=1;if(e.key==="a")keys.a=1;if(e.key==="d")keys.d=1;});
document.addEventListener("keyup",e=>{if(e.key==="w")keys.w=0;if(e.key==="s")keys.s=0;if(e.key==="a")keys.a=0;if(e.key==="d")keys.d=0;});

/* ================= MOUSE / TOUCH LOOK ================= */
let dragging=false,lastX=0,lastY=0;
renderer.domElement.addEventListener("mousedown",e=>{dragging=true; lastX=e.clientX; lastY=e.clientY;});
window.addEventListener("mouseup",()=>dragging=false);
window.addEventListener("mousemove",e=>{if(!dragging) return; player.yaw-= (e.clientX-lastX)*0.002; player.pitch-= (e.clientY-lastY)*0.002; player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch)); lastX=e.clientX; lastY=e.clientY;});
renderer.domElement.addEventListener("touchstart",e=>{dragging=true; lastX=e.touches[0].clientX; lastY=e.touches[0].clientY;},{passive:false});
renderer.domElement.addEventListener("touchmove",e=>{if(!dragging)return; player.yaw-= (e.touches[0].clientX-lastX)*0.003; player.pitch-= (e.touches[0].clientY-lastY)*0.003; player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch)); lastX=e.touches[0].clientX; lastY=e.touches[0].clientY;},{passive:false});
renderer.domElement.addEventListener("touchend",()=>{dragging=false});

/* ================= WORLD ================= */
const blocks=[];
const world={};
const geo=new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type){const k=`${x},${y},${z}`;if(world[k])return; const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[type]})); m.position.set(x+0.5,y+0.5,z+0.5); scene.add(m); blocks.push({x,y,z,mesh:m,type}); world[k]=type;}
function removeBlock(x,y,z){const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);if(i<0)return; scene.remove(blocks[i].mesh); blocks.splice(i,1); delete world[`${x},${y},${z}`];}

/* ================= TERRAIN ================= */
for(let x=-20;x<=20;x++)for(let z=-20;z<=20;z++){const h=Math.floor(4+Math.sin(x*0.2)*2+Math.cos(z*0.2)*2); for(let y=0;y<=h;y++){if(y===h){if(h<3)addBlock(x,y,z,"sand");else addBlock(x,y,z,"grass");}else addBlock(x,y,z,"dirt");}if(h<2)addBlock(x,1,z,"water");}
/* ================= COLLISION ================= */
function collides(pos){
  for(const b of blocks){
    if(pos.x+player.width/2 > b.x &&
       pos.x-player.width/2 < b.x+1 &&
       pos.z+player.width/2 > b.z &&
       pos.z-player.width/2 < b.z+1 &&
       pos.y < b.y+1 &&
       pos.y+player.height > b.y) return true;
  }
  return false;
}
while(collides(player.pos)) player.pos.y++;

/* ================= RAYCAST ================= */
const ray=new THREE.Raycaster();
function getTarget(add){
  ray.setFromCamera({x:0,y:0},camera);
  const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
  if(!hit) return null;
  const p=hit.object.position;
  const n=hit.face.normal;
  return add ? {x:p.x-0.5+n.x, y:p.y-0.5+n.y, z:p.z-0.5+n.z} : {x:p.x-0.5, y:p.y-0.5, z:p.z-0.5};
}

/* ================= BUTTONS ================= */
mineBtn.onclick=()=>{ const t=getTarget(false); if(t) removeBlock(t.x|0,t.y|0,t.z|0); };
buildBtn.onclick=()=>{ const t=getTarget(true); if(t) addBlock(t.x|0,t.y|0,t.z|0,selected); };
jumpBtn.onclick=()=>{ if(player.onGround){player.vel.y=6; player.onGround=false;} };

/* ================= INVENTAR ================= */
let inventory={grass:20,dirt:20,stone:10,sand:10};
let selected="grass";
function updateHotbar(){
  hotbar.innerHTML="";
  for(const k in inventory){
    const d=document.createElement("div");
    d.className="slot"+(k===selected?" active":"");
    d.textContent=k+"\n"+inventory[k];
    d.onclick=()=>{selected=k; updateHotbar();};
    hotbar.appendChild(d);
  }
}
updateHotbar();

/* ================= TIERE ================= */
const animals=[];
const aGeo=new THREE.BoxGeometry(0.8,0.8,1);
const aMat=new THREE.MeshLambertMaterial({color:0xffffff});
function spawnAnimal(x,z){
  const m=new THREE.Mesh(aGeo,aMat.clone());
  m.position.set(x+0.5,5,z+0.5);
  scene.add(m);
  animals.push({mesh:m,hp:10,dir:new THREE.Vector3(Math.random()-.5,0,Math.random()-.5).normalize(),t:2});
}
for(let i=0;i<6;i++) spawnAnimal(Math.random()*20-10, Math.random()*20-10);

function updateAnimals(dt){
  for(const a of animals){
    a.t-=dt;
    if(a.t<=0){ a.dir.set(Math.random()-.5,0,Math.random()-.5).normalize(); a.t=2+Math.random()*2; }
    const next=a.mesh.position.clone().add(a.dir.clone().multiplyScalar(1.5*dt));
    a.mesh.position.copy(next);
  }
}

/* ================= HUNGER ================= */
let hungerTimer=0;

/* ================= ANIMATE LOOP ================= */
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta();

  /* ===== BEWEGUNG ===== */
  let mx=keys.d-keys.a;
  let mz=keys.w-keys.s;
  const l=Math.hypot(mx,mz);
  if(l){ mx/=l; mz/=l; }

  const dx=Math.sin(player.yaw)*mz + Math.cos(player.yaw)*mx;
  const dz=Math.cos(player.yaw)*mz - Math.sin(player.yaw)*mx;

  player.pos.x += dx*6*dt;
  if(collides(player.pos)) player.pos.x -= dx*6*dt;
  player.pos.z += dz*6*dt;
  if(collides(player.pos)) player.pos.z -= dz*6*dt;

  /* ===== FALL / GRAVITATION ===== */
  player.vel.y -= 9.8*dt;
  player.pos.y += player.vel.y*dt;
  if(collides(player.pos)){
    player.vel.y=0;
    player.onGround=true;
    player.pos.y=Math.ceil(player.pos.y);
  } else player.onGround=false;

  /* ===== KAMERA ===== */
  camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
  camera.lookAt(
    camera.position.x+Math.sin(player.yaw),
    camera.position.y+Math.sin(player.pitch),
    camera.position.z+Math.cos(player.yaw)
  );

  /* ===== TIERE ===== */
  updateAnimals(dt);

  /* ===== HUNGER ===== */
  hungerTimer+=dt;
  if(hungerTimer>3){ hungerTimer=0; player.hunger--; if(player.hunger<0){ player.hunger=0; player.hp--; } }

  /* ===== UI ===== */
  healthUI.textContent="❤️ "+player.hp;
  hungerUI.textContent="🍖 "+player.hunger+"%";
  coinsUI.textContent="🪙 "+player.coins;

  renderer.render(scene,camera);
}
animate();
/* ================= BULLETS / SCHIESSEN ================= */
const bullets=[];
shootBtn.onclick=()=>{
  const b=new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({color:0xff0000})
  );
  b.position.copy(camera.position);
  b.dir = new THREE.Vector3(Math.sin(player.yaw), Math.sin(player.pitch), Math.cos(player.yaw)).normalize();
  bullets.push(b);
  scene.add(b);
};

function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.position.add(b.dir.clone().multiplyScalar(20*dt));

    for(let j=animals.length-1;j>=0;j--){
      const a=animals[j];
      if(b.position.distanceTo(a.mesh.position)<0.6){
        a.hp-=5;
        scene.remove(b);
        bullets.splice(i,1);

        if(a.hp<=0){
          scene.remove(a.mesh);
          animals.splice(j,1);
          inventory.meat = (inventory.meat||0)+1;
          player.coins+=2;
          updateHotbar();
        }
        break;
      }
    }
  }
}

/* ================= CRAFTING / BAU ================= */
const buildMenu = document.createElement("div");
buildMenu.style=`position:fixed;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);padding:10px;border-radius:8px;color:white;z-index:20;display:none;`;
document.body.appendChild(buildMenu);

const craftMenu = document.createElement("div");
craftMenu.style=`position:fixed;left:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);padding:10px;border-radius:8px;color:white;z-index:20;display:none;`;
document.body.appendChild(craftMenu);

const buildToggle = document.createElement("button");
buildToggle.textContent="🏗️ BAU"; buildToggle.style="position:fixed;right:10px;bottom:200px;z-index:20;";
document.body.appendChild(buildToggle);
buildToggle.onclick=()=>{ buildMenu.style.display = buildMenu.style.display==="none"?"block":"none"; };

const craftToggle = document.createElement("button");
craftToggle.textContent="🛠️ CRAFT"; craftToggle.style="position:fixed;left:10px;bottom:200px;z-index:20;";
document.body.appendChild(craftToggle);
craftToggle.onclick=()=>{ craftMenu.style.display = craftMenu.style.display==="none"?"block":"none"; };

function updateBuildMenu(){
  buildMenu.innerHTML="<b>Bauen</b><br><br>";
  for(const k in inventory){
    if(inventory[k]>0){
      const btn=document.createElement("button");
      btn.textContent=`${k} (${inventory[k]})`;
      btn.style="display:block;margin:4px 0;width:100%;";
      btn.onclick=()=>{ selected=k; updateHotbar(); };
      buildMenu.appendChild(btn);
    }
  }
}

function updateCraftMenu(){
  craftMenu.innerHTML="<b>Crafting</b><br><br>";
  const woodBtn=document.createElement("button");
  woodBtn.textContent="🪵 1 Holz → 4 Bretter";
  woodBtn.onclick=()=>{
    if(inventory.wood>=1){ inventory.wood-=1; inventory.plank=(inventory.plank||0)+4; updateCraftMenu(); updateBuildMenu(); }
  };
  craftMenu.appendChild(woodBtn);

  const plankBtn=document.createElement("button");
  plankBtn.textContent="🧱 4 Bretter → 1 Stein";
  plankBtn.onclick=()=>{
    if(inventory.plank>=4){ inventory.plank-=4; inventory.stone+=1; updateCraftMenu(); updateBuildMenu(); }
  };
  craftMenu.appendChild(plankBtn);

  const meatBtn=document.createElement("button");
  meatBtn.textContent="🍖 Fleisch essen (+20 Hunger)";
  meatBtn.onclick=()=>{
    if(inventory.meat>=1){ inventory.meat--; player.hunger=Math.min(100,player.hunger+20); updateCraftMenu(); }
  };
  craftMenu.appendChild(meatBtn);
}

updateBuildMenu(); updateCraftMenu();
/* ================= SAVE / LOAD ================= */
const SAVE_KEY="mini_mc_save";

function saveGame(){
  const data={
    player:{x:player.pos.x,y:player.pos.y,z:player.pos.z,hp:player.hp,hunger:player.hunger,coins:player.coins},
    inventory:inventory,
    world:Object.keys(world)
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));
}

function loadGame(){
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw) return;
  try{
    const data=JSON.parse(raw);
    player.pos.set(data.player.x,Math.max(5,data.player.y),data.player.z);
    player.hp=data.player.hp;
    player.hunger=data.player.hunger;
    player.coins=data.player.coins;
    inventory=data.inventory||inventory;

    blocks.forEach(b=>scene.remove(b.mesh));
    blocks.length=0;
    for(const k in world) delete world[k];
    data.world.forEach(key=>{
      const [x,y,z]=key.split(",").map(Number);
      addBlock(x,y,z,"stone");
    });
    updateBuildMenu(); updateCraftMenu(); updateHotbar();
  }catch(e){console.warn("Savegame defekt",e);}
}

setInterval(saveGame,5000);
setTimeout(loadGame,500);

/* ================= MULTIPLAYER ================= */
const channel = new BroadcastChannel("mini_mc_multiplayer");
const otherPlayers={};
const playerId=Math.random().toString(36).substring(2,10);

setInterval(()=>{
  channel.postMessage({id:playerId,pos:player.pos,yaw:player.yaw,pitch:player.pitch,hp:player.hp});
},50);

channel.onmessage=e=>{
  const data=e.data;
  if(data.id===playerId) return;
  if(data.disconnect && otherPlayers[data.id]){
    scene.remove(otherPlayers[data.id].mesh);
    delete otherPlayers[data.id];
    return;
  }
  if(!otherPlayers[data.id]){
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.6,1.8,0.6), new THREE.MeshLambertMaterial({color:Math.random()*0xffffff}));
    scene.add(m);
    otherPlayers[data.id]={mesh:m};
  }
  const p=otherPlayers[data.id];
  p.mesh.position.set(data.pos.x,data.pos.y+0.9,data.pos.z);
};

window.addEventListener("beforeunload",()=>{channel.postMessage({id:playerId,disconnect:true});});

/* ================= ANIMATE LOOP INTEGRATION ================= */
const clock2 = new THREE.Clock();
function animateFull(){
  requestAnimationFrame(animateFull);
  const dt=clock2.getDelta();

  // Bewegung & Kollision
  let mx=keys.d-keys.a;
  let mz=keys.w-keys.s;
  const l=Math.hypot(mx,mz);
  if(l){ mx/=l; mz/=l; }
  const dx=Math.sin(player.yaw)*mz + Math.cos(player.yaw)*mx;
  const dz=Math.cos(player.yaw)*mz - Math.sin(player.yaw)*mx;
  player.pos.x+=dx*6*dt; if(collides(player.pos)) player.pos.x-=dx*6*dt;
  player.pos.z+=dz*6*dt; if(collides(player.pos)) player.pos.z-=dz*6*dt;

  // Fall / Gravitation
  player.vel.y-=9.8*dt;
  player.pos.y+=player.vel.y*dt;
  if(collides(player.pos)){ player.vel.y=0; player.onGround=true; player.pos.y=Math.ceil(player.pos.y);} else player.onGround=false;

  // Kamera
  camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
  camera.lookAt(camera.position.x+Math.sin(player.yaw),camera.position.y+Math.sin(player.pitch),camera.position.z+Math.cos(player.yaw));

  // Tiere
  updateAnimals(dt);

  // Bullets
  updateBullets(dt);

  // Hunger
  hungerTimer+=dt;
  if(hungerTimer>3){ hungerTimer=0; player.hunger--; if(player.hunger<0){player.hunger=0; player.hp--; } }

  // UI
  healthUI.textContent="❤️ "+player.hp;
  hungerUI.textContent="🍖 "+player.hunger+"%";
  coinsUI.textContent="🪙 "+player.coins;

  // Check Tod
  if(player.hp<=0){ alert("Du bist gestorben!"); location.reload(); }

  renderer.render(scene,camera);
}
animateFull();
