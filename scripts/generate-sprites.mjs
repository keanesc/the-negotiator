/**
 * Generate silhouette sprite sheets for the CCTV bank scene.
 * These are dark pixel-art figures on transparent backgrounds —
 * perfect for the security camera aesthetic.
 *
 * Outputs to public/sprites/
 *
 * Sprite sheets (32×48 per frame, horizontal strip):
 *   - suspect-idle.png      (4 frames: subtle breathing)
 *   - suspect-walk.png      (6 frames: pacing left-right)
 *   - suspect-crisis.png    (4 frames: grabbing hostage, gun raised)
 *   - hostage-kneel.png     (2 frames: kneeling tremble)
 *   - hostage-dead.png      (1 frame: lying flat)
 *   - bank-tileset.png      (tileset: floor, wall, counter, vault door, etc.)
 */

import { createCanvas } from "canvas"; // npm canvas is needed
import fs from "fs";
import path from "path";

const FRAME_W = 32;
const FRAME_H = 48;
const DARK = "#111111";
const DARKER = "#0a0a0a";
const DARKEST = "#060606";
const GUN_COLOR = "#151515";
const OUTLINE = "#1a1a1a";

const outDir = path.join(process.cwd(), "public", "sprites");
fs.mkdirSync(outDir, { recursive: true });

function saveSheet(canvas, name) {
  const buf = canvas.toBuffer("image/png");
  const p = path.join(outDir, name);
  fs.writeFileSync(p, buf);
  console.log(`  ✓ ${name} (${canvas.width}×${canvas.height})`);
}

// Helper: draw a simple standing person silhouette
function drawStandingBody(ctx, cx, footY, opts = {}) {
  const {
    headOffX = 0,
    headOffY = 0,
    armRAngle = 0.4, // right arm angle (radians, 0=down)
    armLAngle = 0.3,
    gunExtended = false,
    bodyShiftY = 0,
    legSpread = 0,
    color = DARK,
  } = opts;

  const headR = 4;
  const torsoH = 14;
  const legH = 12;
  const headCY = footY - legH - torsoH - headR + bodyShiftY;
  const torsoTop = headCY + headR;
  const torsoBot = torsoTop + torsoH;

  ctx.fillStyle = color;

  // Head
  ctx.beginPath();
  ctx.arc(cx + headOffX, headCY + headOffY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.fillRect(cx - 4, torsoTop, 8, torsoH);

  // Legs
  ctx.fillRect(cx - 4 - legSpread, torsoBot, 4, legH);
  ctx.fillRect(cx + legSpread, torsoBot, 4, legH);

  // Left arm
  ctx.save();
  ctx.translate(cx - 4, torsoTop + 2);
  ctx.rotate(-armLAngle);
  ctx.fillRect(-3, 0, 3, 10);
  ctx.restore();

  // Right arm + optional gun
  ctx.save();
  ctx.translate(cx + 4, torsoTop + 2);
  ctx.rotate(armRAngle);
  ctx.fillRect(0, 0, 3, 10);
  if (gunExtended) {
    ctx.fillStyle = GUN_COLOR;
    ctx.fillRect(1, 9, 2, 7);
    ctx.fillRect(-1, 14, 6, 3); // barrel
  }
  ctx.restore();
}

// Helper: draw kneeling person
function drawKneelingBody(ctx, cx, footY, opts = {}) {
  const { headOffX = 0, headOffY = 0, color = DARK } = opts;
  const headR = 3;
  const kneelY = footY - 8;

  ctx.fillStyle = color;

  // Head
  ctx.beginPath();
  ctx.arc(cx + headOffX, kneelY - 10 + headOffY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Torso (hunched)
  ctx.fillRect(cx - 3, kneelY - 7, 6, 10);

  // Arms behind head
  ctx.fillRect(cx - 5, kneelY - 12, 2, 6);
  ctx.fillRect(cx + 3, kneelY - 12, 2, 6);

  // Folded legs
  ctx.fillRect(cx - 4, kneelY + 3, 8, 4);
}

// ---- Suspect Idle (4 frames: subtle breathing) ----
{
  const frames = 4;
  const canvas = createCanvas(FRAME_W * frames, FRAME_H);
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < frames; i++) {
    const ox = i * FRAME_W;
    const breathe = Math.sin((i / frames) * Math.PI * 2) * 0.5;
    ctx.save();
    ctx.translate(ox, 0);
    drawStandingBody(ctx, FRAME_W / 2, FRAME_H - 2, {
      bodyShiftY: breathe,
      armRAngle: 0.6,
      gunExtended: true,
    });
    ctx.restore();
  }
  saveSheet(canvas, "suspect-idle.png");
}

// ---- Suspect Walk (6 frames: pacing) ----
{
  const frames = 6;
  const canvas = createCanvas(FRAME_W * frames, FRAME_H);
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < frames; i++) {
    const ox = i * FRAME_W;
    const phase = (i / frames) * Math.PI * 2;
    const legSpd = Math.sin(phase) * 3;
    ctx.save();
    ctx.translate(ox, 0);
    drawStandingBody(ctx, FRAME_W / 2, FRAME_H - 2, {
      legSpread: Math.abs(legSpd),
      armRAngle: 0.4 + Math.sin(phase) * 0.2,
      armLAngle: 0.3 + Math.cos(phase) * 0.2,
      gunExtended: true,
      bodyShiftY: Math.abs(Math.sin(phase)) * -1,
    });
    ctx.restore();
  }
  saveSheet(canvas, "suspect-walk.png");
}

// ---- Suspect Crisis (4 frames: gun raised, aggressive stance) ----
{
  const frames = 4;
  const canvas = createCanvas(FRAME_W * frames, FRAME_H);
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < frames; i++) {
    const ox = i * FRAME_W;
    const phase = (i / frames) * Math.PI * 2;
    ctx.save();
    ctx.translate(ox, 0);
    drawStandingBody(ctx, FRAME_W / 2, FRAME_H - 2, {
      armRAngle: -0.8 + Math.sin(phase) * 0.15, // Gun raised high
      armLAngle: -0.3,
      gunExtended: true,
      headOffX: Math.sin(phase * 2) * 1.5, // Twitchy head
      legSpread: 2,
    });
    ctx.restore();
  }
  saveSheet(canvas, "suspect-crisis.png");
}

// ---- Hostage Kneel (2 frames: subtle tremble) ----
{
  const frames = 2;
  const canvas = createCanvas(FRAME_W * frames, FRAME_H);
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < frames; i++) {
    const ox = i * FRAME_W;
    ctx.save();
    ctx.translate(ox, 0);
    drawKneelingBody(ctx, FRAME_W / 2, FRAME_H - 2, {
      headOffX: i === 1 ? 1 : -1,
      headOffY: i === 1 ? -0.5 : 0.5,
    });
    ctx.restore();
  }
  saveSheet(canvas, "hostage-kneel.png");
}

// ---- Hostage Dead (1 frame: lying flat) ----
{
  const canvas = createCanvas(FRAME_W, FRAME_H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = DARKER;
  // Lying body
  const y = FRAME_H - 8;
  ctx.fillRect(4, y, 24, 4); // body flat
  // Head
  ctx.beginPath();
  ctx.arc(6, y + 1, 3, 0, Math.PI * 2);
  ctx.fill();

  saveSheet(canvas, "hostage-dead.png");
}

// ---- Bank Tileset (16×16 tiles in a grid) ----
{
  const TILE = 16;
  const cols = 8;
  const rows = 8;
  const canvas = createCanvas(TILE * cols, TILE * rows);
  const ctx = canvas.getContext("2d");

  function drawTile(col, row, fn) {
    ctx.save();
    ctx.translate(col * TILE, row * TILE);
    fn(ctx, TILE);
    ctx.restore();
  }

  // Tile 0,0: Dark floor tile A
  drawTile(0, 0, (c, s) => {
    c.fillStyle = "#1a1a18";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#222220";
    c.lineWidth = 0.5;
    c.strokeRect(0.5, 0.5, s - 1, s - 1);
  });

  // Tile 1,0: Dark floor tile B (slightly lighter for checkerboard)
  drawTile(1, 0, (c, s) => {
    c.fillStyle = "#1f1f1d";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#252523";
    c.lineWidth = 0.5;
    c.strokeRect(0.5, 0.5, s - 1, s - 1);
  });

  // Tile 2,0: Wall panel
  drawTile(2, 0, (c, s) => {
    c.fillStyle = "#161616";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#1e1e1e";
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(s, 0);
    c.lineTo(s, s);
    c.stroke();
  });

  // Tile 3,0: Wall panel with baseboard
  drawTile(3, 0, (c, s) => {
    c.fillStyle = "#161616";
    c.fillRect(0, 0, s, s);
    c.fillStyle = "#1c1c1a";
    c.fillRect(0, s - 3, s, 3);
  });

  // Tile 4,0: Counter top
  drawTile(4, 0, (c, s) => {
    c.fillStyle = "#2a2520";
    c.fillRect(0, 0, s, s);
    c.fillStyle = "#332e28";
    c.fillRect(0, 0, s, 3); // top edge
  });

  // Tile 5,0: Counter front
  drawTile(5, 0, (c, s) => {
    c.fillStyle = "#231f1a";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#2a2520";
    c.lineWidth = 0.5;
    c.strokeRect(2, 2, s - 4, s - 4);
  });

  // Tile 6,0: Vault door (top-left quadrant)
  drawTile(6, 0, (c, s) => {
    c.fillStyle = "#1a1a1a";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#2a2a2a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, s);
    c.moveTo(0, 0);
    c.lineTo(s, 0);
    c.stroke();
  });

  // Tile 7,0: Vault door (top-right, with handle circle)
  drawTile(7, 0, (c, s) => {
    c.fillStyle = "#1a1a1a";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#3a3a3a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(s / 2, s / 2, 5, 0, Math.PI * 2);
    c.stroke();
    // Spokes
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      c.beginPath();
      c.moveTo(s / 2, s / 2);
      c.lineTo(s / 2 + Math.cos(angle) * 5, s / 2 + Math.sin(angle) * 5);
      c.stroke();
    }
  });

  // Tile 0,1: Vault door (bottom-left)
  drawTile(0, 1, (c, s) => {
    c.fillStyle = "#1a1a1a";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#2a2a2a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, s);
    c.moveTo(0, s);
    c.lineTo(s, s);
    c.stroke();
  });

  // Tile 1,1: Vault door (bottom-right)
  drawTile(1, 1, (c, s) => {
    c.fillStyle = "#1a1a1a";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#2a2a2a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(s, 0);
    c.lineTo(s, s);
    c.moveTo(0, s);
    c.lineTo(s, s);
    c.stroke();
  });

  // Tile 2,1: Window / glass panel
  drawTile(2, 1, (c, s) => {
    c.fillStyle = "#111418";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#2a2a2e";
    c.lineWidth = 1;
    c.strokeRect(1, 1, s - 2, s - 2);
    // Reflection line
    c.strokeStyle = "#1a1a20";
    c.beginPath();
    c.moveTo(3, 3);
    c.lineTo(s - 6, s - 6);
    c.stroke();
  });

  // Tile 3,1: Door frame
  drawTile(3, 1, (c, s) => {
    c.fillStyle = "#181818";
    c.fillRect(0, 0, s, s);
    c.fillStyle = "#0d0d0d";
    c.fillRect(3, 0, s - 6, s); // dark opening
    c.strokeStyle = "#222222";
    c.lineWidth = 1;
    c.strokeRect(2, 0, s - 4, s);
  });

  // Tile 4,1: Ceiling / dark
  drawTile(4, 1, (c, s) => {
    c.fillStyle = "#0e0e0e";
    c.fillRect(0, 0, s, s);
  });

  // Tile 5,1: Fluorescent light fixture
  drawTile(5, 1, (c, s) => {
    c.fillStyle = "#0e0e0e";
    c.fillRect(0, 0, s, s);
    c.fillStyle = "#2a2a28";
    c.fillRect(2, s / 2 - 1, s - 4, 3);
    c.fillStyle = "#3a3a35";
    c.fillRect(3, s / 2, s - 6, 1);
  });

  // Tile 6,1: Sign tile "FIRST"
  drawTile(6, 1, (c, s) => {
    c.fillStyle = "#161616";
    c.fillRect(0, 0, s, s);
    c.font = "5px monospace";
    c.fillStyle = "#2a2a2a";
    c.textAlign = "center";
    c.fillText("FIRST", s / 2, s / 2 + 2);
  });

  // Tile 7,1: Sign tile "NATIONAL"
  drawTile(7, 1, (c, s) => {
    c.fillStyle = "#161616";
    c.fillRect(0, 0, s, s);
    c.font = "4px monospace";
    c.fillStyle = "#2a2a2a";
    c.textAlign = "center";
    c.fillText("NATIONAL", s / 2, s / 2 + 2);
  });

  // Tile 0,2: Sign tile "BANK"
  drawTile(0, 2, (c, s) => {
    c.fillStyle = "#161616";
    c.fillRect(0, 0, s, s);
    c.font = "5px monospace";
    c.fillStyle = "#2a2a2a";
    c.textAlign = "center";
    c.fillText("BANK", s / 2, s / 2 + 2);
  });

  // Tile 1,2: Empty/black
  drawTile(1, 2, (c, s) => {
    c.fillStyle = "#0a0a0a";
    c.fillRect(0, 0, s, s);
  });

  saveSheet(canvas, "bank-tileset.png");
}

console.log("\nAll sprites generated in public/sprites/");
