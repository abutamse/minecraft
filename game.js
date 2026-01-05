import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

const $=id=>document.getElementById(id);

/* LOGIN */
$("startBtn").onclick=()=>{
  if(!$("nameInput").value.trim()) return alert("Name eingeben!");
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
  pos:new THREE.Vector3(0,10,0),
  vel:new THREE.Vector3(),
  yaw:0,pitch:0,
  onGround:false,
  hp:100,hunger:100
};

/* JOYSTICK – RICHTIG GEMAPPT */
let joy={x:0,y:0},active=false,start={x:0,y:0};
$("joyStick").addEventListener("touchstart",e=>{
  active=true;
  start.x=e.touches[0].clientX;
  start.y=e.touches[0].clientY;
});
$("joyStick").addEventListener("touchmove",e=>{
  if(!active) return;
  const dx=e.touches[0].clientX-start.x;
  const dy=e.touches[0].clientY-start.y;
  const dist=Math.min(Math.hypot(dx,dy),40);
  const ang=Math.atan2(dy,dx);
  joy.x=Math.cos(ang)*(dist/40); // links / rechts
  joy.y=Math.sin(ang)*(dist/40); // vor / zurück
  $("joyStick").style.transform=`translate(${joy.x*30}px,${joy.y*30}px)`;
});
$("joyStick").addEventListener("touchend",()=>{
  active=false; joy.x=joy.y=0;
  $("joyStick").style.transform="translate(0,0)";
});

/* LOOK */
let look=false,lx=0,ly=0;
renderer.domElement.addEventListener("touchstart",e=>{
  look=true; lx=e.touches[0].clientX; ly=e.touches[0].clientY;
});
renderer.domElement.addEventListener("touchmove",e=>{
  if(!look) return;
  player.yaw-=(e.touches[0].clientX-lx)*0.003;
  player.pitch-=(e.touches[0].clientY-ly)*0.003;
  player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
  lx=e.touches[0].clientX; ly=e.touches[0].clientY;
});
renderer.domElement.addEventListener("touchend",()=>look=false);

/* WORLD */
const blocks=[],world={},geo=new THREE.BoxGeometry(1,1,1);
function addBlock(x,y,z,t){
  const k=`${x},${y},${z}`;
  if(world[k]) return;
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[t]}));
  m.position.set(x+.5,y+.5,z+.5);
  scene.add(m);
  blocks.push({x,y,z,mesh:m,type:t});
  world[k]=t;
}
function removeBlock(x,y,z){
  const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
  if(i<0) return;
  inventory[blocks[i].type]=(inventory[blocks[i].type]||0)+1;
  scene.remove(blocks[i].mesh);
  blocks.splice(i,1);
  delete world[`${x},${y},${z}`];
  updateHotbar();
}

/* TERRAIN – ECHTER BODEN */
function gen(cx,cz){
  for(let x=cx-12;x<=cx+12;x++)
  for(let z=cz-12;z<=cz+12;z++){
    if(world[`${x},0,${z}`]) continue;
    const h=Math.floor(4+Math.sin(x*.2)*2+Math.cos(z*.2)*2);
    for(let y=0;y<=h;y++){
      if(y===0) addBlock(x,y,z,"stone");
      else if(y===h) addBlock(x,y,z,"grass");
      else addBlock(x,y,z,"dirt");
    }
  }
}

/* RAYCAST – GELBER PUNKT */
const ray=new THREE.Raycaster();
function target(add){
  ray.setFromCamera({x:0,y:0},camera);
  const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
  if(!hit) return null;
  const p=hit.object.position,n=hit.face.normal;
  return add
    ? {x:p.x-0.5+n.x,y:p.y-0.5+n.y,z:p.z-0.5+n.z}
    : {x:p.x-0.5,y:p.y-0.5,z:p.z-0.5};
}

/* INVENTORY */
let inventory={grass:0,dirt:0,stone:0};
let selected="dirt";
function updateHotbar(){
  $("hotbar").innerHTML="";
  for(const k in inventory){
    const d=document.createElement("div");
    d.className="slot"+(k===selected?" active":"");
    d.textContent=k+"\n"+inventory[k];
    d.onclick=()=>{selected=k;updateHotbar();}
    $("hotbar").appendChild(d);
  }
}

/* BUTTONS */
$("mine").onclick=()=>{const t=target(false);if(t)removeBlock(t.x|0,t.y|0,t.z|0);};
$("build").onclick=()=>{const t=target(true);if(t)addBlock(t.x|0,t.y|0,t.z|0,selected);};
$("jump").onclick=()=>{if(player.onGround){player.vel.y=6;player.onGround=false;}};

/* LOOP */
let hungerTimer=0;
const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=clock.getDelta();

  gen(Math.floor(player.pos.x),Math.floor(player.pos.z));

  const forward=-joy.y;
  const side=joy.x;

  player.pos.x+=(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*side)*6*dt;
  player.pos.z+=(Math.cos(player.yaw)*forward-Math.sin(player.yaw)*side)*6*dt;

  player.vel.y-=9.8*dt;
  player.pos.y+=player.vel.y*dt;
  if(player.pos.y<2){
    player.pos.y=2;
    player.vel.y=0;
    player.onGround=true;
  }

  camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
  camera.lookAt(
    camera.position.x+Math.sin(player.yaw),
    camera.position.y+Math.sin(player.pitch),
    camera.position.z+Math.cos(player.yaw)
  );

  hungerTimer+=dt;
  if(hungerTimer>2){
    hungerTimer=0;
    player.hunger--;
    if(player.hunger<0){player.hunger=0;player.hp--;}
  }

  $("health").textContent="❤️ "+player.hp;
  $("hunger").textContent="🍖 "+player.hunger+"%";

  renderer.render(scene,camera);
}
loop();
}
