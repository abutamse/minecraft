import * as THREE from './three.module.js';

/* ---------- LOGIN ---------- */
window.currentUser=null;

window.register=()=>{
  if(!user.value||!pass.value) return msg.textContent="Fill all";
  if(localStorage.getItem("u_"+user.value)) return msg.textContent="Exists";
  localStorage.setItem("u_"+user.value,JSON.stringify({
    pass:pass.value,
    world:null
  }));
  msg.textContent="Registered";
};

window.login=()=>{
  const d=localStorage.getItem("u_"+user.value);
  if(!d) return msg.textContent="No user";
  const o=JSON.parse(d);
  if(o.pass!==pass.value) return msg.textContent="Wrong pass";
  currentUser=user.value;
  document.getElementById("login").style.display="none";
  document.getElementById("ui").style.display="block";
  startGame(o.world);
};

/* ---------- GAME ---------- */
let scene,camera,renderer;
let blocks=[],animals=[];
let inventory={grass:0,dirt:0,stone:0,sword:1};
let player={x:0,y:3,z:5,vx:0,vy:0,vz:0,onGround:false};
let yaw=0,pitch=0;

const loader=new THREE.TextureLoader();
const tex={
  grass:loader.load("textures/grass.png"),
  dirt:loader.load("textures/dirt.png"),
  stone:loader.load("textures/stone.png")
};

function save(){
  localStorage.setItem("u_"+currentUser,JSON.stringify({
    pass:JSON.parse(localStorage.getItem("u_"+currentUser)).pass,
    world:{blocks,player,inventory}
  }));
}

window.startGame=(w)=>{
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x87ceeb);

  camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
  renderer=new THREE.WebGLRenderer();
  renderer.setSize(innerWidth,innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff));

  if(w){
    inventory=w.inventory;
    player=w.player;
    w.blocks.forEach(b=>addBlock(b.x,b.y,b.z,b.type));
  }else{
    for(let x=-10;x<=10;x++)
      for(let z=-10;z<=10;z++)
        addBlock(x,0,z,"grass");
    spawnPig(2,1,2);
  }

  animate();
};

/* ---------- BLOCKS ---------- */
function addBlock(x,y,z,type){
  const m=new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({map:tex[type]})
  );
  m.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(m);
  blocks.push({x,y,z,type,mesh:m});
}

const ray=new THREE.Raycaster();
function getHit(){
  ray.setFromCamera({x:0,y:0},camera);
  const h=ray.intersectObjects(scene.children);
  return h.length?h[0]:null;
}

window.mine=()=>{
  const h=getHit();
  if(!h) return;
  const b=blocks.find(o=>o.mesh===h.object);
  if(!b) return;
  inventory[b.type]++;
  scene.remove(b.mesh);
  blocks.splice(blocks.indexOf(b),1);
  save();
};

window.build=()=>{
  const h=getHit();
  if(!h||inventory.stone<=0) return;
  const p=h.point.clone().add(h.face.normal.multiplyScalar(0.5));
  addBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z),"stone");
  inventory.stone--;
  save();
};

/* ---------- ANIMALS ---------- */
function spawnPig(x,y,z){
  const m=new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({color:0xff9999})
  );
  m.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(m);
  animals.push({mesh:m,hp:10});
}

window.attack=()=>{
  const h=getHit();
  if(!h) return;
  const a=animals.find(o=>o.mesh===h.object);
  if(!a) return;
  a.hp-=5;
  if(a.hp<=0){
    scene.remove(a.mesh);
    animals.splice(animals.indexOf(a),1);
  }
};

/* ---------- PHYSICS ---------- */
window.jump=()=>{
  if(player.onGround){
    player.vy=6;
    player.onGround=false;
  }
};

function collide(x,y,z){
  return blocks.some(b=>
    x>b.x-0.3&&x<b.x+1.3 &&
    y>b.y-1.8&&y<b.y+1 &&
    z>b.z-0.3&&z<b.z+1.3
  );
}

/* ---------- TOUCH LOOK ---------- */
let look=false,last=null;
document.addEventListener("touchstart",e=>{
  if(e.touches[0].clientX>innerWidth/2){
    look=true;last=e.touches[0];
  }
});
document.addEventListener("touchmove",e=>{
  if(!look) return;
  const t=e.touches[0];
  yaw-= (t.clientX-last.clientX)*0.002;
  pitch-= (t.clientY-last.clientY)*0.002;
  pitch=Math.max(-1.2,Math.min(1.2,pitch));
  last=t;
});
document.addEventListener("touchend",()=>look=false);

/* ---------- LOOP ---------- */
function animate(){
  requestAnimationFrame(animate);
  const d=0.016;

  player.vy-=9.8*d;
  let nx=player.x, ny=player.y+player.vy*d, nz=player.z;

  if(!collide(player.x,ny,player.z)){
    player.y=ny;
    player.onGround=false;
  }else{
    if(player.vy<0) player.onGround=true;
    player.vy=0;
  }

  camera.rotation.order="YXZ";
  camera.rotation.y=yaw;
  camera.rotation.x=pitch;
  camera.position.set(player.x,player.y,player.z);

  renderer.render(scene,camera);
}
