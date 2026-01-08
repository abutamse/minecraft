import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

/* ========= DOM ========= */
const $ = id => document.getElementById(id);

/* ========= GAME STATE ========= */
const gameState = {
  health: 100,
  hunger: 100,
  coins: 0,
  inventory: { grass: 0, dirt: 10, stone: 0, sand: 0 },
  selectedBlock: "dirt"
};

/* ========= LOGIN ========= */
$("startBtn").onclick = () => {
  if (!$("nameInput").value.trim()) return;
  $("login").style.display = "none";
  init();
};

function updateUI() {
  $("health").textContent = `❤️ ${gameState.health}`;
  $("hunger").textContent = `🍖 ${gameState.hunger}%`;
  $("coins").textContent = `🪙 ${gameState.coins}`;
  
  // Update hotbar
  const hotbar = $("hotbar");
  hotbar.innerHTML = "";
  for (const [block, count] of Object.entries(gameState.inventory)) {
    const slot = document.createElement("div");
    slot.style.cssText = `
      width:60px; height:60px; background:rgba(0,0,0,0.7);
      border:2px solid ${block === gameState.selectedBlock ? "yellow" : "white"};
      color:white; display:flex; flex-direction:column;
      align-items:center; justify-content:center; border-radius:4px;
    `;
    slot.innerHTML = `<div style="font-size:20px">${getBlockEmoji(block)}</div><div style="font-size:12px">${count}</div>`;
    slot.onclick = () => {
      gameState.selectedBlock = block;
      updateUI();
    };
    hotbar.appendChild(slot);
  }
}

function getBlockEmoji(type) {
  const emojis = { grass: "🟩", dirt: "🟫", stone: "⬜", sand: "🟨" };
  return emojis[type] || "⬜";
}

function init() {
  updateUI();

  /* ========= RENDERER ========= */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  /* ========= SCENE / CAMERA ========= */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ========= LIGHT ========= */
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(100, 200, 100);
  scene.add(sun);

  /* ========= TEXTURES ========= */
  const createTexture = (color) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 16, 16);
    // Add some noise
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    return texture;
  };

  const textures = {
    grass: createTexture("#5a8f3a"),
    dirt: createTexture("#8b5a3c"),
    stone: createTexture("#808080"),
    sand: createTexture("#ddc87f")
  };

  /* ========= PLAYER ========= */
  const player = {
    pos: new THREE.Vector3(0, 30, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: false
  };

  /* ========= WORLD ========= */
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const blocks = [];
  const world = new Map();
  const CHUNK = 16;
  const chunks = new Set();
  const key = (x, y, z) => `${x},${y},${z}`;

  function heightAt(x, z) {
    return Math.floor(6 + Math.sin(x * 0.15) * 3 + Math.cos(z * 0.15) * 3);
  }

  function addBlock(x, y, z, type) {
    const k = key(x, y, z);
    if (world.has(k)) return;
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: textures[type] }));
    m.position.set(x + 0.5, y + 0.5, z + 0.5);
    scene.add(m);
    blocks.push({ x, y, z, mesh: m, type });
    world.set(k, type);
  }

  function genChunk(cx, cz) {
    const ck = `${cx},${cz}`;
    if (chunks.has(ck)) return;
    chunks.add(ck);
    for (let x = cx; x < cx + CHUNK; x++)
      for (let z = cz; z < cz + CHUNK; z++) {
        const h = heightAt(x, z);
        for (let y = 0; y <= h; y++) {
          addBlock(x, y, z, y === h ? "grass" : y < h - 2 ? "stone" : "dirt");
        }
        // Add random coins
        if (Math.random() < 0.02) {
          const coinGeo = new THREE.SphereGeometry(0.3, 8, 8);
          const coinMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
          const coin = new THREE.Mesh(coinGeo, coinMat);
          coin.position.set(x + 0.5, h + 1.5, z + 0.5);
          coin.userData.isCoin = true;
          scene.add(coin);
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

  /* ========= JOYSTICK ========= */
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

  /* ========= LOOK CONTROLS ========= */
  let drag = false, lx = 0, ly = 0;
  
  renderer.domElement.addEventListener("pointerdown", e => {
    if (e.target === renderer.domElement) {
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
    }
  });
  
  addEventListener("pointerup", () => drag = false);
  
  addEventListener("pointermove", e => {
    if (!drag) return;
    player.yaw -= (e.clientX - lx) * 0.002;
    player.pitch -= (e.clientY - ly) * 0.002;
    player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
    lx = e.clientX;
    ly = e.clientY;
  });

  /* ========= RAYCAST ========= */
  const ray = new THREE.Raycaster();
  ray.far = 5; // Maximale Reichweite
  const center = new THREE.Vector2(0, 0);

  function getHit() {
    // Raycast vom Kamera-Zentrum in Blickrichtung
    const dir = new THREE.Vector3(
      Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      Math.cos(player.yaw) * Math.cos(player.pitch)
    ).normalize();
    
    ray.set(camera.position, dir);
    const hits = ray.intersectObjects(blocks.map(b => b.mesh));
    return hits.length > 0 ? hits[0] : null;
  }

  /* ========= BUTTONS ========= */
  $("mine").onclick = () => {
    const h = getHit();
    if (!h || h.distance > 5) return;
    const p = h.object.position;
    const x = Math.floor(p.x - 0.5), y = Math.floor(p.y - 0.5), z = Math.floor(p.z - 0.5);
    const i = blocks.findIndex(b => b.x === x && b.y === y && b.z === z);
    if (i > -1) {
      const blockType = blocks[i].type;
      gameState.inventory[blockType]++;
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
    const bulletGeo = new THREE.SphereGeometry(0.2);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(camera.position);
    
    const dir = new THREE.Vector3(
      Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    
    bullet.userData.velocity = dir.multiplyScalar(30);
    bullet.userData.isBullet = true;
    bullet.userData.life = 3;
    scene.add(bullet);
  };

  $("eatMeat").onclick = () => {
    if (gameState.hunger < 100) {
      gameState.hunger = Math.min(100, gameState.hunger + 20);
      gameState.health = Math.min(100, gameState.health + 10);
      updateUI();
    }
  };

  /* ========= GAME LOOP ========= */
  const clock = new THREE.Clock();
  
  function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();

    // Generate chunks
    const cx = Math.floor(player.pos.x / CHUNK) * CHUNK;
    const cz = Math.floor(player.pos.z / CHUNK) * CHUNK;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        genChunk(cx + dx * CHUNK, cz + dz * CHUNK);

    // Movement
    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    player.pos.add(forward.multiplyScalar(jy * 6 * dt));
    player.pos.add(right.multiplyScalar(jx * 6 * dt));

    // Gravity
    player.vel.y -= 20 * dt;
    player.pos.y += player.vel.y * dt;

    // Ground collision
    const gy = groundY(player.pos.x, player.pos.z);
    if (player.pos.y <= gy) {
      player.pos.y = gy;
      player.vel.y = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    // Hunger system
    if (Math.random() < 0.001) {
      gameState.hunger = Math.max(0, gameState.hunger - 1);
      if (gameState.hunger === 0 && Math.random() < 0.01) {
        gameState.health = Math.max(0, gameState.health - 1);
      }
      updateUI();
    }

    // Coin collection
    scene.children.forEach(obj => {
      if (obj.userData.isCoin) {
        const dist = player.pos.distanceTo(obj.position);
        if (dist < 2) {
          gameState.coins++;
          scene.remove(obj);
          updateUI();
        }
      }
    });

    // Bullet physics
    scene.children.forEach(obj => {
      if (obj.userData.isBullet) {
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(dt));
        obj.userData.life -= dt;
        if (obj.userData.life <= 0) {
          scene.remove(obj);
        }
      }
    });

    // Camera
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
