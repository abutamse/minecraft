import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ===== DOM ===== */
const $ = id => document.getElementById(id);
const jumpBtn = $("jump");
const mineBtn = $("mine");
const buildBtn = $("build");
const shootBtn = $("shoot");
const healthUI = $("health");
const hungerUI = $("hunger");
const coinsUI = $("coins");
const hotbar = $("hotbar");

/* ===== START ===== */
$("startBtn").onclick = () => {
  if (!$("nameInput").value.trim()) return alert("Name eingeben!");
  $("login").style.display = "none";
  initGame();
};

function initGame() {

  /* ===== SCENE ===== */
  window.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  window.camera = new THREE.PerspectiveCamera(
    75, innerWidth / innerHeight, 0.1, 1000
  );

  window.renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ===== CROSSHAIR ===== */
  const cross = document.createElement("div");
  cross.style = "position:fixed;top:50%;left:50%;width:6px;height:6px;background:yellow;transform:translate(-50%,-50%);z-index:10";
  document.body.appendChild(cross);

  /* ===== LIGHT ===== */
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(100, 200, 100);
  scene.add(sun);

  /* ===== TEXTURES ===== */
  const loader = new THREE.TextureLoader();
  const tex = n => {
    const t = loader.load(n);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
  };

  const textures = {
    grass: tex("grass.png"),
    dirt: tex("dirt.png"),
    stone: tex("stone.png")
  };

  /* ===== PLAYER ===== */
  window.player = {
    pos: new THREE.Vector3(0, 10, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    width: 0.6,
    height: 1.8,
    onGround: false,
    hp: 100,
    hunger: 100,
    coins: 0
  };

  /* ===== INPUT ===== */
  const keys = { w: 0, a: 0, s: 0, d: 0, jump: 0 };
  onkeydown = e => {
    if (e.key === "w") keys.w = 1;
    if (e.key === "s") keys.s = 1;
    if (e.key === "a") keys.a = 1;
    if (e.key === "d") keys.d = 1;
    if (e.key === " ") keys.jump = 1;
  };
  onkeyup = e => {
    if (e.key === "w") keys.w = 0;
    if (e.key === "s") keys.s = 0;
    if (e.key === "a") keys.a = 0;
    if (e.key === "d") keys.d = 0;
    if (e.key === " ") keys.jump = 0;
  };

  /* ===== WORLD ===== */
  window.blocks = [];
  const map = {};
  const geo = new THREE.BoxGeometry(1, 1, 1);

  window.addBlock = (x, y, z, t) => {
    const k = `${x},${y},${z}`;
    if (map[k]) return;
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: textures[t] }));
    m.position.set(x + 0.5, y + 0.5, z + 0.5);
    scene.add(m);
    blocks.push({ x, y, z, mesh: m });
    map[k] = true;
  };

  window.removeBlock = (x, y, z) => {
    const i = blocks.findIndex(b => b.x === x && b.y === y && b.z === z);
    if (i === -1) return;
    scene.remove(blocks[i].mesh);
    blocks.splice(i, 1);
    delete map[`${x},${y},${z}`];
  };

  /* ===== TERRAIN ===== */
  for (let x = -30; x <= 30; x++)
    for (let z = -30; z <= 30; z++) {
      const h = Math.floor(4 + Math.sin(x * 0.15) * 3 + Math.cos(z * 0.15) * 3);
      for (let y = 0; y <= h; y++)
        addBlock(x, y, z, y === h ? "grass" : y > h - 2 ? "dirt" : "stone");
    }

  /* ===== COLLISION ===== */
  function collides(p) {
    for (const b of blocks) {
      if (
        p.x + player.width / 2 > b.x &&
        p.x - player.width / 2 < b.x + 1 &&
        p.z + player.width / 2 > b.z &&
        p.z - player.width / 2 < b.z + 1 &&
        p.y < b.y + 1 &&
        p.y + player.height > b.y
      ) return true;
    }
    return false;
  }

  while (collides(player.pos)) player.pos.y++;

  /* ===== RAYCAST (GENAUES FADENKREUZ) ===== */
  const ray = new THREE.Raycaster();
  function target(add) {
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const hit = ray.intersectObjects(blocks.map(b => b.mesh))[0];
    if (!hit) return null;
    const p = hit.object.position;
    const n = hit.face.normal;
    return add
      ? { x: p.x - 0.5 + n.x, y: p.y - 0.5 + n.y, z: p.z - 0.5 + n.z }
      : { x: p.x - 0.5, y: p.y - 0.5, z: p.z - 0.5 };
  }

  mineBtn.ontouchstart = () => {
    const t = target(false);
    if (t) removeBlock(t.x | 0, t.y | 0, t.z | 0);
  };

  buildBtn.ontouchstart = () => {
    const t = target(true);
    if (t) addBlock(t.x | 0, t.y | 0, t.z | 0, "grass");
  };

  jumpBtn.ontouchstart = () => {
    if (player.onGround) {
      player.vel.y = 6;
      player.onGround = false;
    }
  };

  /* ===== LOOP ===== */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    let mx = keys.d - keys.a;
    let mz = keys.s - keys.w;
    const l = Math.hypot(mx, mz);
    if (l) { mx /= l; mz /= l; }

    const dx = Math.cos(player.yaw) * mx + Math.sin(player.yaw) * mz;
    const dz = -Math.sin(player.yaw) * mx + Math.cos(player.yaw) * mz;

    player.pos.x += dx * 6 * dt;
    if (collides(player.pos)) player.pos.x -= dx * 6 * dt;
    player.pos.z += dz * 6 * dt;
    if (collides(player.pos)) player.pos.z -= dz * 6 * dt;

    player.vel.y -= 9.8 * dt;
    player.pos.y += player.vel.y * dt;
    if (collides(player.pos)) {
      player.vel.y = 0;
      player.onGround = true;
      player.pos.y = Math.ceil(player.pos.y);
    } else player.onGround = false;

    camera.position.set(player.pos.x, player.pos.y + 1.6, player.pos.z);
    camera.lookAt(camera.position.clone().add(
      new THREE.Vector3(Math.sin(player.yaw), Math.sin(player.pitch), -Math.cos(player.yaw))
    ));

    healthUI.textContent = "❤️ " + (player.hp | 0);
    hungerUI.textContent = "🍖 " + (player.hunger | 0) + "%";
    coinsUI.textContent = "🪙 " + player.coins;

    renderer.render(scene, camera);
  }
  animate();
}
/* ===== TEIL 2 – TIERE & HUNGER ===== */

window.animals = [];
window.bullets = [];
window.__hungerTimer = 0;

function groundY(x, z) {
  let y = -1;
  for (const b of blocks)
    if (b.x === Math.floor(x) && b.z === Math.floor(z))
      if (b.y > y) y = b.y;
  return y >= 0 ? y + 1 : null;
}

/* TIERE SPAWNEN */
for (let i = 0; i < 6; i++) {
  const y = groundY(i * 2 - 6, 0);
  if (y === null) continue;
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 1.2),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  m.position.set(i * 2 - 6 + 0.5, y + 0.45, 0.5);
  scene.add(m);
  animals.push({ mesh: m, hp: 10, dir: new THREE.Vector3(1, 0, 0) });
}

/* SCHIESSEN */
shootBtn.ontouchstart = () => {
  const b = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  b.position.copy(camera.position);
  b.dir = new THREE.Vector3(
    Math.sin(player.yaw),
    Math.sin(player.pitch),
    -Math.cos(player.yaw)
  ).normalize();
  bullets.push(b);
  scene.add(b);
};

/* UPDATES */
window.updateAnimals = dt => {
  for (const a of animals) {
    const g = groundY(a.mesh.position.x, a.mesh.position.z);
    if (g !== null) a.mesh.position.y = g + 0.45;
  }
};

window.updateBullets = dt => {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].position.add(bullets[i].dir.clone().multiplyScalar(20 * dt));
  }
};

/* HUNGER */
setInterval(() => {
  player.hunger--;
  if (player.hunger < 0) {
    player.hunger = 0;
    player.hp -= 2;
  }
}, 3000);

/* LOOP ERWEITERN */
const oldRender = renderer.render;
renderer.render = function () {
  updateAnimals(0.016);
  updateBullets(0.016);
  oldRender.apply(renderer, arguments);
};
/* =====================================================
   TEIL 3 – BAU-MENÜ + CRAFTING (NUR EINFÜGEN)
   ===================================================== */

/* ---------- INVENTAR (SICHER) ---------- */
window.inventory = window.inventory || {
  grass: 10,
  dirt: 10,
  stone: 5,
  wood: 5,
  plank: 0,
  meat: 0
};

/* ---------- UI CONTAINER ---------- */
const buildMenu = document.createElement("div");
buildMenu.style = `
  position:fixed;
  right:10px;
  top:50%;
  transform:translateY(-50%);
  background:rgba(0,0,0,0.7);
  padding:10px;
  border-radius:8px;
  color:white;
  z-index:20;
  display:none;
`;
document.body.appendChild(buildMenu);

const craftMenu = document.createElement("div");
craftMenu.style = `
  position:fixed;
  left:10px;
  top:50%;
  transform:translateY(-50%);
  background:rgba(0,0,0,0.7);
  padding:10px;
  border-radius:8px;
  color:white;
  z-index:20;
  display:none;
`;
document.body.appendChild(craftMenu);

/* ---------- BUTTONS ---------- */
const buildToggle = document.createElement("button");
buildToggle.textContent = "🏗️ BAU";
buildToggle.style = "position:fixed;right:10px;bottom:200px;z-index:20;";
document.body.appendChild(buildToggle);

const craftToggle = document.createElement("button");
craftToggle.textContent = "🛠️ CRAFT";
craftToggle.style = "position:fixed;left:10px;bottom:200px;z-index:20;";
document.body.appendChild(craftToggle);

/* ---------- TOGGLE ---------- */
buildToggle.onclick = () => {
  buildMenu.style.display =
    buildMenu.style.display === "none" ? "block" : "none";
};

craftToggle.onclick = () => {
  craftMenu.style.display =
    craftMenu.style.display === "none" ? "block" : "none";
};

/* ---------- BAU-MENÜ ---------- */
function updateBuildMenu() {
  buildMenu.innerHTML = "<b>Bauen</b><br><br>";
  for (const k in inventory) {
    if (inventory[k] > 0) {
      const btn = document.createElement("button");
      btn.textContent = `${k} (${inventory[k]})`;
      btn.style = "display:block;margin:4px 0;width:100%;";
      btn.onclick = () => {
        window.selectedBlockType = k;
      };
      buildMenu.appendChild(btn);
    }
  }
}
window.selectedBlockType = "grass";

/* ---------- BUILD ACTION ERWEITERN ---------- */
const oldBuild = buildBtn.ontouchstart;
buildBtn.ontouchstart = () => {
  if (!inventory[selectedBlockType]) return;
  const t = target(true);
  if (!t) return;
  addBlock(t.x | 0, t.y | 0, t.z | 0, selectedBlockType);
  inventory[selectedBlockType]--;
  updateBuildMenu();
};

/* ---------- CRAFTING ---------- */
function updateCraftMenu() {
  craftMenu.innerHTML = "<b>Crafting</b><br><br>";

  // Holz → Bretter
  const woodBtn = document.createElement("button");
  woodBtn.textContent = "🪵 1 Holz → 4 Bretter";
  woodBtn.onclick = () => {
    if (inventory.wood >= 1) {
      inventory.wood -= 1;
      inventory.plank += 4;
      updateCraftMenu();
      updateBuildMenu();
    }
  };
  craftMenu.appendChild(woodBtn);

  // Bretter → Steinblock
  const plankBtn = document.createElement("button");
  plankBtn.textContent = "🧱 4 Bretter → 1 Stein";
  plankBtn.onclick = () => {
    if (inventory.plank >= 4) {
      inventory.plank -= 4;
      inventory.stone += 1;
      updateCraftMenu();
      updateBuildMenu();
    }
  };
  craftMenu.appendChild(plankBtn);

  // Fleisch essen
  const meatBtn = document.createElement("button");
  meatBtn.textContent = "🍖 Fleisch essen (+20 Hunger)";
  meatBtn.onclick = () => {
    if (inventory.meat >= 1) {
      inventory.meat--;
      player.hunger = Math.min(100, player.hunger + 20);
      updateCraftMenu();
    }
  };
  craftMenu.appendChild(meatBtn);
}

/* ---------- INIT ---------- */
updateBuildMenu();
updateCraftMenu();
/* =====================================================
   TEIL 4 – SAVEGAME (NUR EINFÜGEN)
   ===================================================== */

const SAVE_KEY = "mini_mc_save";

/* ---------- SPEICHERN ---------- */
function saveGame() {
  const data = {
    player: {
      x: player.pos.x,
      y: player.pos.y,
      z: player.pos.z,
      hp: player.hp,
      hunger: player.hunger
    },
    inventory: inventory,
    world: Object.keys(world)
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

/* ---------- LADEN ---------- */
function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    // Spieler
    player.pos.set(
      data.player.x,
      Math.max(5, data.player.y),
      data.player.z
    );
    player.hp = data.player.hp;
    player.hunger = data.player.hunger;

    // Inventar
    inventory = data.inventory || inventory;

    // Welt neu bauen
    blocks.forEach(b => scene.remove(b.mesh));
    blocks.length = 0;
    for (const k in world) delete world[k];

    data.world.forEach(key => {
      const [x, y, z] = key.split(",").map(Number);
      addBlock(x, y, z, "stone");
    });

    updateBuildMenu();
    updateCraftMenu();
  } catch (e) {
    console.warn("Savegame defekt", e);
  }
}

/* ---------- AUTO SAVE ---------- */
setInterval(saveGame, 5000);

/* ---------- LOAD BEIM START ---------- */
setTimeout(loadGame, 500);
/* =====================================================
   TEIL 5 – MULTIPLAYER (LOKAL / MULTI-TAB)
   ===================================================== */

/* ---------- MULTI-TAB CHANNEL ---------- */
const channel = new BroadcastChannel("mini_mc_multiplayer");
const otherPlayers = {}; // id -> {mesh, pos}

/* Spieler ID */
const playerId = Math.random().toString(36).substring(2, 10);

/* SEND PLAYER POSITION ALLE 50ms */
setInterval(() => {
  channel.postMessage({
    id: playerId,
    pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
    yaw: player.yaw,
    pitch: player.pitch,
    hp: player.hp
  });
}, 50);

/* EMPFANG ANDERER SPIELER */
channel.onmessage = e => {
  const data = e.data;
  if (data.id === playerId) return; // Ignorieren eigener Player

  if (!otherPlayers[data.id]) {
    // Mesh erstellen
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.8, 0.6),
      new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
    );
    scene.add(m);
    otherPlayers[data.id] = { mesh: m };
  }

  const p = otherPlayers[data.id];
  p.mesh.position.set(data.pos.x, data.pos.y + 0.9, data.pos.z);
};

/* ANDERE SPIELER ENTFERNEN BEI SCHLUSS (TAB CLOSED) */
window.addEventListener("beforeunload", () => {
  channel.postMessage({ id: playerId, disconnect: true });
});

/* DISCONNECT HANDLING */
channel.onmessage = e => {
  const data = e.data;
  if (data.disconnect && otherPlayers[data.id]) {
    scene.remove(otherPlayers[data.id].mesh);
    delete otherPlayers[data.id];
  }
};
