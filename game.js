import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

const $ = id => document.getElementById(id);

const gameState = {
  health: 100,
  hunger: 100,
  coins: 100,
  meat: 0,
  inventory: { grass: 0, dirt: 10, stone: 0, sand: 0, wood: 0, leaves: 0 },
  selectedBlock: "dirt",
  weapon: "fist",
  skin: "steve",
  playerName: "",
  ownedWeapons: ["fist"]
};

const WEAPONS = {
  fist: { name: "Faust", damage: 50, cost: 0, emoji: "👊", range: 5, projectile: false },
  knife: { name: "Messer", damage: 100, cost: 10, emoji: "🔪", range: 5, projectile: false },
  sword: { name: "Schwert", damage: 150, cost: 50, emoji: "⚔️", range: 6, projectile: false },
  axe: { name: "Axt", damage: 160, cost: 75, emoji: "🪓", range: 6, projectile: false },
  spear: { name: "Speer", damage: 120, cost: 60, emoji: "🔱", range: 8, projectile: true, speed: 25, color: 0x8b4513 },
  bow: { name: "Bogen", damage: 200, cost: 100, emoji: "🏹", range: 50, projectile: true, speed: 30, color: 0x8b4513 },
  pistol: { name: "Pistole", damage: 250, cost: 200, emoji: "🔫", range: 80, projectile: true, speed: 50, color: 0xffff00 },
  rifle: { name: "Gewehr", damage: 300, cost: 400, emoji: "🔫", range: 100, projectile: true, speed: 60, color: 0xff8800 },
  shotgun: { name: "Schrotflinte", damage: 350, cost: 500, emoji: "💥", range: 30, projectile: true, speed: 40, color: 0xff0000, spread: 3 },
  sniper: { name: "Scharfschütze", damage: 450, cost: 800, emoji: "🎯", range: 150, projectile: true, speed: 80, color: 0x00ffff },
  rpg: { name: "RPG", damage: 600, cost: 1500, emoji: "🚀", range: 100, projectile: true, speed: 35, color: 0xff0000, explosive: true },
  minigun: { name: "Minigun", damage: 280, cost: 1200, emoji: "⚡", range: 70, projectile: true, speed: 70, color: 0xffaa00 }
};

const SKINS = [
  { name: "Steve", url: "https://minotar.net/armor/body/steve/100.png" },
  { name: "Alex", url: "https://minotar.net/armor/body/alex/100.png" },
  { name: "Creeper", url: "https://minotar.net/armor/body/Notch/100.png" },
  { name: "Enderman", url: "https://minotar.net/armor/body/Herobrine/100.png" }
];

const ANIMALS = ['🐷', '🐮', '🐔', '🐑'];

function showSkinSelector() {
  const s = document.createElement('div');
  s.id = 'skinSelector';
  s.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:200;';
  s.innerHTML = `<h2 style="color:white;font-size:2em;margin:20px;">Wähle deinen Skin</h2>
    <div style="display:flex;gap:20px;flex-wrap:wrap;">${SKINS.map((sk, i) => 
    `<div class="skin-opt" data-i="${i}" style="cursor:pointer;padding:15px;background:rgba(255,255,255,0.1);border:3px solid white;border-radius:10px;text-align:center;">
      <img src="${sk.url}" style="width:100px;height:100px;image-rendering:pixelated;">
      <p style="color:white;margin-top:10px;font-size:1.2em;">${sk.name}</p>
    </div>`).join('')}</div>`;
  document.body.appendChild(s);
  
  document.querySelectorAll('.skin-opt').forEach(el => {
    el.onclick = () => {
      gameState.skin = SKINS[el.dataset.i].url;
      s.remove();
      $("login").style.display = "flex";
    };
  });
}

function showShop() {
  const sh = document.createElement('div');
  sh.id = 'shopModal';
  sh.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:150;overflow-y:scroll;padding:20px;padding-bottom:100px;';
  sh.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;">
      <h2 style="color:gold;text-align:center;font-size:2.5em;margin-bottom:10px;">🏪 SHOP</h2>
      <p style="color:white;text-align:center;font-size:1.5em;margin-bottom:30px;">Deine Münzen: 🪙 ${gameState.coins}</p>
      <button class="close-shop-btn" style="position:fixed;top:20px;right:20px;padding:15px 30px;font-size:1.8em;background:red;color:white;border:none;border-radius:12px;cursor:pointer;z-index:151;font-weight:bold;">❌ SCHLIEẞEN</button>
      
      <h3 style="color:white;margin:30px 0 20px 0;font-size:1.8em;border-bottom:3px solid gold;padding-bottom:10px;">⚔️ WAFFEN</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;margin-bottom:50px;">
        ${Object.entries(WEAPONS).map(([k, w]) => {
          const own = gameState.ownedWeapons.includes(k);
          const eq = gameState.weapon === k;
          return `<div class="weapon-card" data-key="${k}" style="padding:20px;background:${eq?'linear-gradient(135deg,rgba(0,255,0,0.4),rgba(0,200,0,0.3))':own?'linear-gradient(135deg,rgba(100,100,255,0.3),rgba(50,50,200,0.2))':'linear-gradient(135deg,rgba(255,255,255,0.15),rgba(200,200,200,0.1))'};border:3px solid ${eq?'#00ff00':own?'#6666ff':'white'};border-radius:15px;text-align:center;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 10px 30px rgba(0,0,0,0.5)';" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none';">
            <div style="font-size:4em;margin-bottom:10px;">${w.emoji}</div>
            <p style="color:white;font-size:1.3em;font-weight:bold;margin:10px 0;">${w.name}</p>
            <p style="color:#ffeb3b;font-size:1.1em;margin:5px 0;">💥 ${w.damage} Schaden</p>
            <p style="color:#00bcd4;font-size:1.1em;margin:5px 0;">📏 ${w.range}m Reichweite</p>
            <p style="color:${w.cost<=gameState.coins||own?'#ffd700':'#ff5555'};font-size:1.4em;margin-top:15px;font-weight:bold;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;">
              ${eq?'✅ AUSGERÜSTET':own?'👆 AUSRÜSTEN':w.cost===0?'🎁 GRATIS':`🪙 ${w.cost}`}
            </p>
          </div>`;
        }).join('')}
      </div>
      
      <h3 style="color:white;margin:30px 0 20px 0;font-size:1.8em;border-bottom:3px solid gold;padding-bottom:10px;">📦 BLÖCKE KAUFEN</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px;margin-bottom:50px;">
        ${['grass','dirt','stone','sand','wood','leaves'].map(b => 
          `<div class="block-card" data-block="${b}" style="padding:20px;background:linear-gradient(135deg,rgba(255,255,255,0.15),rgba(200,200,200,0.1));border:3px solid white;border-radius:15px;text-align:center;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">
            <div style="font-size:3.5em;margin-bottom:10px;">${{grass:"🟩",dirt:"🟫",stone:"⬜",sand:"🟨",wood:"🪵",leaves:"🍃"}[b]}</div>
            <p style="color:white;font-size:1.2em;margin:10px 0;font-weight:bold;">10x ${b.toUpperCase()}</p>
            <p style="color:#ffd700;font-size:1.5em;margin-top:10px;font-weight:bold;padding:8px;background:rgba(0,0,0,0.3);border-radius:8px;">🪙 5</p>
          </div>`
        ).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(sh);
  
  document.querySelector('.close-shop-btn').onclick = () => sh.remove();
  
  document.querySelectorAll('.weapon-card').forEach(el => {
    el.onclick = () => {
      const k = el.dataset.key;
      const w = WEAPONS[k];
      const own = gameState.ownedWeapons.includes(k);
      
      if (own) {
        gameState.weapon = k;
        updateUI();
        sh.remove();
        showShop();
      } else if (w.cost <= gameState.coins) {
        gameState.coins -= w.cost;
        gameState.ownedWeapons.push(k);
        gameState.weapon = k;
        updateUI();
        sh.remove();
        showShop();
      }
    };
  });
  
  document.querySelectorAll('.block-card').forEach(el => {
    el.onclick = () => {
      const b = el.dataset.block;
      if (gameState.coins >= 5) {
        gameState.coins -= 5;
        gameState.inventory[b] += 10;
        updateUI();
        sh.remove();
        showShop();
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
    sprite.userData = {
      isAnimal: true,
      health: 100,
      maxHealth: 100,
      emoji: emoji,
      moveDir: Math.random() * Math.PI * 2,
      moveTimer: 0
    };
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
        if (Math.random() < 0.03 && biome !== 'water') {
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

  /* ENDE TEIL 1 - Schreib "continue" für TEIL 2 */
/* TEIL 2 - CONTROLS & GAME LOOP */

  let jx = 0, jy = 0;
  const joyBase = $("joyBase");
  const joyStick = $("joyStick");
  let joyActive = false;

  joyBase.addEventListener("touchstart", e => {
    e.preventDefault();
    joyActive = true;
    const rect = joyBase.getBoundingClientRect();
    joyBase.dataset.sx = rect.left + rect.width / 2;
    joyBase.dataset.sy = rect.top + rect.height / 2;
  });

  document.addEventListener("touchmove", e => {
    if (!joyActive) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - parseFloat(joyBase.dataset.sx);
    const dy = parseFloat(joyBase.dataset.sy) - t.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 40;
    if (dist > maxDist) {
      jx = (dx / dist);
      jy = (dy / dist);
      joyStick.style.left = `${40 + (dx / dist) * maxDist}px`;
      joyStick.style.top = `${40 - (dy / dist) * maxDist}px`;
    } else {
      jx = dx / 40;
      jy = dy / 40;
      joyStick.style.left = `${40 + dx}px`;
      joyStick.style.top = `${40 - dy}px`;
    }
  }, { passive: false });

  document.addEventListener("touchend", () => {
    if (joyActive) {
      joyActive = false;
      jx = jy = 0;
      joyStick.style.left = "40px";
      joyStick.style.top = "40px";
    }
  });

  let drag = false, lx = 0, ly = 0, touchId = null;
  
  document.addEventListener("touchstart", e => {
    const target = e.target;
    if (target.closest('#joyBase') || target.closest('.control') || target.closest('#hotbar') || target.closest('#shopModal')) return;
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
    if (e.target.closest('#joyBase') || e.target.closest('.control') || e.target.closest('#hotbar') || e.target.closest('#shopModal')) return;
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
  });
  
  document.addEventListener("mouseup", () => drag = false);
  
  document.addEventListener("mousemove", e => {
    if (!drag) return;
    player.yaw -= (e.clientX - lx) * 0.002;
    player.pitch -= (e.clientY - ly) * 0.002;
    player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
    lx = e.clientX;
    ly = e.clientY;
  });

  const ray = new THREE.Raycaster();

  function getHit() {
    // EXAKT auf gelben Punkt zielen
    camera.updateMatrixWorld();
    const vec = new THREE.Vector3(0, 0, -1);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    ray.set(camera.position, dir);
    ray.far = 10;
    const hits = ray.intersectObjects(blocks.map(b => b.mesh));
    return hits.length > 0 ? hits[0] : null;
  }

  function getAnimalHit() {
    camera.updateMatrixWorld();
    const vec = new THREE.Vector3(0, 0, -1);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    ray.set(camera.position, dir);
    ray.far = WEAPONS[gameState.weapon].range;
    const hits = ray.intersectObjects(animals);
    return hits.length > 0 ? hits[0] : null;
  }

  function shootProjectile() {
    const w = WEAPONS[gameState.weapon];
    if (!w.projectile) return;
    
    camera.updateMatrixWorld();
    const vec = new THREE.Vector3(0, 0, -1);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    
    const pGeo = w.emoji === '🏹' ? new THREE.ConeGeometry(0.15, 0.6, 8) : new THREE.SphereGeometry(0.2);
    const pMat = new THREE.MeshBasicMaterial({ color: w.color });
    
    if (w.spread) {
      for (let i = 0; i < w.spread; i++) {
        const proj = new THREE.Mesh(pGeo, pMat);
        proj.position.copy(camera.position);
        const spread = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        const sDir = dir.clone().add(spread).normalize();
        proj.userData = {
          velocity: sDir.multiplyScalar(w.speed),
          damage: w.damage,
          life: 5,
          isProjectile: true
        };
        scene.add(proj);
      }
    } else {
      const proj = new THREE.Mesh(pGeo, pMat);
      proj.position.copy(camera.position);
      proj.userData = {
        velocity: dir.multiplyScalar(w.speed),
        damage: w.damage,
        life: 5,
        isProjectile: true,
        explosive: w.explosive
      };
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
      const bt = blocks[i].type;
      if (bt !== 'water') gameState.inventory[bt]++;
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
      if (h) {
        const an = h.object;
        an.userData.health -= w.damage;
        console.log(`Tier getroffen! ${an.userData.health}/${an.userData.maxHealth} HP`);
        
        if (an.userData.health <= 0) {
          const idx = animals.indexOf(an);
          if (idx > -1) {
            scene.remove(an);
            animals.splice(idx, 1);
            gameState.coins += 5;
            gameState.meat += 1;
            updateUI();
            console.log('Tier tot! +5🪙 +1🥩');
          }
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
  shopBtn.style.cssText = 'top:80px;right:15px;bottom:auto;font-size:1.5em;';
  shopBtn.textContent = '🏪';
  shopBtn.onclick = showShop;
  document.body.appendChild(shopBtn);

  let hungerTimer = 0, damageTimer = 0;

  function respawn() {
    player.pos.set(0, 30, 0);
    player.vel.set(0, 0, 0);
    gameState.health = 100;
    gameState.hunger = Math.max(0, gameState.hunger - 50);
    updateUI();
    
    const dm = document.createElement('div');
    dm.style.cssText = 'position:fixed;inset:0;background:rgba(255,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:180;font-size:3em;color:white;font-weight:bold;';
    dm.textContent = '💀 Du bist gestorben!';
    document.body.appendChild(dm);
    setTimeout(() => dm.remove(), 2000);
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

    const nextX = player.pos.x + (forward.x * jy + right.x * jx) * 6 * dt;
    const nextZ = player.pos.z + (forward.z * jy + right.z * jx) * 6 * dt;
    
    const blockAhead = world.has(key(Math.floor(nextX), Math.floor(player.pos.y), Math.floor(nextZ)));
    const blockAbove = world.has(key(Math.floor(nextX), Math.floor(player.pos.y + 1), Math.floor(nextZ)));
    
    if (!blockAhead && !blockAbove) {
      player.pos.x = nextX;
      player.pos.z = nextZ;
    }

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

    if (player.pos.y < -10) respawn();

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
        if (gameState.health === 0) respawn();
      }
    }

    animals.forEach(a => {
      a.userData.moveTimer += dt;
      if (a.userData.moveTimer > 2) {
        a.userData.moveDir = Math.random() * Math.PI * 2;
        a.userData.moveTimer = 0;
      }
      a.position.x += Math.sin(a.userData.moveDir) * 0.5 * dt;
      a.position.z += Math.cos(a.userData.moveDir) * 0.5 * dt;
      const ay = groundY(a.position.x, a.position.z);
      if (ay > -Infinity) a.position.y = ay + 1;
    });

    scene.children.forEach(obj => {
      if (obj.userData.isProjectile) {
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(dt));
        obj.userData.life -= dt;
        
        animals.forEach(a => {
          if (obj.position.distanceTo(a.position) < 2) {
            a.userData.health -= obj.userData.damage;
            console.log(`Projektil trifft! ${a.userData.health}/${a.userData.maxHealth} HP`);
            if (a.userData.health <= 0) {
              const idx = animals.indexOf(a);
              if (idx > -1) {
                scene.remove(a);
                animals.splice(idx, 1);
                gameState.coins += 5;
                gameState.meat += 1;
                updateUI();
                console.log('Tier durch Projektil tot!');
              }
            }
            scene.remove(obj);
          }
        });
        
        if (obj.userData.life <= 0) {
          if (obj.userData.explosive) {
            const ex = new THREE.Mesh(
              new THREE.SphereGeometry(3, 16, 16),
              new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6 })
            );
            ex.position.copy(obj.position);
            scene.add(ex);
            setTimeout(() => scene.remove(ex), 300);
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
