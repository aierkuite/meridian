import { createKeyboardInput, type InputSnapshot } from "./engine/input";
import { startFixedLoop } from "./engine/loop";
import { clamp } from "./engine/math";
import { createJourney, updateJourney, type JourneyState } from "./game/journey";
import { segments } from "./data";
import { createRenderer, renderScene, type Renderer } from "./render/renderer";
import { createAudio, type AudioEngine } from "./audio/audio";
import { createCueAdapter, type CueAdapter } from "./audio/cues";
import { drawEndingScreen, drawHud, drawPauseOverlay } from "./ui/hud";
import { drawTitleScreen } from "./ui/title";
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
const journey: JourneyState = createJourney(segments);
const renderer: Renderer = createRenderer();
const audio: AudioEngine = createAudio();
// 表现层音频 cue 适配器：把 journey + 最近输入快照折叠为 AudioFrame。
const cueAdapter: CueAdapter = createCueAdapter();
// render() 自身无输入访问权，故在 update() 顶部把每个模拟步的最新快照捕获到此
// 模块级变量，render() 据此构建 AudioFrame。初值取一次空采样（无按键即全 false），
// 保证首帧 render 前即有有效快照。
let latestAudioSnapshot: InputSnapshot = input.sample();

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

// M5 title flow：表现层应用阶段。title 期间不推进模拟（updateJourney 不运行），
// 故确定性/回放完全不受影响——AppPhase 只活在表现层（main.ts），绝不进入 game/。
type AppPhase = "title" | "playing";
let appPhase: AppPhase = "title";
// 开始手势边沿：Space（jump 键）按下沿触发「开始」；prevStartKey 仅在 title 期间维护。
let prevStartKey = false;
// 防止「开始」那次 Space 漏进 gameplay 变成首帧跳：进入 playing 后要求 Space 先松开，
// 才允许第一帧 updateJourney（否则按住的开始键会在首个 playing 帧触发跳跃）。
let awaitingStartRelease = false;

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
  // 表现层音频帧的输入来源：每个模拟步都记录最新快照，供 render() 读取（即便暂停）。
  latestAudioSnapshot = snapshot;

  // M5 title flow：title 阶段只等待开始手势（Space 按下沿），绝不推进模拟。
  if (appPhase === "title") {
    const startEdge = snapshot.jump && !prevStartKey;
    prevStartKey = snapshot.jump;
    if (startEdge) {
      appPhase = "playing";
      // 开始手势同时解锁/恢复音频（与 unlockAudioOnce 的首键解锁同走 audio.unlock，幂等）。
      audio.unlock();
      // 要求这次 Space 先松开，避免按住的开始键在首个 playing 帧被当作跳跃。
      awaitingStartRelease = true;
    }
    return;
  }

  const pauseEdge = snapshot.pause && !prevPause;
  prevPause = snapshot.pause;

  // 终态不可暂停：结局屏上的 Esc 无意义，且暂停会挡住 R 重开整段 journey；
  // 只在航程/过渡（playing / transitioning）中允许切换暂停。
  if (pauseEdge && journey.status !== "ending") {
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

  // 开始那次 Space 的去抖：松开前不喂给 gameplay，避免首帧误跳（也不更新边沿基线）。
  if (awaitingStartRelease) {
    if (snapshot.jump) {
      return;
    }
    awaitingStartRelease = false;
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

  renderScene(context, journey.active, journey.camera, renderer, { width, height, dpr }, journey.consequence);

  // 表现层只读 journey：title 阶段绘标题屏（世界静止透在其后）；终态绘结局屏；
  // 否则绘航程内 HUD（叙事/提示/终章进度）。结局 id 由 journey.resolvedEnding 给出，
  // UI 绝不重算结局规则。
  if (appPhase === "title") {
    drawTitleScreen(context, width, height);
  } else if (journey.status === "ending" && journey.resolvedEnding !== undefined) {
    drawEndingScreen(context, width, height, journey.resolvedEnding);
  } else {
    drawHud(context, width, height, journey);
  }

  if (appPhase === "playing" && paused) {
    drawPauseOverlay(context, width, height);
  }

  // 调试覆盖层在主场景与暂停层之上绘制；`drawDebugOverlay` 内部会自行
  // 设置场景变换（含相机偏移）与屏幕坐标变换。
  // 生产构建中 `import.meta.env.DEV` 为 false，整块会被 Vite tree-shake。
  if (import.meta.env.DEV && debugOverlayEnabled) {
    drawDebugOverlay(context, journey, journey.camera, { width, height, dpr });
  }

  // 表现层音频：唯一的 audio.update 调用点。把 journey + 最近输入快照折叠为
  // AudioFrame 交给音频引擎。title/暂停阶段送中性零 cue 帧：不派生输入相关 cue
  // （避免误触 SFX），但仍以零 cue 帧驱动太阳低通/混响与默认垫，使滤镜状态连贯
  // （首键解锁见 unlockAudioOnce；title 开始手势亦调用 audio.unlock）。
  if (appPhase === "title" || paused) {
    audio.update({
      sun: journey.active.sun.value,
      status: journey.status,
      ending: journey.resolvedEnding,
      cues: [],
    });
  } else {
    audio.update(cueAdapter.derive(journey, latestAudioSnapshot));
  }
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
    audio.dispose?.();
    window.removeEventListener("keydown", unlockAudioOnce);
    if (import.meta.env.DEV) {
      window.removeEventListener("keydown", handleDebugKeyDown);
      window.removeEventListener("keyup", handleDebugKeyUp);
    }
  });
}
