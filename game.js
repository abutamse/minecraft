// ---------------- INIT SCENE ----------------
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

function addBlock(x, y, z, type){
    const geo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    const mat = new THREE.MeshStandardMaterial({ map: textures[type] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    scene.add(mesh);
    blocks.push({ mesh, x, y, z, type });
}

// Kleine Berge / Boden
function generateWorld(){
    for(let x=-10;x<=10;x++){
        for(let z=-10;z<=10;z++){
            const h = Math.floor(Math.random()*3)+1;
            for(let y=0;y<h;y++) addBlock(x,y,z,'grass');
            addBlock(x,h,z,'dirt');
        }
    }
}
generateWorld();

// ---------------- PLAYER ----------------
let player = {x:0,y:5,z:0,velocity:new THREE.Vector3(),canJump:true};

// ---------------- COLLISION ----------------
function checkCollisions(pos){
    for(const b of blocks){
        if(pos.x+0.3>b.x && pos.x-0.3<b.x+1 &&
           pos.y < b.y+1 && pos.y+1.8 > b.y &&
           pos.z+0.3>b.z && pos.z-0.3<b.z+1){ return true; }
    }
    return false;
}

// ---------------- INVENTORY ----------------
let user = localStorage.getItem('currentUser');
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
const crosshair = document.getElementById('crosshair');

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
    let x = t.x, z = t.z, y = t.y + 1;
    while(blocks.find(b => b.x === x && b.y === y && b.z === z)) y++;
    addBlock(x, y, z, selected);
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
const actionContainer = document.getElementById('action-buttons');
function createActionButton(text, callback){
    const btn = document.createElement('div');
    btn.className='action-btn';
    btn.innerText=text;
    actionContainer.appendChild(btn);
    btn.addEventListener('touchstart', e=>{ e.preventDefault(); callback(); });
}
createActionButton('MINE', mine);
createActionButton('BUILD', build);

// ---------------- LEFT JOYSTICK ----------------
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive=false; let joystickPos={x:0,y:0};
joystickKnob.addEventListener('touchstart',e=>{e.preventDefault(); joystickActive=true;});
joystickKnob.addEventListener('touchend',e=>{e.preventDefault(); joystickActive=false; joystickPos={x:0,y:0}; joystickKnob.style.left='30px'; joystickKnob.style.top='30px';});
joystickKnob.addEventListener('touchmove',e=>{
    if(!joystickActive) return;
    const touch = e.touches[0]; const rect = joystickBase.getBoundingClientRect();
    let x = touch.clientX - rect.left - rect.width/2; let y = touch.clientY - rect.top - rect.height/2;
    const max = rect.width/2-30; const len = Math.sqrt(x*x+y*y);
    if(len>max){ x=x/max*max; y=y/max*max;}
    joystickPos = {x:x/max, y:-y/max};
    joystickKnob.style.left=`${30+x}px`; joystickKnob.style.top=`${30+y}px`;
});

// ---------------- RIGHT SIDE CAMERA DRAG ----------------
let camPos = {x:0,y:0};
let camActive = false;
document.addEventListener('touchstart', e=>{
    for(const t of e.touches){
        if(t.clientX > window.innerWidth/2){ camActive=true; camLast={x:t.clientX, y:t.clientY}; break; }
    }
});
let camLast={x:0,y:0};
document.addEventListener('touchmove', e=>{
    if(!camActive) return;
    for(const t of e.touches){
        if(t.clientX>window.innerWidth/2){
            const dx = t.clientX - camLast.x;
            const dy = t.clientY - camLast.y;
            camPos.x += dx*0.002;
            camPos.y += dy*0.002;
            camLast={x:t.clientX, y:t.clientY};
            break;
        }
    }
});
document.addEventListener('touchend', e=>{ camActive=false; });

// ---------------- JUMP ----------------
const jumpBtn = document.getElementById('jump-btn');
jumpBtn.addEventListener('touchstart', e=>{
    e.preventDefault();
    if(player.canJump){ player.velocity.y=7; player.canJump=false;}
});

// ---------------- SAVE ----------------
function saveData(){
    localStorage.setItem(user+'_inventory', JSON.stringify(inventory));
    localStorage.setItem(user+'_coins', coins);
}

// ---------------- ANIMATE ----------------
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const speed = 5;

    // Player movement
    player.velocity.x += joystickPos.x*speed*delta;
    player.velocity.z += -joystickPos.y*speed*delta;

    // Gravity
    player.velocity.y -= 9.8*delta;

    const pos = new THREE.Vector3(player.x,player.y,player.z);
    pos.addScaledVector(player.velocity,delta);

    if(checkCollisions(pos)){
        player.velocity.x=0; player.velocity.z=0;
        player.velocity.y=Math.min(0,player.velocity.y);
    } else { player.x=pos.x; player.y=pos.y; player.z=pos.z;}

    if(player.y<1.5){ player.velocity.y=0; player.y=1.5; player.canJump=true;}

    // Camera rotation
    const lookDir = new THREE.Vector3(0,0,-1);
    lookDir.applyAxisAngle(new THREE.Vector3(0,1,0), camPos.x);
    lookDir.y = -camPos.y;

    camera.position.set(player.x,player.y+0.8,player.z);
    camera.lookAt(player.x+lookDir.x,player.y+0.8+lookDir.y,player.z+lookDir.z);

    player.velocity.multiplyScalar(0.9);

    renderer.render(scene,camera);
}
animate();
