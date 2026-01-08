import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

const $ = id => document.getElementById(id);

$("startBtn").onclick = () => {
  if(!$("nameInput").value.trim()) return;
  $("login").style.display="none";
  init();
};

function init(){

/* RENDERER */
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

/* 🔥 DER FIX 🔥 */
renderer.domElement.style.pointerEvents = "none";

/* SCENE / CAMERA */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* PLAYER */
const player={
  pos:new THREE.Vector3(0,20,0),
  vel:new THREE.Vector3(),
  yaw:0,
  pitch:0,
  onGround:false
};

/* WORLD */
const geo=new THREE.BoxGeometry(1,1,1);
const mat=new THREE.MeshLambertMaterial({color:0x55aa55});
const blocks=[];
function addBlock(x,y,z){
  const m=new THREE.Mesh(geo,mat);
  m.position.set(x+.5,y+.5,z+.5);
  scene.add(m);
  blocks.push(m);
}
for(let x=-10;x<10;x++)
for(let z=-10;z<10;z++)
addBlock(x,0,z);

/* RAYCAST */
const ray=new THREE.Raycaster();
const center=new THREE.Vector2(0,0);
function hit(){
  ray.setFromCamera(center,camera);
  return ray.intersectObjects(blocks)[0];
}

/* BUTTONS */
function bind(id,fn){
  $(id).addEventListener("pointerdown",e=>{
    e.preventDefault();
    fn();
  });
}

bind("jump",()=>{
  if(player.onGround){
    player.vel.y=8;
    player.onGround=false;
  }
});

bind("mine",()=>{
  const h=hit();
  if(h){
    scene.remove(h.object);
    blocks.splice(blocks.indexOf(h.object),1);
  }
});

bind("build",()=>{
  const h=hit();
  if(h){
    const p=h.object.position;
    addBlock(Math.floor(p.x),Math.floor(p.y)+1,Math.floor(p.z));
  }
});

bind("shoot",()=>alert("PEW"));
bind("eatMeat",()=>alert("YUM"));

/* LOOP */
const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=clock.getDelta();

  player.vel.y-=20*dt;
  player.pos.y+=player.vel.y*dt;
  if(player.pos.y<=1){
    player.pos.y=1;
    player.vel.y=0;
    player.onGround=true;
  }

  camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
  camera.lookAt(camera.position.x+Math.sin(player.yaw),camera.position.y,camera.position.z+Math.cos(player.yaw));

  renderer.render(scene,camera);
}
loop();
}
