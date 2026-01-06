import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
const $ = id => document.getElementById(id);

/* LOGIN */
$("startBtn").onclick = ()=>{
  if(!$("nameInput").value.trim()) return;
  $("login").style.display="none";
  initGame();
};

function initGame(){

/* SCENE */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* CROSSHAIR */
const cross=document.createElement("div");
cross.style="position:fixed;left:50%;top:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20;";
document.body.appendChild(cross);

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff,.6));
const sun=new THREE.DirectionalLight(0xffffff,.8);
sun.position.set(100,200,100);
scene.add(sun);

/* TEXTURES */
const loader=new THREE.TextureLoader();
function tex(n){
  const t=loader.load(n);
  t.magFilter=t.minFilter=THREE.NearestFilter;
  return t;
}
const textures={
  grass:tex("grass.png"),
  dirt:tex("dirt.png"),
  stone:tex("stone.png"),
  sand:tex("sand.png")
};

/* PLAYER */
const player={
  pos:new THREE.Vector3(0,8,0),
  vel:new THREE.Vector3(),
  yaw:0,pitch:0,
  width:0.6,height:1.8,
  onGround:false,
  hp:100,hunger:100
};

/* LOOK */
let look=false,lx=0,ly=0;
renderer.domElement.addEventListener("pointerdown",e=>{
  look=true;lx=e.clientX;ly=e.clientY;
});
window.addEventListener("pointerup",()=>look=false);
window.addEventListener("pointermove",e=>{
  if(!look)return;
  player.yaw-=(e.clientX-lx)*0.002;
  player.pitch-=(e.clientY-ly)*0.002;
  player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch));
  lx=e.clientX;ly=e.clientY;
});

/* JOYSTICK */
let joyX=0,joyY=0,joyOn=false,sx=0,sy=0;
$("joyStick").addEventListener("touchstart",e=>{
  joyOn=true;
  sx=e.touches[0].clientX;
  sy=e.touches[0].clientY;
});
$("joyStick").addEventListener("touchmove",e=>{
  if(!joyOn)return;
  const dx=e.touches[0].clientX-sx;
  const dy=sy-e.touches[0].clientY;
  joyX=Math.max(-1,Math.min(1,dx/40));
  joyY=Math.max(-1,Math.min(1,dy/40));
  $("joyStick").style.transform=`translate(${joyX*30}px,${-joyY*30}px)`;
});
$("joyStick").addEventListener("touchend",()=>{
  joyOn=false;joyX=joyY=0;
  $("joyStick").style.transform="translate(0,0)";
});

/* WORLD */
const blocks=[],world={},geo=new THREE.BoxGeometry(1,1,1);
function addBlock(x,y,z,t){
  const k=`${x},${y},${z}`;
  if(world[k])return;
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[t]}));
  m.position.set(x+.5,y+.5,z+.5);
  scene.add(m);
  blocks.push({x,y,z,mesh:m});
  world[k]=true;
}
function removeBlock(x,y,z){
  const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
  if(i<0)return;
  scene.remove(blocks[i].mesh);
  blocks.splice(i,1);
  delete world[`${x},${y},${z}`];
}

/* TERRAIN – UNENDLICH */
function gen(cx,cz){
  for(let x=cx-20;x<=cx+20;x++)
  for(let z=cz-20;z<=cz+20;z++){
    if(world[`${x},0,${z}`])continue;
    for(let y=0;y<=3;y++)
      addBlock(x,y,z,y===3?"grass":"dirt");
  }
}
gen(0,0);

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
    ) return true;
  }
  return false;
}

/* RAYCAST – EXAKT GELBER PUNKT */
const ray=new THREE.Raycaster();
function getHit(){
  const d=new THREE.Vector3();
  camera.getWorldDirection(d);
  ray.set(camera.position,d);
  return ray.intersectObjects(blocks.map(b=>b.mesh))[0];
}

/* BUTTONS */
$("mine").onclick=()=>{
  const h=getHit(); if(!h)return;
  const p=h.object.position;
  removeBlock(p.x-0.5,p.y-0.5,p.z-0.5);
};
$("build").onclick=()=>{
  const h=getHit(); if(!h)return;
  const p=h.object.position,n=h.face.normal;
  addBlock(p.x-0.5+n.x,p.y-0.5+n.y,p.z-0.5+n.z,"dirt");
};
$("jump").onclick=()=>{
  if(player.onGround){player.vel.y=6;player.onGround=false;}
};

/* LOOP */
const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=clock.getDelta();

  gen(Math.floor(player.pos.x),Math.floor(player.pos.z));

  const sin=Math.sin(player.yaw),cos=Math.cos(player.yaw);
  let dx=(sin*joyY+cos*joyX)*6*dt;
  let dz=(cos*joyY-sin*joyX)*6*dt;

  player.pos.x+=dx;if(collides(player.pos))player.pos.x-=dx;
  player.pos.z+=dz;if(collides(player.pos))player.pos.z-=dz;

  player.vel.y-=9.8*dt;
  player.pos.y+=player.vel.y*dt;
  if(collides(player.pos)){
    player.vel.y=0;
    player.onGround=true;
    player.pos.y=Math.ceil(player.pos.y);
  }else player.onGround=false;

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
