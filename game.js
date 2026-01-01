// ---------------- BLOCKS ----------------
const blocks = [];
const BLOCK = 1;

function addBlock(x,y,z,type){
    const geo = new THREE.BoxGeometry(BLOCK,BLOCK,BLOCK);
    const mat = new THREE.MeshStandardMaterial({ map: textures[type] });
    const mesh = new THREE.Mesh(geo,mat);
    mesh.position.set(x+0.5,y+0.5,z+0.5);
    scene.add(mesh);
    blocks.push({mesh,x,y,z,type});
}

// ---------------- UNENDLICHE WELT / CHUNKS ----------------
const loadedChunks = new Set();
function generateChunk(cx,cz){
    const CHUNK_SIZE = 10;
    for(let x=cx;x<cx+CHUNK_SIZE;x++){
        for(let z=cz;z<cz+CHUNK_SIZE;z++){
            if(blocks.find(b=>b.x===x && b.z===z)) continue;
            const baseHeight = 1;
            const hill = Math.floor(Math.random()*3);
            const top = baseHeight + hill;

            // Schichten
            for(let y=0;y<top-1;y++) addBlock(x,y,z,'stone');
            addBlock(x,top-1,z,'dirt');
            addBlock(x,top,z,'grass');

            // zufällige Bäume auf Gras
            if(Math.random()<0.05){
                let treeHeight = 3 + Math.floor(Math.random()*2);
                for(let ty=top+1;ty<=top+treeHeight;ty++) addBlock(x,ty,z,'wood');
                for(let lx=-1;lx<=1;lx++){
                    for(let lz=-1;lz<=1;lz++){
                        addBlock(x+lx,top+treeHeight,z+lz,'leaves');
                    }
                }
            }
        }
    }
}

function loadChunks(){
    const playerChunkX = Math.floor(player.x/10)*10;
    const playerChunkZ = Math.floor(player.z/10)*10;
    for(let dx=-20;dx<=20;dx+=10){
        for(let dz=-20;dz<=20;dz+=10){
            const key = `${playerChunkX+dx},${playerChunkZ+dz}`;
            if(!loadedChunks.has(key)){
                generateChunk(playerChunkX+dx,playerChunkZ+dz);
                loadedChunks.add(key);
            }
        }
    }
}
loadChunks();
// ---------------- CROSSHAIR ----------------
const crosshair = document.createElement('div');
crosshair.style.position='absolute';
crosshair.style.top='50%';
crosshair.style.left='50%';
crosshair.style.width='4px';
crosshair.style.height='4px';
crosshair.style.background='black';
crosshair.style.transform='translate(-50%,-50%)';
document.body.appendChild(crosshair);

// ---------------- ACTION BUTTONS (rechts unten) ----------------
function createButton(text,bottom,right,callback){
    const btn = document.createElement('div');
    btn.innerText=text;
    btn.style.position='absolute';
    btn.style.bottom=bottom;
    btn.style.right=right;
    btn.style.padding='12px 16px';
    btn.style.background='rgba(0,0,0,0.6)';
    btn.style.color='white';
    btn.style.borderRadius='8px';
    btn.style.fontSize='14px';
    btn.style.userSelect='none';
    document.body.appendChild(btn);
    btn.addEventListener('touchstart',e=>{e.preventDefault(); callback();});
}
createButton('MINE','120px','20px',mine);
createButton('BUILD','70px','20px',build);
createButton('JUMP','20px','20px',()=>{
    if(player.canJump){player.velocity.y=7;player.canJump=false;}
});

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
    let x=t.x, y=t.y+1, z=t.z;
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
    for(const key in inventory) inventory[key]+=5; // +5 von jeder Textur beim Mining
    coins++;
    saveData();
    updateHotbar();
}

// ---------------- LEFT JOYSTICK ----------------
let joystickPos={x:0,y:0}, joystickActive=false;
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

joystickKnob.addEventListener('touchstart', e=>{e.preventDefault(); joystickActive=true;});
joystickKnob.addEventListener('touchend', e=>{e.preventDefault(); joystickActive=false; joystickPos={x:0,y:0}; joystickKnob.style.left='20px'; joystickKnob.style.top='20px';});
joystickKnob.addEventListener('touchmove', e=>{
    if(!joystickActive) return;
    const touch = e.touches[0]; const rect = joystickBase.getBoundingClientRect();
    let x = touch.clientX - rect.left - rect.width/2;
    let y = touch.clientY - rect.top - rect.height/2;
    const max = rect.width/2-20; const len = Math.sqrt(x*x+y*y);
    if(len>max){x=x/max*max; y=y/max*max;}
    joystickPos={x:x/max, y:-y/max};
    joystickKnob.style.left=`${20+x}px`;
    joystickKnob.style.top=`${20+y}px`;
});

// ---------------- RIGHT TOUCH CAMERA ----------------
let camActive=false, camLast={x:0,y:0}, camYaw=0, camPitch=0;
document.addEventListener('touchstart', e=>{
    for(const t of e.touches){ if(t.clientX>window.innerWidth/2){ camActive=true; camLast={x:t.clientX,y:t.clientY}; break; } }
});
document.addEventListener('touchmove', e=>{
    if(!camActive) return;
    for(const t of e.touches){ if(t.clientX>window.innerWidth/2){
        const dx = t.clientX - camLast.x;
        const dy = t.clientY - camLast.y;
        camYaw -= dx*0.005;
        camPitch -= dy*0.005;
        camPitch = Math.max(-Math.PI/2,Math.min(Math.PI/2,camPitch));
        camLast={x:t.clientX,y:t.clientY};
        break;
    }}
});
document.addEventListener('touchend', e=>{ camActive=false; });

// ---------------- ANIMATION / PHYSICS ----------------
const clock = new THREE.Clock();

function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const speed=5;

    // Spielerbewegung
    const forward = new THREE.Vector3(Math.sin(camYaw),0,-Math.cos(camYaw));
    const right = new THREE.Vector3(-forward.z,0,forward.x);
    player.velocity.addScaledVector(forward,joystickPos.y*speed*delta);
    player.velocity.addScaledVector(right,joystickPos.x*speed*delta);

    // Gravitation
    player.velocity.y -= 9.8*delta;

    // Neue Position prüfen
    const pos = new THREE.Vector3(player.x,player.y,player.z);
    pos.addScaledVector(player.velocity,delta);
    let collided=false;
    for(const b of blocks){
        if(pos.x+0.3>b.x && pos.x-0.3<b.x+1 &&
           pos.y < b.y+1 && pos.y+1.8 > b.y &&
           pos.z+0.3>b.z && pos.z-0.3<b.z+1){ collided=true; break; }
    }
    if(!collided){ player.x=pos.x; player.y=pos.y; player.z=pos.z; } 
    else { player.velocity.x=0; player.velocity.z=0; player.velocity.y=Math.min(0,player.velocity.y); }

    if(player.y<1.5){ player.velocity.y=0; player.y=1.5; player.canJump=true; }

    // Kamera setzen
    camera.position.set(player.x,player.y+0.8,player.z);
    const lookDir = new THREE.Vector3(Math.sin(camYaw)*Math.cos(camPitch), Math.sin(camPitch), -Math.cos(camYaw)*Math.cos(camPitch));
    camera.lookAt(player.x+lookDir.x,player.y+0.8+lookDir.y,player.z+lookDir.z);

    player.velocity.multiplyScalar(0.9);

    // Unendliche Welt laden
    loadChunks();

    // Tiere bewegen sich zufällig
    for(const t of animals){
        t.mesh.position.x += (Math.random()-0.5)*delta*2;
        t.mesh.position.z += (Math.random()-0.5)*delta*2;
        t.mesh.position.y = 1;
    }

    renderer.render(scene,camera);
}
animate();

// ---------------- TIERE ----------------
const animals=[];
function spawnAnimal(x,z){
    const geo = new THREE.BoxGeometry(1,1,1);
    const mat = new THREE.MeshStandardMaterial({color:0xff0000});
    const mesh = new THREE.Mesh(geo,mat);
    mesh.position.set(x+0.5,1,z+0.5);
    scene.add(mesh);
    animals.push({mesh,x,z});
}
for(let i=0;i<5;i++) spawnAnimal(Math.floor(Math.random()*20-10),Math.floor(Math.random()*20-10));

// Tier schlachten Funktion
function killAnimal(animal){
    scene.remove(animal.mesh);
    animals.splice(animals.indexOf(animal),1);
    for(const key in inventory) inventory[key]+=5;
    saveData();
    updateHotbar();
}
