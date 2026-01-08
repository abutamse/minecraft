import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ========= DOM ========= */
const $ = id => document.getElementById(id);

/* ========= LOGIN ========= */
$("startBtn").onclick = () => {
  if (!$("nameInput").value.trim()) return;
  $("login").style.display = "none";
  init();
};

function init(){

/* ========= RENDERER ========= */
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

/* 🔥 DER EINZIGE FIX – WICHTIG 🔥 */
renderer.domElement.style.pointerEvents = "none";

/* ========= SCENE / CAMERA ========= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
window.addEventListener("resize",()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* ========= LIGHT ========= */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ========= TEXTURES ========= */
const loader = new THREE.TextureLoader();
const tex = n => {
  const t = loader.load(n);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  return t;
};
const textures = {
  grass: tex("grass.png"),
  dirt: tex("dirt.png"),
  stone: tex("stone.png"),
  sand: tex("sand.png")
};

/* ========= PLAYER ========= */
const player = {
  pos: new THREE.Vector3(0,30,0),
  vel: new THREE.Vector3(),
  yaw:0,
  pitch:0,
  onGround:false
};

/* ========= WORLD ========= */
const geo = new THREE.BoxGeometry(1,1,1);
const blocks = [];
const world = new Map();
const CHUNK = 16;
const chunks = new Set();
const key=(x,y,z)=>`${x},${y},${z}`;

function heightAt(x,z){
  return Math.floor(6 + Math.sin(x*0.15)*3 + Math.cos(z*0.15)*3);
}

function addBlock(x,y,z,type){
  const k=key(x,y,z);
  if(world.has(k)) return;
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[type]}));
  m.position.set(x+.5,y+.5,z+.5);
  scene.add(m);
  blocks.push({x,y,z,mesh:m});
  world.set(k,true);
}

function genChunk(cx,cz){
  const ck=`${cx},${cz}`;
  if(chunks.has(ck)) return;
  chunks.add(ck);
  for(let x=cx;x<cx+CHUNK;x++)
  for(let z=cz;z<cz+CHUNK;z++){
    const h=heightAt(x,z);
    for(let y=0;y<=h;y++){
      addBlock(x,y,z,y===h?"grass":y<h-2?"stone":"dirt");
    }
  }
}

function groundY(x,z){
  const xi=Math.floor(x), zi=Math.floor(z);
  for(let y=50;y>=-5;y--){
    if(world.has(key(xi,y,zi))) return y+1;
  }
  return -Infinity;
}

/* ========= JOYSTICK ========= */
let jx=0,jy=0;
let joyStartX=0,joyStartY=0;

$("joyBase").addEventListener("touchstart",e=>{
  const t=e.touches[0];
  joyStartX=t.clientX;
  joyStartY=t.clientY;
});
$("joyBase").addEventListener("touchmove",e=>{
  const t=e.touches[0];
  jx=(t.clientX-joyStartX)/40;
  jy=(joyStartY-t.clientY)/40;
  jx=Math.max(-1,Math.min(1,jx));
  jy=Math.max(-1,Math.min(1,jy));
});
$("joyBase").addEventListener("touchend",()=>jx=jy=0);

/* ========= LOOK ========= */
let drag=false,lx=0,ly=0;
renderer.domElement.addEventListener("pointerdown",e=>{
  drag=true; lx=e.clientX; ly=e.clientY;
});
addEventListener("pointerup",()=>drag=false);
addEventListener("pointermove",e=>{
  if(!drag) return;
  player.yaw-=(e.clientX-lx)*0.002;
  player.pitch-=(e.clientY-ly)*0.002;
  player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
  lx=e.clientX; ly=e.clientY;
});

/* ========= RAYCAST ========= */
const ray=new THREE.Raycaster();
const center=new THREE.Vector2(0,0);

function getHit(){
  ray.setFromCamera(center,camera);
  return ray.intersectObjects(blocks.map(b=>b.mesh))[0];
}

/* ========= BUTTONS ========= */
$("mine").onclick=()=>{
  const h=getHit();
  if(!h) return;
  const p=h.object.position;
  const x=Math.floor(p.x-.5),y=Math.floor(p.y-.5),z=Math.floor(p.z-.5);
  const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
  if(i>-1){
    scene.remove(blocks[i].mesh);
    blocks.splice(i,1);
    world.delete(key(x,y,z));
  }
};

$("build").onclick=()=>{
  const h=getHit();
  if(!h) return;
  const p=h.object.position,n=h.face.normal;
  addBlock(
    Math.floor(p.x-.5+n.x),
    Math.floor(p.y-.5+n.y),
    Math.floor(p.z-.5+n.z),
    "dirt"
  );
};

$("jump").onclick=()=>{
  if(player.onGround){
    player.vel.y=8;
    player.onGround=false;
  }
};

/* ========= LOOP ========= */
const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=clock.getDelta();

  const cx=Math.floor(player.pos.x/CHUNK)*CHUNK;
  const cz=Math.floor(player.pos.z/CHUNK)*CHUNK;
  for(let dx=-2;dx<=2;dx++)
  for(let dz=-2;dz<=2;dz++)
    genChunk(cx+dx*CHUNK,cz+dz*CHUNK);

  const forward=new THREE.Vector3(
    Math.sin(player.yaw),0,Math.cos(player.yaw)
  );
  const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));

  player.pos.add(forward.multiplyScalar(jy*6*dt));
  player.pos.add(right.multiplyScalar(jx*6*dt));

  player.vel.y-=20*dt;
  player.pos.y+=player.vel.y*dt;

  const gy=groundY(player.pos.x,player.pos.z);
  if(player.pos.y<=gy){
    player.pos.y=gy;
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
