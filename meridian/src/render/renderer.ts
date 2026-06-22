import type { PhysicsBody } from "../engine/physics";
import { HORIZON_Y, WORLD_H, WORLD_W } from "../game/world";
import type { SegmentState } from "../game/segment";
import { createDaySky, createNightSky } from "./palette";

const SILHOUETTE = "#0e1220";
const ICE_FILL = "#bfe4ee";
const EXIT_SOL = "rgba(255,184,107,0.30)";
const EXIT_LUNA = "rgba(123,212,255,0.30)";

export interface Renderer {
  readonly dayBright: HTMLCanvasElement;
  readonly dayDim: HTMLCanvasElement;
  readonly nightLit: HTMLCanvasElement;
  readonly nightDark: HTMLCanvasElement;
  readonly solCore: HTMLCanvasElement;
  readonly lunaCore: HTMLCanvasElement;
  readonly sunOrb: HTMLCanvasElement;
  readonly horizonGlow: HTMLCanvasElement;
}

function createRadialGlow(radius: number, r: number, g: number, b: number, peak: number): HTMLCanvasElement {
  const size = Math.ceil(radius * 2);
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return c;
  }
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${peak})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function createHorizonGlow(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = WORLD_W;
  c.height = 40;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return c;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, 40);
  grad.addColorStop(0, "rgba(255,243,196,0)");
  grad.addColorStop(0.5, "rgba(255,243,196,0.9)");
  grad.addColorStop(1, "rgba(255,243,196,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD_W, 40);
  return c;
}

export function createRenderer(): Renderer {
  return {
    dayBright: createDaySky(1),
    dayDim: createDaySky(0),
    nightLit: createNightSky(1),
    nightDark: createNightSky(0),
    solCore: createRadialGlow(34, 255, 184, 107, 0.95),
    lunaCore: createRadialGlow(34, 123, 212, 255, 0.95),
    sunOrb: createRadialGlow(64, 255, 233, 168, 1),
    horizonGlow: createHorizonGlow(),
  };
}

function drawAvatar(ctx: CanvasRenderingContext2D, body: PhysicsBody, core: HTMLCanvasElement): void {
  ctx.fillStyle = SILHOUETTE;
  ctx.fillRect(body.pos.x - body.half.x, body.pos.y - body.half.y, body.half.x * 2, body.half.y * 2);
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(core, body.pos.x - core.width / 2, body.pos.y - core.height / 2);
  ctx.globalCompositeOperation = "source-over";
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: SegmentState,
  renderer: Renderer,
  view: { width: number; height: number; dpr: number },
): void {
  const scale = Math.min(view.width / WORLD_W, view.height / WORLD_H);
  const offX = (view.width - WORLD_W * scale) / 2;
  const offY = (view.height - WORLD_H * scale) / 2;

  ctx.save();
  ctx.setTransform(view.dpr * scale, 0, 0, view.dpr * scale, view.dpr * offX, view.dpr * offY);
  ctx.imageSmoothingEnabled = true;

  const s = state.sun.value;

  ctx.drawImage(renderer.dayDim, 0, 0);
  ctx.globalAlpha = s;
  ctx.drawImage(renderer.dayBright, 0, 0);
  ctx.globalAlpha = 1;

  ctx.drawImage(renderer.nightDark, 0, HORIZON_Y);
  ctx.globalAlpha = 1 - s;
  ctx.drawImage(renderer.nightLit, 0, HORIZON_Y);
  ctx.globalAlpha = 1;

  ctx.fillStyle = SILHOUETTE;
  for (const t of state.data.dayTerrain) {
    ctx.fillRect(t.x, t.y, t.w, t.h);
  }
  for (const t of state.data.nightTerrain) {
    ctx.fillRect(t.x, t.y, t.w, t.h);
  }

  ctx.fillStyle = EXIT_SOL;
  ctx.fillRect(state.data.exits.sol.x, state.data.exits.sol.y, state.data.exits.sol.w, state.data.exits.sol.h);
  ctx.fillStyle = EXIT_LUNA;
  ctx.fillRect(state.data.exits.luna.x, state.data.exits.luna.y, state.data.exits.luna.w, state.data.exits.luna.h);

  for (const e of state.elements) {
    const alpha = e.visualAt(s).alpha;
    if (alpha <= 0) {
      continue;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ICE_FILL;
    ctx.fillRect(e.box.x, e.box.y, e.box.w, e.box.h);
    ctx.globalAlpha = 1;
  }

  drawAvatar(ctx, state.player.sol, renderer.solCore);
  drawAvatar(ctx, state.player.luna, renderer.lunaCore);

  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(renderer.horizonGlow, 0, HORIZON_Y - 20);

  const orbScale = 0.85 + 0.15 * s;
  const orbAlpha = 0.55 + 0.45 * s;
  const orbSize = renderer.sunOrb.width * orbScale;
  const orbX = 640;
  const orbY = 660 - 600 * s;
  ctx.globalAlpha = orbAlpha;
  ctx.drawImage(renderer.sunOrb, orbX - orbSize / 2, orbY - orbSize / 2, orbSize, orbSize);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  ctx.restore();
}
