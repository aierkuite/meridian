/**
 * 开发期诊断覆盖层（仅绘制，绝不修改模拟状态）
 *
 * 目的：在开发构建中提供可视化的关卡/物理/相机诊断，便于手感调参与边界
 * 排查。生产构建通过 `import.meta.env.DEV` 在调用点被剔除，本模块的绘制
 * 调用不会进入打包产物。
 *
 * 硬约束（对应 prd.md AC7 + design.md §6）：
 * - **只读**：本模块只读 `JourneyState` / `SegmentState` / `CameraState`，
 *   严禁写入任何 `state.*` / `player.*` / `sun.*` / `camera.*` 字段。
 * - **不入回放**：`dev/replay.ts` 与 `scripts/check-replay.mjs` 不 import 本模块。
 * - **无 shadowBlur**：渲染热路径禁用 `shadowBlur`（M2 implement.md Step 10）。
 * - **无 console.log**：所有诊断停留在画布上，按调用方 opt-in。
 *
 * 绘制时机：调用方在主渲染器之后调用 `drawDebugOverlay`。使用与主渲染器
 * 完全一致的相机偏移约定（见 `render/renderer.ts`），以保证诊断框与场景
 * 对齐。
 */

import type { JourneyState } from "../game/journey";
import type { CameraState } from "../engine/camera";
import type { SegmentState } from "../game/segment";
import type { Avatar } from "../game/player";
import type { AABB } from "../engine/math";
import { WORLD_H, WORLD_W } from "../game/world";

/** 诊断文本/线框的颜色调色板（暖色高对比，便于在任意场景背景上阅读） */
const COLOR_TEXT = "#ffd166";
const COLOR_TEXT_DIM = "rgba(255,209,102,0.7)";
const COLOR_SOL_BOX = "rgba(255,184,107,0.9)";
const COLOR_LUNA_BOX = "rgba(123,212,255,0.9)";
const COLOR_DAY_TERRAIN = "rgba(255,209,102,0.4)";
const COLOR_NIGHT_TERRAIN = "rgba(123,212,255,0.4)";
const COLOR_ELEMENT_SOLID = "rgba(255,90,120,0.8)";
const COLOR_EXIT = "rgba(180,255,200,0.8)";
const COLOR_WORLD_BOUNDS = "rgba(255,255,255,0.5)";

/** 左上角文本面板的行高与字号（CSS 像素，由调用方变换决定最终缩放） */
const LINE_HEIGHT = 18;
const FONT = "12px ui-monospace, Menlo, Consolas, monospace";
const PANEL_PADDING = 8;

/**
 * 把一个 AABB 框按相机偏移绘制成线框矩形
 *
 * @param ctx 目标 2D 上下文（已被调用方设置了带相机偏移的变换）
 * @param box 待绘制的轴对齐包围盒
 * @param color 描边颜色
 * @returns 无返回值
 */
function strokeAABB(ctx: CanvasRenderingContext2D, box: AABB, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

/**
 * 把一位 avatar 的诊断信息追加到文本面板的行列表
 *
 * @param label avatar 显示名（"Sol" / "Luna"）
 * @param a 待展示的 avatar
 * @param bufferRemaining 玩家级共享跳跃缓冲剩余帧数
 * @returns 包含若干行诊断文本的数组
 */
function avatarDebugLines(label: string, a: Avatar, bufferRemaining: number): string[] {
  return [
    `${label} pos=(${a.pos.x.toFixed(1)},${a.pos.y.toFixed(1)}) vel=(${a.vel.x.toFixed(1)},${a.vel.y.toFixed(1)})`,
    `    grounded=${a.onGround} coyote=${a.coyoteFramesRemaining} buffer=${bufferRemaining} gravitySign=${a.gravitySign}`,
  ];
}

/**
 * 在视口左上角绘制只读诊断面板
 *
 * 面板内容（design.md §6 minimum list）：
 * - 活动 segment id / 索引、journey 状态
 * - s（sun）值
 * - Sol / Luna 位置、速度、着地/郊狼/缓冲状态
 * - 相机 x / targetX / transitionFramesRemaining
 *
 * 面板绘制在「屏幕坐标」下：在写入文本前重置变换到屏幕像素空间，结束后
 * 由调用方在下一帧重新设置场景变换。我们使用 `fillRect` 作为半透明背景，
 * 不使用 `shadowBlur`。
 *
 * @param ctx 目标 2D 上下文（此函数内部会临时切换到屏幕坐标）
 * @param journey journey 只读状态
 * @param view 视口尺寸（CSS 像素 width/height + dpr）
 * @returns 无返回值
 */
function drawTextPanel(
  ctx: CanvasRenderingContext2D,
  journey: JourneyState,
  view: { width: number; height: number; dpr: number },
): void {
  const segment: SegmentState = journey.active;
  const lines: string[] = [
    `segment=${segment.data.id} idx=${journey.activeIndex} journey=${journey.status}`,
    `s=${segment.sun.value.toFixed(3)} status=${segment.status} solReached=${segment.solReached} lunaReached=${segment.lunaReached}`,
    ...avatarDebugLines("Sol", segment.player.sol, segment.player.jumpBufferFramesRemaining),
    ...avatarDebugLines("Luna", segment.player.luna, segment.player.jumpBufferFramesRemaining),
    `camera x=${journey.camera.x.toFixed(1)} targetX=${journey.camera.targetX.toFixed(1)} transFrames=${journey.camera.transitionFramesRemaining}`,
  ];

  // 切换到屏幕坐标（撤销场景变换 + 相机偏移），让面板钉在视口左上
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

  const panelWidth = 460;
  const panelHeight = lines.length * LINE_HEIGHT + PANEL_PADDING * 2;
  ctx.fillStyle = "rgba(8,10,20,0.65)";
  ctx.fillRect(PANEL_PADDING, PANEL_PADDING, panelWidth, panelHeight);

  ctx.font = FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR_TEXT;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    ctx.fillStyle = i === 0 ? COLOR_TEXT : COLOR_TEXT_DIM;
    ctx.fillText(line, PANEL_PADDING * 2, PANEL_PADDING * 2 + i * LINE_HEIGHT);
  }
}

/**
 * 设置与主渲染器一致的「场景变换」（含相机偏移）
 *
 * 复刻 `render/renderer.ts::renderScene` 的变换：根据视口缩放居中世界，并把
 * 相机 `x` 作为绘制偏移。gameplay 碰撞永远使用 segment-local 坐标，本变换
 * 仅作用于绘制。
 *
 * @param ctx 目标 2D 上下文（会被原地修改 transform）
 * @param camera 当前相机状态（只读）
 * @param view 视口尺寸（CSS 像素 width/height + dpr）
 * @returns 无返回值
 */
function applySceneTransform(
  ctx: CanvasRenderingContext2D,
  camera: CameraState,
  view: { width: number; height: number; dpr: number },
): void {
  const scale = Math.min(view.width / WORLD_W, view.height / WORLD_H);
  const offX = (view.width - WORLD_W * scale) / 2;
  const offY = (view.height - WORLD_H * scale) / 2;
  ctx.setTransform(
    view.dpr * scale,
    0,
    0,
    view.dpr * scale,
    view.dpr * (offX - camera.x * scale),
    view.dpr * offY,
  );
}

/**
 * 绘制场景内的诊断线框（地形/元素/出口/world bounds/avatar）
 *
 * 调用方需在调用前设置好与主渲染器一致的场景变换（包含相机偏移）；本函数
 * 在该变换下绘制线框，因此线框会随相机滚动而对齐场景。
 *
 * @param ctx 目标 2D 上下文（已设置场景变换）
 * @param state 当前 segment 状态（只读）
 * @param camera 当前相机状态（只读，未使用字段已显式标注）
 * @returns 无返回值
 */
function drawSceneBoxes(ctx: CanvasRenderingContext2D, state: SegmentState, _camera: CameraState): void {
  // day / night 地形线框
  for (const t of state.data.dayTerrain) {
    strokeAABB(ctx, t, COLOR_DAY_TERRAIN);
  }
  for (const t of state.data.nightTerrain) {
    strokeAABB(ctx, t, COLOR_NIGHT_TERRAIN);
  }

  // 当前 sun 下处于实体态的元素框
  const s = state.sun.value;
  for (const e of state.elements) {
    if (e.solidAt(s)) {
      strokeAABB(ctx, e.box, COLOR_ELEMENT_SOLID);
    }
  }

  // 出口
  strokeAABB(ctx, state.data.exits.sol, COLOR_EXIT);
  strokeAABB(ctx, state.data.exits.luna, COLOR_EXIT);

  // world bounds
  strokeAABB(ctx, { x: 0, y: 0, w: WORLD_W, h: WORLD_H }, COLOR_WORLD_BOUNDS);

  // avatar 包围盒
  const sol = state.player.sol;
  const luna = state.player.luna;
  strokeAABB(ctx, { x: sol.pos.x - sol.half.x, y: sol.pos.y - sol.half.y, w: sol.half.x * 2, h: sol.half.y * 2 }, COLOR_SOL_BOX);
  strokeAABB(ctx, { x: luna.pos.x - luna.half.x, y: luna.pos.y - luna.half.y, w: luna.half.x * 2, h: luna.half.y * 2 }, COLOR_LUNA_BOX);
}

/**
 * 绘制完整的开发诊断覆盖层
 *
 * 调用方约定：
 * - 仅在 `import.meta.env.DEV` 且玩家按下调试切换键时调用
 * - 在主渲染器 `renderScene` 之后调用
 * - 调用前 ctx 可处于任意变换状态；本函数内部会自行设置场景变换与屏幕变换
 *
 * @param ctx 目标 2D 上下文
 * @param journey journey 只读状态
 * @param camera 当前相机状态（只读）
 * @param view 视口尺寸（CSS 像素 width/height + dpr）
 * @returns 无返回值
 */
export function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  journey: JourneyState,
  camera: CameraState,
  view: { width: number; height: number; dpr: number },
): void {
  ctx.save();
  // 场景线框：设置与主渲染器一致的场景变换（含相机偏移）
  applySceneTransform(ctx, camera, view);
  drawSceneBoxes(ctx, journey.active, camera);
  // 文本面板：内部会切到屏幕坐标
  drawTextPanel(ctx, journey, view);
  ctx.restore();
}
