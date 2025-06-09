import {
  Application,
  Assets,
  Spritesheet,
  AnimatedSprite,
  Sprite,
  Rectangle,
  Container,
} from "pixi.js";

const app = new Application();
await app.init({ width: 800, height: 600, backgroundColor: 0x000000 });
document.body.appendChild(app.canvas);

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

// === 1. Décor ===
// Fond complet (stitched)
const bgTexture = await Assets.load("/assets/BackGround01.png");
const background = new Sprite(bgTexture);
background.y = 450;
background.x = 0;
world.addChildAt(background, 0);

// Lune
const moonTex = await Assets.load("/assets/Moon_01.png");
const moon = new Sprite(moonTex);
moon.anchor.set(0.5);
moon.x = app.screen.width / 2;
moon.y = 100;
app.stage.addChildAt(moon, 0); // lune indépendante (parallaxe)

// Mist (brouillard flottant)
const mistTex = await Assets.load("/assets/Mist.png");
const mist = new Sprite(mistTex);
mist.y = 400;
mist.alpha = 0.3;
world.addChild(mist);

// Tombes
const gravePaths = ["Grave01.png", "Grave02.png", "Grave03.png"];
for (let i = 0; i < 5; i++) {
  const path = `/assets/${gravePaths[i % gravePaths.length]}`;
  const tex = await Assets.load(path);
  const g = new Sprite(tex);
  g.x = 300 + i * 300;
  g.y = 470;
  world.addChild(g);
}

// Église à la fin
const churchTex = await Assets.load("/assets/Church.png");
const church = new Sprite(churchTex);
church.x = 2400;
church.y = 400;
church.anchor.set(0.5, 1);
world.addChild(church);

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

  const left = await Assets.load(`/assets/${baseName}_Left.png`);
  const center = await Assets.load(`/assets/${baseName}_Center.png`);
  const right = await Assets.load(`/assets/${baseName}_Right.png`);

  let currentX = x;

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

app.ticker.add(() => {
  let moving = false;
  const speed = 3;

  const nextX =
    keys["arrowleft"] || keys["a"]
      ? player.x - speed
      : keys["arrowright"] || keys["d"]
      ? player.x + speed
      : player.x;

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

  // Caméra
  world.x = -player.x + app.screen.width / 2;
  world.x = Math.min(0, world.x); // pas à gauche

  // Lune effet parallaxe (bouge + lentement)
  moon.x = app.screen.width / 2 + player.x * 0.05;

  // Brouillard flotte lentement
  mist.x = (mist.x + 0.3) % 2400;
});
