import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
const $=id=>document.getElementById(id);

$("startBtn").onclick=()=>{
  if(!$("nameInput").value.trim()) return;
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
  stone:tex("stone.png")
};

/* PLAYER */
const player={
  pos:new THREE.Vector3(0,6,0),
  vel:new THREE.Vector3(),
  yaw:0,pitch:0,
  onGround:false,
  hunger:100
};

/* JOYSTICK – ENDGÜLTIG RICHTIG */
let joy={x:0,y:0},active=false,start={x:0,y:0};
$("joyStick").addEventListener("touchstart",e=>{
  active=true;
  start.x=e.touches[0].clientX;
  start.y=e.touches[0].clientY;
});
$("joyStick").addEventListener("touchmove",e=>{
  if(!active)return;
  const dx=e.touches[0].clientX-start.x;
  const dy=start.y-e.touches[0].clientY; // WICHTIG: Y invertiert
  const len=Math.min(Math.hypot(dx,dy),40);
  joy.x=dx/40;
  joy.y=dy/40;
  $("joyStick").style.transform=`translate(${joy.x*30}px,${-joy.y*30}px)`;
});
$("joyStick").addEventListener("touchend",()=>{
  active=false;joy.x=joy.y=0;
  $("joyStick").style.transform="translate(0,0)";
});

/* LOOK */
let look=false,lx=0,ly=0;
renderer.domElement.addEventListener("touchstart",e=>{
  look=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY;
});
renderer.domElement.addEventListener("touchmove",e=>{
  if(!look)return;
  player.yaw-=(e.touches[0].clientX-lx)*0.003;
  player.pitch-=(e.touches[0].clientY-ly)*0.003;
  player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
  lx=e.touches[0].clientX;ly=e.touches[0].clientY;
});
renderer.domElement.addEventListener("touchend",()=>look=false);

/* WORLD */
const blocks=[],world={},geo=new THREE.BoxGeometry(1,1,1);
function addBlock(x,y,z,t){
  const k=`${x},${y},${z}`; if(world[k])return;
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[t]}));
  m.position.set(x+.5,y+.5,z+.5);
  scene.add(m);
  blocks.push({x,y,z,mesh:m});
  world[k]=true;
}
function solid(x,y,z){ return world[`${x},${y},${z}`]; }

/* TERRAIN */
for(let x=-20;x<=20;x++)
for(let z=-20;z<=20;z++)
for(let y=0;y<=3;y++)
  addBlock(x,y,z,y===3?"grass":"dirt");

/* RAYCAST – EXAKT MITTE */
const ray=new THREE.Raycaster();
function rayHit(){
  const dir=new THREE.Vector3();
  camera.getWorldDirection(dir);
  ray.set(camera.position,dir);
  return ray.intersectObjects(blocks.map(b=>b.mesh))[0];
}

/* BUTTONS */
$("mine").onclick=()=>{
  const h=rayHit(); if(!h)return;
  const p=h.object.position;
  scene.remove(h.object);
  delete world[`${p.x-0.5},${p.y-0.5},${p.z-0.5}`];
};
$("build").onclick=()=>{
  const h=rayHit(); if(!h)return;
  const n=h.face.normal,p=h.object.position;
  addBlock(p.x-0.5+n.x,p.y-0.5+n.y,p.z-0.5+n.z,"dirt");
};
$("jump").onclick=()=>{
  if(player.onGround){player.vel.y=6;player.onGround=false;}
};

/* COLLISION */
function collide(nx,ny,nz){
  return solid(Math.floor(nx),Math.floor(ny),Math.floor(nz));
}

/* LOOP */
const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=clock.getDelta();

  const forward=joy.y;
  const side=joy.x;

  const dir=new THREE.Vector3(
    Math.sin(player.yaw),
    0,
    Math.cos(player.yaw)
  );
  const right=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0));

  let nx=player.pos.x+(dir.x*forward+right.x*side)*5*dt;
  let nz=player.pos.z+(dir.z*forward+right.z*side)*5*dt;

  if(!collide(nx,player.pos.y,nz)){
    player.pos.x=nx;
    player.pos.z=nz;
  }

  player.vel.y-=9.8*dt;
  let ny=player.pos.y+player.vel.y*dt;
  if(!collide(player.pos.x,ny,player.pos.z)){
    player.pos.y=ny;
    player.onGround=false;
  }else{
    player.vel.y=0;
    player.onGround=true;
  }

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
