import { createKeyboardInput, type InputSnapshot } from "./engine/input";
import { startFixedLoop } from "./engine/loop";
import { clamp, vec2, type Vec2 } from "./engine/math";

interface DemoState {
  tick: number;
}

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("Meridian root element is missing");
}

document.documentElement.style.height = "100%";
document.body.style.margin = "0";
document.body.style.height = "100%";
document.body.style.overflow = "hidden";
document.body.style.background = "#0b1020";

app.style.width = "100vw";
app.style.height = "100vh";

const canvas = createGameCanvas();
const context = getRequiredCanvasContext(canvas);

app.replaceChildren(canvas);

const input = createKeyboardInput(window);
const demo: DemoState = { tick: 0 };
const canvasSize: CanvasSize = { width: 0, height: 0, dpr: 1 };

/**
 * 创建全视口游戏画布
 *
 * @returns 用于 M0 占位渲染的 Canvas 元素
 */
function createGameCanvas(): HTMLCanvasElement {
  const nextCanvas = document.createElement("canvas");
  nextCanvas.setAttribute("aria-label", "Meridian placeholder");
  nextCanvas.style.display = "block";
  nextCanvas.style.width = "100vw";
  nextCanvas.style.height = "100vh";
  return nextCanvas;
}

/**
 * 获取必需的 Canvas 2D 上下文
 *
 * @param targetCanvas 提供绘图上下文的 Canvas 元素
 * @returns 可直接绘制的 Canvas 2D 上下文
 */
function getRequiredCanvasContext(targetCanvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const nextContext = targetCanvas.getContext("2d");

  if (nextContext === null) {
    throw new Error("Canvas 2D context is unavailable");
  }

  return nextContext;
}

/**
 * 根据设备像素比同步画布后备缓冲区尺寸
 *
 * @param targetCanvas 需要调整尺寸的 Canvas 元素
 * @param size 保存最新 CSS 尺寸与像素比的可复用对象
 * @returns 无返回值
 */
function resizeCanvasToDisplaySize(targetCanvas: HTMLCanvasElement, size: CanvasSize): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const backingWidth = Math.floor(width * dpr);
  const backingHeight = Math.floor(height * dpr);

  if (targetCanvas.width !== backingWidth || targetCanvas.height !== backingHeight) {
    targetCanvas.width = backingWidth;
    targetCanvas.height = backingHeight;
  }

  size.width = width;
  size.height = height;
  size.dpr = dpr;
}

/**
 * 推进 M0 临时模拟状态
 *
 * @param _dt 固定模拟步长，当前占位逻辑只使用 tick
 * @param _input 当前固定步输入快照，当前占位逻辑保留但不消费
 * @returns 无返回值
 */
function updateDemo(_dt: number, _input: InputSnapshot): void {
  demo.tick += 1;
}

/**
 * 渲染 M0 占位画面
 *
 * @param _alpha 当前固定步之间的插值比例，当前占位渲染不使用
 * @returns 无返回值
 */
function renderDemo(_alpha: number): void {
  resizeCanvasToDisplaySize(canvas, canvasSize);
  context.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);
  context.clearRect(0, 0, canvasSize.width, canvasSize.height);

  drawBackground(context, canvasSize);
  drawHorizon(context, canvasSize);
  drawTickMarker(context, canvasSize, demo.tick);
}

/**
 * 绘制上下半屏的占位背景
 *
 * @param ctx Canvas 2D 绘图上下文
 * @param size 当前画布 CSS 尺寸
 * @returns 无返回值
 */
function drawBackground(ctx: CanvasRenderingContext2D, size: CanvasSize): void {
  const horizonY = size.height / 2;

  ctx.fillStyle = "#d9b36a";
  ctx.fillRect(0, 0, size.width, horizonY);

  ctx.fillStyle = "#0c1830";
  ctx.fillRect(0, horizonY, size.width, size.height - horizonY);
}

/**
 * 绘制画面中央的地平线缝
 *
 * @param ctx Canvas 2D 绘图上下文
 * @param size 当前画布 CSS 尺寸
 * @returns 无返回值
 */
function drawHorizon(ctx: CanvasRenderingContext2D, size: CanvasSize): void {
  const horizonY = size.height / 2;

  ctx.fillStyle = "#fff7c7";
  ctx.fillRect(0, horizonY - 1, size.width, 2);
}

/**
 * 绘制由整数模拟 tick 驱动的占位方块
 *
 * @param ctx Canvas 2D 绘图上下文
 * @param size 当前画布 CSS 尺寸
 * @param tick 已推进的固定步计数
 * @returns 无返回值
 */
function drawTickMarker(ctx: CanvasRenderingContext2D, size: CanvasSize, tick: number): void {
  const horizonY = size.height / 2;
  const margin = 32;
  const markerSize = 18;
  const travelWidth = Math.max(1, size.width - margin * 2 - markerSize);
  const progress = triangleWave01(tick, 240);
  const position = vec2(margin + markerSize / 2 + progress * travelWidth, horizonY - 30);

  drawSquare(ctx, position, markerSize);
}

/**
 * 绘制单个占位方块
 *
 * @param ctx Canvas 2D 绘图上下文
 * @param center 方块中心点
 * @param size 方块边长
 * @returns 无返回值
 */
function drawSquare(ctx: CanvasRenderingContext2D, center: Vec2, size: number): void {
  ctx.fillStyle = "#10131a";
  ctx.fillRect(center.x - size / 2, center.y - size / 2, size, size);
}

/**
 * 根据整数 tick 生成 0 到 1 再回到 0 的三角波
 *
 * @param tick 固定步计数
 * @param period 完整往返周期的固定步数量
 * @returns 归一化三角波值
 */
function triangleWave01(tick: number, period: number): number {
  const phase = tick % period;
  const halfPeriod = period / 2;
  return phase <= halfPeriod ? phase / halfPeriod : (period - phase) / halfPeriod;
}

const stopLoop = startFixedLoop({
  sampleInput: input.sample,
  update: updateDemo,
  render: renderDemo,
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopLoop();
    input.dispose();
  });
}
