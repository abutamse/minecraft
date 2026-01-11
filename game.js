import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

const $ = id => document.getElementById(id);

const gameState = {
  health: 100,
  hunger: 100,
  coins: 0,
  meat: 0,
  inventory: { grass: 0, dirt: 10, stone: 0, sand: 0, wood: 0, leaves: 0 },
  selectedBlock: "dirt",
  weapon: "fist",
  skin: "steve",
  playerName: "",
  ownedWeapons: ["fist"]
};

const WEAPONS = {
  fist: { name: "Faust", damage: 20, cost: 0, emoji: "👊", range: 4, projectile: false },
  knife: { name: "Messer", damage: 30, cost: 10, emoji: "🔪", range: 4, projectile: false },
  sword: { name: "Schwert", damage: 50, cost: 50, emoji: "⚔️", range: 5, projectile: false },
  axe: { name: "Axt", damage: 60, cost: 75, emoji: "🪓", range: 5, projectile: false },
  spear: { name: "Speer", damage: 40, cost: 60, emoji: "🔱", range: 8, projectile: true, speed: 25, color: 0x8b4513 },
  bow: { name: "Bogen", damage: 70, cost: 100, emoji: "🏹", range: 50, projectile: true, speed: 30, color: 0x8b4513 },
  pistol: { name: "Pistole", damage: 80, cost: 200, emoji: "🔫", range: 80, projectile: true, speed: 50, color: 0xffff00 },
  rifle: { name: "Gewehr", damage: 100, cost: 400, emoji: "🔫", range: 100, projectile: true, speed: 60, color: 0xff8800 },
  shotgun: { name: "Schrotflinte", damage: 120, cost: 500, emoji: "💥", range: 30, projectile: true, speed: 40, color: 0xff0000, spread: 3 },
  sniper: { name: "Scharfschütze", damage: 150, cost: 800, emoji: "🎯", range: 150, projectile: true, speed: 80, color: 0x00ffff },
  rpg: { name: "RPG", damage: 300, cost: 1500, emoji: "🚀", range: 100, projectile: true, speed: 35, color: 0xff0000, explosive: true },
  minigun: { name: "Minigun", damage: 80, cost: 1200, emoji: "⚡", range: 70, projectile: true, speed: 70, color: 0xffaa00 }
};

const SKINS = [
  { name: "Steve", url: "https://minotar.net/armor/body/steve/100.png" },
  { name: "Alex", url: "https://minotar.net/armor/body/alex/100.png" },
  { name: "Creeper", url: "https://minotar.net/armor/body/Notch/100.png" },
  { name: "Enderman", url: "https://minotar.net/armor/body/Herobrine/100.png" }
];

const ANIMALS = ['🐷', '🐮', '🐔', '🐑'];

function showSkinSelector() {
  const selector = document.createElement('div');
  selector.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:200;';
  selector.innerHTML = `
    <h2 style="color:white;margin-bottom:20px;font-size:2em;">Wähle deinen Skin</h2>
    <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;padding:20px;">
      ${SKINS.map((skin, i) => `
        <div class="skinOption" data-index="${i}" style="cursor:pointer;padding:15px;background:rgba(255,255,255,0.1);border:3px solid white;border-radius:10px;text-align:center;">
          <img src="${skin.url}" style="width:100px;height:100px;image-rendering:pixelated;">
          <p style="color:white;margin-top:10px;font-size:1.2em;">${skin.name}</p>
        </div>
      `).join('')}
    </div>
  `;
  document.body.appendChild(selector);
  document.querySelectorAll('.skinOption').forEach(opt => {
    opt.onclick = () => {
      gameState.skin = SKINS[opt.dataset.index].url;
      selector.remove();
      $("login").style.display = "flex";
    };
  });
}

function showShop() {
  const shop = document.createElement('div');
  shop.id = 'shop';
  shop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:150;overflow-y:scroll;padding:20px;';
  shop.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;">
      <h2 style="color:gold;text-align:center;font-size:2em;margin-bottom:10px;">🏪 SHOP</h2>
      <p style="color:white;text-align:center;font-size:1.3em;margin-bottom:20px;">Deine Münzen: 🪙 ${gameState.coins}</p>
      <button id="closeShop" style="position:fixed;top:20px;right:20px;padding:10px 20px;font-size:1.5em;background:red;color:white;border:none;border-radius:10px;cursor:pointer;z-index:151;">❌</button>
      
      <h3 style="color:white;margin:20px 0;font-size:1.5em;">⚔️ Waffen</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:30px;">
        ${Object.entries(WEAPONS).map(([key, w]) => {
          const owned = gameState.ownedWeapons.includes(key);
          const equipped = gameState.weapon === key;
          return `
          <div class="shopItem" data-weapon="${key}" style="padding:15px;background:${equipped ? 'rgba(0,255,0,0.3)' : owned ? 'rgba(100,100,255,0.2)' : 'rgba(255,255,255,0.1)'};border:2px solid ${equipped ? 'lime' : owned ? 'cyan' : 'white'};border-radius:10px;text-align:center;cursor:pointer;">
            <div style="font-size:3em;">${w.emoji}</div>
            <p style="color:white;font-size:1.1em;margin:5px 0;">${w.name}</p>
            <p style="color:yellow;">💥 ${w.damage} Schaden</p>
            <p style="color:cyan;">📏 ${w.range}m</p>
            <p style="color:gold;font-size:1.2em;">${equipped ? '✅ Ausgerüstet' : owned ? '👆 Ausrüsten' : w.cost === 0 ? 'Gratis' : `🪙 ${w.cost}`}</p>
          </div>`;
        }).join('')}
      </div>
      
      <h3 style="color:white;margin:20px 0;font-size:1.5em;">📦 Blöcke kaufen</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
        ${['grass', 'dirt', 'stone', 'sand', 'wood', 'leaves'].map(block => `
          <div class="buyBlock" data-block="${block}" style="padding:15px;background:rgba(255,255,255,0.1);border:2px solid white;border-radius:10px;text-align:center;cursor:pointer;">
            <div style="font-size:2em;">${{grass:"🟩",dirt:"🟫",stone:"⬜",sand:"🟨",wood:"🪵",leaves:"🍃"}[block]}</div>
            <p style="color:white;margin:5px 0;">10x ${block}</p>
            <p style="color:gold;font-size:1.2em;">🪙 5</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(shop);
  
  $('closeShop').onclick = () => shop.remove();
  
  document.querySelectorAll('.shopItem').forEach(el => {
    el.onclick = () => {
      const key = el.dataset.weapon;
      const weapon = WEAPONS[key];
      const owned = gameState.ownedWeapons.includes(key);
      if (owned) {
        gameState.weapon = key;
        updateUI();
        shop.remove();
        showShop();
      } else if (weapon.cost <= gameState.coins) {
        gameState.coins -= weapon.cost;
        gameState.ownedWeapons.push(key);
        gameState.weapon = key;
        updateUI();
        shop.remove();
        showShop();
      }
    };
  });
  
  document.querySelectorAll('.buyBlock').forEach(el => {
    el.onclick = () => {
      const block = el.dataset.block;
      if (gameState.coins >= 5) {
        gameState.coins -= 5;
        gameState.inventory[block] += 10;
        updateUI();
      }
    };
  });
}

$("startBtn").onclick = () => {
  if (!$("nameInput").value.trim()) return;
  gameState.playerName = $("nameInput").value.trim();
  $("login").style.display = "none";
  init();
};

setTimeout(() => showSkinSelector(), 100);

function updateUI() {
  $("health").textContent = `❤️ ${gameState.health}`;
  $("hunger").textContent = `🍖 ${gameState.hunger}% | 🥩 ${gameState.meat}`;
  $("coins").textContent = `🪙 ${gameState.coins} | ${WEAPONS[gameState.weapon].emoji}`;
  
  const hotbar = $("hotbar");
  hotbar.innerHTML = "";
  for (const [block, count] of Object.entries(gameState.inventory)) {
    if (block === 'water') continue;
    const slot = document.createElement("div");
    slot.style.cssText = `width:70px;height:70px;background:url('${block}.png') center/cover,rgba(0,0,0,0.7);border:3px solid ${block === gameState.selectedBlock ? "yellow" : "white"};color:white;display:flex;align-items:flex-end;justify-content:center;border-radius:4px;cursor:pointer;`;
    slot.innerHTML = `<div style="background:rgba(0,0,0,0.8);padding:2px 8px;border-radius:3px;font-size:14px;font-weight:bold;">${count}</div>`;
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
    water: tex("water.png"),
    wood: tex("wood.png"),
    leaves: tex("leaves.png")
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
    if (moisture < -0.2) return 'forest';
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
      case 'forest':
        return Math.floor(9 + baseNoise);
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
    if (biome === 'forest') {
      return y === h ? 'grass' : y === h - 1 ? 'dirt' : 'stone';
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
    sprite.userData.health = 50;
    sprite.userData.emoji = emoji;
    sprite.userData.moveDir = Math.random() * Math.PI * 2;
    sprite.userData.moveTimer = 0;
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
        
        if (biome === 'forest' && Math.random() < 0.05) {
          for (let ty = 1; ty <= 5; ty++) {
            addBlock(x, h + ty, z, 'wood');
          }
          for (let lx = -2; lx <= 2; lx++)
            for (let lz = -2; lz <= 2; lz++)
              for (let ly = 0; ly <= 2; ly++)
                if (Math.abs(lx) + Math.abs(lz) < 4)
                  addBlock(x + lx, h + 4 + ly, z + lz, 'leaves');
        }
        
        if (biome === 'water' && h < 4) {
          for (let y = h + 1; y <= 4; y++) {
            addBlock(x, y, z, 'water');
          }
        }
        if (Math.random() < 0.02 && biome !== 'water') {
          spawnAnimal(x, h, z);
        }
      }
  }

  function groundY(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    for (let y = 50; y >= -5; y--) {
      const k = key(xi, y, zi);
      if (world.has(k) && world.get(k) !== 'water') return y + 1;
    }
    return -Infinity;
  }

  let jx = 0, jy = 0;
  const joyBase = $("joyBase");
  const joyStick = $("joyStick");
  let joyActive = false;

  joyBase.addEventListener("touchstart", e => {
    e.preventDefault();
    joyActive = true;
    const rect = joyBase.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    joyBase.dataset.startX = startX;
    joyBase.dataset.startY = startY;
  });

  document.addEventListener("touchmove", e => {
    if (!joyActive) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - parseFloat(joyBase.dataset.startX);
    const dy = parseFloat(joyBase.dataset.startY) - t.clientY;
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
  }, { passive: false });

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
    if (e.target.closest('#joyBase') || e.target.closest('.control') || e.target.closest('#hotbar') || e.target.closest('#shop')) return;
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
    if (e.target.closest('#joyBase') || e.target.closest('.control') || e.target.closest('#hotbar') || e.target.closest('#shop')) return;
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

  function getDirection() {
    return new THREE.Vector3(
      Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      Math.cos(player.yaw) * Math.cos(player.pitch)
    ).normalize();
  }

  function getHit() {
    const dir = getDirection();
    ray.set(camera.position, dir);
    ray.far = 10;
    const hits = ray.intersectObjects(blocks.map(b => b.mesh));
    return hits.length > 0 ? hits[0] : null;
  }

  function getAnimalHit() {
    const dir = getDirection();
    ray.set(camera.position, dir);
    ray.far = WEAPONS[gameState.weapon].range;
    const hits = ray.intersectObjects(animals);
    return hits.length > 0 ? hits[0] : null;
  }

  function shootProjectile() {
    const w = WEAPONS[gameState.weapon];
    if (!w.projectile) return;
    const pGeo = w.emoji === '🏹' ? new THREE.ConeGeometry(0.15, 0.6, 8) : new THREE.SphereGeometry(0.2);
    const pMat = new THREE.MeshBasicMaterial({ color: w.color });
    const proj = new THREE.Mesh(pGeo, pMat);
    proj.position.copy(camera.position);
    const dir = getDirection();
    
    if (w.spread) {
      for (let i = 0; i < w.spread; i++) {
        const sp = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        const sDir = dir.clone().add(sp).normalize();
        const sProj = proj.clone();
        sProj.userData.velocity = sDir.multiplyScalar(w.speed);
        sProj.userData.damage = w.damage;
        sProj.userData.life = 5;
        sProj.userData.isProjectile = true;
        scene.add(sProj);
      }
    } else {
      proj.userData.velocity = dir.multiplyScalar(w.speed);
      proj.userData.damage = w.damage;
      proj.userData.life = 5;
      proj.userData.isProjectile = true;
      proj.userData.explosive = w.explosive;
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
    const w = WEAPONS[gameState.weapon];
    if (w.projectile) {
      shootProjectile();
    } else {
      const h = getAnimalHit();
      if (h && h.distance <= w.range) {
        const an = h.object;
        an.userData.health -= w.damage;
        if (an.userData.health <= 0) {
          scene.remove(an);
          animals.splice(animals.indexOf(an), 1);
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

  const shopBtn = document.createElement('div');
  shopBtn.className = 'control';
  shopBtn.style.cssText = 'top:80px;right:15px;bottom:auto;';
  shopBtn.textContent = '🏪';
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
    deathMsg.style.cssText = 'position:fixed;inset:0;background:rgba(255,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:180;font-size:3em;color:white;font-weight:bold;';
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

    if (player.pos.y < -10) {
      respawn();
    }

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

    animals.forEach(animal => {
      animal.userData.moveTimer += dt;
      if (animal.userData.moveTimer > 2) {
        animal.userData.moveDir = Math.random() * Math.PI * 2;
        animal.userData.moveTimer = 0;
      }
      animal.position.x += Math.sin(animal.userData.moveDir) * 0.5 * dt;
      animal.position.z += Math.cos(animal.userData.moveDir) * 0.5 * dt;
      const ay = groundY(animal.position.x, animal.position.z);
      if (ay > -Infinity) animal.position.y = ay + 1;
    });

    scene.children.forEach(obj => {
      if (obj.userData.isProjectile) {
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(dt));
        obj.userData.life -= dt;
        
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
      
      if (obj.userData.isParticle) {
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(dt));
        obj.userData.velocity.y -= 10 * dt;
        obj.userData.life -= dt;
        if (obj.userData.life <= 0) {
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
