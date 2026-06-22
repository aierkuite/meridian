/**
 * 确定性相机状态模块
 *
 * 目的：在 segment 之间提供由帧计数器驱动的相机滚动，避免任何 wall-clock
 * 读取，保持模拟层确定性。相机偏移只影响绘制，绝不参与 gameplay 碰撞。
 *
 * 设计要点：
 * - `x` 是当前实际相机左上角在世界（segment-local）坐标系中的 x 偏移
 * - `targetX` 是本次 transition 的终点 x
 * - `transitionFramesRemaining` 为 0 表示静止；>0 表示正在匀速逼近 targetX
 * - 所有推进以固定步长 DT = 1/120 的帧数为单位
 */

/**
 * 一段 transition 的总帧数
 *
 * 取 60 帧（=0.5s @ 1/120）。足够长以体现「滚动」视觉，又足够短不打断节奏。
 * 设计文档 §3 允许 M2 自由选择 transition 方式；该常量是当前选择。
 */
export const TRANSITION_FRAMES = 60;

export interface CameraState {
  /** 当前相机左上角在 segment-local 坐标系下的 x 偏移；渲染时以此平移绘制 */
  x: number;
  /** 本次 transition 的目标 x；静止时与 `x` 相等 */
  targetX: number;
  /** 本次 transition 剩余帧数；0 表示静止 */
  transitionFramesRemaining: number;
}

/**
 * 创建一个初始静止在 `initialX` 的相机状态
 *
 * @param initialX 初始 x 偏移，默认 0（segment 起点对齐视口左缘）
 * @returns 静止状态的 CameraState
 */
export function createCamera(initialX = 0): CameraState {
  return {
    x: initialX,
    targetX: initialX,
    transitionFramesRemaining: 0,
  };
}

/**
 * 启动一段到 `targetX` 的 transition
 *
 * @param camera 待启动 transition 的相机状态（会被原地修改）
 * @param targetX transition 的终点 x
 * @returns 无返回值
 */
export function startTransition(camera: CameraState, targetX: number): void {
  camera.targetX = targetX;
  camera.transitionFramesRemaining = TRANSITION_FRAMES;
}

/**
 * 按固定帧数推进相机 transition 一步
 *
 * 推进规则：剩余帧数 >0 时，每帧把 `x` 朝 `targetX` 移动剩余距离的均分值，
 * 保证 `transitionFramesRemaining` 减到 0 时 `x` 恰好等于 `targetX`。
 *
 * 该函数完全由帧计数器驱动，不读 wall-clock，可在回放/测试中精确复现。
 *
 * @param camera 待推进的相机状态（会被原地修改）
 * @returns 无返回值
 */
export function stepCamera(camera: CameraState): void {
  if (camera.transitionFramesRemaining <= 0) {
    return;
  }
  const remaining = camera.transitionFramesRemaining;
  camera.x += (camera.targetX - camera.x) / remaining;
  camera.transitionFramesRemaining = remaining - 1;
  if (camera.transitionFramesRemaining === 0) {
    // 最后一步用直接赋值消除浮点累计误差，确保终点严格命中
    camera.x = camera.targetX;
  }
}
