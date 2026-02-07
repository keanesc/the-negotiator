// ============================================================
// BankScene — CCTV feed of the bank interior
//
// State-driven sprite animation at 5-8 FPS to mimic real
// security footage. Three behavioral states:
//   Calm (tension 0-40)   → suspect stands still, gun lowered
//   Agitated (41-70)      → suspect paces back and forth
//   Crisis (71-100)       → suspect grabs hostage, moves to door
//
// CRT effects via in-scene overlays (scanlines, noise, vignette).
// ============================================================

import Phaser from "phaser";
import { EventBus } from "@/lib/phaser/EventBus";

type BehaviorState = "calm" | "agitated" | "crisis";

interface SceneState {
  tension: number;
  paranoia: number;
  hostages: number;
  gameStatus: string;
}

export class BankScene extends Phaser.Scene {
  // --- State ---
  private state: SceneState = {
    tension: 50,
    paranoia: 30,
    hostages: 3,
    gameStatus: "idle",
  };
  private behaviorState: BehaviorState = "agitated";

  // --- Sprites ---
  private suspect!: Phaser.GameObjects.Sprite;
  private hostageSprites: Phaser.GameObjects.Sprite[] = [];
  private deadHostageSprites: Phaser.GameObjects.Sprite[] = [];

  // --- FX ---
  private fluorescentLight!: Phaser.GameObjects.Rectangle;
  private fluorescentTimer!: Phaser.Time.TimerEvent;
  private glitchTimer!: Phaser.Time.TimerEvent;
  private scanlineGraphics!: Phaser.GameObjects.Graphics;
  private vignetteGraphics!: Phaser.GameObjects.Graphics;
  private noiseGraphics!: Phaser.GameObjects.Graphics;

  // --- HUD ---
  private camText!: Phaser.GameObjects.Text;
  private recDot!: Phaser.GameObjects.Arc;
  private recText!: Phaser.GameObjects.Text;

  // --- Movement ---
  private suspectBaseX = 0;
  private suspectBaseY = 0;
  private paceTween: Phaser.Tweens.Tween | null = null;
  private crisisHostageIndex = -1;

  // --- Jitter ---
  private jitterTimer!: Phaser.Time.TimerEvent;
  private spriteTargets: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super("BankScene");
  }

  // ==============================================================
  // PRELOAD
  // ==============================================================
  preload() {
    this.load.spritesheet("suspect-idle", "/sprites/suspect-idle.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("suspect-walk", "/sprites/suspect-walk.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("suspect-crisis", "/sprites/suspect-crisis.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.image("hostage-kneel", "/sprites/hostage-kneel.png");
    this.load.spritesheet("hostage-dead", "/sprites/hostage-dead.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.image("bank-tileset", "/sprites/bank-tileset.png");
  }

  // ==============================================================
  // CREATE
  // ==============================================================
  create() {
    const w = 640;
    const h = 480;

    // ---- Build the bank interior ----
    this.buildBankInterior(w, h);

    // ---- Fluorescent light ----
    this.fluorescentLight = this.add
      .rectangle(w / 2, 30, 200, 4, 0x556650)
      .setAlpha(0.8);

    // Light glow on the ceiling area
    this.add.rectangle(w / 2, 30, 300, 50, 0x445544).setAlpha(0.15);

    // Flickering fluorescent timer
    this.fluorescentTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const baseFlicker = 0.5 + Math.random() * 0.4;
        const paranoiaBoost =
          this.state.paranoia > 70 ? Math.random() * 0.5 : 0;
        this.fluorescentLight.setAlpha(
          Math.random() < 0.08 ? 0.15 : baseFlicker + paranoiaBoost,
        );
      },
    });

    // ---- Create animations ----
    this.createAnimations();

    // ---- Hostages ----
    const hostagePositions = [
      { x: 120, y: 300 },
      { x: 180, y: 320 },
      { x: 240, y: 295 },
    ];

    for (let i = 0; i < 3; i++) {
      const pos = hostagePositions[i];

      // Dead sprite (hidden initially)
      const dead = this.add
        .sprite(pos.x, pos.y + 10, "hostage-dead", 0)
        .setScale(2)
        .setVisible(false)
        .setTint(0x888888);
      this.deadHostageSprites.push(dead);

      // Living sprite — face-down, static (no animation)
      const hostage = this.add
        .image(pos.x, pos.y, "hostage-kneel")
        .setScale(2)
        .setTint(0xaaaaaa);
      this.hostageSprites.push(hostage as unknown as Phaser.GameObjects.Sprite);
    }

    // ---- Suspect (Jax) ----
    this.suspectBaseX = 370;
    this.suspectBaseY = 290;
    this.suspect = this.add
      .sprite(this.suspectBaseX, this.suspectBaseY, "suspect-idle", 0)
      .setScale(2.5)
      .setTint(0xaaaaaa);
    this.suspect.play("suspect-breathe");

    // Track all sprites for jitter
    this.spriteTargets = [this.suspect, ...this.hostageSprites];

    // ---- CRT overlays (scanlines, vignette, noise) ----
    this.applyCrtOverlays(w, h);

    // ---- Timestamp HUD ----
    this.createHUD(w, h);

    // ---- Jitter timer (1-2px vertical shifts) ----
    this.jitterTimer = this.time.addEvent({
      delay: Phaser.Math.Between(60000, 120000), // 1-2 minutes
      loop: true,
      callback: () => {
        for (const sprite of this.spriteTargets) {
          if (sprite.visible && Math.random() < 0.3) {
            const shift = Phaser.Math.Between(-2, 2);
            sprite.y += shift;
            // Return to base after a short delay
            this.time.delayedCall(100, () => {
              sprite.y -= shift;
            });
          }
        }
      },
    });

    // ---- Random digital artifact glitches ----
    this.scheduleGlitch();

    // ---- EventBus: listen for state updates from React ----
    EventBus.on("state-update", this.onStateUpdate, this);

    // ---- Signal that scene is ready ----
    EventBus.emit("current-scene-ready", this);
  }

  // ==============================================================
  // UPDATE (runs every frame)
  // ==============================================================
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_time: number, _delta: number) {
    // Redraw noise overlay each frame for dynamic static
    this.drawNoise();

    // Update HUD clock
    this.updateHUD();

    // Paranoia: very occasional twitchy head on suspect (rare)
    if (
      this.state.paranoia > 50 &&
      this.suspect.visible &&
      Math.random() < 0.001
    ) {
      const twitchAmount = (this.state.paranoia - 50) / 25;
      this.suspect.x = this.suspect.x + (Math.random() - 0.5) * twitchAmount;
    }
  }

  // ==============================================================
  // STATE UPDATE HANDLER
  // ==============================================================
  private onStateUpdate(newState: Partial<SceneState>) {
    const prevHostages = this.state.hostages;
    this.state = { ...this.state, ...newState };

    // Determine behavior state
    const t = this.state.tension;
    let newBehavior: BehaviorState;
    if (t <= 40) newBehavior = "calm";
    else if (t <= 70) newBehavior = "agitated";
    else newBehavior = "crisis";

    // If behavior changed, transition
    if (newBehavior !== this.behaviorState) {
      this.transitionBehavior(newBehavior);
    }

    // If hostages changed, update sprites
    if (this.state.hostages < prevHostages) {
      this.killHostage(this.state.hostages);
    }
  }

  // ==============================================================
  // BEHAVIOR STATE MACHINE
  // ==============================================================
  private transitionBehavior(newState: BehaviorState) {
    const prevState = this.behaviorState;
    this.behaviorState = newState;

    // Stop any existing pace tween
    if (this.paceTween) {
      this.paceTween.stop();
      this.paceTween = null;
    }

    // Release crisis hostage if leaving crisis
    if (prevState === "crisis" && this.crisisHostageIndex >= 0) {
      const hostage = this.hostageSprites[this.crisisHostageIndex];
      if (hostage && hostage.visible) {
        // Return hostage to original position
        const positions = [
          { x: 120, y: 300 },
          { x: 180, y: 320 },
          { x: 240, y: 295 },
        ];
        const pos = positions[this.crisisHostageIndex];
        this.tweens.add({
          targets: hostage,
          x: pos.x,
          y: pos.y,
          duration: 800,
          ease: "Power2",
        });
      }
      this.crisisHostageIndex = -1;
    }

    switch (newState) {
      case "calm":
        this.enterCalm();
        break;
      case "agitated":
        this.enterAgitated();
        break;
      case "crisis":
        this.enterCrisis();
        break;
    }
  }

  private enterCalm() {
    // Return to center, play idle animation
    this.tweens.add({
      targets: this.suspect,
      x: this.suspectBaseX,
      y: this.suspectBaseY,
      duration: 1000,
      ease: "Power2",
    });
    this.suspect.play("suspect-breathe");
  }

  private enterAgitated() {
    // Play walk animation, start pacing tween
    this.suspect.play("suspect-pace");

    const paceRange = 40 + (this.state.tension - 40) * 1.5;
    const paceSpeed = 2500 - (this.state.tension - 40) * 30;

    this.paceTween = this.tweens.add({
      targets: this.suspect,
      x: {
        from: this.suspectBaseX - paceRange,
        to: this.suspectBaseX + paceRange,
      },
      duration: Math.max(800, paceSpeed),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onYoyo: () => {
        this.suspect.setFlipX(!this.suspect.flipX);
      },
      onRepeat: () => {
        this.suspect.setFlipX(!this.suspect.flipX);
      },
    });
  }

  private enterCrisis() {
    // Play crisis animation
    this.suspect.play("suspect-threat");

    // Find a living hostage to grab
    this.crisisHostageIndex = -1;
    for (let i = 0; i < this.hostageSprites.length; i++) {
      if (this.hostageSprites[i].visible) {
        this.crisisHostageIndex = i;
        break;
      }
    }

    // Move suspect toward door (left side of screen)
    const crisisX = 300;
    const crisisY = 280;

    this.tweens.add({
      targets: this.suspect,
      x: crisisX,
      y: crisisY,
      duration: 1500,
      ease: "Power2",
    });

    // Drag the grabbed hostage along
    if (this.crisisHostageIndex >= 0) {
      const hostage = this.hostageSprites[this.crisisHostageIndex];
      this.tweens.add({
        targets: hostage,
        x: crisisX - 30,
        y: crisisY + 15,
        duration: 1500,
        ease: "Power2",
      });
    }
  }

  // ==============================================================
  // HOSTAGE MANAGEMENT
  // ==============================================================
  private killHostage(remainingCount: number) {
    // Kill the next hostage (from the end)
    for (let i = this.hostageSprites.length - 1; i >= 0; i--) {
      if (i >= remainingCount && this.hostageSprites[i].visible) {
        const hostage = this.hostageSprites[i];
        const dead = this.deadHostageSprites[i];

        // Brief flash effect
        this.cameras.main.flash(200, 40, 0, 0);

        // Hide living, show dead
        this.time.delayedCall(200, () => {
          hostage.setVisible(false);
          dead.setVisible(true);
        });

        break;
      }
    }
  }

  // ==============================================================
  // CRT OVERLAYS (scanlines, vignette, noise — drawn in-scene)
  // ==============================================================
  private applyCrtOverlays(w: number, h: number) {
    // Scanlines — horizontal semi-transparent lines
    this.scanlineGraphics = this.add.graphics().setDepth(90);
    this.scanlineGraphics.fillStyle(0x000000, 0.08);
    for (let y = 0; y < h; y += 3) {
      this.scanlineGraphics.fillRect(0, y, w, 1);
    }

    // Vignette — dark edges
    this.vignetteGraphics = this.add.graphics().setDepth(91);
    // Draw concentric rectangles getting darker toward edges
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const alpha = (i / steps) * 0.4;
      const inset = ((steps - i) / steps) * 0.35;
      this.vignetteGraphics.fillStyle(0x000000, alpha);
      // Top strip
      this.vignetteGraphics.fillRect(0, 0, w, h * inset);
      // Bottom strip
      this.vignetteGraphics.fillRect(0, h - h * inset, w, h * inset);
      // Left strip
      this.vignetteGraphics.fillRect(0, 0, w * inset, h);
      // Right strip
      this.vignetteGraphics.fillRect(w - w * inset, 0, w * inset, h);
    }

    // Noise overlay — redrawn every frame in update()
    this.noiseGraphics = this.add.graphics().setDepth(92).setAlpha(0.5);
  }

  private drawNoise() {
    const w = 640;
    const h = 480;
    const intensity = 0.02 + (this.state.tension / 100) * 0.04;

    this.noiseGraphics.clear();
    // Draw sparse random noise pixels
    for (let i = 0; i < 200; i++) {
      if (Math.random() < intensity * 5) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        const brightness = Math.random() * 0.3;
        this.noiseGraphics.fillStyle(0xffffff, brightness);
        this.noiseGraphics.fillRect(x, y, 2, 1);
      }
    }
  }

  // ==============================================================
  // DIGITAL GLITCH ARTIFACTS
  // ==============================================================
  private scheduleGlitch() {
    const delay = Phaser.Math.Between(60000, 120000); // 1-2 minutes
    this.glitchTimer = this.time.delayedCall(delay, () => {
      // Brief vertical frame shift
      const shift = Phaser.Math.Between(-3, 3);
      this.cameras.main.y += shift;

      // Briefly increase noise
      this.noiseGraphics.setAlpha(1);

      // Restore after brief duration
      this.time.delayedCall(Phaser.Math.Between(80, 200), () => {
        this.cameras.main.y = 0;
        this.noiseGraphics.setAlpha(0.5);
        this.scheduleGlitch();
      });
    });
  }

  // ==============================================================
  // BANK INTERIOR
  // ==============================================================
  private buildBankInterior(w: number, h: number) {
    // Back wall — dark grey-green, typical of CCTV footage
    this.add.rectangle(w / 2, h * 0.325, w, h * 0.65, 0x2a2e2a);

    // Wall paneling lines
    const wallGraphics = this.add.graphics();
    wallGraphics.lineStyle(1, 0x3a3e3a);
    for (let x = 0; x < w; x += 80) {
      wallGraphics.lineBetween(x, 0, x, h * 0.65);
    }

    // "FIRST NATIONAL BANK" sign
    this.add
      .text(w / 2, 16, "FIRST NATIONAL BANK", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#556655",
      })
      .setOrigin(0.5, 0.5);

    // Floor — slightly lighter than wall
    this.add.rectangle(w / 2, h * 0.825, w, h * 0.35, 0x2e3028);

    // Floor tiles (checkerboard)
    const floorGraphics = this.add.graphics();
    floorGraphics.fillStyle(0x383a32);
    for (let x = 0; x < w; x += 40) {
      for (let y = h * 0.65; y < h; y += 30) {
        if ((Math.floor(x / 40) + Math.floor(y / 30)) % 2 === 0) {
          floorGraphics.fillRect(x, y, 40, 30);
        }
      }
    }

    // Counter/desk
    this.add.rectangle(w * 0.25, h * 0.55, w * 0.4, h * 0.2, 0x4a4038);
    // Counter top edge
    this.add
      .rectangle(w * 0.25, h * 0.45, w * 0.4, 4, 0x5a5048)
      .setOrigin(0.5, 0);

    // Vault door
    this.add.rectangle(w * 0.8, h * 0.325, w * 0.2, h * 0.45, 0x333333);
    const vaultGraphics = this.add.graphics();
    vaultGraphics.lineStyle(3, 0x4a4a4a);
    vaultGraphics.strokeRect(w * 0.7, h * 0.1, w * 0.2, h * 0.45);
    // Vault handle
    vaultGraphics.lineStyle(3, 0x5a5a5a);
    vaultGraphics.strokeCircle(w * 0.8, h * 0.32, 15);
    // Handle spokes
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      vaultGraphics.lineBetween(
        w * 0.8,
        h * 0.32,
        w * 0.8 + Math.cos(angle) * 15,
        h * 0.32 + Math.sin(angle) * 15,
      );
    }

    // Exit door (left side)
    this.add.rectangle(40, h * 0.45, 50, h * 0.4, 0x1a1a1a);
    const doorGraphics = this.add.graphics();
    doorGraphics.lineStyle(1, 0x3a3a3a);
    doorGraphics.strokeRect(15, h * 0.25, 50, h * 0.4);
  }

  // ==============================================================
  // ANIMATIONS
  // ==============================================================
  private createAnimations() {
    // Suspect idle breathing — 4 frames at 5 FPS
    this.anims.create({
      key: "suspect-breathe",
      frames: this.anims.generateFrameNumbers("suspect-idle", {
        start: 0,
        end: 3,
      }),
      frameRate: 5,
      repeat: -1,
    });

    // Suspect pacing walk — 6 frames at 7 FPS
    this.anims.create({
      key: "suspect-pace",
      frames: this.anims.generateFrameNumbers("suspect-walk", {
        start: 0,
        end: 5,
      }),
      frameRate: 7,
      repeat: -1,
    });

    // Suspect crisis / threat — 4 frames at 6 FPS
    this.anims.create({
      key: "suspect-threat",
      frames: this.anims.generateFrameNumbers("suspect-crisis", {
        start: 0,
        end: 3,
      }),
      frameRate: 6,
      repeat: -1,
    });

    // hostage-kneel is now a static image — no animation needed
  }

  // ==============================================================
  // HUD (timestamp, REC indicator)
  // ==============================================================
  private createHUD(w: number, h: number) {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#555555",
    };

    // CAM-03 + timestamp
    this.camText = this.add
      .text(10, h - 20, "", textStyle)
      .setScrollFactor(0)
      .setDepth(100);

    // REC text
    this.recText = this.add
      .text(w - 48, h - 20, "REC", textStyle)
      .setScrollFactor(0)
      .setDepth(100);

    // Blinking REC dot
    this.recDot = this.add
      .circle(w - 16, h - 14, 3, 0xaa0000)
      .setScrollFactor(0)
      .setDepth(100);

    // Blink timer
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.recDot.setVisible(!this.recDot.visible);
      },
    });
  }

  private updateHUD() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
    const dateStr = now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    this.camText.setText(`CAM-03  ${dateStr}  ${timeStr}`);
  }

  // ==============================================================
  // CLEANUP
  // ==============================================================
  shutdown() {
    EventBus.off("state-update", this.onStateUpdate, this);
  }
}
