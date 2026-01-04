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

/* ===== GAME INIT ===== */
function initGame(){

/* ===== SCENE & CAMERA ===== */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);

const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
});

/* ===== CROSSHAIR ===== */
const cross=document.createElement("div");
cross.style="position:fixed;top:50%;left:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20";
document.body.appendChild(cross);

/* ===== LIGHT ===== */
scene.add(new THREE.AmbientLight(0xffffff,0.7));
const sun=new THREE.DirectionalLight(0xffffff,0.6);
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
    water:tex("water.png"),
    cow:tex("cow.png") // einfache Tiertextur
};

/* ===== PLAYER ===== */
const player={
    pos:new THREE.Vector3(0,0,0),
    vel:new THREE.Vector3(),
    yaw:0,pitch:0,onGround:false,
    speed:6,width:0.6,height:1.8,
    hp:100,hunger:100,coins:0,
    move:{forward:false,back:false,left:false,right:false,jump:false}
};

/* ===== WORLD ===== */
const blockGeo=new THREE.BoxGeometry(0.98,0.98,0.98);
const blocks=[];
const world={};
const chunks=new Set();

function addBlock(x,y,z,type){
    const k=`${x},${y},${z}`;
    if(world[k]) return;
    const m=new THREE.Mesh(blockGeo,new THREE.MeshLambertMaterial({map:textures[type]}));
    m.position.set(x+0.5,y+0.5,z+0.5);
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
        inventory[blocks[i].type]=(inventory[blocks[i].type]||0)+1;
        updateHotbarUI();
    }
}

/* ===== TERRAIN ===== */
function genChunk(cx,cz){
    for(let x=cx;x<cx+16;x++)
    for(let z=cz;z<cz+16;z++){
        let baseHeight = 4;
        let height = Math.floor(baseHeight + Math.sin(x*0.15)*3 + Math.cos(z*0.15)*3 + Math.random()*1);

        for(let y=0;y<=height;y++){
            let type="stone";
            if(y>height-3) type="dirt";
            if(y===height) type=Math.random()<0.2?"sand":"grass";
            addBlock(x,y,z,type);
        }

        // Bäume
        if(Math.random()<0.08){
            const h=3+Math.floor(Math.random()*2);
            for(let i=1;i<=h;i++) addBlock(x,height+i,z,"wood");
            for(let dx=-1;dx<=1;dx++)
            for(let dz=-1;dz<=1;dz++) addBlock(x+dx,height+h,z+dz,"leaves");
        }

        // Wasser
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
function collide(pos){
    for(const b of blocks){
        if(Math.abs(b.x+0.5-pos.x)<player.width/2 &&
           Math.abs(b.z+0.5-pos.z)<player.width/2 &&
           pos.y< b.y+1 &&
           pos.y + player.height> b.y){
            return true;
        }
    }
    return false;
}

/* ===== INVENTORY ===== */
let inventory={grass:5,dirt:5,stone:5,sand:5,wood:5};
let selected="grass";
function updateHotbarUI(){
    hotbar.innerHTML="";
    Object.keys(inventory).forEach(k=>{
        const d=document.createElement("div");
        d.className="slot"+(k===selected?" active":"");
        d.textContent=`${k}\n${inventory[k]}`;
        d.onclick=()=>{selected=k;updateHotbarUI();}
        hotbar.appendChild(d);
    });
}

/* ===== KEYBOARD ===== */
window.addEventListener("keydown",e=>{
    if(e.key==="w")player.move.forward=true;
    if(e.key==="s")player.move.back=true;
    if(e.key==="a")player.move.left=true;
    if(e.key==="d")player.move.right=true;
    if(e.key===" ")player.move.jump=true;
});
window.addEventListener("keyup",e=>{
    if(e.key==="w")player.move.forward=false;
    if(e.key==="s")player.move.back=false;
    if(e.key==="a")player.move.left=false;
    if(e.key==="d")player.move.right=false;
    if(e.key===" ")player.move.jump=false;
});

/* ===== JOYSTICK / LOOK ===== */
let active=false,joy={x:0,y:0};
joystick.addEventListener("touchstart",()=>active=true);
joystick.addEventListener("touchend",()=>{active=false;joy={x:0,y:0};stick.style.left="40px";stick.style.top="40px";});
joystick.addEventListener("touchmove",e=>{
    if(!active)return;
    const t=e.touches[0]; const r=joystick.getBoundingClientRect();
    let x=t.clientX-r.left-60; let y=t.clientY-r.top-60;
    const d=Math.min(40,Math.hypot(x,y)); const a=Math.atan2(y,x);
    joy.x=Math.cos(a)*d/40; joy.y=Math.sin(a)*d/40;
    stick.style.left=40+joy.x*40+"px"; stick.style.top=40+joy.y*40+"px";
});

let look=false,last={x:0,y:0};
window.addEventListener("touchstart",e=>{for(const t of e.touches) if(t.clientX>window.innerWidth/2){look=true;last={x:t.clientX,y:t.clientY};}});
window.addEventListener("touchmove",e=>{if(!look) return; for(const t of e.touches) if(t.clientX>window.innerWidth/2){player.yaw-=(t.clientX-last.x)*0.004; player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch-(t.clientY-last.y)*0.004)); last={x:t.clientX,y:t.clientY};}});
window.addEventListener("touchend",()=>look=false);

/* ===== RAYCAST ===== */
const raycaster=new THREE.Raycaster();
function getTargetBlock(){
    raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
    const intersects=raycaster.intersectObjects(blocks.map(b=>b.mesh));
    if(intersects.length>0){
        const blockPos=intersects[0].object.position.clone().subScalar(0.5);
        const normal=intersects[0].face.normal;
        return {blockPos,normal};
    }
    return null;
}

/* ===== PROJECTILES ===== */
const projectiles=[];
function shoot(){
    const geometry=new THREE.SphereGeometry(0.1,8,8);
    const material=new THREE.MeshBasicMaterial({color:0xff0000});
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.copy(camera.position);
    const dir=new THREE.Vector3(Math.sin(player.yaw),Math.sin(player.pitch),-Math.cos(player.yaw)).normalize();
    projectiles.push({mesh,dir,speed:20});
    scene.add(mesh);
}

/* ===== ANIMAL SYSTEM ===== */
const animals=[];
function spawnAnimal(x,y,z){
    const geo=new THREE.BoxGeometry(0.8,0.8,0.8);
    const mat=new THREE.MeshLambertMaterial({map:textures.cow});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.set(x+0.5,y+0.4,z+0.5);
    scene.add(mesh);
    animals.push({mesh,vel:new THREE.Vector3(),hp:10});
}

/* ===== ACTION BUTTONS ===== */
jumpBtn.addEventListener("touchstart",()=>{if(player.onGround) {player.vel.y=6;player.onGround=false;}},{passive:false});
mineBtn.addEventListener("touchstart",()=>{
    const target=getTargetBlock();
    if(target){
        const b=target.blockPos;
        removeBlock(Math.floor(b.x),Math.floor(b.y),Math.floor(b.z));
    }
},{passive:false});
buildBtn.addEventListener("touchstart",()=>{
    if(inventory[selected]<=0) return;
    const target=getTargetBlock();
    if(target){
        const b=target.blockPos;
        const n=target.normal;
        const px=Math.floor(b.x+n.x);
        const py=Math.floor(b.y+n.y);
        const pz=Math.floor(b.z+n.z);
        if(!collide(new THREE.Vector3(px+0.5,py+0.5,pz+0.5))){
            addBlock(px,py,pz,selected);
            inventory[selected]--;
            updateHotbarUI();
        }
    }
},{passive:false});
shootBtn.addEventListener("touchstart",shoot);

/* ===== ANIMATE LOOP ===== */
const clock=new THREE.Clock();
loadChunks();

// Set player above Boden
let maxY=0;
for(const b of blocks){ if(b.x===0 && b.z===0 && b.y>maxY) maxY=b.y; }
player.pos.set(0.5,maxY+player.height,0.5);

// Spawn ein paar Tiere
for(let i=0;i<5;i++){
    spawnAnimal(Math.floor(Math.random()*20-10),0,Math.floor(Math.random()*20-10));
}

function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    loadChunks();

    // Bewegung
    const dir=new THREE.Vector3();
    dir.x=(player.move.left?-1:0)+(player.move.right?1:0)+joy.x||0;
    dir.z=(player.move.forward?-1:0)+(player.move.back?1:0)-joy.y||0;
    if(dir.length()>0) dir.normalize();

    let newPos=player.pos.clone();
    newPos.x+=Math.sin(player.yaw)*dir.z*player.speed*dt+Math.cos(player.yaw)*dir.x*player.speed*dt;
    newPos.z+=-Math.cos(player.yaw)*dir.z*player.speed*dt+Math.sin(player.yaw)*dir.x*player.speed*dt;
    if(!collide(new THREE.Vector3(newPos.x,player.pos.y,newPos.z))){
        player.pos.x=newPos.x; player.pos.z=newPos.z;
    }

    // Y-Bewegung / Schwerkraft
    if(player.move.jump && player.onGround){player.vel.y=6;player.onGround=false;}
    player.vel.y-=9.8*dt;
    newPos.y=player.pos.y+player.vel.y*dt;
    let feet=new THREE.Vector3(player.pos.x,newPos.y,player.pos.z);
    if(collide(feet) || newPos.y<0){
        player.vel.y=0;
        player.onGround=true;
    } else {
        player.pos.y=newPos.y;
        player.onGround=false;
    }

    // Kamera
    camera.position.copy(player.pos).add(new THREE.Vector3(0,player.height,0));
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(Math.sin(player.yaw)*10,Math.sin(player.pitch)*10,-Math.cos(player.yaw)*10)));

    // Tiere bewegen
    for(const a of animals){
        const moveDir=new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5);
        moveDir.normalize().multiplyScalar(1*dt);
        a.mesh.position.add(moveDir);
    }

    // Projectiles bewegen & check collision
    for(let i=projectiles.length-1;i>=0;i--){
        const p=projectiles[i];
        p.mesh.position.add(p.dir.clone().multiplyScalar(p.speed*dt));

        // Prüfen Tiere
        for(const a of animals){
            if(p.mesh.position.distanceTo(a.mesh.position)<0.5){
                a.hp-=5;
                scene.remove(p.mesh);
                projectiles.splice(i,1);
                if(a.hp<=0){scene.remove(a.mesh);animals.splice(animals.indexOf(a),1);}
                break;
            }
        }
    }

    updateHotbarUI();
    healthUI.textContent=`❤️ ${player.hp|0}`;
    hungerUI.textContent=`🍖 ${player.hunger|0}%`;
    coinsUI.textContent=`🪙 ${player.coins}`;

    renderer.render(scene,camera);
}

animate();
} // initGame
