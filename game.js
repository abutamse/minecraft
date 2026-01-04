import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ===== DOM HELPERS ===== */
const $=id=>document.getElementById(id);
const joystick=$("joystick"),stick=$("stick");
const jumpBtn=$("jump"),mineBtn=$("mine"),buildBtn=$("build"),shootBtn=$("shoot");
const healthUI=$("health"),hungerUI=$("hunger"),coinsUI=$("coins");
const hotbar=$("hotbar");

/* ===== LOGIN ===== */
const login=$("login"),startBtn=$("startBtn"),nameInput=$("nameInput");
let playerName=null;
startBtn.addEventListener("click",()=>{
    const name=nameInput.value.trim();
    if(!name) return alert("Bitte Name eingeben!");
    playerName=name;
    login.style.display="none";
    initGame();
});
const key=k=>`${playerName}_${k}`;

/* ===== GAME INIT ===== */
function initGame(){

/* ===== SCENE & CAMERA ===== */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
});

/* ===== UI / FADENKREUZ ===== */
const cross=document.createElement("div");
cross.style="position:fixed;top:50%;left:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20";
document.body.appendChild(cross);

/* ===== LIGHT ===== */
scene.add(new THREE.AmbientLight(0xffffff,.7));
const sun=new THREE.DirectionalLight(0xffffff,.6);
sun.position.set(100,200,100);
scene.add(sun);

/* ===== TEXTURES ===== */
const loader=new THREE.TextureLoader();
const tex=n=>{const t=loader.load(n);t.magFilter=t.minFilter=THREE.NearestFilter;return t;};
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
    pos:new THREE.Vector3(0,10,0),
    vel:new THREE.Vector3(),
    yaw:0,pitch:0,onGround:false,
    hp:100,hunger:100,coins:0,
    speed:6,
    move:{forward:false,back:false,left:false,right:false,jump:false}
};

/* ===== WORLD ===== */
const blockGeo=new THREE.BoxGeometry(1,1,1);
const blocks=[];
const world={};
const chunks=new Set();

function addBlock(x,y,z,type){
    const k=`${x},${y},${z}`;
    if(world[k]) return;
    const m=new THREE.Mesh(blockGeo,new THREE.MeshLambertMaterial({map:textures[type]}));
    m.position.set(x+.5,y+.5,z+.5);
    scene.add(m);
    blocks.push({x,y,z,mesh:m,type});
    world[k]=type;
}
function removeBlock(x,y,z){
    const k=`${x},${y},${z}`;
    const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
    if(i>-1){const type=blocks[i].type; scene.remove(blocks[i].mesh); blocks.splice(i,1); delete world[k]; inventory[type]=(inventory[type]||0)+1; updateHotbarUI();}
}

/* ===== TERRAIN ===== */
function genChunk(cx,cz){
    for(let x=cx;x<cx+16;x++)
    for(let z=cz;z<cz+16;z++){
        let height=Math.floor(Math.sin(x*.1)*5+Math.cos(z*.1)*5+Math.random()*2)+5;
        for(let y=0;y<=height;y++){
            let type="stone";
            if(y>height-3) type="dirt";
            if(y===height) type=Math.random()<.2?"sand":"grass";
            addBlock(x,y,z,type);
        }
        if(Math.random()<.08){
            const h=3+Math.floor(Math.random()*2);
            for(let i=1;i<=h;i++) addBlock(x,height+i,z,"wood");
            for(let dx=-1;dx<=1;dx++)
            for(let dz=-1;dz<=1;dz++) addBlock(x+dx,height+h,z+dz,"leaves");
        }
        if(height<4) for(let y=height+1;y<=3;y++) addBlock(x,y,z,"water");
    }
}
function loadChunks(){
    const cx=Math.floor(player.pos.x/16)*16;
    const cz=Math.floor(player.pos.z/16)*16;
    for(let dx=-32;dx<=32;dx+=16)
    for(let dz=-32;dz<=32;dz+=16){
        const k=`${cx+dx},${cz+dz}`;
        if(!chunks.has(k)){genChunk(cx+dx,cz+dz);chunks.add(k);}
    }
}

/* ===== COLLISION ===== */
function collide(x,y,z){
    for(const b of blocks){
        if(Math.abs(b.x+.5-x)<.45 && Math.abs(b.z+.5-z)<.45 && y<b.y+1 && y+1>b.y) return true;
    }
    return false;
}

/* ===== INVENTAR ===== */
let inventory={grass:5,dirt:5,stone:5,sand:5,wood:5};
let selected="grass"; let food=0; let weapons={"knife":true}; let currentWeapon="knife";
function updateHotbarUI(){
    hotbar.innerHTML="";
    Object.keys(inventory).forEach(k=>{
        const d=document.createElement("div");
        d.className="slot"+(k===selected?" active":"");
        d.textContent=`${k}\n${inventory[k]}`;
        d.onclick=()=>{selected=k;updateHotbarUI();}
        hotbar.appendChild(d);
    });
    const f=document.createElement("div"); f.className="slot"; f.textContent=`🍖 ${food}`; hotbar.appendChild(f);
}

/* ===== KEYBOARD ===== */
window.addEventListener("keydown",e=>{if(e.key==="w")player.move.forward=true;if(e.key==="s")player.move.back=true;if(e.key==="a")player.move.left=true;if(e.key==="d")player.move.right=true;if(e.key===" ")player.move.jump=true;});
window.addEventListener("keyup",e=>{if(e.key==="w")player.move.forward=false;if(e.key==="s")player.move.back=false;if(e.key==="a")player.move.left=false;if(e.key==="d")player.move.right=false;if(e.key===" ")player.move.jump=false;});

/* ===== JOYSTICK / LOOK ===== */
let active=false,joy={x:0,y:0}; joystick.addEventListener("touchstart",()=>active=true); joystick.addEventListener("touchend",()=>{active=false;joy={x:0,y:0};stick.style.left="40px";stick.style.top="40px";});
joystick.addEventListener("touchmove",e=>{if(!active)return; const t=e.touches[0]; const r=joystick.getBoundingClientRect(); let x=t.clientX-r.left-60; let y=t.clientY-r.top-60; const d=Math.min(40,Math.hypot(x,y)); const a=Math.atan2(y,x); joy.x=Math.cos(a)*d/40; joy.y=Math.sin(a)*d/40; stick.style.left=40+joy.x*40+"px"; stick.style.top=40+joy.y*40+"px";});

let look=false,last={x:0,y:0};
window.addEventListener("touchstart",e=>{for(const t of e.touches) if(t.clientX>window.innerWidth/2){look=true;last={x:t.clientX,y:t.clientY};}});
window.addEventListener("touchmove",e=>{if(!look) return; for(const t of e.touches) if(t.clientX>window.innerWidth/2){player.yaw-=(t.clientX-last.x)*0.004; player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch-(t.clientY-last.y)*0.004)); last={x:t.clientX,y:t.clientY};}});
window.addEventListener("touchend",()=>look=false);

/* ===== ACTION BUTTONS ===== */
jumpBtn.addEventListener("touchstart",()=>{if(player.onGround){player.vel.y=6;player.onGround=false;}},{passive:false});
mineBtn.addEventListener("touchstart",()=>{const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw)); const p=player.pos.clone().add(dir); removeBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z));},{passive:false});
buildBtn.addEventListener("touchstart",()=>{if(inventory[selected]<=0) return; const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw)); const p=player.pos.clone().add(dir); addBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z),selected); inventory[selected]--;updateHotbarUI();},{passive:false});

/* ===== ANIMATE LOOP ===== */
const clock=new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    loadChunks();

    const dir=new THREE.Vector3(); dir.x=joy.x||0; dir.z=-joy.y||0;
    if(player.move.forward) dir.z-=1; if(player.move.back) dir.z+=1; if(player.move.left) dir.x-=1; if(player.move.right) dir.x+=1;
    if(dir.length()>0) dir.normalize();
    player.pos.x+=Math.sin(player.yaw)*dir.z*player.speed*dt+Math.cos(player.yaw)*dir.x*player.speed*dt;
    player.pos.z+=-Math.cos(player.yaw)*dir.z*player.speed*dt+Math.sin(player.yaw)*dir.x*player.speed*dt;
    if(player.move.jump && player.onGround){player.vel.y=6;player.onGround=false;}
    player.vel.y-=9.8*dt; player.pos.y+=player.vel.y*dt; if(player.pos.y<2){player.pos.y=2;player.vel.y=0;player.onGround=true;} else player.onGround=false;

    camera.position.copy(player.pos).add(new THREE.Vector3(0,1.6,0));
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(Math.sin(player.yaw)*10,Math.sin(player.pitch)*10,-Math.cos(player.yaw)*10)));

    healthUI.textContent=`❤️ ${player.hp|0}`;
    hungerUI.textContent=`🍖 ${player.hunger|0}%`;
    coinsUI.textContent=`🪙 ${player.coins}`;

    updateHotbarUI();
    renderer.render(scene,camera);
}
animate();

} // initGame
