// ============================================================
// EventBus — Phaser ↔ React communication bridge
// ============================================================

import Phaser from "phaser";

export const EventBus = new Phaser.Events.EventEmitter();
