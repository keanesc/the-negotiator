// ============================================================
// Phaser Game Config — factory function to create the game
// ============================================================

import Phaser from "phaser";
import { BankScene } from "@/lib/phaser/scenes/BankScene";

export function StartGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 640,
    height: 480,
    parent,
    backgroundColor: "#0a0a0a",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BankScene],
    // Disable audio — we handle audio separately via Web Audio API
    audio: {
      noAudio: true,
    },
  };

  return new Phaser.Game(config);
}
