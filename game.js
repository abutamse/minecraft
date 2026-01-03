import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ================== LOGIN ================== */
let playerName = null;
const login = document.getElementById("login");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("nameInput");

startBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) { alert("Bitte Namen eingeben!"); return; }
    playerName = name;
    login.style.display = "none";
    initGame();
};

function key(k) {
    if (!playerName) return k + "_default";
    return `${k}_${playerName}`;
}

/* ================== GAME ================== */
function initGame() {

    /* ---------- SCENE & CAMERA ---------- */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });

    /* ---------- LIGHT ---------- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(100, 200, 100);
    scene.add(sun);

    /* ---------- PLAYER ---------- */
    const player = {
        pos: new THREE.Vector3(0, 5, 0),
        vel: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        hp: Number(localStorage.getItem(key("hp"))) || 100,
        hunger: Number(localStorage.getItem(key("hunger"))) || 100,
        coins: Number(localStorage.getItem(key("coins"))) || 0,
        onGround: false,
        speed: 10
    };

    /* ---------- UI ---------- */
    const healthUI = document.getElementById("health");
    const hungerUI = document.getElementById("hunger");
    const coinsUI = document.getElementById("coins");
    const foodUI = document.getElementById("food");
    const weaponsUI = document.getElementById("weapons");
    const hotbar = document.getElementById("hotbar");

    // Fadenkreuz
    const crosshair = document.createElement("div");
    crosshair.style.position = "fixed";
    crosshair.style.top = "50%";
    crosshair.style.left = "50%";
    crosshair.style.width = "4px";
    crosshair.style.height = "4px";
    crosshair.style.background = "yellow";
    crosshair.style.transform = "translate(-50%,-50%)";
    crosshair.style.zIndex = "20";
    document.body.appendChild(crosshair);

    function updateStats() {
        healthUI.textContent = `❤️ ${Math.floor(player.hp)}`;
        hungerUI.textContent = `🍖 ${Math.floor(player.hunger)}%`;
        coinsUI.textContent = `🪙 ${player.coins}`;
    }

    /* ---------- TEXTURES ---------- */
    const loader = new THREE.TextureLoader();
    function tex(n) { const t = loader.load(n); t.magFilter = t.minFilter = THREE.NearestFilter; return t; }
    const textures = { grass: tex("grass.png"), dirt: tex("dirt.png"), wood: tex("wood.png"), leaves: tex("leaves.png") };

    /* ---------- WORLD ---------- */
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const blocks = [];
    const world = JSON.parse(localStorage.getItem(key("world")) || "{}");
    const chunks = new Set();

    function saveWorld() { localStorage.setItem(key("world"), JSON.stringify(world)); }

    function addBlock(x, y, z, type, save = true) {
        if (world[`${x},${y},${z}`]) return;
        const mat = new THREE.MeshLambertMaterial({ map: textures[type] });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        scene.add(mesh);
        blocks.push({ x, y, z, type, mesh });
        if (save) { world[`${x},${y},${z}`] = type; saveWorld(); }
    }

    function removeBlock(b) {
        scene.remove(b.mesh);
        delete world[`${b.x},${b.y},${b.z}`];
        blocks.splice(blocks.indexOf(b), 1);
        saveWorld();
    }

    /* ---------- CHUNK GENERATOR (unendlich) ---------- */
    function genChunk(cx, cz) {
        for (let x = cx; x < cx + 16; x++) {
            for (let z = cz; z < cz + 16; z++) {
                const h = Math.floor(Math.random() * 4) + 1 + Math.floor(Math.sin(x * 0.2 + z * 0.2) * 2);
                for (let y = 0; y <= h; y++) addBlock(x, y, z, y < h ? "dirt" : "grass");

                if (Math.random() < 0.1) {
                    const hTree = 2 + Math.floor(Math.random() * 2);
                    for (let y = 1; y <= hTree; y++) addBlock(x, h + y, z, "wood");
                    for (let dx = -1; dx <= 1; dx++)
                        for (let dz = -1; dz <= 1; dz++)
                            addBlock(x + dx, h + hTree, z + dz, "leaves");
                }
            }
        }
    }

    function loadChunks() {
        const cx = Math.floor(player.pos.x / 16) * 16;
        const cz = Math.floor(player.pos.z / 16) * 16;
        for (let dx = -32; dx <= 32; dx += 16)
            for (let dz = -32; dz <= 32; dz += 16) {
                const k = `${cx + dx},${cz + dz}`;
                if (!chunks.has(k)) { genChunk(cx + dx, cz + dz); chunks.add(k); }
            }
    }
    loadChunks();

    /* ---------- INVENTORY / FOOD ---------- */
    let food = Number(localStorage.getItem(key("food")) || 0);
    function updateFoodUI() {
        foodUI.innerHTML = "";
        const btn = document.createElement("button");
        btn.textContent = `🍖 Fleisch (${food})`;
        btn.onclick = () => { if (food <= 0 || player.hunger >= 100) return; food--; player.hunger = Math.min(100, player.hunger + 25); localStorage.setItem(key("food"), food); };
        foodUI.appendChild(btn);
    }
    updateFoodUI();

    /* ---------- WEAPONS ---------- */
    const weapons = [{ name: "Messer", dmg: 5, price: 0 }, { name: "Schwert I", dmg: 10, price: 100 }, { name: "Schwert II", dmg: 20, price: 300 }, { name: "Bogen", dmg: 15, price: 200 }, { name: "Gewehr", dmg: 40, price: 1000 }];
    let ownedWeapons = JSON.parse(localStorage.getItem(key("weapons")) || '["Messer"]');
    let currentWeapon = localStorage.getItem(key("currentWeapon")) || "Messer";
    function updateWeaponsUI() { weaponsUI.innerHTML = ""; weapons.forEach(w => { const btn = document.createElement("button"); if (ownedWeapons.includes(w.name)) { btn.textContent = `⚔ ${w.name}`; if (w.name === currentWeapon) btn.style.border = "2px solid yellow"; btn.onclick = () => { currentWeapon = w.name; localStorage.setItem(key("currentWeapon"), currentWeapon); updateWeaponsUI(); }; } else { btn.textContent = `🪙 ${w.name} (${w.price})`; btn.onclick = () => { if (player.coins < w.price) return; player.coins -= w.price; ownedWeapons.push(w.name); currentWeapon = w.name; localStorage.setItem(key("weapons"), JSON.stringify(ownedWeapons)); localStorage.setItem(key("currentWeapon"), currentWeapon); updateWeaponsUI(); }; } weaponsUI.appendChild(btn); }); }
    updateWeaponsUI();
    function weaponDamage() { return weapons.find(w => w.name === currentWeapon)?.dmg || 5; }

    /* ---------- MOBS ---------- */
    const mobs = [];
    const mobGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    function spawnMob(type) { const mat = new THREE.MeshLambertMaterial({ color: type === "animal" ? 0x996633 : 0xaa0000 }); const mesh = new THREE.Mesh(mobGeo, mat); mesh.position.set(Math.random() * 32 - 16, 1, Math.random() * 32 - 16); scene.add(mesh); mobs.push({ type, mesh, hp: type === "animal" ? 20 : 40, vel: new THREE.Vector3() }); }
    for (let i = 0; i < 5; i++) spawnMob("animal");

    /* ---------- PROJECTILES ---------- */
    const projectiles = [];
    function shootProjectile() { const dir = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize(); const proj = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffff00 })); proj.position.copy(player.pos).add(new THREE.Vector3(0, 1.5, 0)); scene.add(proj); projectiles.push({ mesh: proj, dir, damage: weaponDamage(), life: 3 }); }

    /* ---------- CONTROLS ---------- */
    const joystick = document.getElementById("joystick");
    const stick = document.getElementById("stick");
    let joy = { x: 0, y: 0 }, active = false;
    joystick.ontouchstart = () => active = true;
    joystick.ontouchend = () => { active = false; joy = { x: 0, y: 0 }; stick.style.left = "40px"; stick.style.top = "40px"; };
    joystick.ontouchmove = e => { if (!active) return; const r = joystick.getBoundingClientRect(); const t = e.touches[0]; let x = t.clientX - r.left - 60; let y = t.clientY - r.top - 60; const d = Math.min(40, Math.hypot(x, y)); const a = Math.atan2(y, x); joy.x = Math.cos(a) * d / 40; joy.y = Math.sin(a) * d / 40; stick.style.left = 40 + joy.x * 40 + "px"; stick.style.top = 40 + joy.y * 40 + "px"; };

    const jump = document.getElementById("jump");
    const mine = document.getElementById("mine");
    const build = document.getElementById("build");
    const shootBtn = document.getElementById("shoot");
    jump.onclick = () => { if (player.onGround) player.vel.y = 6; };
    mine.onclick = () => { const b = getTargetBlock(); if (b) removeBlock(b); else hitMob(); };
    build.onclick = () => { const b = getTargetBlock(); if (!b) return; addBlock(b.x, b.y + 1, b.z, "wood"); };
    shootBtn.onclick = shootProjectile;

    /* ---------- TOUCH CAMERA ---------- */
    let look = false, last = { x: 0, y: 0 };
    window.addEventListener("touchstart", e => { for (const t of e.touches) if (t.clientX > innerWidth / 2) { look = true; last = { x: t.clientX, y: t.clientY }; } });
    window.addEventListener("touchmove", e => { if (!look) return; for (const t of e.touches) { if (t.clientX > innerWidth / 2) { const dx = t.clientX - last.x; const dy = t.clientY - last.y; player.yaw -= dx * 0.004; player.pitch -= dy * 0.004; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch)); last = { x: t.clientX, y: t.clientY }; } } });
    window.addEventListener("touchend", () => look = false);

    /* ---------- ANIMATE LOOP ---------- */
    const clock = new THREE.Clock();
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        const dt = clock.getDelta(); time += dt;

        // Tag/Nacht
        const day = Math.sin(time * 0.05) * 0.5 + 0.5;
        scene.background.setHSL(0.6, 0.6, 0.5 * day + 0.1);
        sun.intensity = day;

        // Hunger
        player.hunger -= dt * (100 / 300);
        if (player.hunger <= 0) player.hp -= dt * 5;

        // Bewegung + Kollisionsphysik
        const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
        const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
        player.vel.addScaledVector(fwd, -joy.y * player.speed * dt);
        player.vel.addScaledVector(right, joy.x * player.speed * dt);
        player.vel.y -= 9.8 * dt;

        const newPos = player.pos.clone().addScaledVector(player.vel, dt);
        let onGround = false;
        for (const b of blocks) {
            if (newPos.x + 0.5 > b.x && newPos.x - 0.5 < b.x + 1 &&
                newPos.y + 0.0 > b.y && newPos.y - 1 < b.y + 1 &&
                newPos.z + 0.5 > b.z && newPos.z - 0.5 < b.z + 1) {
                if (player.vel.y < 0) { newPos.y = b.y + 1; player.vel.y = 0; onGround = true; }
                else if (player.vel.y > 0) newPos.y = b.y - 1; player.vel.y = 0;
            }
        }
        player.pos.copy(newPos);
        player.onGround = onGround;
        player.vel.multiplyScalar(0.85);

        camera.position.copy(player.pos).add(new THREE.Vector3(0, 1.6, 0));
        const lookDir = new THREE.Vector3(Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
        camera.lookAt(camera.position.clone().add(lookDir));

        // Projektile
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.mesh.position.addScaledVector(p.dir, 15 * dt);
            p.life -= dt;
            for (const m of mobs) {
                if (p.mesh.position.distanceTo(m.mesh.position) < 0.5) {
                    m.hp -= p.damage;
                    scene.remove(p.mesh);
                    projectiles.splice(i, 1);
                    if (m.hp <= 0) { scene.remove(m.mesh); mobs.splice(mobs.indexOf(m), 1); if (m.type === "animal") { food++; localStorage.setItem(key("food"), food); } player.coins += m.type === "animal" ? 10 : 25; }
                    break;
                }
            }
            if (p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
        }

        loadChunks();
        if (day < 0.3 && mobs.length < 10) spawnMob("animal");
        if (day < 0.3 && mobs.length < 15) spawnMob("monster");

        updateStats();
        updateFoodUI();
        updateWeaponsUI();

        renderer.render(scene, camera);

        localStorage.setItem(key("hp"), player.hp);
        localStorage.setItem(key("hunger"), player.hunger);
        localStorage.setItem(key("coins"), player.coins);
    }
    animate();
}
