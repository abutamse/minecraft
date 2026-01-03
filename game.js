import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ---------- BASIC ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:false});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* ---------- LIGHT ---------- */
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const sun=new THREE.DirectionalLight(0xffffff,0.6);
sun.position.set(100,200,100);
scene.add(sun);

/* ---------- TEXTURES ---------- */
const loader=new THREE.TextureLoader();
function tex(name){
 const t=loader.load(name);
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestFilter;
 return t;
}
const textures={
 grass:tex("grass.png"),
 dirt:tex("dirt.png"),
 stone:tex("stone.png"),
 sand:tex("sand.png")
};

/* ---------- WORLD ---------- */
const blocks=[];
const geo=new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type){
 const mat=new THREE.MeshLambertMaterial({map:textures[type]});
 const mesh=new THREE.Mesh(geo,mat);
 mesh.position.set(x+0.5,y+0.5,z+0.5);
 scene.add(mesh);
 blocks.push({x,y,z,mesh});
}

// simple flat world
for(let x=-20;x<20;x++)
 for(let z=-20;z<20;z++)
  addBlock(x,0,z,"grass");

/* ---------- PLAYER ---------- */
const player={
 pos:new THREE.Vector3(0,2,0),
 vel:new THREE.Vector3(),
 yaw:0,
 pitch:0
};

/* ---------- JOYSTICK ---------- */
const joystick=document.getElementById("joystick");
const stick=document.getElementById("stick");
let joy={x:0,y:0}, joyActive=false;

joystick.addEventListener("touchstart",e=>{joyActive=true});
joystick.addEventListener("touchend",e=>{
 joyActive=false;
 joy={x:0,y:0};
 stick.style.left="40px";
 stick.style.top="40px";
});
joystick.addEventListener("touchmove",e=>{
 if(!joyActive) return;
 const r=joystick.getBoundingClientRect();
 const t=e.touches[0];
 let x=t.clientX-r.left-60;
 let y=t.clientY-r.top-60;
 const d=Math.min(40,Math.hypot(x,y));
 const a=Math.atan2(y,x);
 x=Math.cos(a)*d;
 y=Math.sin(a)*d;
 joy.x=x/40;
 joy.y=y/40;
 stick.style.left=40+x+"px";
 stick.style.top=40+y+"px";
});

/* ---------- CAMERA TOUCH LOOK ---------- */
let lookActive=false, last={x:0,y:0};

addEventListener("touchstart",e=>{
 for(const t of e.touches){
  if(t.clientX>innerWidth/2){
   lookActive=true;
   last={x:t.clientX,y:t.clientY};
  }
 }
});

addEventListener("touchmove",e=>{
 if(!lookActive) return;
 for(const t of e.touches){
  if(t.clientX>innerWidth/2){
   const dx=t.clientX-last.x;
   const dy=t.clientY-last.y;
   player.yaw -= dx*0.004;
   player.pitch -= dy*0.004;
   player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
   last={x:t.clientX,y:t.clientY};
  }
 }
});

addEventListener("touchend",()=>lookActive=false);

/* ---------- JUMP ---------- */
document.getElementById("jump").onclick=()=>{
 if(player.pos.y<=2.01) player.vel.y=6;
};

/* ---------- LOOP ---------- */
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=clock.getDelta();

 const speed=5;
 const forward=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
 const right=new THREE.Vector3(-forward.z,0,forward.x);

 player.vel.addScaledVector(forward, -joy.y*speed*dt);
 player.vel.addScaledVector(right, joy.x*speed*dt);

 player.vel.y -= 9.8*dt;
 player.pos.addScaledVector(player.vel,dt);

 if(player.pos.y<2){
  player.pos.y=2;
  player.vel.y=0;
 }

 player.vel.multiplyScalar(0.85);

 const lookDir=new THREE.Vector3(
  Math.sin(player.yaw)*Math.cos(player.pitch),
  Math.sin(player.pitch),
 -Math.cos(player.yaw)*Math.cos(player.pitch)
 );

 camera.position.copy(player.pos).add(new THREE.Vector3(0,1.6,0));
 camera.lookAt(camera.position.clone().add(lookDir));

 renderer.render(scene,camera);
}
animate();
