// ---------------- INIT ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- LIGHT ----------------
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(50,100,50);
scene.add(sun);

// ---------------- TEXTURES ----------------
const loader = new THREE.TextureLoader();
const textures = {
  dirt: loader.load('dirt.png'),
  grass: loader.load('grass.png'),
  stone: loader.load('stone.png'),
  sand: loader.load('sand.png')
};

// ---------------- WORLD ----------------
const blocks = [];
const BLOCK = 1;

// Block hinzufügen
function addBlock(x,y,z,type){
    const geo = new THREE.BoxGeometry(BLOCK,BLOCK,BLOCK);
    const mat = new THREE.MeshStandardMaterial({ map: textures[type] });
    const mesh = new THREE.Mesh(geo,mat);
    mesh.position.set(x+0.5,y+0.5,z+0.5);
    scene.add(mesh);
    blocks.push({mesh,x,y,z,type});
}

// ---------------- PLAYER ----------------
let player = {x:0,y:5,z:0,velocity:new THREE.Vector3(),canJump:true};

// Kollision prüfen
function checkCollisions(pos){
    for(const b of blocks){
        if(pos.x+0.3>b.x && pos.x-0.3<b.x+1 &&
           pos.y < b.y+1 && pos.y+1.8 > b.y &&
           pos.z+0.3>b.z && pos.z-0.3<b.z+1){ return true; }
    }
    return false;
}

// ---------------- INVENTORY ----------------
let user = localStorage.getItem('currentUser') || 'guest';
let inventory = JSON.parse(localStorage.getItem(user+'_inventory')) || {grass:10,dirt:10,stone:10,sand:10};
let coins = parseInt(localStorage.getItem(user+'_coins')) || 0;
let selected = 'grass';

const hotbar = document.getElementById('hotbar');
function updateHotbar(){
    hotbar.innerHTML='';
    for(const k in inventory){
        const b = document.createElement('button');
        b.textContent=`${k} (${inventory[k]})`;
        if(k===selected) b.classList.add('active');
        b.onclick = ()=>{selected=k; updateHotbar();};
        hotbar.appendChild(b);
    }
}
updateHotbar();

// ---------------- CROSSHAIR ----------------
const crosshair = document.createElement('div');
crosshair.style.position='absolute';
crosshair.style.top='50%';
crosshair.style.left='50%';
crosshair.style.width='2px';
crosshair.style.height='2px';
crosshair.style.background='black';
crosshair.style.transform='translate(-50%,-50%)';
document.body.appendChild(crosshair);

// ---------------- RAYCAST ----------------
const raycaster = new THREE.Raycaster();
function getTarget(){
    raycaster.setFromCamera({x:0,y:0},camera);
    const hits = raycaster.intersectObjects(blocks.map(b=>b.mesh));
    if(hits.length) return blocks.find(b=>b.mesh===hits[0].object);
    return null;
}

// ---------------- BUILD / MINE ----------------
function build(){
    const t = getTarget();
    if(!t || inventory[selected]<=0) return;
    let x = t.x, z = t.z, y = t.y+1;
    while(blocks.find(b=>b.x===x && b.y===y && b.z===z)) y++;
    addBlock(x,y,z,selected);
    inventory[selected]--;
    saveData();
    updateHotbar();
}
function mine(){
    const t = getTarget();
    if(!t) return;
    scene.remove(t.mesh);
    blocks.splice(blocks.indexOf(t),1);
    inventory[t.type] = (inventory[t.type]||0)+1;
    coins++;
    saveData();
    updateHotbar();
}

// ---------------- ACTION BUTTONS ----------------
function createButton(text,top,right,callback){
    const btn = document.createElement('div');
    btn.innerText=text;
    btn.style.position='absolute';
    btn.style.top=top;
    btn.style.right=right;
    btn.style.padding='10px 15px';
    btn.style.background='rgba(0,0,0,0.5)';
    btn.style.color='white';
    btn.style.borderRadius='8px';
    btn.style.fontSize='14px';
    btn.style.userSelect='none';
    document.body.appendChild(btn);
    btn.addEventListener('touchstart', e=>{ e.preventDefault(); callback(); });
}
createButton('MINE','20px','20px',mine);
createButton('BUILD','70px','20px',build);
createButton('JUMP','120px','20px',()=>{
    if(player.canJump){player.velocity.y=7;player.canJump=false;}
});

// ---------------- LEFT JOYSTICK ----------------
let joystickPos={x:0,y:0},joystickActive=false;
const joystickBase = document.createElement('div');
joystickBase.style.position='absolute';
joystickBase.style.bottom='50px';
joystickBase.style.left='50px';
joystickBase.style.width='80px';
joystickBase.style.height='80px';
joystickBase.style.background='rgba(0,0,0,0.3)';
joystickBase.style.borderRadius='50%';
document.body.appendChild(joystickBase);
const joystickKnob = document.createElement('div');
joystickKnob.style.width='40px';
joystickKnob.style.height='40px';
joystickKnob.style.background='rgba(0,0,0,0.6)';
joystickKnob.style.borderRadius='50%';
joystickKnob.style.position='absolute';
joystickKnob.style.left='20px';
joystickKnob.style.top='20px';
joystickBase.appendChild(joystickKnob);

joystickKnob.addEventListener('touchstart',e=>{e.preventDefault(); joystickActive=true;});
joystickKnob.addEventListener('touchend',e=>{e.preventDefault(); joystickActive=false; joystickPos={x:0,y:0}; joystickKnob.style.left='20px'; joystickKnob.style.top='20px';});
joystickKnob.addEventListener('touchmove',e=>{
    if(!joystickActive) return;
    const touch = e.touches[0]; const rect = joystickBase.getBoundingClientRect();
    let x = touch.clientX - rect.left - rect.width/2; let y = touch.clientY - rect.top - rect.height/2;
    const max = rect.width/2-20; const len = Math.sqrt(x*x+y*y);
    if(len>max){x=x/max*max; y=y/max*max;}
    joystickPos={x:x/max, y:-y/max};
    joystickKnob.style.left=`${20+x}px`; joystickKnob.style.top=`${20+y}px`;
});
// ---------------- RECHTE SEITE KAMERA ----------------
let camActive = false, camLast={x:0,y:0};
let camYaw = 0, camPitch = 0;

document.addEventListener('touchstart', e=>{
    for(const t of e.touches){
        if(t.clientX > window.innerWidth/2){
            camActive = true;
            camLast = {x:t.clientX, y:t.clientY};
            break;
        }
    }
});

document.addEventListener('touchmove', e=>{
    if(!camActive) return;
    for(const t of e.touches){
        if(t.clientX > window.innerWidth/2){
            const dx = t.clientX - camLast.x;
            const dy = t.clientY - camLast.y;
            camYaw -= dx * 0.005;
            camPitch -= dy * 0.005;
            camPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, camPitch)); // Limit nach oben/unten
            camLast = {x:t.clientX, y:t.clientY};
            break;
        }
    }
});

document.addEventListener('touchend', e=>{ camActive=false; });

// ---------------- UNENDLICHE WELT ----------------
function generateChunk(cx,cz){
    const CHUNK_SIZE = 10;
    for(let x=cx; x<cx+CHUNK_SIZE; x++){
        for(let z=cz; z<cz+CHUNK_SIZE; z++){
            if(blocks.find(b=>b.x===x && b.z===z)) continue; // existiert schon
            const h = Math.floor(Math.random()*3)+1;
            for(let y=0; y<h; y++) addBlock(x,y,z,'grass');
            addBlock(x,h,z,'dirt');
        }
    }
}

let loadedChunks = new Set();
function loadChunks(){
    const playerChunkX = Math.floor(player.x/10)*10;
    const playerChunkZ = Math.floor(player.z/10)*10;
    for(let dx=-20; dx<=20; dx+=10){
        for(let dz=-20; dz<=20; dz+=10){
            const key = `${playerChunkX+dx},${playerChunkZ+dz}`;
            if(!loadedChunks.has(key)){
                generateChunk(playerChunkX+dx, playerChunkZ+dz);
                loadedChunks.add(key);
            }
        }
    }
}

// ---------------- SAVE ----------------
function saveData(){
    localStorage.setItem(user+'_inventory', JSON.stringify(inventory));
    localStorage.setItem(user+'_coins', coins);
}

// ---------------- ANIMATION ----------------
const clock = new THREE.Clock();

function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const speed = 5;

    // Spielerbewegung
    const forward = new THREE.Vector3(Math.sin(camYaw),0,-Math.cos(camYaw));
    const right = new THREE.Vector3(-forward.z,0,forward.x);
    player.velocity.addScaledVector(forward, joystickPos.y*speed*delta);
    player.velocity.addScaledVector(right, joystickPos.x*speed*delta);

    // Gravitation
    player.velocity.y -= 9.8*delta;

    // Neue Position testen
    const pos = new THREE.Vector3(player.x,player.y,player.z);
    pos.addScaledVector(player.velocity,delta);

    if(checkCollisions(pos)){
        player.velocity.x=0; player.velocity.z=0;
        player.velocity.y=Math.min(0,player.velocity.y);
    } else { player.x=pos.x; player.y=pos.y; player.z=pos.z;}

    if(player.y<1.5){ player.velocity.y=0; player.y=1.5; player.canJump=true;}

    // Kamera setzen
    camera.position.set(player.x,player.y+0.8,player.z);
    const lookDir = new THREE.Vector3(
        Math.sin(camYaw)*Math.cos(camPitch),
        Math.sin(camPitch),
        -Math.cos(camYaw)*Math.cos(camPitch)
    );
    camera.lookAt(player.x+lookDir.x,player.y+0.8+lookDir.y,player.z+lookDir.z);

    player.velocity.multiplyScalar(0.9);

    // Unendliche Welt laden
    loadChunks();

    renderer.render(scene,camera);
}
animate();
