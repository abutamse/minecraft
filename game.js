import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

document.addEventListener("DOMContentLoaded", () => {

const $ = id => document.getElementById(id);

/* ===== LOGIN ===== */
$("startBtn").onclick = () => {
    const name = $("nameInput").value.trim();
    if(!name){ alert("Name eingeben!"); return; }
    $("login").style.display = "none";
    initGame(name);
};

function initGame(playerName){

/* ===== SCENE / RENDERER ===== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.domElement.style.position="fixed";
renderer.domElement.style.inset="0";
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

/* ===== LIGHT ===== */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ===== PLAYER ===== */
const player = {
    pos:new THREE.Vector3(0,15,0),
    vel:new THREE.Vector3(),
    yaw:0,
    pitch:0,
    width:0.6,
    height:1.8,
    onGround:false,
    hp:100,
    hunger:100,
    coins:0,
    name:playerName
};

/* ===== UI ===== */
const healthUI=$("health");
const hungerUI=$("hunger");
const coinsUI=$("coins");
const hotbar=$("hotbar");

/* ===== INPUT ===== */
const keys={w:0,a:0,s:0,d:0,jump:0};

addEventListener("keydown",e=>{
    if(e.key==="w")keys.w=1;
    if(e.key==="a")keys.a=1;
    if(e.key==="s")keys.s=1;
    if(e.key==="d")keys.d=1;
    if(e.key===" ")keys.jump=1;
});
addEventListener("keyup",e=>{
    if(e.key==="w")keys.w=0;
    if(e.key==="a")keys.a=0;
    if(e.key==="s")keys.s=0;
    if(e.key==="d")keys.d=0;
    if(e.key===" ")keys.jump=0;
});

/* ===== TOUCH CAMERA ===== */
let lookActive=false,lastX=0,lastY=0;
renderer.domElement.addEventListener("touchstart",e=>{
    lookActive=true;
    lastX=e.touches[0].clientX;
    lastY=e.touches[0].clientY;
});
renderer.domElement.addEventListener("touchmove",e=>{
    if(!lookActive)return;
    const dx=e.touches[0].clientX-lastX;
    const dy=e.touches[0].clientY-lastY;
    lastX=e.touches[0].clientX;
    lastY=e.touches[0].clientY;
    player.yaw-=dx*0.003;
    player.pitch-=dy*0.003;
    player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
});
renderer.domElement.addEventListener("touchend",()=>lookActive=false);

/* ===== JOYSTICK ===== */
const joystick=$("joystick");
const stick=$("stick");
let joyActive=false;

joystick.addEventListener("touchstart",e=>{joyActive=true;e.preventDefault();});
joystick.addEventListener("touchend",e=>{
    joyActive=false;
    keys.w=keys.a=keys.s=keys.d=0;
    stick.style.left="40px";stick.style.top="40px";
});
joystick.addEventListener("touchmove",e=>{
    if(!joyActive)return;
    const t=e.touches[0];
    const r=joystick.getBoundingClientRect();
    let x=t.clientX-r.left-60;
    let y=t.clientY-r.top-60;
    const d=Math.hypot(x,y);
    if(d>50){x=x/d*50;y=y/d*50;}
    stick.style.left=(40+x)+"px";
    stick.style.top=(40+y)+"px";
    keys.w=y<-15; keys.s=y>15;
    keys.a=x<-15; keys.d=x>15;
},{passive:false});
/* ===== TEXTUREN ===== */
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
    water:tex("water.png"),
    wood:tex("wood.png"),
    leaves:tex("leaves.png")
};

/* ===== WORLD ===== */
const blocks=[];
const world={};
const geo=new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type){
    const k=`${x},${y},${z}`;
    if(world[k])return;
    const mat=new THREE.MeshLambertMaterial({
        map:textures[type],
        transparent:type==="water",
        opacity:type==="water"?0.6:1
    });
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x+.5,y+.5,z+.5);
    scene.add(m);
    blocks.push({x,y,z,mesh:m,type});
    world[k]=type;
}

function removeBlock(x,y,z){
    const i=blocks.findIndex(b=>b.x===x&&b.y===y&&b.z===z);
    if(i===-1)return;
    scene.remove(blocks[i].mesh);
    blocks.splice(i,1);
    delete world[`${x},${y},${z}`];
}

/* ===== TERRAIN MIT SAND + WASSER ===== */
const WATER_LEVEL=3;

for(let x=-30;x<=30;x++){
for(let z=-30;z<=30;z++){
    const h=Math.floor(
        4+Math.sin(x*0.15)*3+Math.cos(z*0.15)*3
    );
    for(let y=0;y<=h;y++){
        let type="stone";
        if(y===h){
            type = h<=WATER_LEVEL ? "sand" : "grass";
        }else if(y>=h-2){
            type = h<=WATER_LEVEL ? "sand" : "dirt";
        }
        addBlock(x,y,z,type);
    }
    for(let y=h+1;y<=WATER_LEVEL;y++){
        addBlock(x,y,z,"water");
    }
}}

/* ===== COLLISION ===== */
function collides(p){
    for(const b of blocks){
        if(b.type==="water")continue;
        if(
            p.x+player.width/2>b.x &&
            p.x-player.width/2<b.x+1 &&
            p.z+player.width/2>b.z &&
            p.z-player.width/2<b.z+1 &&
            p.y<b.y+1 &&
            p.y+player.height>b.y
        )return true;
    }
    return false;
}

/* ===== RAYCAST ===== */
const ray=new THREE.Raycaster();
function target(add){
    ray.setFromCamera({x:0,y:0},camera);
    const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
    if(!hit)return null;
    const p=hit.object.position;
    const n=hit.face.normal;
    return add
        ?{x:p.x-.5+n.x,y:p.y-.5+n.y,z:p.z-.5+n.z}
        :{x:p.x-.5,y:p.y-.5,z:p.z-.5};
}

/* ===== INVENTAR ===== */
let inventory={
    grass:20,
    dirt:20,
    stone:10,
    sand:10,
    wood:5,
    meat:0
};
let selected="grass";

function updateHotbar(){
    hotbar.innerHTML="";
    for(const k in inventory){
        const d=document.createElement("div");
        d.className="slot"+(k===selected?" active":"");
        d.textContent=k+"\n"+inventory[k];
        d.onclick=()=>{selected=k;updateHotbar();};
        hotbar.appendChild(d);
    }
}
updateHotbar();

/* ===== BUTTONS ===== */
$("jump").onclick=()=>{
    if(player.onGround){
        player.vel.y=6;
        player.onGround=false;
    }
};
$("mine").onclick=()=>{
    const t=target(false);
    if(t)removeBlock(t.x|0,t.y|0,t.z|0);
};
$("build").onclick=()=>{
    const t=target(true);
    if(t&&inventory[selected]>0){
        addBlock(t.x|0,t.y|0,t.z|0,selected);
        inventory[selected]--;
        updateHotbar();
    }
};

/* ===== TIERE ===== */
const animals=[];
function spawnAnimal(x,z){
    const m=new THREE.Mesh(
        new THREE.BoxGeometry(.9,.9,1.2),
        new THREE.MeshLambertMaterial({color:0xffffff})
    );
    m.position.set(x+.5,6,z+.5);
    scene.add(m);
    animals.push({
        mesh:m,
        hp:10,
        dir:new THREE.Vector3(Math.random()-.5,0,Math.random()-.5).normalize(),
        t:2+Math.random()*3
    });
}
for(let i=0;i<6;i++)spawnAnimal(Math.random()*20-10,Math.random()*20-10);

/* ===== BULLETS ===== */
const bullets=[];
$("shoot").onclick=()=>{
    const b=new THREE.Mesh(
        new THREE.SphereGeometry(.1),
        new THREE.MeshBasicMaterial({color:0xff0000})
    );
    b.position.copy(camera.position);
    b.dir=new THREE.Vector3(
        Math.sin(player.yaw),
        Math.sin(player.pitch),
        -Math.cos(player.yaw)
    ).normalize();
    bullets.push(b);
    scene.add(b);
};
/* ===== ANIMAL UPDATE ===== */
function updateAnimals(dt){
    for(const a of animals){
        a.t-=dt;
        if(a.t<=0){
            a.dir.set(Math.random()-.5,0,Math.random()-.5).normalize();
            a.t=2+Math.random()*3;
        }
        const next=a.mesh.position.clone().add(a.dir.clone().multiplyScalar(1.2*dt));
        a.mesh.position.copy(next);
    }
}

/* ===== BULLET UPDATE ===== */
function updateBullets(dt){
    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];
        b.position.add(b.dir.clone().multiplyScalar(20*dt));
        for(let j=animals.length-1;j>=0;j--){
            const a=animals[j];
            if(b.position.distanceTo(a.mesh.position)<0.6){
                a.hp-=5;
                scene.remove(b);
                bullets.splice(i,1);
                if(a.hp<=0){
                    scene.remove(a.mesh);
                    animals.splice(j,1);
                    inventory.meat++;
                    player.coins+=2;
                    updateHotbar();
                }
                break;
            }
        }
    }
}

/* ===== MULTIPLAYER ===== */
const channel=new BroadcastChannel("mini_mc_multiplayer");
const playerId=Math.random().toString(36).slice(2);
const others={};

setInterval(()=>{
    channel.postMessage({
        id:playerId,
        pos:{x:player.pos.x,y:player.pos.y,z:player.pos.z},
        yaw:player.yaw
    });
},50);

channel.onmessage=e=>{
    const d=e.data;
    if(d.id===playerId)return;
    if(!others[d.id]){
        const m=new THREE.Mesh(
            new THREE.BoxGeometry(.6,1.8,.6),
            new THREE.MeshLambertMaterial({color:Math.random()*0xffffff})
        );
        scene.add(m);
        others[d.id]={mesh:m};
    }
    others[d.id].mesh.position.set(d.pos.x,d.pos.y+.9,d.pos.z);
};

/* ===== SAVE ===== */
const SAVE_KEY="mini_mc_save";
function saveGame(){
    localStorage.setItem(SAVE_KEY,JSON.stringify({
        pos:player.pos,
        hp:player.hp,
        hunger:player.hunger,
        inv:inventory
    }));
}
function loadGame(){
    const d=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");
    if(!d)return;
    player.pos.set(d.pos.x,d.pos.y,d.pos.z);
    player.hp=d.hp;
    player.hunger=d.hunger;
    inventory=d.inv;
    updateHotbar();
}
setTimeout(loadGame,500);
setInterval(saveGame,5000);

/* ===== ANIMATE LOOP ===== */
const clock=new THREE.Clock();
let hungerTimer=0;

function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    /* Bewegung */
    let mx=keys.d-keys.a;
    let mz=keys.s-keys.w;
    const len=Math.hypot(mx,mz);
    if(len){mx/=len;mz/=len;}

    const dx=Math.sin(player.yaw)*mz+Math.cos(player.yaw)*mx;
    const dz=-Math.cos(player.yaw)*mz+Math.sin(player.yaw)*mx;

    player.pos.x+=dx*6*dt;
    if(collides(player.pos))player.pos.x-=dx*6*dt;
    player.pos.z+=dz*6*dt;
    if(collides(player.pos))player.pos.z-=dz*6*dt;

    /* Gravitation */
    player.vel.y-=9.8*dt;
    player.pos.y+=player.vel.y*dt;
    if(collides(player.pos)){
        player.vel.y=0;
        player.onGround=true;
        player.pos.y=Math.ceil(player.pos.y);
    }else player.onGround=false;

    /* Kamera */
    camera.position.set(
        player.pos.x,
        player.pos.y+1.6,
        player.pos.z
    );
    camera.lookAt(
        camera.position.x+Math.sin(player.yaw),
        camera.position.y+Math.sin(player.pitch),
        camera.position.z-Math.cos(player.yaw)
    );

    /* Updates */
    updateAnimals(dt);
    updateBullets(dt);

    /* Hunger */
    hungerTimer+=dt;
    if(hungerTimer>3){
        hungerTimer=0;
        player.hunger--;
        if(player.hunger<0){
            player.hunger=0;
            player.hp-=2;
        }
    }
    if(player.hp<=0){
        alert("Du bist gestorben!");
        location.reload();
    }

    /* UI */
    healthUI.textContent="❤️ "+player.hp;
    hungerUI.textContent="🍖 "+player.hunger+"%";
    coinsUI.textContent="🪙 "+player.coins;

    renderer.render(scene,camera);
}
animate();

} // END initGame
}); // END DOMContentLoaded
