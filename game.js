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

startBtn.addEventListener("click",()=>{
    const name=nameInput.value.trim();
    if(!name) return alert("Bitte Name eingeben!");
    playerName=name;
    login.style.display="none";
    init();
});
const key=k=>`${playerName}_${k}`;

/* ================= GAME ================= */
function init(){

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

/* ===== FADENKREUZ & TARGET BLOCK ===== */
const cross=document.createElement("div");
cross.style="position:fixed;top:50%;left:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:20";
document.body.appendChild(cross);

const targetBox=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01,1.01,1.01)),
    new THREE.LineBasicMaterial({color:0xffff00})
);
scene.add(targetBox);
targetBox.visible=false;

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
        const type=blocks[i].type;
        scene.remove(blocks[i].mesh);
        blocks.splice(i,1);
        delete world[k];
        inventory[type]=(inventory[type]||0)+1;
        updateHotbarUI();
    }
}

/* ===== TERRAIN & CHUNKS ===== */
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
            for(let dz=-1;dz<=1;dz++)
                addBlock(x+dx,height+h,z+dz,"leaves");
        }
        if(height<4){
            for(let y=height+1;y<=3;y++) addBlock(x,y,z,"water");
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

/* ===== INVENTAR / HOTBAR ===== */
let inventory={grass:5,dirt:5,stone:5,sand:5,wood:5};
let selected="grass";
let food=0;
let weapons={"knife":true};
let currentWeapon="knife";

function updateHotbarUI(){
    hotbar.innerHTML="";
    Object.keys(inventory).forEach(k=>{
        const d=document.createElement("div");
        d.className="slot"+(k===selected?" active":"");
        d.textContent=`${k}\n${inventory[k]}`;
        d.onclick=()=>{selected=k;updateHotbarUI();}
        hotbar.appendChild(d);
    });
    const f=document.createElement("div");
    f.className="slot";
    f.textContent=`🍖 ${food}`;
    hotbar.appendChild(f);
}

/* ===== CONTROLS KEYBOARD ===== */
window.addEventListener("keydown",e=>{
    if(e.key==="w") player.move.forward=true;
    if(e.key==="s") player.move.back=true;
    if(e.key==="a") player.move.left=true;
    if(e.key==="d") player.move.right=true;
    if(e.key===" ") player.move.jump=true;
});
window.addEventListener("keyup",e=>{
    if(e.key==="w") player.move.forward=false;
    if(e.key==="s") player.move.back=false;
    if(e.key==="a") player.move.left=false;
    if(e.key==="d") player.move.right=false;
    if(e.key===" ") player.move.jump=false;
});

/* ===== TOUCH: JOYSTICK + LOOK SIMULTAN ===== */
let look=false,last={x:0,y:0};
let active=false,joy={x:0,y:0};

function getTouch(e,touchType){
    const touches=e.touches;
    for(let i=0;i<touches.length;i++){
        if(touches[i].clientX<window.innerWidth/2 && touchType==="joystick") return touches[i];
        if(touches[i].clientX>window.innerWidth/2 && touchType==="look") return touches[i];
    }
    return null;
}

joystick.addEventListener("touchstart",()=>active=true);
joystick.addEventListener("touchend",()=>{
    active=false;
    joy={x:0,y:0};
    stick.style.left="40px";
    stick.style.top="40px";
});
joystick.addEventListener("touchmove",e=>{
    if(!active)return;
    const t=getTouch(e,"joystick");
    if(!t) return;
    const r=joystick.getBoundingClientRect();
    let x=t.clientX-r.left-60;
    let y=t.clientY-r.top-60;
    const d=Math.min(40,Math.hypot(x,y));
    const a=Math.atan2(y,x);
    joy.x=Math.cos(a)*d/40;
    joy.y=Math.sin(a)*d/40;
    stick.style.left=40+joy.x*40+"px";
    stick.style.top=40+joy.y*40+"px";
});

window.addEventListener("touchstart",e=>{
    const t=getTouch(e,"look");
    if(t){look=true;last={x:t.clientX,y:t.clientY};}
});
window.addEventListener("touchmove",e=>{
    const t=getTouch(e,"look");
    if(!t) return;
    if(look){
        player.yaw-=(t.clientX-last.x)*0.004;
        player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch-(t.clientY-last.y)*0.004));
        last={x:t.clientX,y:t.clientY};
    }
});
window.addEventListener("touchend",()=>look=false);

/* ===== ACTIONS BUTTONS ===== */
jumpBtn.onclick=()=>{if(player.onGround){player.vel.y=6;player.onGround=false;}};
mineBtn.onclick=()=>{
    const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
    const p=player.pos.clone().add(dir);
    removeBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z));
};
buildBtn.onclick=()=>{
    if(inventory[selected]<=0) return;
    const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
    const p=player.pos.clone().add(dir);
    addBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z),selected);
    inventory[selected]--;updateHotbarUI();
};

/* ===== PROJECTILES ===== */
const projectiles=[];
shootBtn.onclick=()=>{
    const dir=new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw));
    const m=new THREE.Mesh(new THREE.SphereGeometry(.1),new THREE.MeshBasicMaterial({color:0xffff00}));
    m.position.copy(player.pos.clone().add(new THREE.Vector3(0,1.6,0)));
    scene.add(m);
    projectiles.push({mesh:m,vel:dir.multiplyScalar(15),dmg:5});
};

/* ===== MOBS ===== */
const mobs=[];
const mobTypes={cow:{hp:20,color:0xffffff,drop:1},pig:{hp:15,color:0xff9999,drop:1},zombie:{hp:30,color:0x00ff00,drop:2}};
let mobTimer=0;
function spawnMob(){
    const types=Object.keys(mobTypes);
    const type=types[Math.floor(Math.random()*types.length)];
    const g=new THREE.BoxGeometry(.8,.8,.8);
    const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:mobTypes[type].color}));
    m.position.set(player.pos.x+Math.random()*20-10,3,player.pos.z+Math.random()*20-10);
    scene.add(m);
    mobs.push({mesh:m,type,hp:mobTypes[type].hp});
}

/* ===== ANIMATE LOOP ===== */
const clock=new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    loadChunks();

    // Bewegung
    const dir=new THREE.Vector3();
    dir.x=joy.x||0;
    dir.z=-joy.y||0;
    if(player.move.forward) dir.z-=1;
    if(player.move.back) dir.z+=1;
    if(player.move.left) dir.x-=1;
    if(player.move.right) dir.x+=1;
    if(dir.length()>0) dir.normalize();
    player.pos.x+=Math.sin(player.yaw)*dir.z*player.speed*dt+Math.cos(player.yaw)*dir.x*player.speed*dt;
    player.pos.z+=-Math.cos(player.yaw)*dir.z*player.speed*dt+Math.sin(player.yaw)*dir.x*player.speed*dt;

    if(player.move.jump && player.onGround){player.vel.y=6;player.onGround=false;}

    // Gravitation
    player.vel.y-=9.8*dt;
    player.pos.y+=player.vel.y*dt;
    if(player.pos.y<2){player.pos.y=2;player.vel.y=0;player.onGround=true;} else player.onGround=false;

    camera.position.copy(player.pos).add(new THREE.Vector3(0,1.6,0));
    camera.lookAt(camera.position.clone().add(new THREE.Vector3(Math.sin(player.yaw)*10,Math.sin(player.pitch)*10,-Math.cos(player.yaw)*10)));

    // Projektile
    for(let i=projectiles.length-1;i>=0;i--){
        const p=projectiles[i];
        p.mesh.position.addScaledVector(p.vel,dt);
        if(p.mesh.position.distanceTo(player.pos)>50){scene.remove(p.mesh);projectiles.splice(i,1);}
        for(let j=mobs.length-1;j>=0;j--){
            const m=mobs[j];
            if(p.mesh.position.distanceTo(m.mesh.position)<.5){
                m.hp-=p.dmg;
                scene.remove(p.mesh);
                projectiles.splice(i,1);
                if(m.hp<=0){scene.remove(m.mesh);mobs.splice(j,1);food+=mobTypes[m.type].drop;player.coins+=10;}
                break;
            }
        }
    }

    // Mobs
    mobTimer+=dt;
    if(mobTimer>5){spawnMob();mobTimer=0;}
    for(const m of mobs){
        if(m.mesh.position.distanceTo(player.pos)<6){
            const d=player.pos.clone().sub(m.mesh.position).normalize();
            m.mesh.position.addScaledVector(d,dt*2);
        }
    }

    // Blockhighlight
    const raycaster=new THREE.Raycaster(camera.position,new THREE.Vector3(Math.sin(player.yaw),0,-Math.cos(player.yaw)));
    const intersects=raycaster.intersectObjects(blocks.map(b=>b.mesh));
    if(intersects.length>0){
        targetBox.visible=true;
        targetBox.position.copy(intersects[0].object.position);
    } else targetBox.visible=false;

    updateHotbarUI();

    // UI
    healthUI.textContent=`❤️ ${player.hp|0}`;
    hungerUI.textContent=`🍖 ${player.hunger|0}%`;
    coinsUI.textContent=`🪙 ${player.coins}`;

    renderer.render(scene,camera);
}
animate();

});
