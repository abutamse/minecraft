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
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
document.body.appendChild(renderer.domElement);

/* ================= SCENE / CAMERA ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
addEventListener("resize",()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
});

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ================= TEXTURES ================= */
const loader = new THREE.TextureLoader();
const tex = n=>{
    const t = loader.load(n,undefined,undefined,()=>console.warn("Missing texture",n));
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
    pos: new THREE.Vector3(0,50,0),
    vel: new THREE.Vector3(),
    yaw:0,
    pitch:0,
    width:0.6,
    height:1.8,
    onGround:false
};

/* ================= WORLD ================= */
const geo = new THREE.BoxGeometry(1,1,1);
const blocks = [];
const world = new Map();
const CHUNK = 16;
const chunks = new Set();

const key = (x,y,z)=>`${x},${y},${z}`;
const chunkKey = (x,z)=>`${x},${z}`;

function addBlock(x,y,z,type){
    const k = key(x,y,z);
    if(world.has(k)) return;
    const m = new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[type]}));
    m.position.set(x+0.5,y+0.5,z+0.5);
    scene.add(m);
    blocks.push({x,y,z,mesh:m});
    world.set(k,true);
}

function heightAt(x,z){
    return Math.floor(6 + Math.sin(x*0.15)*3 + Math.cos(z*0.15)*3);
}

function generateChunk(cx,cz){
    const ck = chunkKey(cx,cz);
    if(chunks.has(ck)) return;
    chunks.add(ck);

    for(let x=cx;x<cx+CHUNK;x++)
    for(let z=cz;z<cz+CHUNK;z++){
        const h = heightAt(x,z);
        for(let y=0;y<=h;y++){
            if(y===h) addBlock(x,y,z,h<5?"sand":"grass");
            else if(y<h-3) addBlock(x,y,z,"stone");
            else addBlock(x,y,z,"dirt");
        }
    }
}

/* ================= GROUND CHECK (FIX) ================= */
function groundY(x,z){
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    for(let y=100;y>=-5;y--){
        if(world.has(key(xi,y,zi))) return y+1;
    }
    return -Infinity;
}

/* ================= RAYCAST (CROSSHAIR FIX) ================= */
const ray = new THREE.Raycaster();
const center = new THREE.Vector2(0,0);

function getTarget(build){
    ray.setFromCamera(center,camera);
    const hit = ray.intersectObjects(blocks.map(b=>b.mesh))[0];
    if(!hit) return null;

    const p = hit.object.position;
    const n = hit.face.normal;

    const bx = Math.floor(p.x-0.5 + (build?n.x:0));
    const by = Math.floor(p.y-0.5 + (build?n.y:0));
    const bz = Math.floor(p.z-0.5 + (build?n.z:0));

    return {x:bx,y:by,z:bz};
}

/* ================= CONTROLS ================= */
let jx=0,jy=0,active=false,sx=0,sy=0;

$("joyBase").addEventListener("touchstart",e=>{
    active=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY;
});
$("joyBase").addEventListener("touchmove",e=>{
    if(!active) return;
    jx=(e.touches[0].clientX-sx)/40;
    jy=(sy-e.touches[0].clientY)/40;
    jx=Math.max(-1,Math.min(1,jx));
    jy=Math.max(-1,Math.min(1,jy));
});
$("joyBase").addEventListener("touchend",()=>{jx=jy=0;active=false;});

$("jump").onclick=()=>{
    if(player.onGround){ player.vel.y=8; player.onGround=false; }
};

$("mine").onclick=()=>{
    const t = getTarget(false);
    if(t && world.has(key(t.x,t.y,t.z))){
        const i = blocks.findIndex(b=>b.x===t.x&&b.y===t.y&&b.z===t.z);
        if(i>-1){ scene.remove(blocks[i].mesh); blocks.splice(i,1); world.delete(key(t.x,t.y,t.z)); }
    }
};

$("build").onclick=()=>{
    const t = getTarget(true);
    if(t && !world.has(key(t.x,t.y,t.z))) addBlock(t.x,t.y,t.z,"dirt");
};

/* ================= LOOK ================= */
let drag=false,lx=0,ly=0;
renderer.domElement.addEventListener("pointerdown",e=>{drag=true;lx=e.clientX;ly=e.clientY;});
addEventListener("pointerup",()=>drag=false);
addEventListener("pointermove",e=>{
    if(!drag) return;
    player.yaw-=(e.clientX-lx)*0.002;
    player.pitch-=(e.clientY-ly)*0.002;
    player.pitch=Math.max(-1.5,1.5,player.pitch);
    lx=e.clientX; ly=e.clientY;
});

/* ================= LOOP ================= */
const clock = new THREE.Clock();

function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    const pcx = Math.floor(player.pos.x/CHUNK)*CHUNK;
    const pcz = Math.floor(player.pos.z/CHUNK)*CHUNK;
    for(let dx=-2;dx<=2;dx++)
    for(let dz=-2;dz<=2;dz++)
        generateChunk(pcx+dx*CHUNK,pcz+dz*CHUNK);

    const sin=Math.sin(player.yaw), cos=Math.cos(player.yaw);
    player.pos.x += (sin*jy + cos*jx)*6*dt;
    player.pos.z += (cos*jy - sin*jx)*6*dt;

    player.vel.y -= 20*dt;
    player.pos.y += player.vel.y*dt;

    const gy = groundY(player.pos.x,player.pos.z);
    if(player.pos.y <= gy){
        player.pos.y = gy;
        player.vel.y = 0;
        player.onGround = true;
    } else player.onGround = false;

    camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
    camera.lookAt(
        camera.position.x+Math.sin(player.yaw)*Math.cos(player.pitch),
        camera.position.y+Math.sin(player.pitch),
        camera.position.z+Math.cos(player.yaw)*Math.cos(player.pitch)
    );

    renderer.render(scene,camera);
}
animate();

}
