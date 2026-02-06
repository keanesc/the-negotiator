"use client";

import { useRef, useEffect } from "react";

// ============================================================
// CCTV Monitor — canvas-based bank interior with CRT effects
// Sprite scene: Jax + hostages, state-driven animation
// ============================================================

interface CCTVMonitorProps {
  tension: number;
  paranoia: number;
  hostages: number;
  gameStatus: "idle" | "calibrating" | "active" | "won" | "lost";
  children?: React.ReactNode; // Waveform overlay goes here
}

export default function CCTVMonitor({
  tension,
  paranoia,
  hostages,
  gameStatus,
  children,
}: CCTVMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;

    let animId: number;
    const startTime = performance.now();

    function draw(now: number) {
      if (!ctx || !canvas) return;
      timeRef.current = (now - startTime) / 1000;
      frameRef.current++;

      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // Bank interior background
      drawBankInterior(ctx, w, h, t);

      // Draw hostages
      drawHostages(ctx, w, h, hostages, t);

      // Draw Jax
      drawJax(ctx, w, h, tension, paranoia, t);

      // CRT effects
      drawScanlines(ctx, w, h);
      drawVignette(ctx, w, h);
      drawNoise(ctx, w, h, tension);

      // Timestamp overlay
      drawTimestamp(ctx, w, h, t);

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [tension, paranoia, hostages, gameStatus]);

  // Paranoia glow
  const paranoiaGlow = paranoia > 50 ? `0 0 ${paranoia / 3}px rgba(255, 165, 0, ${paranoia / 200})` : "none";

  return (
    <div className="relative" style={{ boxShadow: paranoiaGlow }}>
      {/* Monitor bezel */}
      <div
        className="relative rounded-sm overflow-hidden"
        style={{
          border: "8px solid #1a1a1a",
          borderTop: "12px solid #222",
          borderBottom: "12px solid #181818",
          boxShadow:
            "inset 0 0 30px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.8)",
          background: "#111",
        }}
      >
        {/* Power LED */}
        <div
          className="absolute top-[-8px] right-4 w-2 h-2 rounded-full z-10"
          style={{
            background: gameStatus === "active" ? "#00ff41" : gameStatus === "calibrating" ? "#ffaa00" : "#333",
            boxShadow: gameStatus === "active" ? "0 0 6px #00ff41" : "none",
          }}
        />

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="block w-full h-auto"
          style={{
            imageRendering: "pixelated",
            filter: `brightness(${1 - tension * 0.002}) contrast(${1 + tension * 0.003})`,
          }}
        />

        {/* Waveform overlay (children) */}
        {children && (
          <div className="absolute inset-0 pointer-events-none">{children}</div>
        )}

        {/* CRT curvature overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      </div>
    </div>
  );
}

// ---- Drawing functions ----

function drawBankInterior(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _t: number
) {
  // Floor
  ctx.fillStyle = "#1a1a18";
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  // Floor tiles (checkerboard pattern)
  ctx.fillStyle = "#1f1f1d";
  for (let x = 0; x < w; x += 40) {
    for (let y = h * 0.65; y < h; y += 30) {
      if ((Math.floor(x / 40) + Math.floor(y / 30)) % 2 === 0) {
        ctx.fillRect(x, y, 40, 30);
      }
    }
  }

  // Back wall
  ctx.fillStyle = "#161616";
  ctx.fillRect(0, 0, w, h * 0.65);

  // Wall paneling
  ctx.strokeStyle = "#1e1e1e";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h * 0.65);
    ctx.stroke();
  }

  // Counter/desk
  ctx.fillStyle = "#2a2520";
  ctx.fillRect(w * 0.05, h * 0.45, w * 0.4, h * 0.2);
  ctx.fillStyle = "#332e28";
  ctx.fillRect(w * 0.05, h * 0.45, w * 0.4, 4);

  // Vault door (background)
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(w * 0.7, h * 0.1, w * 0.2, h * 0.45);
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.7, h * 0.1, w * 0.2, h * 0.45);
  // Vault handle
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.32, 15, 0, Math.PI * 2);
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 3;
  ctx.stroke();

  // "FIRST NATIONAL BANK" sign (subtle)
  ctx.font = "10px monospace";
  ctx.fillStyle = "#2a2a2a";
  ctx.textAlign = "center";
  ctx.fillText("FIRST NATIONAL BANK", w / 2, 20);
}

function drawHostages(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  t: number
) {
  const positions = [
    { x: w * 0.15, y: h * 0.55 },
    { x: w * 0.25, y: h * 0.58 },
    { x: w * 0.35, y: h * 0.53 },
  ];

  for (let i = 0; i < 3; i++) {
    const pos = positions[i];
    if (i < count) {
      // Living hostage — kneeling silhouette
      const tremble = Math.sin(t * 3 + i * 2) * 1;
      drawSilhouettePerson(ctx, pos.x + tremble, pos.y, 0.6, "#1a1a1a", true);
    } else {
      // Dead hostage — lying on ground
      ctx.fillStyle = "#0f0f0f";
      ctx.fillRect(pos.x - 10, pos.y + 10, 25, 5);
    }
  }
}

function drawJax(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tension: number,
  paranoia: number,
  t: number
) {
  const baseX = w * 0.55;
  const baseY = h * 0.4;

  // Pacing motion — more erratic at high tension
  const paceSpeed = 1 + tension * 0.03;
  const paceRange = 10 + tension * 0.3;
  const dx = Math.sin(t * paceSpeed) * paceRange;

  // Paranoia — twitchy head movement
  const headTwitch = paranoia > 50 ? Math.sin(t * 8) * (paranoia / 30) : 0;

  // Draw Jax silhouette (standing, armed)
  const x = baseX + dx;
  const y = baseY;

  // Body
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(x - 6, y, 12, 25); // Torso

  // Head
  ctx.beginPath();
  ctx.arc(x + headTwitch, y - 5, 6, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillRect(x - 6, y + 25, 5, 15);
  ctx.fillRect(x + 1, y + 25, 5, 15);

  // Gun arm (extends when tension is high)
  const armAngle = tension > 70 ? -0.3 : 0.5;
  ctx.save();
  ctx.translate(x + 6, y + 5);
  ctx.rotate(armAngle);
  ctx.fillRect(0, 0, 18, 3);
  // Gun
  ctx.fillRect(16, -2, 8, 5);
  ctx.restore();

  // Other arm
  ctx.fillRect(x - 12, y + 5, 6, 3);
}

function drawSilhouettePerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  kneeling: boolean
) {
  ctx.fillStyle = color;

  if (kneeling) {
    // Kneeling pose
    ctx.fillRect(x - 4 * scale, y, 8 * scale, 15 * scale); // Body
    ctx.beginPath();
    ctx.arc(x, y - 3 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill(); // Head
    // Hands behind head
    ctx.fillRect(x - 6 * scale, y - 5 * scale, 3 * scale, 6 * scale);
    ctx.fillRect(x + 3 * scale, y - 5 * scale, 3 * scale, 6 * scale);
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.6)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawNoise(ctx: CanvasRenderingContext2D, w: number, h: number, tension: number) {
  const intensity = 0.02 + (tension / 100) * 0.06;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 16) {
    if (Math.random() < intensity) {
      const noise = (Math.random() - 0.5) * 40;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawTimestamp(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  ctx.font = "11px monospace";
  ctx.fillStyle = "#555";
  ctx.textAlign = "left";
  ctx.fillText(`CAM-03  ${dateStr}  ${timeStr}`, 10, h - 10);
  ctx.textAlign = "right";
  ctx.fillText("REC ●", w - 10, h - 10);

  // Blinking REC indicator
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = "#aa0000";
    ctx.beginPath();
    ctx.arc(w - 22, h - 13, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
