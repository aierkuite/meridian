/**
 * 线性 progression 拥有者：在一段有界的 segment 链上推进
 *
 * 职责：
 * - 持有当前 segment 链、活动 segment 状态、活动索引、journey 状态
 * - 处理 restart 意图（重置当前 segment 的 checkpoint）
 * - 在 playing 状态下委托给 `updateSegment`
 * - 当前 segment 通关后进入 transitioning 状态，按固定帧计数器推进相机
 * - transition 结束后载入下一段；若链尾无下一段则回到 segment 0（开发期可玩）
 *
 * 不变式：
 * - SegmentState 始终聚焦单个有界 segment；journey 层不污染其字段
 * - 相机偏移只影响绘制；gameplay 碰撞永远在 segment-local 坐标系中
 * - transition 完全由帧计数器驱动，无 wall-clock 读取
 */

import type { InputSnapshot } from "../engine/input";
import { createCamera, startTransition, stepCamera, type CameraState } from "../engine/camera";
import {
  createSegment,
  resetSegment,
  updateSegment,
  type SegmentData,
  type SegmentState,
} from "./segment";

export type JourneyStatus = "playing" | "transitioning";

export interface JourneyState {
  /** 只读的 segment 数据链 */
  readonly segments: readonly SegmentData[];
  /** 当前活动 segment 的运行时状态 */
  active: SegmentState;
  /** 当前活动 segment 在 `segments` 中的索引 */
  activeIndex: number;
  /** journey 当前阶段：playing = 正常推进；transitioning = 通关后过渡中 */
  status: JourneyStatus;
  /** 相机状态；transition 期间由 journey 推进，静止期供渲染层读取 */
  readonly camera: CameraState;
}

/**
 * 创建 journey 初始状态
 *
 * @param segments segment 数据链（至少 1 项）
 * @returns 处于 playing 状态、活动索引为 0 的 JourneyState
 */
export function createJourney(segments: readonly SegmentData[]): JourneyState {
  if (segments.length === 0) {
    throw new Error("Journey requires at least one segment");
  }
  const first = segments[0];
  if (first === undefined) {
    // 已由 length 检查保证；保留以避免 non-null 断言
    throw new Error("Journey first segment is undefined");
  }
  return {
    segments,
    active: createSegment(first),
    activeIndex: 0,
    status: "playing",
    camera: createCamera(0),
  };
}

/**
 * 载入指定索引处的 segment 并复位相机
 *
 * @param state journey 状态（原地修改 active / activeIndex / camera）
 * @param nextIndex 要载入的 segment 索引（会被钳制到 [0, segments.length)）
 * @returns 无返回值
 */
function loadSegment(state: JourneyState, nextIndex: number): void {
  const clamped = ((nextIndex % state.segments.length) + state.segments.length) % state.segments.length;
  const data = state.segments[clamped];
  if (data === undefined) {
    // 钳制后理论上不可达；不使用 non-null 断言
    throw new Error(`Segment at index ${clamped} is undefined`);
  }
  state.active = createSegment(data);
  state.activeIndex = clamped;
  state.camera.x = 0;
  state.camera.targetX = 0;
  state.camera.transitionFramesRemaining = 0;
}

/**
 * 推进一帧 journey
 *
 * 流程（对应 design.md §3）：
 * 1. 处理 restart 边沿：重置当前 segment checkpoint（不影响 status）
 * 2. status === "playing"：委托 `updateSegment`；通关则切到 transitioning 并启动相机 transition
 * 3. status === "transitioning"：推进相机一帧；transition 结束则载入下一段并回到 playing
 *
 * @param state journey 状态
 * @param input 本帧玩家输入快照
 * @param dt 固定步长（DT = 1/120）
 * @param prevRestart 上一帧 restart 标志，用于边沿检测；由调用方维护
 * @returns 无返回值
 */
export function updateJourney(
  state: JourneyState,
  input: InputSnapshot,
  dt: number,
  prevRestart: boolean,
): void {
  const restartEdge = input.restart && !prevRestart;

  // transitioning 期间忽略 gameplay 输入但仍允许 restart 打断过渡（回到当前活动段）
  if (restartEdge) {
    resetSegment(state.active);
    state.status = "playing";
    state.camera.transitionFramesRemaining = 0;
    state.camera.x = 0;
    state.camera.targetX = 0;
    return;
  }

  if (state.status === "playing") {
    updateSegment(state.active, input, dt);
    if (state.active.status === "won") {
      state.status = "transitioning";
      // Option A：单 segment loop-back。下一段在 segment-local 坐标下从 0 开始，
      // 因此 targetX = 0；transition 主要价值是刷新 SegmentState 与短暂视觉停顿。
      startTransition(state.camera, 0);
    }
    return;
  }

  // status === "transitioning"
  stepCamera(state.camera);
  if (state.camera.transitionFramesRemaining === 0) {
    const nextIndex = state.activeIndex + 1;
    loadSegment(state, nextIndex);
    state.status = "playing";
  }
}
