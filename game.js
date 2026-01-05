import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

document.addEventListener("DOMContentLoaded",()=>{

const $=id=>document.getElementById(id);

/* ===== LOGIN ===== */
$("startBtn").onclick=()=>{
    const name=$("nameInput").value.trim();
    if(!name){alert("Name eingeben");return;}
    $("login").style.display="none";
    startGame(name);
};

function startGame(playerName){

/* ===== SCENE ===== */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.domElement.style.position="fixed";
renderer.domElement.style.inset="0";
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
});

/* ===== FADENKREUZ ===== */
const cross=document.createElement("div");
cross.style.cssText="position:fixed;left:50%;top:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:10;pointer-events:none";
document.body.appendChild(cross);

/* ===== LIGHT ===== */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun=new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(100,200,100);
scene.add(sun);

/* ===== PLAYER ===== */
const player={
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

/* ===== INPUT ===== */
const keys={w:0,a:0,s:0,d:0};

addEventListener("keydown",e=>{
    if(e.key==="w")keys.w=1;
    if(e.key==="a")keys.a=1;
    if(e.key==="s")keys.s=1;
    if(e.key==="d")keys.d=1;
});
addEventListener("keyup",e=>{
    if(e.key==="w")keys.w=0;
    if(e.key==="a")keys.a=0;
    if(e.key==="s")keys.s=0;
    if(e.key==="d")keys.d=0;
});

/* ===== TOUCH BUTTONS ===== */
$("jump").ontouchstart=()=>{if(player.onGround){player.vel.y=6;}};

/* ===== LOOK ===== */
let looking=false,lastX=0,lastY=0;
renderer.domElement.addEventListener("mousedown",e=>{looking=true;lastX=e.clientX;lastY=e.clientY;});
addEventListener("mouseup",()=>looking=false);
addEventListener("mousemove",e=>{
    if(!looking)return;
    player.yaw-= (e.clientX-lastX)*0.002;
    player.pitch-= (e.clientY-lastY)*0.002;
    lastX=e.clientX;lastY=e.clientY;
    player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
});

renderer.domElement.addEventListener("touchstart",e=>{
    looking=true;
    lastX=e.touches[0].clientX;
    lastY=e.touches[0].clientY;
},{passive:false});
renderer.domElement.addEventListener("touchmove",e=>{
    if(!looking)return;
    const dx=e.touches[0].clientX-lastX;
    const dy=e.touches[0].clientY-lastY;
    lastX=e.touches[0].clientX;
    lastY=e.touches[0].clientY;
    player.yaw-=dx*0.003;
    player.pitch-=dy*0.003;
    player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch));
},{passive:false});
renderer.domElement.addEventListener("touchend",()=>looking=false);

/* ===== JOYSTICK ===== */
const joystick=$("joystick");
const stick=$("stick");
let joy=false;

joystick.ontouchstart=e=>{joy=true;e.preventDefault();};
joystick.ontouchend=e=>{
    joy=false;
    keys.w=keys.a=keys.s=keys.d=0;
    stick.style.left="40px";
    stick.style.top="40px";
};
joystick.ontouchmove=e=>{
    if(!joy)return;
    const r=joystick.getBoundingClientRect();
    let x=e.touches[0].clientX-r.left-60;
    let y=e.touches[0].clientY-r.top-60;
    const d=Math.hypot(x,y);
    if(d>50){x=x/d*50;y=y/d*50;}
    stick.style.left=(40+x)+"px";
    stick.style.top=(40+y)+"px";
    keys.w=y<-15;
    keys.s=y>15;
    keys.a=x<-15;
    keys.d=x>15;
};

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
    water:tex("water.png")
};

/* ===== WORLD ===== */
const blocks=[];
const geo=new THREE.BoxGeometry(1,1,1);
const WATER=3;

function addBlock(x,y,z,type){
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
    blocks.push({x,y,z,type,mesh:m});
}

/* ===== TERRAIN ===== */
for(let x=-25;x<=25;x++){
for(let z=-25;z<=25;z++){
    const h=Math.floor(4+Math.sin(x*0.15)*3+Math.cos(z*0.15)*3);
    for(let y=0;y<=h;y++){
        let t="stone";
        if(y===h)t=h<=WATER?"sand":"grass";
        else if(y>=h-2)t=h<=WATER?"sand":"dirt";
        addBlock(x,y,z,t);
    }
    for(let y=h+1;y<=WATER;y++)addBlock(x,y,z,"water");
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

/* ===== ANIMALS ===== */
const animals=[];
function spawnAnimal(x,z){
    const m=new THREE.Mesh(
        new THREE.BoxGeometry(0.9,0.9,1.2),
        new THREE.MeshLambertMaterial({color:0xffffff})
    );
    m.position.set(x+0.5,6,z+0.5);
    scene.add(m);
    animals.push({mesh:m});
}
for(let i=0;i<6;i++)spawnAnimal(Math.random()*20-10,Math.random()*20-10);

/* ===== LOOP ===== */
const clock=new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const dt=clock.getDelta();

    let forward=keys.w-keys.s;
    let side=keys.d-keys.a;

    const sin=Math.sin(player.yaw);
    const cos=Math.cos(player.yaw);

    player.pos.x+=(sin*forward + cos*side)*6*dt;
    player.pos.z+=(-cos*forward + sin*side)*6*dt;

    if(collides(player.pos)){
        player.pos.x-=(sin*forward + cos*side)*6*dt;
        player.pos.z-=(-cos*forward + sin*side)*6*dt;
    }

    player.vel.y-=9.8*dt;
    player.pos.y+=player.vel.y*dt;
    if(collides(player.pos)){
        player.vel.y=0;
        player.onGround=true;
        player.pos.y=Math.ceil(player.pos.y);
    }else player.onGround=false;

    camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
    camera.lookAt(
        camera.position.x+Math.sin(player.yaw),
        camera.position.y+Math.sin(player.pitch),
        camera.position.z-Math.cos(player.yaw)
    );

    healthUI.textContent="❤️ "+player.hp;
    hungerUI.textContent="🍖 "+player.hunger+"%";
    coinsUI.textContent="🪙 "+player.coins;

    renderer.render(scene,camera);
}
animate();

} // game
});
