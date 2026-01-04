import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

document.addEventListener("DOMContentLoaded",()=>{

/* ===== DOM ===== */
const $=id=>document.getElementById(id);
const joystick=$("joystick"),stick=$("stick");
const jumpBtn=$("jump"),mineBtn=$("mine"),buildBtn=$("build"),shootBtn=$("shoot");
const healthUI=$("health"),hungerUI=$("hunger"),coinsUI=$("coins");
const hotbar=$("hotbar");

/* ===== LOGIN ===== */
const login=$("login"),startBtn=$("startBtn"),nameInput=$("nameInput");
let playerName=null;
startBtn.onclick=()=>{
    if(!nameInput.value.trim()) return alert("Name eingeben");
    playerName=nameInput.value.trim();
    login.style.display="none";
    init();
};
const key=k=>`${playerName}_${k}`;

/* ================= GAME ================= */
function init(){

/* ===== SCENE ===== */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:false});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
});

/* ===== LIGHT ===== */
scene.add(new THREE.AmbientLight(0xffffff,.7));
const sun=new THREE.DirectionalLight(0xffffff,.6);
sun.position.set(100,200,100);
scene.add(sun);

/* ===== TEXTURES ===== */
const loader=new THREE.TextureLoader();
const tex=n=>{
    const t=loader.load(n);
    t.magFilter=t.minFilter=THREE.NearestFilter;
    return t;
};
const textures={
    grass:tex("grass.png"),
    dirt:tex("dirt.png"),
    stone:tex("stone.png"),
    sand:tex("sand.png"),
    wood:tex("wood.png"),
    leaves:tex("leaves.png"),
    water:tex("water.png")
};

/* ===== PLAYER ===== */
const player={
    pos:new THREE.Vector3(0,6,0),
    vel:new THREE.Vector3(),
    yaw:0,pitch:0,onGround:false,
    hp:100,hunger:100,coins:0,
    speed:10
};

/* ===== WORLD ===== */
const blockGeo=new THREE.BoxGeometry(1,1,1);
const blocks=[];
const world={};
const chunks=new Set();

function addBlock(x,y,z,type){
    const k=`${x},${y},${z}`;
    if(world[k])return;
    const m=new THREE.Mesh(blockGeo,new THREE.MeshLambertMaterial({map:textures[type]}));
    m.position.set(x+.5,y+.5,z+.5);
    scene.add(m);
    blocks.push({x,y,z,mesh:m,type});
    world[k]=type;
}

function removeBlock(x,y,z){
    const k=`${x},${y},${z}`;
    const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
    if(i>-1){
        scene.remove(blocks[i].mesh);
        blocks.splice(i,1);
        delete world[k];
        inventory[world[k]]=(inventory[world[k]]||0)+1;
        updateHotbar();
    }
}

/* ===== TERRAIN ===== */
function genChunk(cx,cz){
    for(let x=cx;x<cx+16;x++)
    for(let z=cz;z<cz+16;z++){
        let h=4+Math.floor(Math.sin(x*.15+z*.15)*2+Math.random()*2);
        for(let y=0;y<=h;y++){
            let t="stone";
            if(y>h-3)t="dirt";
            if(y===h)t=Math.random()<.2?"sand":"grass";
            addBlock(x,y,z,t);
        }
        if(Math.random()<.08){
            addBlock(x,h+1,z,"wood");
            addBlock(x,h+2,z,"wood");
            for(let dx=-1;dx<=1;dx++)
            for(let dz=-1;dz<=1;dz++)
                addBlock(x+dx,h+3,z+dz,"leaves");
        }
        if(h<4){
            for(let y=h+1;y<=3;y++)
                addBlock(x,y,z,"water");
        }
    }
}

function loadChunks(){
    const cx=Math.floor(player.pos.x/16)*16;
    const cz=Math.floor(player.pos.z/16)*16;
    for(let dx=-32;dx<=32;dx+=16)
    for(let dz=-32;dz<=32;dz+=16){
        const k=`${cx+dx},${cz+dz}`;
        if(!chunks.has(k)){
            genChunk(cx+dx,cz+dz);
            chunks.add(k);
        }
    }
}

/* ===== COLLISION ===== */
function collide(x,y,z){
    for(const b of blocks){
        if(Math.abs(b.x+.5-x)<.45 &&
           Math.abs(b.z+.5-z)<.45 &&
           y<b.y+1 && y+1>b.y) return true;
    }
    return false;
}

/* ===== INVENTORY ===== */
let inventory={grass:0,dirt:0,stone:0,sand:0,wood:0};
let selected="grass";

function updateHotbar(){
    hotbar.innerHTML="";
    Object.keys(inventory).forEach(k=>{
        const d=document.createElement("div");
        d.className="slot"+(k===selected?" active":"");
        d.textContent=`${k}\n${inventory[k]}`;
        d.onclick=()=>{selected=k;updateHotbar();}
        hotbar.appendChild(d);
    });
}
updateHotbar();

/* ===== JOYSTICK ===== */
let joy={x:0,y:0},active=false;
joystick.ontouchstart=()=>active=true;
joystick.ontouchend=()=>{
    active=false;joy={x:0,y:0};
    stick.style.left="40px";stick.style.top="40px";
};
joystick.ontouchmove=e=>{
    if(!active)return;
    const r=joystick.getBoundingClientRect();
    const t=e.touches[0];
    let x=t.clientX-r.left-60;
    let y=t.clientY-r.top-60;
    const d=Math.min(40,Math.hypot(x,y));
    const a=Math.atan2(y,x);
    joy.x=Math.cos(a)*d/40;
    joy.y=Math.sin(a)*d/40;
    stick.style.left=40+joy.x*40+"px";
    stick.style.top=40+joy.y*40+"px";
};

/* ===== LOOK ===== */
let look=false,last={x:0,y:0};
addEventListener("touchstart",e=>{
    for(const t of e.touches)
        if(t.clientX>innerWidth/2){look=true;last={x:t.clientX,y:t.clientY};}
});
addEventListener("touchmove",e=>{
    if(!look)return;
    for(const t of e.touches)
        if(t.clientX>innerWidth/2){
            player.yaw-=(t.clientX-last.x)*.004;
            player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch-(t.clientY-last.y)*.004));
            last={x:t.clientX,y:t.clientY};
        }
});
addEventListener("touchend",()=>look=false);

/* ===== ACTIONS ===== */
mineBtn.onclick=()=>{
    const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
    const p=player.pos.clone().add(dir);
    removeBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z));
};

buildBtn.onclick=()=>{
    if(inventory[selected]<=0)return;
    const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
    const p=player.pos.clone().add(dir);
    addBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z),selected);
    inventory[selected]--;
    updateHotbar();
};

jumpBtn.onclick=()=>{
    if(player.onGround){player.vel.y=6;player.onGround=false;}
};

/* ===== LOOP ===== */
const clock=new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    loadChunks();

    const f=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
    const r=new THREE.Vector3(-f.z,0,f.x);

    let nx=player.pos.x+(f.x*-joy.y+r.x*joy.x)*player.speed*dt;
    let nz=player.pos.z+(f.z*-joy.y+r.z*joy.x)*player.speed*dt;
    if(!collide(nx,player.pos.y,nz)){
        player.pos.x=nx;player.pos.z=nz;
    }

    player.vel.y-=9.8*dt;
    let ny=player.pos.y+player.vel.y*dt;
    if(ny<2){ny=2;player.vel.y=0;player.onGround=true;}
    player.pos.y=ny;

    camera.position.copy(player.pos).add(new THREE.Vector3(0,1.6,0));
    camera.lookAt(camera.position.clone().add(f));

    player.hunger-=dt*(100/300);
    if(player.hunger<=0){player.hunger=0;player.hp-=dt*2;}

    healthUI.textContent=`❤️ ${player.hp|0}`;
    hungerUI.textContent=`🍖 ${player.hunger|0}%`;
    coinsUI.textContent=`🪙 ${player.coins}`;

    renderer.render(scene,camera);
}
animate();
}
});
