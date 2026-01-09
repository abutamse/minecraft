import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ========= DOM ========= */
const $ = id => document.getElementById(id);

/* ========= GAME STATE ========= */
const gameState = {
  health: 100,
  hunger: 100,
  coins: 0,
  meat: 0,
  inventory: { grass: 0, dirt: 10, stone: 0, sand: 0, water: 0 },
  selectedBlock: "dirt",
  weapon: "fist",
  skin: "steve",
  playerName: ""
};

const WEAPONS = {
  fist: { name: "Faust", damage: 5, cost: 0, emoji: "👊", range: 3, projectile: false },
  knife: { name: "Messer", damage: 15, cost: 10, emoji: "🔪", range: 3, projectile: false },
  sword: { name: "Schwert", damage: 30, cost: 50, emoji: "⚔️", range: 4, projectile: false },
  axe: { name: "Axt", damage: 35, cost: 75, emoji: "🪓", range: 4, projectile: false },
  spear: { name: "Speer", damage: 25, cost: 60, emoji: "🔱", range: 6, projectile: true, speed: 25, color: 0x8b4513 },
  bow: { name: "Bogen", damage: 40, cost: 100, emoji: "🏹", range: 50, projectile: true, speed: 30, color: 0x8b4513 },
  pistol: { name: "Pistole", damage: 50, cost: 200, emoji: "🔫", range: 80, projectile: true, speed: 50, color: 0xffff00 },
  rifle: { name: "Gewehr", damage: 70, cost: 400, emoji: "🔫", range: 100, projectile: true, speed: 60, color: 0xff8800 },
  shotgun: { name: "Schrotflinte", damage: 80, cost: 500, emoji: "💥", range: 30, projectile: true, speed: 40, color: 0xff0000, spread: 3 },
  sniper: { name: "Scharfschütze", damage: 120, cost: 800, emoji: "🎯", range: 150, projectile: true, speed: 80, color: 0x00ffff },
  rpg: { name: "RPG", damage: 200, cost: 1500, emoji: "🚀", range: 100, projectile: true, speed: 35, color: 0xff0000, explosive: true },
  minigun: { name: "Minigun", damage: 45, cost: 1200, emoji: "⚡", range: 70, projectile: true, speed: 70, color: 0xffaa00, rapid: true }
};

const SKINS = [
  { name: "Steve", url: "https://minotar.net/armor/body/steve/100.png" },
  { name: "Alex", url: "https://minotar.net/armor/body/alex/100.png" },
  { name: "Creeper", url: "https://minotar.net/armor/body/Notch/100.png" },
  { name: "Enderman", url: "https://minotar.net/armor/body/Herobrine/100.png" }
];

const ANIMALS = ['🐷', '🐮', '🐔', '🐑'];

/* ========= SKIN SELECTION ========= */
let skinSelected = false;

function showSkinSelector() {
  const selector = document.createElement('div');
  selector.id = 'skinSelector';
  selector.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.95);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; z-index: 200; overflow-y: auto;
  `;
  
  selector.innerHTML = `
    <h2 style="color: white; margin-bottom: 20px; font-size: 2em;">Wähle deinen Skin</h2>
    <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; padding: 20px;">
      ${SKINS.map((skin, i) => `
        <div class="skinOption" data-index="${i}" style="
          cursor: pointer; padding: 15px; background: rgba(255,255,255,0.1);
          border: 3px solid white; border-radius: 10px; text-align: center;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          <img src="${skin.url}" style="width: 100px; height: 100px; image-rendering: pixelated;">
          <p style="color: white; margin-top: 10px; font-size: 1.2em;">${skin.name}</p>
        </div>
      `).join('')}
    </div>
  `;
  
  document.body.appendChild(selector);
  
  document.querySelectorAll('.skinOption').forEach(opt => {
    opt.onclick = () => {
      gameState.skin = SKINS[opt.dataset.index].url;
      selector.remove();
      skinSelected = true;
      $("login").style.display = "flex";
    };
  });
}

/* ========= SHOP ========= */
function showShop() {
  const shop = document.createElement('div');
  shop.id = 'shop';
  shop.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.95);
    display: flex; flex-direction: column; align-items: center;
    justify-content: flex-start; z-index: 150; overflow-y: auto; padding: 20px;
  `;
  
  shop.innerHTML = `
    <h2 style="color: gold; margin-bottom: 10px; font-size: 2em;">🏪 SHOP</h2>
    <p style="color: white; margin-bottom: 20px;">Deine Münzen: 🪙 ${gameState.coins}</p>
    <button onclick="this.parentElement.remove()" style="
      position: absolute; top: 20px; right: 20px; padding: 10px 20px;
      font-size: 1.5em; background: red; color: white; border: none;
      border-radius: 10px; cursor: pointer;
    ">❌</button>
    
    <h3 style="color: white; margin-top: 20px;">⚔️ Waffen</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; width: 100%; max-width: 1000px; margin-bottom: 30px;">
      ${Object.entries(WEAPONS).map(([key, w]) => `
        <div class="shopItem" style="
          padding: 15px; background: ${gameState.weapon === key ? 'rgba(0,255,0,0.3)' : 'rgba(255,255,255,0.1)'};
          border: 2px solid ${gameState.weapon === key ? 'lime' : 'white'}; border-radius: 10px;
          text-align: center; cursor: ${w.cost <= gameState.coins || gameState.weapon === key ? 'pointer' : 'not-allowed'};
          opacity: ${w.cost <= gameState.coins || gameState.weapon === key ? '1' : '0.5'};
        " onclick="buyWeapon('${key}')">
          <div style="font-size: 3em;">${w.emoji}</div>
          <p style="color: white; font-size: 1.1em; margin: 5px 0;">${w.name}</p>
          <p style="color: yellow;">💥 ${w.damage} Schaden</p>
          <p style="color: cyan;">📏 ${w.range}m Reichweite</p>
          <p style="color: gold; font-size: 1.2em; margin-top: 5px;">
            ${gameState.weapon === key ? '✅ Ausgerüstet' : w.cost === 0 ? 'Gratis' : `🪙 ${w.cost}`}
          </p>
        </div>
      `).join('')}
    </div>
    
    <h3 style="color: white; margin-top: 20px;">📦 Blöcke kaufen</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; width: 100%; max-width: 800px;">
      ${['grass', 'dirt', 'stone', 'sand'].map(block => `
        <div style="
          padding: 15px; background: rgba(255,255,255,0.1);
          border: 2px solid white; border-radius: 10px; text-align: center;
          cursor: pointer;
        " onclick="buyBlocks('${block}')">
          <div style="font-size: 2em;">${getBlockEmoji(block)}</div>
          <p style="color: white; margin: 5px 0;">10x ${block}</p>
          <p style="color: gold; font-size: 1.2em;">🪙 5</p>
        </div>
      `).join('')}
    </div>
  `;
  
  document.body.appendChild(shop);
}

window.buyWeapon = (key) => {
  const weapon = WEAPONS[key];
  if (gameState.weapon === key) return;
  if (weapon.cost > gameState.coins) return;
  
  gameState.coins -= weapon.cost;
  gameState.weapon = key;
  updateUI();
  $('shop').remove();
  showShop();
};

window.buyBlocks = (block) => {
  if (gameState.coins < 5) return;
  gameState.coins -= 5;
  gameState.inventory[block] += 10;
  updateUI();
};

/* ========= LOGIN ========= */
$("startBtn").onclick = () => {
  if (!$("nameInput").value.trim()) return;
  gameState.playerName = $("nameInput").value.trim();
  $("login").style.display = "none";
  init();
};

setTimeout(() => showSkinSelector(), 100);

function getBlockEmoji(type) {
  const emojis = { grass: "🟩", dirt: "🟫", stone: "⬜", sand: "🟨", water: "💧" };
  return emojis[type] || "⬜";
}

function updateUI() {
  $("health").textContent = `❤️ ${gameState.health}`;
  $("hunger").textContent = `🍖 ${gameState.hunger}%`;
  $("coins").textContent = `🪙 ${gameState.coins} | ${WEAPONS[gameState.weapon].emoji} ${WEAPONS[gameState.weapon].name}`;
  
  const hotbar = $("hotbar");
  hotbar.innerHTML = "";
  for (const [block, count] of Object.entries(gameState.inventory)) {
    if (block === 'water') continue;
    const slot = document.createElement("div");
    slot.style.cssText = `
      width:70px; height:70px; 
      background: url('${block}.png') center/cover, rgba(0,0,0,0.7);
      border:3px solid ${block === gameState.selectedBlock ? "yellow" : "white"};
      color:white; display:flex; align-items:flex-end; 
      justify-content:center; border-radius:4px; cursor:pointer;
      position: relative;
    `;
    slot.innerHTML = `<div style="background: rgba(0,0,0,0.8); padding: 2px 8px; border-radius: 3px; font-size:14px; font-weight: bold;">${count}</div>`;
    slot.onclick = () => {
      gameState.selectedBlock = block;
      updateUI();
    };
    hotbar.appendChild(slot);
  }
}

function init() {
  updateUI();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(100, 200, 100);
  scene.add(sun);

  const loader = new THREE.TextureLoader();
  const tex = n => {
    const t = loader.load(n);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
  };
  const textures = {
    grass: tex("grass.png"),
    dirt: tex("dirt.png"),
    stone: tex("stone.png"),
    sand: tex("sand.png"),
    water: tex("water.png")
  };

  const player = {
    pos: new THREE.Vector3(0, 30, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: false
  };

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const blocks = [];
  const world = new Map();
  const animals = [];
  const CHUNK = 16;
  const chunks = new Set();
  const key = (x, y, z) => `${x},${y},${z}`;

  function noise(x, z) {
    let n = 0;
    n += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 8;
    n += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 4;
    n += Math.sin(x * 0.3) * Math.cos(z * 0.3) * 2;
    return n;
  }

  function getBiome(x, z) {
    const heat = Math.sin(x * 0.03) * Math.cos(z * 0.03);
    const moisture = Math.sin(x * 0.04 + 100) * Math.cos(z * 0.04 + 100);
    if (heat < -0.3) return 'mountains';
    if (moisture > 0.4) return 'water';
    if (heat > 0.3) return 'desert';
    return 'plains';
  }

  function heightAt(x, z) {
    const biome = getBiome(x, z);
    const baseNoise = noise(x, z);
    switch(biome) {
      case 'mountains':
        return Math.floor(15 + baseNoise * 2 + Math.abs(Math.sin(x * 0.08) * Math.cos(z * 0.08)) * 15);
      case 'water':
        return 3;
      case 'desert':
        return Math.floor(6 + baseNoise * 0.5);
      case 'plains':
        return Math.floor(8 + baseNoise);
      default:
        return 8;
    }
  }

  function getBlockType(x, y, z, h, biome) {
    if (biome === 'water' && y <= 4) {
      return y === 4 ? 'water' : y === 3 ? 'sand' : y < 3 ? 'stone' : 'dirt';
    }
    if (biome === 'desert') {
      return y === h ? 'sand' : y < h - 2 ? 'stone' : 'sand';
    }
    if (biome === 'mountains') {
      return y > h - 3 ? 'stone' : y === h ? 'grass' : y < h - 4 ? 'stone' : 'dirt';
    }
    return y === h ? 'grass' : y < h - 2 ? 'stone' : 'dirt';
  }

  function addBlock(x, y, z, type) {
    const k = key(x, y, z);
    if (world.has(k)) return;
    const mat = new THREE.MeshLambertMaterial({ 
      map: textures[type],
      transparent: type === 'water',
      opacity: type === 'water' ? 0.7 : 1
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x + 0.5, y + 0.5, z + 0.5);
    scene.add(m);
    blocks.push({ x, y, z, mesh: m, type });
    world.set(k, type);
  }

  function spawnAnimal(x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '48px Arial';
    const emoji = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    ctx.fillText(emoji, 8, 48);
    
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.position.set(x + 0.5, y + 1, z + 0.5);
    sprite.scale.set(1.5, 1.5, 1);
    sprite.userData.isAnimal = true;
    sprite.userData.health = 20;
    sprite.userData.emoji = emoji;
    scene.add(sprite);
    animals.push(sprite);
  }

  function genChunk(cx, cz) {
    const ck = `${cx},${cz}`;
    if (chunks.has(ck)) return;
    chunks.add(ck);
    
    for (let x = cx; x < cx + CHUNK; x++)
      for (let z = cz; z < cz + CHUNK; z++) {
        const biome = getBiome(x, z);
        const h = heightAt(x, z);
        for (let y = 0; y <= h; y++) {
          const blockType = getBlockType(x, y, z, h, biome);
          addBlock(x, y, z, blockType);
        }
        if (biome === 'water' && h < 4) {
          for (let y = h + 1; y <= 4; y++) {
            addBlock(x, y, z, 'water');
          }
        }
        if (Math.random() < 0.01 && biome !== 'water') {
          spawnAnimal(x, h, z);
        }
      }
  }

  function groundY(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    for (let y = 50; y >= -5; y--) {
      if (world.has(key(xi, y, zi))) return y + 1;
    }
    return -Infinity;
  }

  let jx = 0, jy = 0;
  const joyBase = $("joyBase");
  const joyStick = $("joyStick");
  let joyActive = false;
  let joyStartX = 0, joyStartY = 0;

  joyBase.addEventListener("touchstart", e => {
    e.preventDefault();
    joyActive = true;
    const rect = joyBase.getBoundingClientRect();
    joyStartX = rect.left + rect.width / 2;
    joyStartY = rect.top + rect.height / 2;
  });

  document.addEventListener("touchmove", e => {
    if (!joyActive) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - joyStartX;
    const dy = joyStartY - t.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 40;
    if (dist > maxDist) {
      jx = (dx / dist) * (maxDist / 40);
      jy = (dy / dist) * (maxDist / 40);
      joyStick.style.left = `${40 + (dx / dist) * maxDist}px`;
      joyStick.style.top = `${40 - (dy / dist) * maxDist}px`;
    } else {
      jx = dx / 40;
      jy = dy / 40;
      joyStick.style.left = `${40 + dx}px`;
      joyStick.style.top = `${40 - dy}px`;
    }
  });

  document.addEventListener("touchend", e => {
    if (joyActive) {
      e.preventDefault();
      joyActive = false;
      jx = jy = 0;
      joyStick.style.left = "40px";
      joyStick.style.top = "40px";
    }
  });

  let drag = false, lx = 0, ly = 0;
  let touchId = null;
  
  document.addEventListener("touchstart", e => {
    if (e.target.closest('#joyBase') || e.target.closest('.control') || e.target.closest('#hotbar')) {
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    touchId = touch.identifier;
    lx = touch.clientX;
    ly = touch.clientY;
    drag = true;
  }, { passive: false });
  
  document.addEventListener("touchmove", e => {
    if (!drag || touchId === null) return;
    e.preventDefault();
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;
    const dx = touch.clientX - lx;
    const dy = touch.clientY - ly;
    player.yaw -= dx * 0.003;
    player.pitch -= dy * 0.003;
    player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
    lx = touch.clientX;
    ly = touch.clientY;
  }, { passive: false });
  
  document.addEventListener("touchend", e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        drag = false;
        touchId = null;
        break;
      }
    }
  });
  
  document.addEventListener("mousedown", e => {
    if (e.target.closest('#joyBase') || e.target.closest('.control') || e.target.closest('#hotbar')) {
      return;
    }
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
  });
  
  document.addEventListener("mouseup", () => {
    drag = false;
  });
  
  document.addEventListener("mousemove", e => {
    if (!drag) return;
    player.yaw -= (e.clientX - lx) * 0.002;
    player.pitch -= (e.clientY - ly) * 0.002;
    player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
    lx = e.clientX;
    ly = e.clientY;
  });

  const ray = new THREE.Raycaster();
  ray.far = 10;

  function getHit() {
    const dir = new THREE.Vector3(
      Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      Math.cos(player.yaw) * Math.cos(player.pitch)
    ).normalize();
    ray.set(camera.position, dir);
    const hits = ray.intersectObjects(blocks.map(b => b.mesh));
    return hits.length > 0 ? hits[0] : null;
  }

  function getAnimalHit() {
    const dir = new THREE.Vector3(
      Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      Math.cos(player.yaw) * Math.cos(player.pitch)
    ).normalize();
    ray.set(camera.position, dir);
    const hits = ray.intersectObjects(animals);
    return hits.length > 0 ? hits[0] : null;
  }

  function shootProjectile() {
    const weapon = WEAPONS[gameState.weapon];
    if (!weapon.projectile) return;

    const projGeo = weapon.emoji === '🏹' ? 
      new THREE.ConeGeometry(0.1, 0.5, 8) : 
      new THREE.SphereGeometry(0.15);
    
    const projMat = new THREE.MeshBasicMaterial({ color: weapon.color });
    const proj = new THREE.Mesh(projGeo, projMat);
    proj.position.copy(camera.position);
    
    const dir = new THREE.Vector3(
      Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      Math.cos(player.yaw) * Math.cos(player.pitch)
    ).normalize();
    
    if (weapon.spread) {
      for (let i = 0; i < weapon.spread; i++) {
        const spread = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );
        const spreadDir = dir.clone().add(spread).normalize();
        const spreadProj = proj.clone();
        spreadProj.userData.velocity = spreadDir.multiplyScalar(weapon.speed);
        spreadProj.userData.damage = weapon.damage;
        spreadProj.userData.life = 5;
        spreadProj.userData.isProjectile = true;
        scene.add(spreadProj);
      }
    } else {
      proj.userData.velocity = dir.multiplyScalar(weapon.speed);
      proj.userData.damage = weapon.damage;
      proj.userData.life = 5;
      proj.userData.isProjectile = true;
      proj.userData.explosive = weapon.explosive;
      scene.add(proj);
    }
  }

  $("mine").onclick = () => {
    const h = getHit();
    if (!h || h.distance > 5) return;
    const p = h.object.position;
    const x = Math.floor(p.x - 0.5), y = Math.floor(p.y - 0.5), z = Math.floor(p.z - 0.5);
    const i = blocks.findIndex(b => b.x === x && b.y === y && b.z === z);
    if (i > -1) {
      const blockType = blocks[i].type;
      if (blockType !== 'water') {
        gameState.inventory[blockType]++;
      }
      scene.remove(blocks[i].mesh);
      blocks.splice(i, 1);
      world.delete(key(x, y, z));
      updateUI();
    }
  };

  $("build").onclick = () => {
    if (gameState.inventory[gameState.selectedBlock] <= 0) return;
    const h = getHit();
    if (!h || h.distance > 5) return;
    const p = h.object.position, n = h.face.normal;
    addBlock(
      Math.floor(p.x - 0.5 + n.x),
      Math.floor(p.y - 0.5 + n.y),
      Math.floor(p.z - 0.5 + n.z),
      gameState.selectedBlock
    );
    gameState.inventory[gameState.selectedBlock]--;
    updateUI();
  };

  $("jump").onclick = () => {
    if (player.onGround) {
      player.vel.y = 8;
      player.onGround = false;
    }
  };

  $("shoot").onclick = () => {
    const weapon = WEAPONS[gameState.weapon];
    if (weapon.projectile) {
      shootProjectile();
    } else {
      const h = getAnimalHit();
      if (h && h.distance <= weapon.range) {
        const animal = h.object;
        animal.userData.health -= weapon.damage;
        if (animal.userData.health <= 0) {
          scene.remove(animal);
          animals.splice(animals.indexOf(animal), 1);
          gameState.coins += 5;
          gameState.meat += 1;
          updateUI();
        }
      }
    }
  };

  $("eatMeat").onclick = () => {
    if (gameState.meat > 0 && gameState.hunger < 100) {
      gameState.meat--;
      gameState.hunger = Math.min(100, gameState.hunger + 30);
      updateUI();
    }
  };

  // Shop Button
  const shopBtn = document.createElement('div');
  shopBtn.className = 'control';
  shopBtn.style.cssText = 'top: 80px; right: 15px; bottom: auto;';
  shopBtn.textContent = '🏪 SHOP';
  shopBtn.onclick = showShop;
  document.body.appendChild(shopBtn);

  let hungerTimer = 0;
  let damageTimer = 0;

  function respawn() {
    player.pos.set(0, 30, 0);
    player.vel.set(0, 0, 0);
    gameState.health = 100;
    gameState.hunger = Math.max(0, gameState.hunger - 50);
    updateUI();
    
    const deathMsg = document.createElement('div');
    deathMsg.style.cssText = `
      position: fixed; inset: 0; background: rgba(255,0,0,0.8);
      display: flex; align-items: center; justify-content: center;
      z-index: 180; font-size: 3em; color: white; font-weight: bold;
    `;
    deathMsg.textContent = '💀 Du bist gestorben!';
    document.body.appendChild(deathMsg);
    setTimeout(() => deathMsg.remove(), 2000);
  }

  const clock = new THREE.Clock();
  
  function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();

    const cx = Math.floor(player.pos.x / CHUNK) * CHUNK;
    const cz = Math.floor(player.pos.z / CHUNK) * CHUNK;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        genChunk(cx + dx * CHUNK, cz + dz * CHUNK);

    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    player.pos.add(forward.multiplyScalar(jy * 6 * dt));
    player.pos.add(right.multiplyScalar(jx * 6 * dt));

    player.vel.y -= 20 * dt;
    player.pos.y += player.vel.y * dt;

    const gy = groundY(player.pos.x, player.pos.z);
    if (player.pos.y <= gy) {
      player.pos.y = gy;
      player.vel.y = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    // Tod durch Fall
    if (player.pos.y < -10) {
      respawn();
    }

    // Hunger System
    hungerTimer += dt;
    if (hungerTimer >= 10) {
      hungerTimer = 0;
      gameState.hunger = Math.max(0, gameState.hunger - 1);
      updateUI();
    }

    if (gameState.hunger === 0) {
      damageTimer += dt;
      if (damageTimer >= 5) {
        damageTimer = 0;
        gameState.health = Math.max(0, gameState.health - 1);
        updateUI();
        if (gameState.health === 0) {
          respawn();
        }
      }
    }

    // Projectile physics
    scene.children.forEach(obj => {
      if (obj.userData.isProjectile) {
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(dt));
        obj.userData.life -= dt;
        
        // Check animal collision
        animals.forEach(animal => {
          if (obj.position.distanceTo(animal.position) < 1) {
            animal.userData.health -= obj.userData.damage;
            if (animal.userData.health <= 0) {
              scene.remove(animal);
              animals.splice(animals.indexOf(animal), 1);
              gameState.coins += 5;
              gameState.meat += 1;
              updateUI();
            }
            scene.remove(obj);
          }
        });
        
        if (obj.userData.life <= 0) {
          if (obj.userData.explosive) {
            // Explosion effect
            const explosionGeo = new THREE.SphereGeometry(3, 16, 16);
            const explosionMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6 });
            const explosion = new THREE.Mesh(explosionGeo, explosionMat);
            explosion.position.copy(obj.position);
            scene.add(explosion);
            setTimeout(() => scene.remove(explosion), 300);
          }
          scene.remove(obj);
        }
      }
    });

    camera.position.set(player.pos.x, player.pos.y + 1.6, player.pos.z);
    camera.lookAt(
      camera.position.x + Math.sin(player.yaw) * Math.cos(player.pitch),
      camera.position.y + Math.sin(player.pitch),
      camera.position.z + Math.cos(player.yaw) * Math.cos(player.pitch)
    );

    renderer.render(scene, camera);
  }
  
  loop();
}
