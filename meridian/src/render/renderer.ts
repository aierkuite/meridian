import type { PhysicsBody } from "../engine/physics";
import type { CameraState } from "../engine/camera";
import { clamp } from "../engine/math";
import { HORIZON_Y, WORLD_H, WORLD_W } from "../game/world";
import type { Element, ElementKind, ElementWorld } from "../game/element";
import type { SegmentState } from "../game/segment";
import type { Consequence } from "../game/consequence";
import { createDaySky, createNightSky } from "./palette";

const SILHOUETTE = "#0e1220";
/** 核心辉光最暗时仍保留的 alpha 地板：耗尽的光是「黯淡余烬」而非「消失」（AC4） */
const CORE_DIM_FLOOR = 0.18;
/** 各元素 kind+world 的轮廓填色（design.md §6 minimum differentiation） */
const ICE_FILL = "#bfe4ee";
const VINE_DAY_FILL = "#7fae5a";
const FUNGI_NIGHT_FILL = "#8a4fd3";
const DOOR_DAY_FILL = "rgba(255,209,102,0.65)";
const GATE_NIGHT_FILL = "rgba(123,160,255,0.65)";
const MOTE_FILL = "#ffe6a8";
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
  /** fungi/mote 共用的预渲染辉光精灵（加性合成用，避免 per-frame shadowBlur） */
  readonly elementGlow: HTMLCanvasElement;
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
    // 小尺寸辉光精灵：drawImage 时按 box 缩放，供 fungi/mote 加性绘制
    elementGlow: createRadialGlow(48, 255, 220, 160, 0.55),
  };
}

/**
 * 把 consequence 的剩余光值映射为核心辉光亮度（AC4 / AC10）
 *
 * 用 alpha/亮度而非色相承载「已花费的光」：满光为 1，耗尽时落到 CORE_DIM_FLOOR
 * 的暗余烬，保证 silhouette 始终在场（牺牲＝变暗，不是移除），且不以纯色相表义。
 *
 * @param light 该核剩余光值（consequence.solLight / lunaLight，[0,1]）
 * @returns 绘制核心辉光时应使用的 globalAlpha（[CORE_DIM_FLOOR, 1]）
 */
function coreBrightness(light: number): number {
  return CORE_DIM_FLOOR + (1 - CORE_DIM_FLOOR) * clamp(light, 0, 1);
}

/**
 * 绘制单个 avatar：实心轮廓恒亮在场，核心辉光按 brightness 加性叠加
 *
 * 轮廓（silhouette）不受 consequence 影响，确保两位 avatar 全程可见；只有核心
 * 辉光随花费的光变暗（globalAlpha=brightness），表义经由亮度而非色相。
 *
 * @param ctx 目标 2D 上下文
 * @param body 该 avatar 的物理体（提供位置与半尺寸）
 * @param core 预渲染的核心辉光精灵
 * @param brightness 核心辉光亮度（coreBrightness 的返回值，[CORE_DIM_FLOOR,1]）
 * @returns 无返回值
 */
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  body: PhysicsBody,
  core: HTMLCanvasElement,
  brightness: number,
): void {
  ctx.fillStyle = SILHOUETTE;
  ctx.fillRect(body.pos.x - body.half.x, body.pos.y - body.half.y, body.half.x * 2, body.half.y * 2);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = brightness;
  ctx.drawImage(core, body.pos.x - core.width / 2, body.pos.y - core.height / 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/**
 * 按 kind + world 选择元素轮廓填色
 *
 * 行为属模拟层职责；本函数只做表现层取色，绝不下放 gameplay 判定。
 *
 * @param kind 元素类型
 * @param world 所在世界
 * @returns 形如 "#rrggbb" 或 "rgba(...)" 的填色字符串
 */
function elementFillFor(kind: ElementKind, world: ElementWorld): string {
  switch (kind) {
    case "ice":
      return ICE_FILL;
    case "vine":
      // day = 暖绿藤蔓；night = 紫色发光真菌
      return world === "day" ? VINE_DAY_FILL : FUNGI_NIGHT_FILL;
    case "door":
      // day = 暖色光门；night = 冷色暗门
      return world === "day" ? DOOR_DAY_FILL : GATE_NIGHT_FILL;
    case "mote":
      return MOTE_FILL;
  }
}

/**
 * 绘制单个元素：先填轮廓，再为真菌/mote 叠加预渲染辉光（加性合成）
 *
 * 不使用 per-frame shadowBlur——辉光来自 createRenderer() 预渲染的精灵，
 * 用 drawImage + globalCompositeOperation='lighter' 叠加（见 design.md §6）。
 *
 * @param ctx 目标 2D 上下文（调用方已设置 globalAlpha）
 * @param e 待绘制元素
 * @param renderer 持有预渲染辉光精灵
 * @returns 无返回值
 */
function fillElement(ctx: CanvasRenderingContext2D, e: Element, renderer: Renderer): void {
  ctx.fillStyle = elementFillFor(e.kind, e.world);
  ctx.fillRect(e.box.x, e.box.y, e.box.w, e.box.h);
  // 为真菌（night vine）与 mote 加性叠一层辉光，强化生物发光观感
  if ((e.kind === "vine" && e.world === "night") || e.kind === "mote") {
    const glow = renderer.elementGlow;
    const cx = e.box.x + e.box.w / 2;
    const cy = e.box.y + e.box.h / 2;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(glow, cx - glow.width / 2, cy - glow.height / 2);
    ctx.globalCompositeOperation = "source-over";
  }
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: SegmentState,
  camera: CameraState,
  renderer: Renderer,
  view: { width: number; height: number; dpr: number },
  consequence: Consequence,
): void {
  const scale = Math.min(view.width / WORLD_W, view.height / WORLD_H);
  const offX = (view.width - WORLD_W * scale) / 2;
  const offY = (view.height - WORLD_H * scale) / 2;

  ctx.save();
  // 相机 x 偏移只作用在绘制变换上；gameplay 碰撞永远使用 segment-local 坐标
  ctx.setTransform(
    view.dpr * scale,
    0,
    0,
    view.dpr * scale,
    view.dpr * (offX - camera.x * scale),
    view.dpr * offY,
  );
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
    fillElement(ctx, e, renderer);
    ctx.globalAlpha = 1;
  }

  // 核心辉光按 consequence 剩余光值变暗（AC4/AC10）；silhouette 不受影响恒在场
  drawAvatar(ctx, state.player.sol, renderer.solCore, coreBrightness(consequence.solLight));
  drawAvatar(ctx, state.player.luna, renderer.lunaCore, coreBrightness(consequence.lunaLight));

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
