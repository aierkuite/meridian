/**
 * 标题屏（M5 title flow，design.md §3 / ui-guidelines「Title + ×4 ending screens」）
 *
 * 表现层全屏覆盖：在 journey 开始前显示游戏名、控制说明与开始提示。仅绘制，
 * 不持有/不推进任何模拟状态——AppPhase 由 main.ts 拥有，title 期间 updateJourney
 * 绝不运行（确定性/回放不受影响）。无 level-select、无 settings、无营销文案。
 */

/** 标题主色：与 HUD 叙事行同源的柔和冷白 */
const TITLE_COLOR = "#e8f0ff";
/** 控制/副标题色：安静灰蓝，作为背景信息 */
const SUBTLE_COLOR = "#8fa3c8";
/** 开始提示色：暖色，呼应「以光为题」的基调 */
const PROMPT_COLOR = "#ffd166";

/**
 * 居中绘制一行文本（title 屏内部小工具，独立于 hud 以保持模块自洽）
 *
 * @param ctx 目标 2D 上下文（屏幕坐标，已按 dpr 设置变换）
 * @param text 待绘制文本
 * @param cx 水平中心 x
 * @param y 垂直中心 y（textBaseline = "middle"）
 * @param font CSS font 串
 * @param color 填充色
 * @param alpha 透明度（默认 1）
 * @returns 无返回值
 */
function drawCenteredLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  font: string,
  color: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, y);
  ctx.restore();
}

/**
 * 绘制标题屏（R1）：游戏名、副标题、单行控制说明、开始提示
 *
 * 由 main.ts 在 appPhase === "title" 时调用；可叠在静止世界之上。文本均为英文、
 * 克制。控制行是 on-screen controls 的单一来源（ui-guidelines「Controls」）。
 *
 * @param ctx 目标 2D 上下文（屏幕坐标）
 * @param width 屏幕宽
 * @param height 屏幕高
 * @returns 无返回值
 */
export function drawTitleScreen(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const cx = width / 2;

  // 深色幕：盖住身后定格的世界，让标题文本读得清（不全黑，留一点世界氛围透出）
  ctx.save();
  ctx.fillStyle = "rgba(4,5,12,0.72)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 标题 + 副标题
  drawCenteredLine(ctx, "Meridian", cx, height / 2 - 60, "300 64px system-ui, sans-serif", TITLE_COLOR);
  drawCenteredLine(ctx, "Two lights, one sky.", cx, height / 2 - 12, "300 20px system-ui, sans-serif", SUBTLE_COLOR, 0.85);

  // 控制说明（单行，英文，简洁）——on-screen controls 的单一来源
  drawCenteredLine(
    ctx,
    "←/→ or A·D  move      ↑/↓  sun      Space  jump      R  restart      Esc  pause",
    cx,
    height / 2 + 40,
    "300 15px system-ui, sans-serif",
    SUBTLE_COLOR,
    0.75,
  );

  // 开始提示：暖色、略亮，单一明确的进入动作
  drawCenteredLine(ctx, "Press Space to begin", cx, height - 72, "400 18px system-ui, sans-serif", PROMPT_COLOR, 0.95);
}
