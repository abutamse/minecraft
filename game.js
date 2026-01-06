import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
const $=id=>document.getElementById(id);

/* LOGIN */
$("startBtn").onclick=()=>{
  if(!$("nameInput").value.trim())return;
  $("login").style.display="none";
  init();
};

function init(){

/* SCENE */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun=new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* TEXTURES */
const loader=new THREE.TextureLoader();
const tex=n=>{const t=loader.load(n);t.magFilter=t.minFilter=THREE.NearestFilter;return t;};
const textures={
  grass:tex("grass.png"),
  dirt:tex("dirt.png"),
  stone:tex("stone.png"),
  sand:tex("sand.png"),
  water:tex("water.png"),
  wood:tex("wood.png"),
  leaves:tex("leaves.png")
};

/* PLAYER */
const player={
  pos:new THREE.Vector3(0,12,0),
  vel:new THREE.Vector3(),
  yaw:0,pitch:0,
  width:0.6,height:1.8,
  onGround:false,
  hp:100,hunger:100
};

/* INVENTORY */
const inventory={grass:0,dirt:0,stone:0,sand:0,wood:0,leaves:0};
function updateHotbar(){
  const h=$("hotbar");
  h.innerHTML="";
  for(const k in inventory){
    const d=document.createElement("div");
    d.className="slot";
    d.textContent=`${k}: ${inventory[k]}`;
    h.appendChild(d);
  }
}
updateHotbar();

/* WORLD */
const geo=new THREE.BoxGeometry(1,1,1);
const blocks=[];
const world={};

function addBlock(x,y,z,type){
  const k=`${x},${y},${z}`;
  if(world[k])return;
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[type]}));
  m.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(m);
  blocks.push({x,y,z,mesh:m,type});
  world[k]=1;
}

function removeBlock(x,y,z){
  const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
  if(i<0)return;
  inventory[blocks[i].type]++;
  updateHotbar();
  scene.remove(blocks[i].mesh);
  blocks.splice(i,1);
  delete world[`${x},${y},${z}`];
}

/* UNENDLICHE WELT */
function gen(cx,cz){
  for(let x=cx-16;x<cx+16;x++)
  for(let z=cz-16;z<cz+16;z++){
    const h=Math.floor(4+Math.sin(x*0.2)*2+Math.cos(z*0.2)*2);
    for(let y=0;y<=h;y++){
      if(y===h){
        if(h<=2)addBlock(x,y,z,"sand");
        else addBlock(x,y,z,"grass");
      }else if(y<h-2){
        addBlock(x,y,z,"stone");
      }else addBlock(x,y,z,"dirt");
    }
    if(Math.random()<0.02){
      addBlock(x,h+1,z,"wood");
      addBlock(x,h+2,z,"leaves");
    }
  }
}

/* ANIMALS */
const animals=[];
function spawnAnimal(x,z){
  const m=new THREE.Mesh(
    new THREE.BoxGeometry(0.8,0.8,1),
    new THREE.MeshLambertMaterial({color:0xffffff})
  );
  m.position.set(x,10,z);
  scene.add(m);
  animals.push({mesh:m,dir:new THREE.Vector3(Math.random()-.5,0,Math.random()-.5)});
}
for(let i=0;i<6;i++)spawnAnimal(Math.random()*20-10,Math.random()*20-10);

/* COLLISION */
function collides(p){
  for(const b of blocks){
    if(
      p.x+player.width/2>b.x &&
      p.x-player.width/2<b.x+1 &&
      p.z+player.width/2>b.z &&
      p.z-player.width/2<b.z+1 &&
      p.y<b.y+1 &&
      p.y+player.height>b.y
    )return true;
  }
  return false;
}

/* RAYCAST */
const ray=new THREE.Raycaster();
function getTarget(add){
  const dir=new THREE.Vector3();
  camera.getWorldDirection(dir);
  ray.set(camera.position,dir);
  const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
  if(!hit)return null;
  const p=hit.object.position;
  const n=hit.face.normal;
  return add
    ? {x:p.x-0.5+n.x,y:p.y-0.5+n.y,z:p.z-0.5+n.z}
    : {x:p.x-0.5,y:p.y-0.5,z:p.z-0.5};
}

/* BUTTONS */
$("mine").onclick=()=>{const t=getTarget(false);if(t)removeBlock(t.x|0,t.y|0,t.z|0);};
$("build").onclick=()=>{const t=getTarget(true);if(t)addBlock(t.x|0,t.y|0,t.z|0,"dirt");};
$("jump").onclick=()=>{if(player.onGround){player.vel.y=6;}};

/* JOYSTICK (RICHTIG) */
let jx=0,jy=0,active=false,sx=0,sy=0;
$("joyBase").addEventListener("touchstart",e=>{
  active=true;
  sx=e.touches[0].clientX;
  sy=e.touches[0].clientY;
});
$("joyBase").addEventListener("touchmove",e=>{
  if(!active)return;
  jx=Math.max(-1,Math.min(1,(e.touches[0].clientX-sx)/40));
  jy=Math.max(-1,Math.min(1,(sy-e.touches[0].clientY)/40));
});
$("joyBase").addEventListener("touchend",()=>{jx=jy=0;active=false;});

/* LOOK */
let drag=false,lx=0,ly=0;
renderer.domElement.addEventListener("pointerdown",e=>{drag=true;lx=e.clientX;ly=e.clientY;});
addEventListener("pointerup",()=>drag=false);
addEventListener("pointermove",e=>{
  if(!drag)return;
  player.yaw-=(e.clientX-lx)*0.002;
  player.pitch-=(e.clientY-ly)*0.002;
  player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
  lx=e.clientX;ly=e.clientY;
});

/* LOOP */
const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=clock.getDelta();

  const sin=Math.sin(player.yaw),cos=Math.cos(player.yaw);
  const dx=(sin*jy+cos*jx)*6*dt;
  const dz=(cos*jy-sin*jx)*6*dt;

  player.pos.x+=dx;if(collides(player.pos))player.pos.x-=dx;
  player.pos.z+=dz;if(collides(player.pos))player.pos.z-=dz;

  player.vel.y-=9.8*dt;
  player.pos.y+=player.vel.y*dt;
  if(collides(player.pos)){
    player.vel.y=0;
    player.pos.y=Math.ceil(player.pos.y);
    player.onGround=true;
  }

  gen(Math.floor(player.pos.x/16)*16,Math.floor(player.pos.z/16)*16);

  camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
  camera.lookAt(
    camera.position.x+Math.sin(player.yaw),
    camera.position.y+Math.sin(player.pitch),
    camera.position.z+Math.cos(player.yaw)
  );

  renderer.render(scene,camera);
}
loop();
}
