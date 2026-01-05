import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

document.addEventListener("DOMContentLoaded", () => {

const $ = id => document.getElementById(id);

/* ================= LOGIN ================= */
$("startBtn").onclick = () => {
    const name = $("nameInput").value.trim();
    if(!name){ alert("Name eingeben!"); return; }
    $("login").style.display = "none";
    initGame(name);
};

function initGame(playerName){

/* ================= SCENE ================= */
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

/* ================= FADENKREUZ ================= */
const cross = document.createElement("div");
cross.style.cssText = `
position:fixed;
left:50%;top:50%;
width:8px;height:8px;
background:yellow;
transform:translate(-50%,-50%);
z-index:20;
pointer-events:none`;
document.body.appendChild(cross);

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ================= PLAYER ================= */
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

/* ================= UI ================= */
const healthUI=$("health");
const hungerUI=$("hunger");
const coinsUI=$("coins");
const hotbar=$("hotbar");

/* ================= INPUT ================= */
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

/* ================= KAMERA LOOK (MOUSE + TOUCH) ================= */
let look=false, lx=0, ly=0;

renderer.domElement.addEventListener("mousedown",e=>{
    look=true; lx=e.clientX; ly=e.clientY;
});
addEventListener("mouseup",()=>look=false);
addEventListener("mousemove",e=>{
    if(!look) return;
    const dx=e.clientX-lx, dy=e.clientY-ly;
    lx=e.clientX; ly=e.clientY;
    player.yaw -= dx*0.002;
    player.pitch -= dy*0.002;
    player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
});

renderer.domElement.addEventListener("touchstart",e=>{
    look=true; lx=e.touches[0].clientX; ly=e.touches[0].clientY;
},{passive:false});
renderer.domElement.addEventListener("touchmove",e=>{
    if(!look) return;
    const dx=e.touches[0].clientX-lx;
    const dy=e.touches[0].clientY-ly;
    lx=e.touches[0].clientX; ly=e.touches[0].clientY;
    player.yaw -= dx*0.003;
    player.pitch -= dy*0.003;
    player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
},{passive:false});
renderer.domElement.addEventListener("touchend",()=>look=false);

/* ================= JOYSTICK ================= */
const joystick=$("joystick");
const stick=$("stick");
let joy=false;

joystick.addEventListener("touchstart",e=>{joy=true;e.preventDefault();});
joystick.addEventListener("touchend",()=>{
    joy=false; keys.w=keys.a=keys.s=keys.d=0;
    stick.style.left="40px"; stick.style.top="40px";
});
joystick.addEventListener("touchmove",e=>{
    if(!joy) return;
    const r=joystick.getBoundingClientRect();
    let x=e.touches[0].clientX-r.left-60;
    let y=e.touches[0].clientY-r.top-60;
    const d=Math.hypot(x,y);
    if(d>50){x=x/d*50;y=y/d*50;}
    stick.style.left=(40+x)+"px";
    stick.style.top=(40+y)+"px";
    keys.w=y<-15; keys.s=y>15;
    keys.a=x<-15; keys.d=x>15;
},{passive:false});

/* ================= TEXTUREN ================= */
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
    water:tex("water.png")
};

/* ================= WORLD ================= */
const blocks=[];
const world={};
const geo=new THREE.BoxGeometry(1,1,1);

function addBlock(x,y,z,type){
    const k=`${x},${y},${z}`;
    if(world[k])return;
    const m=new THREE.Mesh(
        geo,
        new THREE.MeshLambertMaterial({
            map:textures[type],
            transparent:type==="water",
            opacity:type==="water"?0.6:1
        })
    );
    m.position.set(x+.5,y+.5,z+.5);
    scene.add(m);
    blocks.push({x,y,z,mesh:m,type});
    world[k]=type;
}

/* ================= TERRAIN ================= */
const WATER=3;
for(let x=-30;x<=30;x++){
for(let z=-30;z<=30;z++){
    const h=Math.floor(4+Math.sin(x*.15)*3+Math.cos(z*.15)*3);
    for(let y=0;y<=h;y++){
        let t="stone";
        if(y===h) t=h<=WATER?"sand":"grass";
        else if(y>=h-2) t=h<=WATER?"sand":"dirt";
        addBlock(x,y,z,t);
    }
    for(let y=h+1;y<=WATER;y++) addBlock(x,y,z,"water");
}}

/* ================= COLLISION ================= */
function collides(p){
    for(const b of blocks){
        if(b.type==="water") continue;
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

/* ================= HOTBAR ================= */
let inventory={grass:20,dirt:20,stone:10,sand:10};
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

/* ================= BUTTONS ================= */
$("jump").onclick=()=>{ if(player.onGround){player.vel.y=6;} };

/* ================= ANIMATE ================= */
const clock=new THREE.Clock();
let hungerTimer=0;

function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    /* Bewegung korrekt relativ zur Kamera */
    let mx=keys.d-keys.a;
    let mz=keys.s-keys.w;
    const len=Math.hypot(mx,mz);
    if(len){mx/=len;mz/=len;}

    const dx=Math.sin(player.yaw)*mz + Math.cos(player.yaw)*mx;
    const dz=-Math.cos(player.yaw)*mz + Math.sin(player.yaw)*mx;

    player.pos.x+=dx*6*dt;
    if(collides(player.pos)) player.pos.x-=dx*6*dt;
    player.pos.z+=dz*6*dt;
    if(collides(player.pos)) player.pos.z-=dz*6*dt;

    /* Gravitation */
    player.vel.y-=9.8*dt;
    player.pos.y+=player.vel.y*dt;
    if(collides(player.pos)){
        player.vel.y=0;
        player.onGround=true;
        player.pos.y=Math.ceil(player.pos.y);
    } else player.onGround=false;

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

    /* Hunger */
    hungerTimer+=dt;
    if(hungerTimer>3){
        hungerTimer=0;
        player.hunger--;
        if(player.hunger<0){player.hunger=0;player.hp-=2;}
    }

    healthUI.textContent="❤️ "+player.hp;
    hungerUI.textContent="🍖 "+player.hunger+"%";
    coinsUI.textContent="🪙 "+player.coins;

    renderer.render(scene,camera);
}
animate();

} // initGame
}); // DOMContentLoaded
