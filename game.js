import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

window.onload = () => {

// ---------------- LOGIN ----------------
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');

let user = localStorage.getItem('currentUser');

loginBtn.onclick = () => {
  const u = usernameInput.value.trim();
  const p = passwordInput.value.trim();
  if(!u || !p){
    loginMsg.textContent="Bitte Benutzername & Passwort eingeben";
    return;
  }

  const users = JSON.parse(localStorage.getItem('users')) || {};
  if(users[u]){
    if(users[u].password !== p){
      loginMsg.textContent="Falsches Passwort";
      return;
    }
  } else {
    users[u] = {password:p};
    localStorage.setItem('users',JSON.stringify(users));
  }

  user = u;
  localStorage.setItem('currentUser', user);
  loginForm.style.display="none";
  startGame();
};

// ---------------- GAME ----------------
function startGame(){

// THREE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize',()=>{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// LIGHT
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(50,100,50);
scene.add(sun);

// TEXTURES
const loader = new THREE.TextureLoader();
const textures = {
  grass: loader.load('grass.png'),
  dirt: loader.load('dirt.png'),
  stone: loader.load('stone.png'),
  sand: loader.load('sand.png'),
  wood: loader.load('wood.png'),
  leaves: loader.load('leaves.png')
};

// PLAYER
const player = {
  x:0, y:5, z:0,
  velocity:new THREE.Vector3(),
  canJump:true
};

// INVENTORY
let inventory = JSON.parse(localStorage.getItem(user+'_inventory')) || {
  grass:10, dirt:10, stone:10, sand:10, wood:0, leaves:0
};

let coins = parseInt(localStorage.getItem(user+'_coins')) || 0;
let selected = "grass";

const hotbar = document.getElementById("hotbar");

function updateHotbar(){
  hotbar.innerHTML="";
  for(const k in inventory){
    const b = document.createElement("button");
    b.textContent = `${k} (${inventory[k]})`;
    if(k===selected) b.style.border="2px solid yellow";
    b.onclick=()=>{selected=k; updateHotbar();};
    hotbar.appendChild(b);
  }
}
updateHotbar();

function saveData(){
  localStorage.setItem(user+'_inventory',JSON.stringify(inventory));
  localStorage.setItem(user+'_coins',coins);
}

// BLOCKS
const blocks = [];

function addBlock(x,y,z,type){
  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshStandardMaterial({map:textures[type]});
  const mesh = new THREE.Mesh(geo,mat);
  mesh.position.set(x+0.5,y+0.5,z+0.5);
  scene.add(mesh);
  blocks.push({mesh,x,y,z,type});
}

// WORLD
const loadedChunks = new Set();

function generateChunk(cx,cz){
  for(let x=cx;x<cx+10;x++){
    for(let z=cz;z<cz+10;z++){
      if(blocks.find(b=>b.x===x && b.z===z)) continue;
      const h = 1 + Math.floor(Math.random()*3);
      for(let y=0;y<h;y++){
        addBlock(x,y,z,y<h-1?"stone":"grass");
      }
    }
  }
}

function loadChunks(){
  const cx = Math.floor(player.x/10)*10;
  const cz = Math.floor(player.z/10)*10;
  for(let dx=-20;dx<=20;dx+=10){
    for(let dz=-20;dz<=20;dz+=10){
      const key = `${cx+dx},${cz+dz}`;
      if(!loadedChunks.has(key)){
        generateChunk(cx+dx,cz+dz);
        loadedChunks.add(key);
      }
    }
  }
}
loadChunks();

// ANIMATION
const clock = new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  player.velocity.y -= 9.8 * dt;
  player.x += player.velocity.x * dt;
  player.y += player.velocity.y * dt;
  player.z += player.velocity.z * dt;

  if(player.y < 1.5){
    player.y = 1.5;
    player.velocity.y = 0;
    player.canJump = true;
  }

  camera.position.set(player.x, player.y+0.8, player.z+2);
  camera.lookAt(player.x, player.y+0.8, player.z);

  loadChunks();
  renderer.render(scene,camera);
}
animate();

}
};
