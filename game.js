import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ========= DOM READY ========= */
document.addEventListener("DOMContentLoaded", () => {

const $ = id => document.getElementById(id);

/* ========= LOGIN ========= */
$("startBtn").addEventListener("click", () => {
    const name = $("nameInput").value.trim();
    if (!name) {
        alert("Bitte Namen eingeben!");
        return;
    }
    $("login").style.display = "none";
    initGame(name);
});

/* ========= GAME ========= */
function initGame(playerName){

/* ========= BASIC ========= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
});

/* ========= LIGHT ========= */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ========= PLAYER ========= */
const player = {
    pos: new THREE.Vector3(0,15,0),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    width: 0.6,
    height: 1.8,
    onGround:false,
    hp:100,
    hunger:100,
    coins:0,
    name: playerName
};

/* ========= UI ========= */
const healthUI = $("health");
const hungerUI = $("hunger");
const coinsUI = $("coins");
const hotbar = $("hotbar");

/* ========= INPUT ========= */
const keys = {w:0,a:0,s:0,d:0,jump:0};
addEventListener("keydown",e=>{
    if(e.key==="w") keys.w=1;
    if(e.key==="a") keys.a=1;
    if(e.key==="s") keys.s=1;
    if(e.key==="d") keys.d=1;
    if(e.key===" ") keys.jump=1;
});
addEventListener("keyup",e=>{
    if(e.key==="w") keys.w=0;
    if(e.key==="a") keys.a=0;
    if(e.key==="s") keys.s=0;
    if(e.key==="d") keys.d=0;
    if(e.key===" ") keys.jump=0;
});

/* ========= TEXTURES ========= */
const loader = new THREE.TextureLoader();
const tex = n=>{
    const t=loader.load(n);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
};
const textures = {
    grass: tex("grass.png"),
    dirt: tex("dirt.png"),
    stone: tex("stone.png"),
    wood: tex("wood.png"),
    leaves: tex("leaves.png")
};

/* ========= WORLD ========= */
const blocks=[];
const world={};
const box = new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type){
    const key=`${x},${y},${z}`;
    if(world[key]) return;
    const mesh=new THREE.Mesh(box,new THREE.MeshLambertMaterial({map:textures[type]}));
    mesh.position.set(x+0.5,y+0.5,z+0.5);
    scene.add(mesh);
    blocks.push({x,y,z,mesh,type});
    world[key]=type;
}

function removeBlock(x,y,z){
    const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
    if(i===-1) return;
    scene.remove(blocks[i].mesh);
    blocks.splice(i,1);
    delete world[`${x},${y},${z}`];
}

/* ========= TERRAIN ========= */
for(let x=-25;x<=25;x++){
for(let z=-25;z<=25;z++){
    const h=Math.floor(4+Math.sin(x*0.15)*3+Math.cos(z*0.15)*3);
    for(let y=0;y<=h;y++){
        addBlock(x,y,z,y===h?"grass":y>h-2?"dirt":"stone");
    }
}}

/* ========= COLLISION ========= */
function collides(p){
    for(const b of blocks){
        if(
            p.x+player.width/2>b.x &&
            p.x-player.width/2<b.x+1 &&
            p.z+player.width/2>b.z &&
            p.z-player.width/2<b.z+1 &&
            p.y<b.y+1 &&
            p.y+player.height>b.y
        ) return true;
    }
    return false;
}

/* ========= INVENTORY ========= */
let inventory={grass:20,dirt:20,stone:10,wood:5,meat:0};
let selected="grass";

function updateHotbar(){
    hotbar.innerHTML="";
    for(const k in inventory){
        const d=document.createElement("div");
        d.className="slot"+(k===selected?" active":"");
        d.textContent=k+"\n"+inventory[k];
        d.onclick=()=>{selected=k;updateHotbar();}
        hotbar.appendChild(d);
    }
}
updateHotbar();

/* ========= ACTION BUTTONS ========= */
$("jump").onclick=()=>{ if(player.onGround){player.vel.y=6;} };
$("mine").onclick=()=>{
    const t=rayTarget(false);
    if(t) removeBlock(t.x|0,t.y|0,t.z|0);
};
$("build").onclick=()=>{
    const t=rayTarget(true);
    if(t && inventory[selected]>0){
        addBlock(t.x|0,t.y|0,t.z|0,selected);
        inventory[selected]--;
        updateHotbar();
    }
};

/* ========= RAYCAST ========= */
const ray=new THREE.Raycaster();
function rayTarget(add){
    ray.setFromCamera({x:0,y:0},camera);
    const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
    if(!hit) return null;
    const p=hit.object.position;
    const n=hit.face.normal;
    return add?
        {x:p.x-0.5+n.x,y:p.y-0.5+n.y,z:p.z-0.5+n.z}:
        {x:p.x-0.5,y:p.y-0.5,z:p.z-0.5};
}

/* ========= ANIMALS ========= */
const animals=[];
function spawnAnimal(x,z){
    const m=new THREE.Mesh(
        new THREE.BoxGeometry(1,0.8,1.4),
        new THREE.MeshLambertMaterial({color:0xffffff})
    );
    m.position.set(x+0.5,6,z+0.5);
    scene.add(m);
    animals.push({mesh:m,hp:10,dir:new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5)});
}
for(let i=0;i<6;i++) spawnAnimal(Math.random()*20-10,Math.random()*20-10);

/* ========= BULLETS ========= */
const bullets=[];
$("shoot").onclick=()=>{
    const b=new THREE.Mesh(
        new THREE.SphereGeometry(0.1),
        new THREE.MeshBasicMaterial({color:0xff0000})
    );
    b.position.copy(camera.position);
    b.dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
    bullets.push(b);
    scene.add(b);
};

/* ========= MULTIPLAYER ========= */
const channel=new BroadcastChannel("mini_mc");
const id=Math.random().toString(36).slice(2);
const others={};

setInterval(()=>{
    channel.postMessage({id,pos:player.pos});
},50);

channel.onmessage=e=>{
    if(e.data.id===id) return;
    if(!others[e.data.id]){
        const m=new THREE.Mesh(
            new THREE.BoxGeometry(0.6,1.8,0.6),
            new THREE.MeshLambertMaterial({color:Math.random()*0xffffff})
        );
        scene.add(m);
        others[e.data.id]={mesh:m};
    }
    others[e.data.id].mesh.position.copy(e.data.pos);
};

/* ========= LOOP ========= */
const clock=new THREE.Clock();
let hungerTimer=0;

function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    const mx=keys.d-keys.a;
    const mz=keys.s-keys.w;
    player.pos.x+=mx*5*dt;
    player.pos.z+=mz*5*dt;

    player.vel.y-=9.8*dt;
    player.pos.y+=player.vel.y*dt;
    if(collides(player.pos)){
        player.vel.y=0;
        player.onGround=true;
        player.pos.y=Math.ceil(player.pos.y);
    } else player.onGround=false;

    camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
    camera.lookAt(camera.position.x,camera.position.y,camera.position.z-1);

    bullets.forEach(b=>b.position.add(b.dir.clone().multiplyScalar(20*dt)));

    hungerTimer+=dt;
    if(hungerTimer>3){
        hungerTimer=0;
        player.hunger--;
        if(player.hunger<=0){player.hp-=2;}
    }

    healthUI.textContent="❤️ "+player.hp;
    hungerUI.textContent="🍖 "+player.hunger;
    coinsUI.textContent="🪙 "+player.coins;

    renderer.render(scene,camera);
}
animate();

} // END GAME
}); // END DOM READY
