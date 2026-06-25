/**
 * HUD / overlay 表现层（design.md §9）
 *
 * 单向只读：读取 simulation（journey / segment / narration 选词）来绘制叙事行、
 * graduated hint、终章融合进度与四种结局屏。绝不写回 gameplay 状态，也不在此
 * 重算结局规则——结局 id 由 journey.resolvedEnding 给出，文本由 narration 选取。
 */
import type { JourneyState } from "../game/journey";
import type { EndingId } from "../game/ending";
import {
  adaptiveLineFor,
  beatLineFor,
  choicePromptFor,
  endingTextFor,
  hintLineFor,
} from "../game/narration";
import { finaleFusionProgress } from "../game/segment";

/** 叙事行配色：柔和冷白，贴合 silhouette + glow 基调 */
const NARRATION_COLOR = "#cfe0ff";
/** 选择点提示配色：暖色，呼应「以光为代价」的告警语义 */
const CHOICE_COLOR = "#ffd166";
/** hint / 自适应行配色：更安静的灰蓝，作为兜底背景信息 */
const QUIET_COLOR = "#8fa3c8";

/**
 * 居中绘制一行文本（HUD 通用小工具）
 *
 * @param ctx 目标 2D 上下文（屏幕坐标，已按 dpr 设置变换）
 * @param text 待绘制文本
 * @param cx 水平中心 x
 * @param y 垂直基线中心 y（textBaseline = "middle"）
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
 * 绘制终章 Reunion 的融合进度条（AC6）
 *
 * 仅当活动段携带 finale 时绘制：读取 finaleFusionProgress（render-free 纯派生量）
 * 显示 hold→dissolve 的整体融合进度，并标注当前是否处于「守住太阳窗口」阶段。
 *
 * @param ctx 目标 2D 上下文
 * @param width 屏幕宽
 * @param journey 只读 journey 状态
 * @returns 无返回值
 */
function drawFinaleProgress(ctx: CanvasRenderingContext2D, width: number, journey: JourneyState): void {
  const state = journey.active;
  if (state.data.finale === undefined) {
    return;
  }
  const progress = finaleFusionProgress(state);
  const barW = Math.min(420, width * 0.5);
  const barH = 6;
  const x = (width - barW) / 2;
  const y = 56;

  ctx.save();
  drawCenteredLine(ctx, "The line is close. Hold together.", width / 2, y - 18, "300 16px system-ui, sans-serif", NARRATION_COLOR);
  ctx.fillStyle = "rgba(143,163,200,0.25)";
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = CHOICE_COLOR;
  ctx.fillRect(x, y, barW * progress, barH);
  ctx.restore();
}

/**
 * 绘制航程内 HUD：叙事行、选择点提示、graduated hint、终章进度（AC6/AC7/AC8）
 *
 * 全部为只读取词：beat/adaptive 行来自 narration，hint 仅在卡关后由确定性帧计数
 * 触发且无任何「跳关」入口。status === "ending" 时不调用本函数（改绘结局屏）。
 *
 * @param ctx 目标 2D 上下文（屏幕坐标）
 * @param width 屏幕宽
 * @param height 屏幕高
 * @param journey 只读 journey 状态
 * @returns 无返回值
 */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  journey: JourneyState,
): void {
  drawFinaleProgress(ctx, width, journey);

  const segmentId = journey.active.data.id;
  const cx = width / 2;

  // beat / 开场叙事行（屏幕下方居中）
  const beat = beatLineFor(segmentId);
  if (beat !== undefined) {
    drawCenteredLine(ctx, beat, cx, height - 96, "300 20px system-ui, sans-serif", NARRATION_COLOR, 0.92);
  }

  // 自适应行：仅当已花费过光（band 偏离 whole）时叠一行更安静的注脚
  if (journey.consequence.shortcutsTaken > 0) {
    const adaptive = adaptiveLineFor(journey.consequence);
    drawCenteredLine(ctx, adaptive, cx, height - 70, "300 15px system-ui, sans-serif", QUIET_COLOR, 0.85);
  }

  // 选择点提示：携带 choicePoint 且该选择尚未结算时给出告警（已走 shortcut/通关后隐去）
  const cp = journey.active.data.choicePoint;
  if (cp !== undefined && journey.consequence.choices[cp.id] === "unresolved") {
    drawCenteredLine(ctx, choicePromptFor(cp.id), cx, height - 130, "400 18px system-ui, sans-serif", CHOICE_COLOR, 0.95);
  }

  // graduated hint：仅在确定性 stuck 计数跨过阈值后出现，纯文本兜底，无 skip 入口
  const hint = hintLineFor(segmentId, journey.active.frameInSegment);
  if (hint !== undefined) {
    drawCenteredLine(ctx, hint, cx, height - 40, "300 15px system-ui, sans-serif", QUIET_COLOR, 0.8);
  }
}

/**
 * 单个结局的画面氛围（M5 R5/AC5）：幕色 + 标题色/亮度 + 可选泛光
 *
 * 仅承载「取色/亮度」，绝不重算结局规则。明亮结局（one-sky/vow）暖而亮，
 * 悲剧结局（afterglow/long-dark）冷暗、标题更黯，使四结局一眼可辨。
 */
interface EndingMood {
  /** 全屏深色幕（带情绪色温） */
  readonly scrim: string;
  /** 标题填色 */
  readonly title: string;
  /** 标题透明度（越黯淡的结局越低） */
  readonly titleAlpha: number;
  /** 可选氛围泛光色（加性径向光）；null 表示不绘 */
  readonly glow: string | null;
}

/**
 * 由结局 id 选取画面氛围（闭合 switch，新增结局时编译器强制补齐分支）
 *
 * 结局 id 由 journey.resolvedEnding 给出，本函数只做表现层取色，绝不调用
 * resolveEnding，也不改动任何 gameplay 状态。
 *
 * @param ending 已解析的结局 id
 * @returns 该结局的画面氛围
 */
function endingMoodFor(ending: EndingId): EndingMood {
  switch (ending) {
    case "one-sky":
      // 圆满：暖金满溢的高光
      return { scrim: "rgba(18,12,4,0.74)", title: "#ffe9a8", titleAlpha: 1, glow: "rgba(255,210,120,0.16)" };
    case "vow":
      // 苦乐参半：暖冷平衡的柔白
      return { scrim: "rgba(8,10,20,0.82)", title: "#dfe7ff", titleAlpha: 0.96, glow: "rgba(160,180,255,0.10)" };
    case "afterglow":
      // 不均的遗憾：偏暖而黯
      return { scrim: "rgba(16,9,6,0.86)", title: "#e6b486", titleAlpha: 0.9, glow: "rgba(230,150,90,0.08)" };
    case "long-dark":
      // 挥霍后的黯淡：冷而近黑，标题最黯
      return { scrim: "rgba(2,4,10,0.92)", title: "#90a4c8", titleAlpha: 0.82, glow: null };
  }
}

/**
 * 绘制结局屏（AC9）：四种结局唯一的全屏终态 UI
 *
 * 由 journey.resolvedEnding 驱动、经 narration.endingTextFor 取标题/收束句；表现层
 * 不重算结局规则。无 level-select、无硬性 level-complete 卡。
 *
 * @param ctx 目标 2D 上下文（屏幕坐标）
 * @param width 屏幕宽
 * @param height 屏幕高
 * @param ending 已解析的结局 id（来自 journey.resolvedEnding）
 * @returns 无返回值
 */
export function drawEndingScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ending: EndingId,
): void {
  const text = endingTextFor(ending);
  const mood = endingMoodFor(ending);
  const cx = width / 2;

  ctx.save();
  // 深色幕（带结局情绪色温）：盖住定格的终章画面，让结局文本读得清
  ctx.fillStyle = mood.scrim;
  ctx.fillRect(0, 0, width, height);

  // 可选氛围泛光：自标题区向外的柔和径向光，加性叠加，强化结局情绪而不抢文本
  if (mood.glow !== null) {
    const radius = Math.max(width, height) * 0.5;
    const gy = height / 2 - 10;
    const grad = ctx.createRadialGradient(cx, gy, 0, cx, gy, radius);
    grad.addColorStop(0, mood.glow);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }

  drawCenteredLine(ctx, text.title, cx, height / 2 - 28, "300 44px system-ui, sans-serif", mood.title, mood.titleAlpha);
  drawCenteredLine(ctx, text.closer, cx, height / 2 + 24, "300 20px system-ui, sans-serif", QUIET_COLOR, 0.9);
  drawCenteredLine(ctx, "Press R to begin again.", cx, height - 56, "300 15px system-ui, sans-serif", QUIET_COLOR, 0.65);
  ctx.restore();
}

export function drawPauseOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(8,10,20,0.5)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#cfe0ff";
  ctx.font = "300 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Paused — press Esc to resume", width / 2, height / 2);
  ctx.restore();
}
