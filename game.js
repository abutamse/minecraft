import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ================= DOM ================= */
const $ = id => document.getElementById(id);

/* ================= LOGIN ================= */
$("startBtn").onclick = () => {
    if (!$("nameInput").value.trim()) return;
    $("login").style.display = "none";
    initGame();
};

function initGame() {

/* ================= RENDERER ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
document.body.appendChild(renderer.domElement);

/* ================= SCENE / CAMERA ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(100, 200, 100);
scene.add(sun);

/* ================= TEXTURES ================= */
const loader = new THREE.TextureLoader();
const tex = n => {
    const t = loader.load(n);
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
    pos: new THREE.Vector3(0, 15, 0),
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
let inventory = { grass:0, dirt:0, stone:0, sand:0, wood:0, leaves:0, meat:0 };
let selected = "dirt";

/* ================= HOTBAR ================= */
function updateHotbar(){
    const h = $("hotbar");
    h.innerHTML = "";
    for(const k in inventory){
        const d = document.createElement("div");
        d.className = "slot" + (k === selected ? " active" : "");
        d.textContent = `${k} ${inventory[k]}`;
        d.onclick = () => { selected = k; updateHotbar(); };
        h.appendChild(d);
    }
}
updateHotbar();

/* ================= WORLD ================= */
const geo = new THREE.BoxGeometry(1,1,1);
const blocks = [];
const world = new Map();

function key(x,y,z){ return `${x},${y},${z}`; }

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

function removeBlock(x,y,z){
    const k = key(x,y,z);
    if(!world.has(k)) return;
    const i = blocks.findIndex(b => b.x===x && b.y===y && b.z===z);
    if(i !== -1){
        scene.remove(blocks[i].mesh);
        inventory[blocks[i].type]++;
        blocks.splice(i,1);
        updateHotbar();
    }
    world.delete(k);
}

/* ================= TERRAIN ================= */
function gen(cx,cz){
    for(let x=cx-16;x<cx+16;x++)
    for(let z=cz-16;z<cz+16;z++){
        const h = Math.floor(4 + Math.sin(x*0.2)*2 + Math.cos(z*0.2)*2);
        for(let y=0;y<=h;y++){
            if(world.has(key(x,y,z))) continue;
            if(y===h) addBlock(x,y,z,h<=2?"sand":"grass");
            else if(y<h-2) addBlock(x,y,z,"stone");
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

/* ================= RAYCAST ================= */
const ray = new THREE.Raycaster();
function getTarget(add){
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    ray.set(camera.position,dir);
    const hit = ray.intersectObjects(blocks.map(b=>b.mesh))[0];
    if(!hit) return null;
    const p = hit.object.position;
    const n = hit.face.normal;
    return {
        x: Math.floor(p.x-0.5 + (add?n.x:0)),
        y: Math.floor(p.y-0.5 + (add?n.y:0)),
        z: Math.floor(p.z-0.5 + (add?n.z:0))
    };
}

/* ================= BUTTONS ================= */
$("mine").onclick = () => {
    const t = getTarget(false);
    if(t) removeBlock(t.x,t.y,t.z);
};

$("build").onclick = () => {
    if(inventory[selected]<=0) return;
    const t = getTarget(true);
    if(t){
        inventory[selected]--;
        addBlock(t.x,t.y,t.z,selected);
        updateHotbar();
    }
};

$("jump").onclick = () => {
    if(player.onGround){
        player.vel.y = 6;
        player.onGround = false;
    }
};

/* ================= SHOOT ================= */
const bullets = [];
$("shoot").onclick = () => {
    const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.1),
        new THREE.MeshBasicMaterial({color:0xff0000})
    );
    b.position.copy(camera.position);
    b.dir = new THREE.Vector3();
    camera.getWorldDirection(b.dir);
    bullets.push(b);
    scene.add(b);
};

/* ================= JOYSTICK ================= */
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

/* ================= LOOK ================= */
let drag=false,lx=0,ly=0;
renderer.domElement.addEventListener("pointerdown",e=>{
    drag=true; lx=e.clientX; ly=e.clientY;
});
addEventListener("pointerup",()=>drag=false);
addEventListener("pointermove",e=>{
    if(!drag) return;
    player.yaw -= (e.clientX-lx)*0.002;
    player.pitch -= (e.clientY-ly)*0.002;
    player.pitch = Math.max(-1.5,Math.min(1.5,player.pitch));
    lx=e.clientX; ly=e.clientY;
});

/* ================= ANIMALS ================= */
const animals=[];
function spawnAnimal(){
    const m=new THREE.Mesh(
        new THREE.BoxGeometry(0.8,0.8,1),
        new THREE.MeshLambertMaterial({color:0xffffff})
    );
    m.position.set(Math.random()*40-20,5,Math.random()*40-20);
    scene.add(m);
    animals.push({mesh:m,hp:10});
}
for(let i=0;i<6;i++) spawnAnimal();

/* ================= EAT ================= */
$("eatMeat").onclick=()=>{
    if(inventory.meat>0){
        inventory.meat--;
        player.hunger=Math.min(100,player.hunger+20);
        updateHotbar();
    }
};

/* ================= SAVE ================= */
setInterval(()=>{
    localStorage.setItem("mini_mc_save",JSON.stringify({
        player,
        inventory,
        world:[...world.entries()]
    }));
},5000);

/* ================= LOOP ================= */
const clock=new THREE.Clock();
let hungerTimer=0;

function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    const sin=Math.sin(player.yaw), cos=Math.cos(player.yaw);
    const dx=sin*jy + cos*jx;
    const dz=cos*jy - sin*jx;

    player.pos.x+=dx*6*dt;
    if(collides(player.pos)) player.pos.x-=dx*6*dt;
    player.pos.z+=dz*6*dt;
    if(collides(player.pos)) player.pos.z-=dz*6*dt;

    player.vel.y-=9.8*dt;
    player.pos.y+=player.vel.y*dt;

    if(collides(player.pos)){
        player.vel.y=0;
        player.pos.y=Math.floor(player.pos.y);
        player.onGround=true;
    } else player.onGround=false;

    gen(Math.floor(player.pos.x/16)*16,Math.floor(player.pos.z/16)*16);

    camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
    camera.lookAt(
        camera.position.x+Math.sin(player.yaw)*Math.cos(player.pitch),
        camera.position.y+Math.sin(player.pitch),
        camera.position.z+Math.cos(player.yaw)*Math.cos(player.pitch)
    );

    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];
        b.position.add(b.dir.clone().multiplyScalar(20*dt));
        for(let j=animals.length-1;j>=0;j--){
            if(b.position.distanceTo(animals[j].mesh.position)<0.6){
                scene.remove(b); bullets.splice(i,1);
                animals[j].hp-=5;
                if(animals[j].hp<=0){
                    scene.remove(animals[j].mesh);
                    animals.splice(j,1);
                    inventory.meat++; player.coins+=2;
                    spawnAnimal(); updateHotbar();
                }
                break;
            }
        }
    }

    hungerTimer+=dt;
    if(hungerTimer>3){
        hungerTimer=0;
        player.hunger--;
        if(player.hunger<0){player.hunger=0;player.hp--;}
    }

    $("health").textContent="❤️ "+player.hp;
    $("hunger").textContent="🍖 "+player.hunger+"%";
    $("coins").textContent="🪙 "+player.coins;

    if(player.hp<=0){
        alert("Du bist gestorben!");
        location.reload();
    }

    renderer.render(scene,camera);
}
animate();
}
