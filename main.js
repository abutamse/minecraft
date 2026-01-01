// ========= BASIC =========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Kamera bewusst niedrig & nah
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ========= LIGHT =========
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10,20,10);
scene.add(sun);

// ========= BLOCKS =========
const blocks = [];

function addBlock(x,y,z,color=0x55aa55){
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(mesh);
  blocks.push(mesh);
}

// Boden (GARANTIERT sichtbar)
for(let x=-10;x<=10;x++){
  for(let z=-10;z<=10;z++){
    addBlock(x,0,z);
  }
}

// Testblock vor Kamera
addBlock(0,1,0,0xff0000);

// ========= JOYSTICK =========
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

let moveX = 0;
let moveZ = 0;

joystick.addEventListener("touchmove", e=>{
  const r = joystick.getBoundingClientRect();
  const t = e.touches[0];

  const dx = t.clientX - (r.left + r.width/2);
  const dy = t.clientY - (r.top + r.height/2);

  const dist = Math.min(40, Math.hypot(dx,dy));
  const angle = Math.atan2(dy,dx);

  moveX = Math.cos(angle) * (dist/40);
  moveZ = Math.sin(angle) * (dist/40);

  stick.style.left = 35 + moveX*40 + "px";
  stick.style.top  = 35 + moveZ*40 + "px";
});

joystick.addEventListener("touchend", ()=>{
  moveX = moveZ = 0;
  stick.style.left = "35px";
  stick.style.top  = "35px";
});

// ========= LOOP =========
function animate(){
  requestAnimationFrame(animate);

  camera.position.x += moveX * 0.1;
  camera.position.z += moveZ * 0.1;

  renderer.render(scene,camera);
}
animate();
