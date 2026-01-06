import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ================= DOM ================= */
const $ = id => document.getElementById(id);

/* ================= LOGIN ================= */
$("startBtn").onclick = () => {
    if (!$("nameInput").value.trim()) return;
    $("login").style.display = "none";
    initGame();
};

function initGame(){

/* ================= RENDERER ================= */
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
document.body.appendChild(renderer.domElement);

/* ================= SCENE / CAMERA ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

window.addEventListener("resize",()=>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ================= TEXTURES ================= */
const loader = new THREE.TextureLoader();
const tex = n => {
    const t = loader.load(n, undefined, undefined, ()=>console.warn("Missing texture:",n));
    t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
};

const textures = {
    grass: tex("grass.png"),
    dirt: tex("dirt.png"),
    stone: tex("stone.png"),
    sand: tex("sand.png"),
    wood: tex("wood.png"),
    leaves: tex("leaves.png")
};

/* ================= PLAYER ================= */
const player = {
    pos: new THREE.Vector3(0,30,0),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    width: 0.6,
    height: 1.8,
    onGround: false,
    hp: 100,
    hunger: 100,
    coins: 0
};

/* ================= INVENTORY ================= */
let inventory = { grass:0,dirt:0,stone:0,sand:0,wood:0,leaves:0,meat:0 };
let selected = "dirt";

/* ================= HOTBAR ================= */
function updateHotbar(){
    const h = $("hotbar");
    h.innerHTML = "";
    for(const k in inventory){
        const d = document.createElement("div");
        d.className = "slot" + (k===selected?" active":"");
        d.textContent = `${k} ${inventory[k]}`;
        d.onclick = ()=>{ selected=k; updateHotbar(); };
        h.appendChild(d);
    }
}
updateHotbar();

/* ================= WORLD ================= */
const geo = new THREE.BoxGeometry(1,1,1);
const blocks = [];
const world = new Map();
const chunks = new Set();
const CHUNK = 16;

function key(x,y,z){ return `${x},${y},${z}`; }
function chunkKey(cx,cz){ return `${cx},${cz}`; }

function addBlock(x,y,z,type){
    const k = key(x,y,z);
    if(world.has(k)) return;
    const m = new THREE.Mesh(
        geo,
        new THREE.MeshLambertMaterial({ map: textures[type] })
    );
    m.position.set(x+0.5,y+0.5,z+0.5);
    scene.add(m);
    blocks.push({x,y,z,type,mesh:m});
    world.set(k,type);
}

function getHeight(x,z){
    return Math.floor(
        6 +
        Math.sin(x*0.15)*3 +
        Math.cos(z*0.15)*3
    );
}

/* ================= TERRAIN / INFINITE ================= */
function generateChunk(cx,cz){
    const ck = chunkKey(cx,cz);
    if(chunks.has(ck)) return;
    chunks.add(ck);

    for(let x=cx;x<cx+CHUNK;x++)
    for(let z=cz;z<cz+CHUNK;z++){
        const h = getHeight(x,z);
        for(let y=0;y<=h;y++){
            if(y===h) addBlock(x,y,z,h<5?"sand":"grass");
            else if(y<h-3) addBlock(x,y,z,"stone");
            else addBlock(x,y,z,"dirt");
        }
    }
}

/* ================= COLLISION ================= */
function collides(p){
    for(const b of blocks){
        if(
            p.x+player.width/2 > b.x &&
            p.x-player.width/2 < b.x+1 &&
            p.z+player.width/2 > b.z &&
            p.z-player.width/2 < b.z+1 &&
            p.y < b.y+1 &&
            p.y+player.height > b.y
        ) return true;
    }
    return false;
}

function groundHeight(x,z){
    let max = -Infinity;
    for(const b of blocks){
        if(
            x > b.x-0.3 && x < b.x+1.3 &&
            z > b.z-0.3 && z < b.z+1.3
        ){
            if(b.y+1 > max) max = b.y+1;
        }
    }
    return max;
}

/* ================= CONTROLS ================= */
let jx=0,jy=0,active=false,sx=0,sy=0;
$("joyBase").addEventListener("touchstart",e=>{
    active=true;
    sx=e.touches[0].clientX;
    sy=e.touches[0].clientY;
});
$("joyBase").addEventListener("touchmove",e=>{
    if(!active) return;
    jx=(e.touches[0].clientX-sx)/40;
    jy=(sy-e.touches[0].clientY)/40;
    jx=Math.max(-1,Math.min(1,jx));
    jy=Math.max(-1,Math.min(1,jy));
    $("joyStick").style.transform=`translate(${jx*30}px,${-jy*30}px)`;
});
$("joyBase").addEventListener("touchend",()=>{
    jx=jy=0; active=false;
    $("joyStick").style.transform="translate(0,0)";
});

$("jump").onclick=()=>{
    if(player.onGround){
        player.vel.y=7;
        player.onGround=false;
    }
};

/* ================= LOOK ================= */
let drag=false,lx=0,ly=0;
renderer.domElement.addEventListener("pointerdown",e=>{
    drag=true; lx=e.clientX; ly=e.clientY;
});
window.addEventListener("pointerup",()=>drag=false);
window.addEventListener("pointermove",e=>{
    if(!drag) return;
    player.yaw -= (e.clientX-lx)*0.002;
    player.pitch -= (e.clientY-ly)*0.002;
    player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch));
    lx=e.clientX; ly=e.clientY;
});

/* ================= MAIN LOOP ================= */
const clock = new THREE.Clock();

function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    /* === Generate nearby chunks === */
    const pcx = Math.floor(player.pos.x/CHUNK)*CHUNK;
    const pcz = Math.floor(player.pos.z/CHUNK)*CHUNK;
    for(let dx=-2;dx<=2;dx++)
    for(let dz=-2;dz<=2;dz++){
        generateChunk(pcx+dx*CHUNK, pcz+dz*CHUNK);
    }

    /* === Movement === */
    const sin=Math.sin(player.yaw), cos=Math.cos(player.yaw);
    player.pos.x += (sin*jy + cos*jx) * 6 * dt;
    player.pos.z += (cos*jy - sin*jx) * 6 * dt;

    /* === Gravity === */
    player.vel.y -= 15 * dt;
    player.pos.y += player.vel.y * dt;

    const g = groundHeight(player.pos.x,player.pos.z);
    if(player.pos.y <= g){
        player.pos.y = g;
        player.vel.y = 0;
        player.onGround = true;
    } else player.onGround = false;

    /* === Camera === */
    camera.position.set(
        player.pos.x,
        player.pos.y + 1.6,
        player.pos.z
    );
    camera.lookAt(
        camera.position.x + Math.sin(player.yaw)*Math.cos(player.pitch),
        camera.position.y + Math.sin(player.pitch),
        camera.position.z + Math.cos(player.yaw)*Math.cos(player.pitch)
    );

    renderer.render(scene,camera);
}
animate();

}
