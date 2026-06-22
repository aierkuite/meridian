import { createKeyboardInput, type InputSnapshot } from "./engine/input";
import { startFixedLoop } from "./engine/loop";
import { clamp } from "./engine/math";
import { resetSegment, createSegment, updateSegment, type SegmentState } from "./game/segment";
import m1Slice from "./data/segments/m1-slice";
import { createRenderer, renderScene, type Renderer } from "./render/renderer";
import { createAudio, type AudioEngine } from "./audio/audio";
import { drawPauseOverlay, drawWinCard } from "./ui/hud";

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

const WIN_HOLD_SECONDS = 1.8;

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
const segment: SegmentState = createSegment(m1Slice);
const renderer: Renderer = createRenderer();
const audio: AudioEngine = createAudio();

const canvasSize: CanvasSize = { width: 0, height: 0, dpr: 1 };
let wonTimer = 0;
let paused = false;
let prevRestart = false;
let prevPause = false;

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
  const restartEdge = snapshot.restart && !prevRestart;
  const pauseEdge = snapshot.pause && !prevPause;
  prevRestart = snapshot.restart;
  prevPause = snapshot.pause;

  if (segment.status === "won") {
    wonTimer += dt;
    if (wonTimer >= WIN_HOLD_SECONDS) {
      resetSegment(segment);
      wonTimer = 0;
    }
    return;
  }

  if (restartEdge) {
    resetSegment(segment);
    wonTimer = 0;
    return;
  }

  if (pauseEdge) {
    paused = !paused;
  }

  if (paused) {
    return;
  }

  updateSegment(segment, snapshot, dt);
}

function render(_alpha: number): void {
  resizeCanvasToDisplaySize(canvas, canvasSize);
  const { width, height, dpr } = canvasSize;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#05070f";
  context.fillRect(0, 0, width, height);

  renderScene(context, segment, renderer, { width, height, dpr });

  if (segment.status === "won") {
    drawWinCard(context, width, height, Math.min(1, wonTimer * 4));
  }
  if (paused) {
    drawPauseOverlay(context, width, height);
  }

  audio.update(segment.sun.value);
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
  });
}
