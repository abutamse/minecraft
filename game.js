import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ================= DOM ================= */
const $=id=>document.getElementById(id);
const joystick=$("joystick"),stick=$("stick");
const jumpBtn=$("jump"),mineBtn=$("mine"),buildBtn=$("build"),shootBtn=$("shoot");
const healthUI=$("health"),hungerUI=$("hunger"),coinsUI=$("coins");
const hotbar=$("hotbar");

/* ================= LOGIN ================= */
$("startBtn").onclick=()=>{
  if(!$("nameInput").value.trim())return alert("Name!");
  $("login").style.display="none";
  init();
};

/* ================= GAME ================= */
function init(){

/* ===== Scene ===== */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

onresize=()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
};

/* ===== Crosshair ===== */
const cross=document.createElement("div");
cross.style="position:fixed;top:50%;left:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20";
document.body.appendChild(cross);

/* ===== Light + Day/Night ===== */
const ambient=new THREE.AmbientLight(0xffffff,0.6);
scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);
let time=0;

/* ===== Textures ===== */
const L=new THREE.TextureLoader();
const T=n=>{const t=L.load(n);t.magFilter=t.minFilter=THREE.NearestFilter;return t;}
const tex={
 grass:T("grass.png"),dirt:T("dirt.png"),stone:T("stone.png"),
 sand:T("sand.png"),wood:T("wood.png"),leaves:T("leaves.png"),
 water:T("water.png"),cow:T("cow.png")
};

/* ===== Player ===== */
const player={
 pos:new THREE.Vector3(0,20,0),
 vel:new THREE.Vector3(),
 yaw:0,pitch:0,
 w:0.6,h:1.8,
 onGround:false,
 hp:100,hunger:100,coins:0,
 move:{f:0,b:0,l:0,r:0,j:0}
};

/* ===== World ===== */
const blocks=[],map={};
const geo=new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,t){
 const k=`${x},${y},${z}`; if(map[k])return;
 const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:tex[t]}));
 m.position.set(x+.5,y+.5,z+.5);
 scene.add(m);
 blocks.push({x,y,z,m});
 map[k]=t;
}
function remBlock(x,y,z){
 const i=blocks.findIndex(b=>b.x==x&&b.y==y&&b.z==z);
 if(i<0)return;
 scene.remove(blocks[i].m);
 blocks.splice(i,1);
 delete map[`${x},${y},${z}`];
 inventory[selected]++;
}

/* ===== Terrain ===== */
for(let x=-40;x<40;x++)
for(let z=-40;z<40;z++){
 let h=Math.floor(4+Math.sin(x*.15)*3+Math.cos(z*.15)*3);
 for(let y=0;y<=h;y++){
  addBlock(x,y,z,y==h?"grass":y>h-2?"dirt":"stone");
 }
}

/* ===== Spawn Player Safely ===== */
player.pos.y=10;
while(collide(player.pos))player.pos.y++;

/* ===== Collision ===== */
function collide(p){
 for(const b of blocks){
  if(p.x+player.w/2>b.x&&p.x-player.w/2<b.x+1&&
     p.y<p.y+player.h&&
     p.y<b.y+1&&p.y+player.h>b.y&&
     p.z+player.w/2>b.z&&p.z-player.w/2<b.z+1) return true;
 }
 return false;
}

/* ===== Inventory ===== */
let inventory={grass:10,dirt:10,stone:10,wood:5};
let selected="grass";
function ui(){
 hotbar.innerHTML="";
 for(const k in inventory){
  const d=document.createElement("div");
  d.className="slot"+(k==selected?" active":"");
  d.textContent=k+"\n"+inventory[k];
  d.onclick=()=>{selected=k;ui();}
  hotbar.appendChild(d);
 }
}

/* ===== Input ===== */
onkeydown=e=>{
 if(e.key=="w")player.move.f=1;
 if(e.key=="s")player.move.b=1;
 if(e.key=="a")player.move.l=1;
 if(e.key=="d")player.move.r=1;
 if(e.key==" ")player.move.j=1;
}
onkeyup=e=>{
 if(e.key=="w")player.move.f=0;
 if(e.key=="s")player.move.b=0;
 if(e.key=="a")player.move.l=0;
 if(e.key=="d")player.move.r=0;
 if(e.key==" ")player.move.j=0;
};

/* ===== Raycast (EXAKT FADENKREUZ) ===== */
const ray=new THREE.Raycaster();
function target(add){
 ray.setFromCamera({x:0,y:0},camera);
 const hits=ray.intersectObjects(blocks.map(b=>b.m));
 if(!hits[0])return null;
 const p=hits[0].object.position;
 const n=hits[0].face.normal;
 return add?
 {x:p.x-.5+n.x,y:p.y-.5+n.y,z:p.z-.5+n.z}:
 {x:p.x-.5,y:p.y-.5,z:p.z-.5};
}

/* ===== Actions ===== */
mineBtn.ontouchstart=()=>{const t=target();if(t)remBlock(t.x|0,t.y|0,t.z|0)};
buildBtn.ontouchstart=()=>{if(!inventory[selected])return;
 const t=target(1); if(!t)return;
 addBlock(t.x|0,t.y|0,t.z|0,selected); inventory[selected]--; ui();
};
jumpBtn.ontouchstart=()=>{if(player.onGround){player.vel.y=6;player.onGround=0;}};

/* ===== Shooting ===== */
const shots=[];
shootBtn.ontouchstart=()=>{
 const g=new THREE.SphereGeometry(.1);
 const m=new THREE.MeshBasicMaterial({color:0xff0000});
 const s=new THREE.Mesh(g,m);
 s.position.copy(camera.position);
 s.dir=new THREE.Vector3(Math.sin(player.yaw),Math.sin(player.pitch),-Math.cos(player.yaw));
 shots.push(s); scene.add(s);
};

/* ===== Animals ===== */
const animals=[];
for(let i=0;i<6;i++){
 const m=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshLambertMaterial({map:tex.cow}));
 m.position.set(Math.random()*20-10,10,Math.random()*20-10);
 while(collide({x:m.position.x,y:m.position.y,z:m.position.z}))m.position.y++;
 m.hp=10; animals.push(m); scene.add(m);
}

/* ===== Loop ===== */
const clock=new THREE.Clock();
function loop(){
 requestAnimationFrame(loop);
 const dt=clock.getDelta();

 /* Day/Night */
 time+=dt*.02;
 sun.intensity=.2+Math.max(0,Math.sin(time));
 ambient.intensity=.2+sun.intensity;

 /* Hunger */
 player.hunger-=dt*.5;
 if(player.hunger<0){player.hp-=dt*5;player.hunger=0;}

 /* Movement */
 let dx=(player.move.r-player.move.l);
 let dz=(player.move.b-player.move.f);
 const l=Math.hypot(dx,dz); if(l){dx/=l;dz/=l;}
 player.pos.x+=Math.cos(player.yaw)*dx*6*dt+Math.sin(player.yaw)*dz*6*dt;
 player.pos.z+=-Math.sin(player.yaw)*dx*6*dt+Math.cos(player.yaw)*dz*6*dt;
 if(collide(player.pos)){player.pos.x-=dx;player.pos.z-=dz;}

 player.vel.y-=9.8*dt;
 if(player.move.j&&player.onGround){player.vel.y=6;player.onGround=0;}
 player.pos.y+=player.vel.y*dt;
 if(collide(player.pos)){player.pos.y=Math.ceil(player.pos.y);player.vel.y=0;player.onGround=1;}

 /* Camera */
 camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
 camera.lookAt(camera.position.clone().add(
  new THREE.Vector3(Math.sin(player.yaw),Math.sin(player.pitch),-Math.cos(player.yaw))
 ));

 /* Animals */
 for(const a of animals){
  const d=a.position.clone().sub(player.pos);
  if(d.length()<6)d.normalize();
  else d.set(Math.random()-.5,0,Math.random()-.5).normalize();
  a.position.add(d.multiplyScalar(dt));
 }

 /* Shots */
 for(let i=shots.length-1;i>=0;i--){
  const s=shots[i];
  s.position.add(s.dir.clone().multiplyScalar(20*dt));
  for(const a of animals){
   if(s.position.distanceTo(a.position)<.5){
    a.hp-=5; scene.remove(s); shots.splice(i,1);
    if(a.hp<=0){scene.remove(a);player.coins+=5;}
   }
  }
 }

 healthUI.textContent="❤️ "+player.hp|0;
 hungerUI.textContent="🍖 "+player.hunger|0+"%";
 coinsUI.textContent="🪙 "+player.coins;

 renderer.render(scene,camera);
}
ui(); loop();
}
