import { HORIZON_Y, WORLD_H, WORLD_W } from "../game/world";

type RGB = readonly [number, number, number];

const HALF_H = WORLD_H - HORIZON_Y;

// Each pair: [dim, bright] — day brightens with s, night brightens with (1-s).
// M5 R5：仅微调色相以加强「暖昼 / 冷夜」对比；保持 [dim,bright] 线性结构不变，
// 故亮度/上下位置仍是世界的首要区分信号（绝不以纯色相表义）。
const DAY_TOP: readonly [RGB, RGB] = [
  [60, 52, 96],
  [214, 162, 90],
];
const DAY_HOR: readonly [RGB, RGB] = [
  [112, 86, 82],
  [250, 206, 128],
];
const NIGHT_TOP: readonly [RGB, RGB] = [
  [22, 36, 78],
  [78, 62, 130],
];
const NIGHT_BOT: readonly [RGB, RGB] = [
  [8, 16, 34],
  [158, 116, 190],
];

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgb(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

export function createDaySky(bright: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = WORLD_W;
  c.height = HORIZON_Y;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return c;
  }
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  g.addColorStop(0, rgb(lerpRGB(DAY_TOP[0], DAY_TOP[1], bright)));
  g.addColorStop(1, rgb(lerpRGB(DAY_HOR[0], DAY_HOR[1], bright)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, HORIZON_Y);
  return c;
}

export function createNightSky(lit: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = WORLD_W;
  c.height = HALF_H;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return c;
  }
  const g = ctx.createLinearGradient(0, 0, 0, HALF_H);
  g.addColorStop(0, rgb(lerpRGB(NIGHT_TOP[0], NIGHT_TOP[1], lit)));
  g.addColorStop(1, rgb(lerpRGB(NIGHT_BOT[0], NIGHT_BOT[1], lit)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, HALF_H);
  return c;
}
