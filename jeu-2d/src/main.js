import {
  Application,
  Assets,
  Spritesheet,
  AnimatedSprite,
  Sprite,
  Rectangle,
  Container,
  Text,
  Graphics,
} from "pixi.js";

const app = new Application();
await app.init({ width: 800, height: 600, backgroundColor: 0x000000 });

document.body.appendChild(app.canvas);
// ... après les imports et la création de 'app'

// === Variables de Santé et Potions ===
const maxHealth = 100;
let currentHealth = maxHealth;
const potions = []; // Tableau pour suivre les potions à l'écran
const bossTriggerX = 1300;
const bossTriggerY = 420;
// === Interface Utilisateur (UI) ===
const ui = new Container();
ui.zIndex = 100; // S'assure que l'UI est toujours au-dessus du reste
app.stage.addChild(ui);

// Charger les textures de la barre de vie
const healthBarBgTex = await Assets.load("/assets/bar_background.png");
const healthBarFillTex = await Assets.load("/assets/health_bar.png");
const healthBarFrameTex = await Assets.load("/assets/bar.png");

// Créer les sprites
const healthBarBg = new Sprite(healthBarBgTex);
healthBarBg.x = 10;
healthBarBg.y = 10;
ui.addChild(healthBarBg);

const healthBarFill = new Sprite(healthBarFillTex);
healthBarFill.x = healthBarBg.x;
healthBarFill.y = healthBarBg.y;
ui.addChild(healthBarFill);
// On stocke la largeur initiale pour les calculs
const maxFillWidth = healthBarFill.width;

const healthBarFrame = new Sprite(healthBarFrameTex);
healthBarFrame.x = healthBarBg.x;
healthBarFrame.y = healthBarBg.y;
ui.addChild(healthBarFrame);

/**
 * Met à jour la largeur de la barre de vie en fonction de la santé actuelle.
 */
function updateHealthBar() {
  const healthPercentage = currentHealth / maxHealth;
  healthBarFill.width = maxFillWidth * healthPercentage;
}

// Conteneur monde
const world = new Container();
app.stage.addChild(world);

const animations = ["idle", "run", "attack", "roll", "jump"];
const characters = {};
let current = "idle";
let keys = {};
let player = null;
let jumping = false;
let velocityY = 0;
const gravity = 0.6;
const jumpForce = -12;
const platforms = [];
const destructibles = [];

// === 1. Décor ===
// Fond complet (stitched)

// Lune (parallaxe)
const moonTex = await Assets.load("/assets/Moon_01.png");
const moon = new Sprite(moonTex);
moon.anchor.set(0.5);
moon.x = app.screen.width / 2;
moon.y = 100;
app.stage.addChildAt(moon, 0);

// Mist (brouillard flottant)
const mistTex = await Assets.load("/assets/Mist.png");
const mist = new Sprite(mistTex);
mist.y = 400;
mist.alpha = 0.3;
world.addChild(mist);

async function createProp(x, y, count, name, spacing = 50) {
  // Charger la texture unique
  const tex = await Assets.load(`/assets/${name}.png`);
  for (let i = 0; i < count; i++) {
    const sprite = new Sprite(tex);
    sprite.x = x + i * spacing;
    sprite.y = y;
    world.addChild(sprite);
  }
}
// Arbres
const treePaths = ["Tree.png"];

// Tombes
const gravePaths = ["Grave01.png", "Grave02.png", "Grave03.png"];

await createProp(0, 510, 10, "Under_Platform_Center", 50);
await createProp(460, 510, 1, "Under_Platform_Right", 10);
await createProp(0, 450, 5, "BackGround01", 60);
await createProp(400, 470, 1, "crate_1", 60);
await createProp(0, 477, 1, "Grave02", 60);
await createProp(250, 477, 2, "Grave01", 60);
await createProp(400, 392, 1, "Tree", 60);

await createProp(530, 480, 1, "Under_Platform_Left", 10);
await createProp(550, 480, 24, "Under_Platform_Center", 50);
await createProp(530, 520, 25, "Under_Platform_Center", 50);
await createProp(1700, 480, 5, "Under_Platform_Right", 10);
await createProp(530, 400, 18, "BackGround01", 60);
await createProp(640, 420, 2, "crate_1", 1000);
await createProp(540, 418, 6, "Grave02", 150);
await createProp(740, 380, 3, "Grave03", 400);
await createProp(800, 424, 2, "Grave01", 600);
await createProp(680, 352, 2, "Tree", 250);

await createProp(1830, 510, 1, "Under_Platform_Left", 10);
await createProp(1860, 510, 18, "Under_Platform_Center", 50);
await createProp(2700, 510, 10, "Under_Platform_Right", 10);
await createProp(1850, 450, 13, "BackGround01", 60);
await createProp(1900, 477, 5, "Grave02", 200);
await createProp(2700, 340, 1, "Church", 60);
await createProp(2700, 470, 1, "crate_1", 60);
await createProp(1950, 477, 4, "Grave01", 150);
await createProp(400, 392, 1, "Tree", 60);

const bossAnimations = ["idle", "move", "attack", "hurt", "die"];
// Chargement des sprites du boss

const bossSprites = {};
for (const anim of bossAnimations) {
  try {
    const json = await (await fetch(`/assets/Boss_${anim}.json`)).json();
    const texture = await Assets.load(`/assets/Boss_${anim}.png`);
    const spritesheet = new Spritesheet(texture, json);
    await spritesheet.parse();
    const frames = Object.values(spritesheet.textures);
    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 1);
    sprite.animationSpeed = 0.15;
    sprite.scale.set(1.5); // ajuste à une taille jouable

    sprite.visible = false;
    // réduction taille boss

    bossSprites[anim] = sprite;
    // console.log(`Loaded Boss_${anim}`);
  } catch (e) {
    console.error(`Erreur lors du chargement de Boss_${anim}:`, e);
  }
}

let boss = null;
let currentBossAnim = "idle"; // ✅ ajoute ça ici

boss = bossSprites["idle"];
boss.x = 1600;
boss.y = 470;
boss.visible = true;
// ou 0.25 selon le rendu souhaité

boss.play();
world.addChild(boss);
for (const anim in bossSprites) {
  if (bossSprites[anim] !== boss) world.addChild(bossSprites[anim]);
}

let bossHealth = 5;
let bossDefeated = false;
// tout en haut (global vars)
let bossSpawned = false;

// déclaration UI du boss (avant le ticker)
const bossHealthBar = new Sprite(healthBarBgTex);
bossHealthBar.x = 300;
bossHealthBar.y = 10;
bossHealthBar.visible = false;
ui.addChild(bossHealthBar);

const bossHealthFill = new Sprite(healthBarFillTex);
bossHealthFill.x = bossHealthBar.x;
bossHealthFill.y = bossHealthBar.y;
bossHealthFill.visible = false;
ui.addChild(bossHealthFill);

const bossMaxFillWidth = bossHealthFill.width;

const bossHealthFrame = new Sprite(healthBarFrameTex);
bossHealthFrame.x = bossHealthBar.x;
bossHealthFrame.y = bossHealthBar.y;
bossHealthFrame.visible = false;
ui.addChild(bossHealthFrame);

// Fonction pour mettre à jour la barre
function updateBossHealthBar() {
  const healthPercentage = bossHealth / 5;
  bossHealthFill.width = bossMaxFillWidth * healthPercentage;
}

// === 2. Joueur et animations ===
for (const anim of animations) {
  const json = await (await fetch(`/assets/${anim}.json`)).json();
  const texture = await Assets.load(`/assets/${anim}.png`);
  const spritesheet = new Spritesheet(texture, json);
  await spritesheet.parse();

  const frames = Object.values(spritesheet.textures);
  const sprite = new AnimatedSprite(frames);
  sprite.anchor.set(0.5, 1);
  sprite.animationSpeed = 0.15;
  sprite.visible = false;

  characters[anim] = sprite;
}

player = characters["idle"];
player.x = 100;
player.y = 400;
player.visible = true;
player.play();
world.addChild(player);
for (const anim in characters) {
  if (characters[anim] !== player) world.addChild(characters[anim]);
}

const bossZone = new Graphics();
bossZone.lineStyle(4, 0xff0000, 1);
bossZone.drawRect(1250, 350, 400, 250);
bossZone.endFill();
bossZone.visible = false;
world.addChild(bossZone);

// === 3. Plateformes ===
async function createPlatformTile(x, y, count, baseName = "Platform") {
  if (count === 1) {
    const tex = await Assets.load(`/assets/${baseName}.png`);
    const tile = new Sprite(tex);
    tile.x = x;
    tile.y = y;
    world.addChild(tile);
    platforms.push({
      x: tile.x,
      y: tile.y,
      width: tile.width,
      height: tile.height,
    });
    return;
  }
  let currentX = x;

  const left = await Assets.load(`/assets/${baseName}_Left.png`);
  const center = await Assets.load(`/assets/${baseName}_Center.png`);
  const right = await Assets.load(`/assets/${baseName}_Right.png`);

  // Left cap
  const leftTile = new Sprite(left);
  leftTile.x = currentX;
  leftTile.y = y;
  world.addChild(leftTile);
  platforms.push({
    x: leftTile.x,
    y: leftTile.y,
    width: leftTile.width,
    height: leftTile.height,
  });
  currentX += left.width;
  const messageText = new Text("", {
    fontSize: 48,
    fill: 0xffffff,
    fontWeight: "bold",
    align: "center",
  });
  messageText.anchor.set(0.5);
  messageText.x = app.screen.width / 2;
  messageText.y = app.screen.height / 2;
  messageText.visible = false;
  ui.addChild(messageText);
  function showMessage(text) {
    messageText.text = text;
    messageText.visible = true;
  }

  // Middle segments
  for (let i = 0; i < count - 2; i++) {
    const centerTile = new Sprite(center);
    centerTile.x = currentX;
    centerTile.y = y;
    world.addChild(centerTile);
    platforms.push({
      x: centerTile.x,
      y: centerTile.y,
      width: centerTile.width,
      height: centerTile.height,
    });
    currentX += center.width;
  }

  // Right cap
  const rightTile = new Sprite(right);
  rightTile.x = currentX;
  rightTile.y = y;
  world.addChild(rightTile);
  platforms.push({
    x: rightTile.x,
    y: rightTile.y,
    width: rightTile.width,
    height: rightTile.height,
  });
}

// Plateformes du niveau tutoriel
await createPlatformTile(0, 500, 10);
await createPlatformTile(530, 450, 25);
await createPlatformTile(1830, 500, 20);

function switchAnimation(name, once = false) {
  if (current === name || !characters[name]) return;
  const old = characters[current];
  const next = characters[name];

  old.visible = false;
  old.gotoAndStop(0);

  next.x = old.x;
  next.y = old.y;
  next.scale.x = old.scale.x;

  next.visible = true;
  next.play();

  if (once) {
    next.loop = false;
    next.onComplete = () => {
      switchAnimation("idle");
      next.loop = true;
    };
  } else {
    next.loop = true;
    next.onComplete = null;
  }

  current = name;
  player = next;
}

function getPlatformBounds(plat) {
  return new Rectangle(plat.x, plat.y, plat.width, plat.height);
}

// === 4. Contrôles ===
window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
// MODIFIEZ votre fonction spawnHealthPotion comme ceci :
async function spawnHealthPotion(x, y) {
  const tex = await Assets.load("/assets/potion_1.png");
  const potion = new Sprite(tex);
  potion.x = x;
  potion.y = y;
  potion.anchor.set(0.5, 1);
  world.addChild(potion);

  // On ajoute la potion au tableau pour la suivre
  potions.push(potion);

  // Animation "pièce Mario" (conservez cette partie)
  const initialY = y;
  let vy = -4;
  const gravity = 0.2;

  const animate = () => {
    potion.y += vy;
    vy += gravity;
    if (vy > 2 && potion.y >= initialY) {
      potion.y = initialY;
      app.ticker.remove(animate); // Arrête l'animation de rebond
    }
  };

  app.ticker.add(animate);
}

app.ticker.add(() => {
  if (currentHealth <= 0) {
    app.ticker.stop();
    showMessage("GAME OVER");
    return;
  }

  if (bossDefeated && !messageText.visible) {
    showMessage("BRAVO ! Boss vaincu !");
  }
  let moving = false;
  const speed = 3;

  const nextX =
    keys["arrowleft"] || keys["a"]
      ? player.x - speed
      : keys["arrowright"] || keys["d"]
      ? player.x + speed
      : player.x;

  if (boss && !bossDefeated) {
    const dx = player.x - boss.x;
    const distance = Math.abs(dx);
    boss.scale.x = dx > 0 ? 1 : -1;

    if (distance < 150) {
      switchBossAnimation("attack");

      const bossBounds = boss.getBounds();
      const playerBounds = player.getBounds();
      const intersects =
        playerBounds.x < bossBounds.x + bossBounds.width &&
        playerBounds.x + playerBounds.width > bossBounds.x &&
        playerBounds.y < bossBounds.y + bossBounds.height &&
        playerBounds.y + playerBounds.height > bossBounds.y;

      if (intersects) {
        currentHealth = Math.max(0, currentHealth - 0.5);
        updateHealthBar();
      }
    } else {
      boss.x += dx > 0 ? 1 : -1;
      switchBossAnimation("move");
    }
  }

  function switchBossAnimation(name) {
    if (currentBossAnim === name || !bossSprites[name]) return;

    const old = bossSprites[currentBossAnim];
    const next = bossSprites[name];

    old.visible = false;
    old.gotoAndStop(0);

    next.x = old.x;
    next.y = old.y;
    next.scale.x = old.scale.x;

    next.visible = true;
    next.play();

    currentBossAnim = name;
    boss = next;
  }

  // Gestion collision horizontal
  let horizontalBlocked = false;
  const playerBounds = player.getBounds();

  for (const plat of platforms) {
    const platBounds = getPlatformBounds(plat);
    const futureBounds = new Rectangle(
      nextX - player.width / 2,
      player.y - player.height,
      playerBounds.width,
      playerBounds.height
    );

    const intersects =
      futureBounds.x < platBounds.x + platBounds.width &&
      futureBounds.x + futureBounds.width > platBounds.x &&
      futureBounds.y < platBounds.y + platBounds.height &&
      futureBounds.y + futureBounds.height > platBounds.y;

    if (intersects) {
      horizontalBlocked = true;
      break;
    }
  }
  if (!bossSpawned && player.x >= bossTriggerX) {
    bossSpawned = true;
    boss.visible = true;
    boss.play();

    bossHealthBar.visible = true;
    bossHealthFill.visible = true;
    bossHealthFrame.visible = true;
  }

  if (!horizontalBlocked) {
    if (keys["arrowleft"] || keys["a"]) {
      player.x -= speed;
      player.scale.x = -1;
      moving = true;
    }
    if (keys["arrowright"] || keys["d"]) {
      player.x += speed;
      player.scale.x = 1;
      moving = true;
    }
  }

  if (keys[" "]) {
    switchAnimation("attack", true);
    // Détection de collision avec caisse
    const playerBounds = player.getBounds();
    for (const d of destructibles) {
      if (d.destroyed) continue;
      const crateBounds = d.sprite.getBounds();
      const isTouching =
        playerBounds.x < crateBounds.x + crateBounds.width &&
        playerBounds.x + playerBounds.width > crateBounds.x &&
        playerBounds.y < crateBounds.y + crateBounds.height &&
        playerBounds.y + playerBounds.height > crateBounds.y;

      if (isTouching) {
        d.destroyed = true;
        world.removeChild(d.sprite);
        // Remplacer par sprite endommagé
        Assets.load("/assets/crate_1_damaged.png").then((tex) => {
          const brokenCrate = new Sprite(tex);
          brokenCrate.x = d.x;
          brokenCrate.y = d.y;
          world.addChild(brokenCrate);
        });
        spawnHealthPotion(d.x + d.sprite.width / 2, d.y);
      }
    }
    if (boss && !bossDefeated) {
      const bossBounds = boss.getBounds();
      const playerBounds = player.getBounds();
      const intersects =
        playerBounds.x < bossBounds.x + bossBounds.width &&
        playerBounds.x + playerBounds.width > bossBounds.x &&
        playerBounds.y < bossBounds.y + bossBounds.height &&
        playerBounds.y + playerBounds.height > bossBounds.y;

      if (intersects) {
        bossHealth--;
        updateBossHealthBar();

        if (bossHealth <= 0) {
          bossDefeated = true;
          switchBossAnimation("die");

          setTimeout(async () => {
            boss.visible = false;
            const tex = await Assets.load("/assets/potion_1.png");
            const drop = new Sprite(tex);
            drop.x = boss.x;
            drop.y = boss.y;
            drop.anchor.set(0.5, 1);
            world.addChild(drop);
            potions.push(drop);
          }, 1500);
        } else {
          switchBossAnimation("hurt");
        }
      }
    }

    keys[" "] = false;
    return;
  }

  if (keys["t"]) {
    switchAnimation("roll", true);
    keys["t"] = false;
    return;
  }

  if (keys["arrowup"] && !jumping && velocityY === 0) {
    velocityY = jumpForce;
    jumping = true;
    switchAnimation("jump", true);
    keys["arrowup"] = false;
  }

  velocityY += gravity;
  player.y += velocityY;

  let onPlatform = false;
  for (const plat of platforms) {
    const withinX = player.x >= plat.x && player.x <= plat.x + plat.width;
    const wasAbove = player.y - velocityY <= plat.y + 5;
    const isBelow = player.y >= plat.y;

    if (withinX && wasAbove && isBelow && velocityY >= 0) {
      player.y = plat.y;
      velocityY = 0;
      jumping = false;
      onPlatform = true;
      break;
    }
  }
  if (!onPlatform) jumping = true;

  if (!jumping && current !== "attack" && current !== "roll") {
    switchAnimation(moving ? "run" : "idle");
  }
  // ... DANS votre app.ticker.add(() => { ... })

  // === GESTION DES COLLISIONS AVEC LES POTIONS ===
  for (let i = potions.length - 1; i >= 0; i--) {
    const potion = potions[i];
    const playerBounds = player.getBounds();
    const potionBounds = potion.getBounds();

    // Détection de collision (AABB)
    const intersects =
      playerBounds.x < potionBounds.x + potionBounds.width &&
      playerBounds.x + playerBounds.width > potionBounds.x &&
      playerBounds.y < potionBounds.y + potionBounds.height &&
      playerBounds.y + playerBounds.height > potionBounds.y;

    if (intersects) {
      // 1. Supprimer la potion de l'écran et du tableau
      world.removeChild(potion);
      potions.splice(i, 1);

      // 2. Augmenter la vie du joueur (sans dépasser le max)
      currentHealth = Math.min(maxHealth, currentHealth + 25); // Une potion redonne 25 PV

      // 3. Mettre à jour la barre de vie visuellement
      updateHealthBar();
    }
  }

  // Caméra

  // ... reste de votre code
  // Caméra
  world.x = -player.x + app.screen.width / 2;

  world.x = Math.min(0, world.x);

  // Parallaxe lune
  moon.x = app.screen.width / 2 + player.x * 0.05;

  // Mist flot
  mist.x = (mist.x + 0.3) % 2400;
  const pauseBtn = document.getElementById("pause-btn");
  const restartBtn = document.getElementById("restart-btn");
  const isPaused = false;
  if (isPaused) return;

  if (currentHealth <= 0) {
    app.ticker.stop();
    showMessage("GAME OVER");
    return;
  }

  if (bossDefeated && !messageText.visible) {
    showMessage("BRAVO ! Boss vaincu !");
  }

  if (player.x > 1100 && player.x < 1700 && player.y < 600) {
    bossZone.visible = true;
  } else {
    bossZone.visible = false;
  }
  if (pauseBtn && restartBtn) {
    pauseBtn.addEventListener("click", () => {
      isPaused = !isPaused;
      pauseBtn.innerText = isPaused ? "Reprendre" : "Pause";
    });

    restartBtn.addEventListener("click", () => {
      app.destroy(true, { children: true });
      window.location.href = window.location.href;
    });
  }
});
