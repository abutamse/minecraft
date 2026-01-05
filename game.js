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
  if (!$("nameInput").value.trim()) return alert("Name eingeben!");
  $("login").style.display = "none";
  initGame();
};

function initGame() {

/* ================= SCENE ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ================= FADENKREUZ ================= */
const cross = document.createElement("div");
cross.style.cssText = `
position:fixed;
left:50%;top:50%;
width:8px;height:8px;
background:yellow;
transform:translate(-50%,-50%);
z-index:20;
pointer-events:none;
`;
document.body.appendChild(cross);

/* ================= LICHT ================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ================= TEXTUREN ================= */
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
  water: tex("water.png"),
  wood: tex("wood.png"),
  leaves: tex("leaves.png")
};

/* ================= PLAYER ================= */
const player = {
  pos: new THREE.Vector3(0,10,0),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  width: 0.6,
  height: 1.8,
  onGround: false,
  hp: 100,
  hunger: 100,
  coins: 0
};

/* ================= INPUT ================= */
const keys = { w:0,a:0,s:0,d:0 };

onkeydown = e => {
  if(e.key==="w") keys.w=1;
  if(e.key==="s") keys.s=1;
  if(e.key==="a") keys.a=1;
  if(e.key==="d") keys.d=1;
};
onkeyup = e => {
  if(e.key==="w") keys.w=0;
  if(e.key==="s") keys.s=0;
  if(e.key==="a") keys.a=0;
  if(e.key==="d") keys.d=0;
};

/* ================= MAUS / TOUCH LOOK ================= */
let dragging=false,lastX=0,lastY=0;

renderer.domElement.addEventListener("mousedown",e=>{
  dragging=true; lastX=e.clientX; lastY=e.clientY;
});
addEventListener("mouseup",()=>dragging=false);
addEventListener("mousemove",e=>{
  if(!dragging) return;
  const dx=e.clientX-lastX;
  const dy=e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  player.yaw -= dx*0.002;
  player.pitch -= dy*0.002;
  player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
});

/* ================= WORLD ================= */
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
  m.position.set(x+.5,y+.5,z+.5);
  scene.add(m);
  blocks.push({x,y,z,mesh:m});
  world[k]=type;
}

function removeBlock(x,y,z){
  const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
  if(i<0) return;
  scene.remove(blocks[i].mesh);
  blocks.splice(i,1);
  delete world[`${x},${y},${z}`];
}

/* ================= TERRAIN ================= */
for(let x=-20;x<=20;x++)
for(let z=-20;z<=20;z++){
  const h=Math.floor(4+Math.sin(x*0.2)*2+Math.cos(z*0.2)*2);
  for(let y=0;y<=h;y++){
    if(y===h){
      if(h<3) addBlock(x,y,z,"sand");
      else addBlock(x,y,z,"grass");
    } else addBlock(x,y,z,"dirt");
  }
  if(h<2) addBlock(x,1,z,"water");
}
/* ================= COLLISION ================= */
function collides(p){
  for(const b of blocks){
    if(
      p.x+player.width/2 > b.x &&
      p.x-player.width/2 < b.x+1 &&
      p.z+player.width/2 > b.z &&
      p.z-player.width/2 < b.z+1 &&
      p.y < b.y+1 &&
      p.y+player.height > b.y
    ) return true;
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
  return add
    ? {x:p.x-.5+n.x,y:p.y-.5+n.y,z:p.z-.5+n.z}
    : {x:p.x-.5,y:p.y-.5,z:p.z-.5};
}

/* ================= BUTTONS ================= */
mineBtn.onclick=()=>{
  const t=getTarget(false);
  if(t) removeBlock(t.x|0,t.y|0,t.z|0);
};

buildBtn.onclick=()=>{
  const t=getTarget(true);
  if(t) addBlock(t.x|0,t.y|0,t.z|0,"grass");
};

jumpBtn.onclick=()=>{
  if(player.onGround){
    player.vel.y=6;
    player.onGround=false;
  }
};

/* ================= INVENTAR ================= */
let inventory={grass:20,dirt:20,stone:10,sand:10};
let selected="grass";

function updateHotbar(){
  hotbar.innerHTML="";
  for(const k in inventory){
    const d=document.createElement("div");
    d.className="slot"+(k===selected?" active":"");
    d.textContent=k+"\n"+inventory[k];
    d.onclick=()=>{selected=k;updateHotbar();};
    hotbar.appendChild(d);
  }
}
updateHotbar();

/* ================= TIERE ================= */
const animals=[];
const aGeo=new THREE.BoxGeometry(.8,.8,1);
const aMat=new THREE.MeshLambertMaterial({color:0xffffff});

function spawnAnimal(x,z){
  const m=new THREE.Mesh(aGeo,aMat.clone());
  m.position.set(x+.5,5,z+.5);
  scene.add(m);
  animals.push({
    mesh:m,
    hp:10,
    dir:new THREE.Vector3(Math.random()-.5,0,Math.random()-.5).normalize(),
    t:2
  });
}

for(let i=0;i<6;i++)
  spawnAnimal(Math.random()*20-10,Math.random()*20-10);

/* ================= ANIMALS UPDATE ================= */
function updateAnimals(dt){
  for(const a of animals){
    a.t-=dt;
    if(a.t<=0){
      a.dir.set(Math.random()-.5,0,Math.random()-.5).normalize();
      a.t=2+Math.random()*2;
    }
    a.mesh.position.add(a.dir.clone().multiplyScalar(dt));
  }
}

/* ================= HUNGER ================= */
let hungerTimer=0;

/* ================= ANIMATE ================= */
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta();

  /* Bewegung – NICHT invertiert */
  let mx=keys.d-keys.a;
  let mz=keys.w-keys.s;
  const l=Math.hypot(mx,mz);
  if(l){mx/=l;mz/=l;}

  const dx=Math.sin(player.yaw)*mz+Math.cos(player.yaw)*mx;
  const dz=Math.cos(player.yaw)*mz-Math.sin(player.yaw)*mx;

  player.pos.x+=dx*6*dt;
  if(collides(player.pos)) player.pos.x-=dx*6*dt;
  player.pos.z+=dz*6*dt;
  if(collides(player.pos)) player.pos.z-=dz*6*dt;

  /* Gravitation */
  player.vel.y-=9.8*dt;
  player.pos.y+=player.vel.y*dt;
  if(collides(player.pos)){
    player.vel.y=0;
    player.onGround=true;
    player.pos.y=Math.ceil(player.pos.y);
  } else player.onGround=false;

  /* Kamera – FULLSCREEN */
  camera.position.set(
    player.pos.x,
    player.pos.y+1.6,
    player.pos.z
  );
  camera.lookAt(
    camera.position.x+Math.sin(player.yaw),
    camera.position.y+Math.sin(player.pitch),
    camera.position.z+Math.cos(player.yaw)
  );

  /* Tiere */
  updateAnimals(dt);

  /* Hunger */
  hungerTimer+=dt;
  if(hungerTimer>3){
    hungerTimer=0;
    player.hunger--;
    if(player.hunger<0){
      player.hunger=0;
      player.hp--;
    }
  }

  healthUI.textContent="❤️ "+player.hp;
  hungerUI.textContent="🍖 "+player.hunger+"%";

  renderer.render(scene,camera);
}
animate();

} // END initGame
