import * as PIXI from "pixi.js";

export class Game {
  constructor(app) {
    this.app = app;
    // ...
  }

  start() {
    class Game {
      constructor(options) {
        this.app = new PIXI.Application(options);
        document.body.appendChild(this.app.view);
        this.state = this.loadingState.bind(this);
        this.keys = {};
        this.gravity = 0.8;
        this.groundY = 500;
        this.velocityY = 0;
        this.isJumping = false;
        this.isFalling = false;
        this.speed = 5;
        this.player = null;
        this.textures = {};
      }

      start() {
        window.addEventListener("keydown", (e) => (this.keys[e.key] = true));
        window.addEventListener("keyup", (e) => (this.keys[e.key] = false));

        this.createGround();
        this.loadAssets();
        this.app.ticker.add((delta) => this.gameLoop(delta));
      }

      loadAssets() {
        const loader = PIXI.Loader.shared;
        const animations = {
          idle: "__Idle.gif",
          run: "__Run.gif",
          jump: "__Jump.gif",
          fall: "__Fall.gif",
          attack: "__AttackComboNoMovement.gif",
        };
        for (const key in animations) {
          loader.add(key, animations[key]);
        }
        loader.load((ldr, resources) => this.setup(resources));
      }

      createGround() {
        for (let i = 0; i < 20; i++) {
          const tile = new PIXI.Graphics();
          tile.beginFill(i % 2 === 0 ? 0x228b22 : 0x006400);
          tile.drawRect(0, 0, 40, 40);
          tile.endFill();
          tile.x = i * 40;
          tile.y = this.groundY + 40;
          this.app.stage.addChild(tile);
        }
      }

      setup(resources) {
        this.player = new PIXI.Sprite(resources.idle.texture);
        this.player.anchor.set(0.5, 1);
        this.player.x = 100;
        this.player.y = this.groundY;
        this.app.stage.addChild(this.player);

        for (const key in resources) {
          this.textures[key] = [resources[key].texture];
        }
        this.currentAnim = "idle";
        this.state = this.playState.bind(this);
      }

      loadingState() {
        // optional loading visuals
      }

      switchAnimation(name) {
        if (this.currentAnim === name) return;
        this.currentAnim = name;
        this.player.texture = this.textures[name][0];
      }

      gameLoop(delta) {
        if (this.state) {
          this.state(delta);
        }
      }

      playState() {
        let moving = false;
        if (this.keys["ArrowRight"] || this.keys["d"]) {
          this.player.x += this.speed;
          this.player.scale.x = 1;
          moving = true;
        }
        if (this.keys["ArrowLeft"] || this.keys["a"]) {
          this.player.x -= this.speed;
          this.player.scale.x = -1;
          moving = true;
        }

        if (
          (this.keys[" "] || this.keys["Spacebar"]) &&
          !this.isJumping &&
          !this.isFalling
        ) {
          this.switchAnimation("attack");
          return;
        }

        if ((this.keys["ArrowUp"] || this.keys["w"]) && !this.isJumping) {
          this.velocityY = -15;
          this.isJumping = true;
          this.isFalling = false;
          this.switchAnimation("jump");
        }

        this.velocityY += this.gravity;
        this.player.y += this.velocityY;

        if (this.player.y >= this.groundY) {
          this.player.y = this.groundY;
          this.velocityY = 0;
          if (this.isJumping || this.isFalling) {
            this.isJumping = false;
            this.isFalling = false;
            this.switchAnimation(moving ? "run" : "idle");
          }
        } else if (this.velocityY > 0 && !this.isFalling) {
          this.switchAnimation("fall");
          this.isFalling = true;
        }

        if (!this.isJumping && !this.isFalling && !this.keys[" "]) {
          this.switchAnimation(moving ? "run" : "idle");
        }
      }
    }

    window.addEventListener("load", () => {
      const game = new Game({
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb,
      });
      game.start();
    });

    // ton code ici...
  }
}
