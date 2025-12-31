// ---------- BASIC SETUP ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// ---------- LIGHT ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50,100,50);
scene.add(sun);

// ---------- TOUCH LOOK ----------
let lookX = 0, lookY = 0;
let lastX = null, lastY = null;

document.addEventListener("touchstart", e=>{
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
});

document.addEventListener("touchmove", e=>{
  const t = e.touches[0];
  if(lastX===null) return;

  lookX += (t.clientX - lastX) * 0.003;
  lookY += (t.clientY - lastY) * 0.003;
  lookY = Math.max(-1.4, Math.min(1.4, lookY));

  lastX = t.clientX;
  lastY = t.clientY;
});

// ---------- BLOCKS (NO TEXTURES) ----------
const blocks = [];

function addBlock(x,y,z){
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshLambertMaterial({ color:0x55aa55 })
  );
  mesh.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(mesh);
  blocks.push({mesh,x,y,z});
}

// Ground
for(let x=-10;x<=10;x++){
  for(let z=-10;z<=10;z++){
    addBlock(x,0,z);
  }
}

// ---------- RAYCAST ----------
const ray = new THREE.Raycaster();
function getTarget(){
  ray.setFromCamera({x:0,y:0},camera);
  const hits = ray.intersectObjects(blocks.map(b=>b.mesh));
  if(!hits.length) return null;
  return blocks.find(b=>b.mesh===hits[0].object);
}

// ---------- BUILD / MINE ----------
document.getElementById("mine").ontouchstart = ()=>{
  const t = getTarget();
  if(!t) return;
  scene.remove(t.mesh);
  blocks.splice(blocks.indexOf(t),1);
};

document.getElementById("build").ontouchstart = ()=>{
  const t = getTarget();
  if(!t) return;
  addBlock(t.x, t.y+1, t.z);
};

// ---------- JOYSTICK ----------
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

let joyX=0, joyY=0, joyActive=false;

joystick.addEventListener("touchstart", e=>{
  joyActive=true;
});
joystick.addEventListener("touchend", e=>{
  joyActive=false;
  joyX=joyY=0;
  stick.style.left="35px";
  stick.style.top="35px";
});
joystick.addEventListener("touchmove", e=>{
  const r = joystick.getBoundingClientRect();
  const t = e.touches[0];
  const x = t.clientX - r.left - 60;
  const y = t.clientY - r.top - 60;

  const d = Math.min(40, Math.hypot(x,y));
  const a = Math.atan2(y,x);

  joyX = Math.cos(a)*(d/40);
  joyY = Math.sin(a)*(d/40);

  stick.style.left = 35 + joyX*40 + "px";
  stick.style.top  = 35 + joyY*40 + "px";
});

// ---------- LOOP ----------
function animate(){
  requestAnimationFrame(animate);

  camera.rotation.y = -lookX;
  camera.rotation.x = -lookY;

  camera.position.x += joyX * 0.1;
  camera.position.z += joyY * 0.1;

  renderer.render(scene,camera);
}
animate();
