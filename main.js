/* ---------------- SCENE ---------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/* ---------------- LIGHT ---------------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

/* ---------------- TEXTURES ---------------- */
const loader = new THREE.TextureLoader();
const textures = {
  grass: loader.load("https://threejs.org/examples/textures/terrain/grasslight-big.jpg"),
  dirt: loader.load("https://threejs.org/examples/textures/terrain/backgrounddetailed6.jpg")
};

/* ---------------- WORLD ---------------- */
const blocks = [];
const geo = new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type="grass"){
  const mat = new THREE.MeshStandardMaterial({ map: textures[type] });
  const b = new THREE.Mesh(geo, mat);
  b.position.set(x,y,z);
  scene.add(b);
  blocks.push(b);
}

for(let x=-10;x<=10;x++){
  for(let z=-10;z<=10;z++){
    addBlock(x,0,z,"grass");
  }
}

/* ---------------- CAMERA LOOK ---------------- */
let yaw=0, pitch=0;
let look=false, lx=0, ly=0;

window.addEventListener("touchstart", e=>{
  if(e.target.closest("#joystick")) return;
  look=true;
  lx=e.touches[0].clientX;
  ly=e.touches[0].clientY;
});
window.addEventListener("touchend", ()=>look=false);
window.addEventListener("touchmove", e=>{
  if(!look) return;
  const dx=e.touches[0].clientX-lx;
  const dy=e.touches[0].clientY-ly;
  yaw -= dx*0.002;
  pitch -= dy*0.002;
  pitch=Math.max(-1.4,Math.min(1.4,pitch));
  camera.rotation.set(pitch,yaw,0);
  lx=e.touches[0].clientX;
  ly=e.touches[0].clientY;
});

/* ---------------- JOYSTICK MOVE ---------------- */
let moveX=0, moveZ=0;
const stick=document.getElementById("stick");
let active=false, sx=0, sy=0;

document.getElementById("joystick").addEventListener("touchstart", e=>{
  active=true;
  sx=e.touches[0].clientX;
  sy=e.touches[0].clientY;
});
window.addEventListener("touchend", ()=>{
  active=false;
  moveX=moveZ=0;
  stick.style.left="50px";
  stick.style.top="50px";
});
window.addEventListener("touchmove", e=>{
  if(!active) return;
  const dx=e.touches[0].clientX-sx;
  const dy=e.touches[0].clientY-sy;
  const max=40;
  const x=Math.max(-max,Math.min(max,dx));
  const y=Math.max(-max,Math.min(max,dy));
  stick.style.left=50+x+"px";
  stick.style.top=50+y+"px";
  moveX=x/max;
  moveZ=y/max;
});

/* ---------------- RAYCAST (FIXED) ---------------- */
const raycaster=new THREE.Raycaster();
raycaster.far = 6;

function getTarget(){
  raycaster.setFromCamera({x:0,y:0},camera);
  const hits=raycaster.intersectObjects(blocks);
  return hits.length?hits[0]:null;
}

/* ---------------- ACTIONS ---------------- */
document.getElementById("mineBtn").onclick=()=>{
  const hit=getTarget();
  if(!hit) return;
  scene.remove(hit.object);
  blocks.splice(blocks.indexOf(hit.object),1);
};

document.getElementById("buildBtn").onclick=()=>{
  const hit=getTarget();
  if(!hit) return;
  const p=hit.object.position.clone().add(hit.face.normal);
  addBlock(p.x,p.y,p.z,"dirt");
};

/* ---------------- LOOP ---------------- */
function animate(){
  requestAnimationFrame(animate);
  const speed=0.06;
  camera.position.x += (Math.sin(yaw)*moveZ + Math.cos(yaw)*moveX)*speed;
  camera.position.z += (Math.cos(yaw)*moveZ - Math.sin(yaw)*moveX)*speed;
  renderer.render(scene,camera);
}
animate();
