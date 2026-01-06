import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ================= DOM ================= */
const $ = id=>document.getElementById(id);

/* ================= LOGIN ================= */
$("startBtn").onclick=()=>{
    if(!$("nameInput").value.trim()) return;
    $("login").style.display="none";
    initGame();
};

function initGame(){

/* ================= RENDERER ================= */
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.domElement.style.position="fixed";
renderer.domElement.style.inset="0";
document.body.appendChild(renderer.domElement);

/* ================= SCENE / CAMERA ================= */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
window.addEventListener("resize",()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
});

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun=new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ================= TEXTURES ================= */
const loader=new THREE.TextureLoader();
const tex=n=>{const t=loader.load(n); t.magFilter=t.minFilter=THREE.NearestFilter; return t;};
const textures={
    grass:tex("grass.png"),
    dirt:tex("dirt.png"),
    stone:tex("stone.png"),
    sand:tex("sand.png"),
    water:tex("water.png"),
    wood:tex("wood.png"),
    leaves:tex("leaves.png")
};

/* ================= PLAYER ================= */
const player={
    pos:new THREE.Vector3(0,15,0),
    vel:new THREE.Vector3(),
    yaw:0,pitch:0,
    width:0.6,height:1.8,
    onGround:false,
    hp:100,hunger:100,coins:0
};

/* ================= INVENTORY ================= */
let inventory={grass:0,dirt:0,stone:0,sand:0,wood:0,leaves:0,meat:0};
let selected="dirt";

/* ================= HOTBAR ================= */
function updateHotbar(){
    const h=$("hotbar"); h.innerHTML="";
    for(const k in inventory){
        const d=document.createElement("div");
        d.className="slot"+(k===selected?" active":"");
        d.textContent=`${k} ${inventory[k]}`;
        d.onclick=()=>{ selected=k; updateHotbar(); };
        h.appendChild(d);
    }
}
updateHotbar();

/* ================= WORLD ================= */
const geo=new THREE.BoxGeometry(1,1,1);
const blocks=[];
const world=new Map();

function addBlock(x,y,z,type){
    const k=`${x},${y},${z}`;
    if(world.has(k)) return;
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:textures[type]}));
    m.position.set(x+0.5,y+0.5,z+0.5);
    scene.add(m);
    blocks.push({x,y,z,mesh:m,type});
    world.set(k,type);
}
function removeBlock(x,y,z){
    const k=`${x},${y},${z}`;
    if(!world.has(k)) return;
    const block=blocks.find(b=>b.x===x && b.y===y && b.z===z);
    if(block){
        scene.remove(block.mesh);
        blocks.splice(blocks.indexOf(block),1);
        inventory[block.type]=(inventory[block.type]||0)+1;
        updateHotbar();
    }
    world.delete(k);
}

/* ================= TERRAIN ================= */
function gen(cx,cz){
    for(let x=cx-16;x<cx+16;x++)
    for(let z=cz-16;z<cz+16;z++){
        const h=Math.floor(4+Math.sin(x*0.2)*2+Math.cos(z*0.2)*2);
        for(let y=0;y<=h;y++){
            const k=`${x},${y},${z}`;
            if(world.has(k)) continue;
            if(y===h) addBlock(x,y,z,h<=2?"sand":"grass");
            else if(y<h-2) addBlock(x,y,z,"stone");
            else addBlock(x,y,z,"dirt");
        }
    }
}

/* ================= COLLISION ================= */
function collides(p){
    for(const b of blocks){
        if(p.x+player.width/2 > b.x && p.x-player.width/2 < b.x+1 &&
           p.z+player.width/2 > b.z && p.z-player.width/2 < b.z+1 &&
           p.y < b.y+1 && p.y+player.height > b.y) return true;
    }
    return false;
}

/* ================= RAYCAST ================= */
const ray=new THREE.Raycaster();
function getTarget(add){
    const dir=new THREE.Vector3();
    camera.getWorldDirection(dir);
    ray.set(camera.position,dir);
    const hit=ray.intersectObjects(blocks.map(b=>b.mesh))[0];
    if(!hit) return null;
    const p=hit.object.position;
    const n=hit.face.normal;
    return add?{x:p.x-0.5+n.x,y:p.y-0.5+n.y,z:p.z-0.5}:{x:p.x-0.5,y:p.y-0.5,z:p.z-0.5};
}

/* ================= BUTTONS ================= */
$("mine").onclick=()=>{ const t=getTarget(false); if(t) removeBlock(Math.floor(t.x),Math.floor(t.y),Math.floor(t.z)); };
$("build").onclick=()=>{ 
    if(inventory[selected]<=0) return;
    const t=getTarget(true);
    if(t){ inventory[selected]--; addBlock(Math.floor(t.x),Math.floor(t.y),Math.floor(t.z),selected); updateHotbar(); }
};
$("jump").onclick=()=>{ if(player.onGround) player.vel.y=6; };

/* ================= SHOOT ================= */
const bullets=[];
$("shoot").onclick=()=>{
    const b=new THREE.Mesh(new THREE.SphereGeometry(0.1),new THREE.MeshBasicMaterial({color:0xff0000}));
    b.position.copy(camera.position);
    b.dir=new THREE.Vector3();
    camera.getWorldDirection(b.dir);
    bullets.push(b);
    scene.add(b);
};

/* ================= JOYSTICK ================= */
let jx=0,jy=0,active=false,sx=0,sy=0;
$("joyBase").addEventListener("touchstart",e=>{ active=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; });
$("joyBase").addEventListener("touchmove",e=>{
    if(!active) return;
    jx=(e.touches[0].clientX-sx)/40;
    jy=(sy-e.touches[0].clientY)/40;
    jx=Math.max(-1,Math.min(1,jx));
    jy=Math.max(-1,Math.min(1,jy));
    $("joyStick").style.transform=`translate(${jx*30}px,${-jy*30}px)`;
});
$("joyBase").addEventListener("touchend",()=>{ jx=0; jy=0; active=false; $("joyStick").style.transform="translate(0,0)"; });

/* ================= MOUSE LOOK ================= */
let drag=false,lx=0,ly=0;
renderer.domElement.addEventListener("pointerdown",e=>{ drag=true; lx=e.clientX; ly=e.clientY; });
window.addEventListener("pointerup",()=>drag=false);
window.addEventListener("pointermove",e=>{
    if(!drag) return;
    player.yaw-=(e.clientX-lx)*0.002;
    player.pitch-=(e.clientY-ly)*0.002;
    player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
    lx=e.clientX; ly=e.clientY;
});

/* ================= TIERE ================= */
const animals=[];
const aGeo=new THREE.BoxGeometry(0.8,0.8,1);
const aMat=new THREE.MeshLambertMaterial({color:0xffffff});
function spawnAnimal(){
    const x=Math.random()*40-20;
    const z=Math.random()*40-20;
    const m=new THREE.Mesh(aGeo,aMat.clone());
    m.position.set(x,5,z);
    scene.add(m);
    animals.push({mesh:m,hp:10,dir:new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5).normalize(),t:2});
}
for(let i=0;i<6;i++) spawnAnimal();

function updateAnimals(dt){
    for(const a of animals){
        a.t-=dt;
        if(a.t<=0){ a.dir.set(Math.random()-0.5,0,Math.random()-0.5).normalize(); a.t=2+Math.random()*2; }
        const next=a.mesh.position.clone().add(a.dir.clone().multiplyScalar(1.5*dt));
        a.mesh.position.copy(next);
    }
}

/* ================= INVENTAR / EATING ================= */
$("eatMeat").onclick=()=>{ if(inventory.meat>=1){ inventory.meat--; player.hunger=Math.min(100,player.hunger+20); updateHotbar(); } };

/* ================= SAVE / LOAD ================= */
const SAVE_KEY="mini_mc_save";
function saveGame(){
    const data={
        player:{x:player.pos.x,y:player.pos.y,z:player.pos.z,hp:player.hp,hunger:player.hunger,coins:player.coins},
        inventory:inventory,
        world:Array.from(world.keys())
    };
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
}
function loadGame(){
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    try{
        const data=JSON.parse(raw);
        player.pos.set(data.player.x,Math.max(5,data.player.y),data.player.z);
        player.hp=data.player.hp;
        player.hunger=data.player.hunger;
        player.coins=data.player.coins;
        inventory=data.inventory||inventory;
        blocks.forEach(b=>scene.remove(b.mesh));
        blocks.length=0;
        world.clear();
        data.world.forEach(k=>{
            const [x,y,z]=k.split(",").map(Number);
            addBlock(x,y,z,"stone");
        });
        updateHotbar();
    }catch(e){console.warn("Savegame defekt",e);}
}
setInterval(saveGame,5000);
setTimeout(loadGame,500);

/* ================= MULTIPLAYER ================= */
const channel=new BroadcastChannel("mini_mc_multiplayer");
const otherPlayers={};
const playerId=Math.random().toString(36).substring(2,10);

setInterval(()=>{
    channel.postMessage({id:playerId,pos:{x:player.pos.x,y:player.pos.y,z:player.pos.z},yaw:player.yaw,pitch:player.pitch,hp:player.hp});
},50);

channel.onmessage=e=>{
    const data=e.data;
    if(data.id===playerId) return;
    if(data.disconnect && otherPlayers[data.id]){ scene.remove(otherPlayers[data.id].mesh); delete otherPlayers[data.id]; return; }
    if(!otherPlayers[data.id]){
        const m=new THREE.Mesh(new THREE.BoxGeometry(0.6,1.8,0.6),new THREE.MeshLambertMaterial({color:Math.random()*0xffffff}));
        scene.add(m);
        otherPlayers[data.id]={mesh:m,hp:data.hp};
    }
    const p=otherPlayers[data.id];
    p.mesh.position.set(data.pos.x,data.pos.y+0.9,data.pos.z);
    p.mesh.rotation.y=data.yaw;
};

/* ================= ANIMATE LOOP ================= */
const clock=new THREE.Clock();
let hungerTimer=0;

function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    // Bewegung
    const sin=Math.sin(player.yaw), cos=Math.cos(player.yaw);
    const dx=sin*jy + cos*jx;
    const dz=cos*jy - sin*jx;
    player.pos.x+=dx*6*dt; if(collides(player.pos)) player.pos.x-=dx*6*dt;
    player.pos.z+=dz*6*dt; if(collides(player.pos)) player.pos.z-=dz*6*dt;

    // Gravitation
    player.vel.y-=9.8*dt;
    player.pos.y+=player.vel.y*dt;
    if(collides(player.pos)){ player.vel.y=0; player.pos.y=Math.ceil(player.pos.y); player.onGround=true; } else player.onGround=false;

    // Chunks generieren
    gen(Math.floor(player.pos.x/16)*16,Math.floor(player.pos.z/16)*16);

    // Kamera
    camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
    camera.lookAt(camera.position.x+Math.sin(player.yaw),camera.position.y+Math.sin(player.pitch),camera.position.z+Math.cos(player.yaw));

    // Tiere bewegen
    updateAnimals(dt);

    // Bullets
    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];
        b.position.add(b.dir.clone().multiplyScalar(20*dt));
        // Tiere treffen
        for(let j=animals.length-1;j>=0;j--){
            const a=animals[j];
            if(b.position.distanceTo(a.mesh.position)<0.6){
                a.hp-=5;
                scene.remove(b);
                bullets.splice(i,1);
                if(a.hp<=0){
                    scene.remove(a.mesh);
                    animals.splice(j,1);
                    inventory.meat=(inventory.meat||0)+1;
                    player.coins+=2;
                    spawnAnimal(); // respawn
                    updateHotbar();
                }
                break;
            }
        }
        // Andere Spieler treffen
        for(const id in otherPlayers){
            const op=otherPlayers[id];
            if(b.position.distanceTo(op.mesh.position)<0.6){
                op.hp-=5;
                scene.remove(b);
                bullets.splice(i,1);
                if(op.hp<=0){
                    op.mesh.position.set(0,10,0); // respawn
                    op.hp=100;
                }
                break;
            }
        }
    }

    // Hunger
    hungerTimer+=dt;
    if(hungerTimer>3){ hungerTimer=0; player.hunger--; if(player.hunger<0){player.hunger=0; player.hp--; } }

    // UI
    $("health").textContent="❤️ "+player.hp;
    $("hunger").textContent="🍖 "+player.hunger+"%";
    $("coins").textContent="🪙 "+player.coins;

    // Tod
    if(player.hp<=0){ alert("Du bist gestorben!"); location.reload(); }

    renderer.render(scene,camera);
}
animate();

window.addEventListener("beforeunload",()=>{channel.postMessage({id:playerId,disconnect:true});});
