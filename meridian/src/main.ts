import { createKeyboardInput, type InputSnapshot } from "./engine/input";
import { startFixedLoop } from "./engine/loop";
import { clamp } from "./engine/math";
import { createJourney, updateJourney, type JourneyState } from "./game/journey";
import m1Slice from "./data/segments/m1-slice";
import { createRenderer, renderScene, type Renderer } from "./render/renderer";
import { createAudio, type AudioEngine } from "./audio/audio";
import { drawPauseOverlay } from "./ui/hud";
// 静态 import：生产构建中 Vite 会把 `import.meta.env.DEV` 折叠为 false，
// 进而把本模块整条 import 与 `drawDebugOverlay` 的调用一并 tree-shake。
import { drawDebugOverlay } from "./dev/debugOverlay";

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
document.body.style.background = "#05070f";

app.style.width = "100vw";
app.style.height = "100vh";

const canvas = createGameCanvas();
const context = getRequiredCanvasContext(canvas);

app.replaceChildren(canvas);

const input = createKeyboardInput(window);
const journey: JourneyState = createJourney([m1Slice]);
const renderer: Renderer = createRenderer();
const audio: AudioEngine = createAudio();

// 调试覆盖层开关：仅在 DEV 构建中追踪 Backquote 边沿。`prevDebugKey` 与
// `debugOverlayEnabled` 即使在生产中保留也只是死代码，会在 Vite 的
// minifier 阶段连同 `import.meta.env.DEV === false` 分支一起被剔除。
// 选 `Backquote`：design.md §6 推荐，避开所有 gameplay 按键。
const DEBUG_TOGGLE_CODE = "Backquote";
let debugOverlayEnabled = false;
let prevDebugKey = false;
let debugKeyDown = false;

// 调试切换键状态：独立于 gameplay input 采样器，避免污染 `InputSnapshot`
// （后者被 replay harness 直接消费）。仅在 DEV 构建中启用监听。
const handleDebugKeyDown = (event: KeyboardEvent): void => {
  if (event.code === DEBUG_TOGGLE_CODE) {
    debugKeyDown = true;
  }
};
const handleDebugKeyUp = (event: KeyboardEvent): void => {
  if (event.code === DEBUG_TOGGLE_CODE) {
    debugKeyDown = false;
  }
};
if (import.meta.env.DEV) {
  window.addEventListener("keydown", handleDebugKeyDown);
  window.addEventListener("keyup", handleDebugKeyUp);
}

const canvasSize: CanvasSize = { width: 0, height: 0, dpr: 1 };
let paused = false;
let prevPause = false;
// 上一帧 restart 标志：同时供 main 自身与 updateJourney 复算边沿
let prevRestart = false;

function createGameCanvas(): HTMLCanvasElement {
  const nextCanvas = document.createElement("canvas");
  nextCanvas.setAttribute("aria-label", "Meridian");
  nextCanvas.style.display = "block";
  nextCanvas.style.width = "100vw";
  nextCanvas.style.height = "100vh";
  return nextCanvas;
}

function getRequiredCanvasContext(targetCanvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const nextContext = targetCanvas.getContext("2d");
  if (nextContext === null) {
    throw new Error("Canvas 2D context is unavailable");
  }
  return nextContext;
}

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

function update(dt: number, snapshot: InputSnapshot): void {
  const pauseEdge = snapshot.pause && !prevPause;
  prevPause = snapshot.pause;

  if (pauseEdge) {
    paused = !paused;
  }

  // 调试覆盖层切换边沿：独立于 gameplay，暂停期间也可切换；DEV 构建外为死分支
  if (import.meta.env.DEV) {
    const debugEdge = debugKeyDown && !prevDebugKey;
    prevDebugKey = debugKeyDown;
    if (debugEdge) {
      debugOverlayEnabled = !debugOverlayEnabled;
    }
  }

  if (paused) {
    // 暂停期间不更新 prevRestart，确保恢复后第一次 restart 仍按边沿触发
    return;
  }

  // updateJourney 内部会按 snapshot.restart && !prevRestart 复算边沿；
  // 把本帧前的 prevRestart 传进去，再更新它
  updateJourney(journey, snapshot, dt, prevRestart);
  prevRestart = snapshot.restart;
}

function render(_alpha: number): void {
  resizeCanvasToDisplaySize(canvas, canvasSize);
  const { width, height, dpr } = canvasSize;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#05070f";
  context.fillRect(0, 0, width, height);

  renderScene(context, journey.active, journey.camera, renderer, { width, height, dpr });

  if (paused) {
    drawPauseOverlay(context, width, height);
  }

  // 调试覆盖层在主场景与暂停层之上绘制；`drawDebugOverlay` 内部会自行
  // 设置场景变换（含相机偏移）与屏幕坐标变换。
  // 生产构建中 `import.meta.env.DEV` 为 false，整块会被 Vite tree-shake。
  if (import.meta.env.DEV && debugOverlayEnabled) {
    drawDebugOverlay(context, journey, journey.camera, { width, height, dpr });
  }

  audio.update(journey.active.sun.value);
}

function unlockAudioOnce(): void {
  audio.unlock();
  window.removeEventListener("keydown", unlockAudioOnce);
}
window.addEventListener("keydown", unlockAudioOnce);

const stopLoop = startFixedLoop({
  sampleInput: input.sample,
  update,
  render,
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopLoop();
    input.dispose();
    window.removeEventListener("keydown", unlockAudioOnce);
    if (import.meta.env.DEV) {
      window.removeEventListener("keydown", handleDebugKeyDown);
      window.removeEventListener("keyup", handleDebugKeyUp);
    }
  });
}
