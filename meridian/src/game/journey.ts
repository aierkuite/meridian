/**
 * 线性 progression 拥有者：在一段有界的 segment 链上推进
 *
 * 职责：
 * - 持有当前 segment 链、活动 segment 状态、活动索引、journey 状态、consequence
 * - 处理 restart 意图（重置当前 segment 的 checkpoint，但绝不清 consequence）
 * - 在 playing 状态下委托给 `updateSegment`，并在选择点把 shortcut/whole 写入 consequence
 * - 非末段通关后进入 transitioning 状态，按固定帧计数器推进相机后载入下一段
 * - 末段（Reunion）通关后解析 consequence → 结局，进入终态 "ending"（不再 loop-back）
 *
 * 不变式：
 * - SegmentState 始终聚焦单个有界 segment；journey 层不污染其字段
 * - consequence 只在选择点写入；death/reset/正常通关都不花费光（design.md §3/§4）
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
import {
  createConsequence,
  recordWhole,
  spendShortcut,
  type Consequence,
} from "./consequence";
import { resolveEnding, type EndingId } from "./ending";

export type JourneyStatus = "playing" | "transitioning" | "ending";

export interface JourneyState {
  /** 只读的 segment 数据链 */
  readonly segments: readonly SegmentData[];
  /** 当前活动 segment 的运行时状态 */
  active: SegmentState;
  /** 当前活动 segment 在 `segments` 中的索引 */
  activeIndex: number;
  /** journey 当前阶段：playing=正常推进；transitioning=过渡中；ending=终章已解析 */
  status: JourneyStatus;
  /** 累积 consequence：只在选择点写入，跨 segment / reset 持续 */
  consequence: Consequence;
  /** 已解析的结局 id；仅在 status === "ending" 时有值，否则为 undefined */
  resolvedEnding: EndingId | undefined;
  /** 相机状态；transition 期间由 journey 推进，静止期供渲染层读取 */
  readonly camera: CameraState;
}

/**
 * 创建 journey 初始状态
 *
 * @param segments segment 数据链（至少 1 项）
 * @returns 处于 playing 状态、活动索引为 0、满光 consequence 的 JourneyState
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
    consequence: createConsequence(),
    resolvedEnding: undefined,
    camera: createCamera(0),
  };
}

/**
 * 在 ending 终态下重开整段 journey（full-journey restart）
 *
 * 复用 `createJourney` 构造一份全新初始状态，再把可变字段拷回原 state，
 * 从而与「首次进入 journey」完全一致：回到首段（index 0）、满光 consequence、
 * 三个选择点均 "unresolved"、status 回到 "playing"、resolvedEnding 清空、
 * 相机复位。segments / camera 为 readonly 引用，故逐字段写入而非整体替换。
 *
 * @param state journey 状态（原地重置为全新 journey）
 * @returns 无返回值
 */
function restartJourney(state: JourneyState): void {
  const fresh = createJourney(state.segments);
  state.active = fresh.active;
  state.activeIndex = fresh.activeIndex;
  state.status = fresh.status;
  state.consequence = fresh.consequence;
  state.resolvedEnding = fresh.resolvedEnding;
  state.camera.x = fresh.camera.x;
  state.camera.targetX = fresh.camera.targetX;
  state.camera.transitionFramesRemaining = fresh.camera.transitionFramesRemaining;
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
 * 在选择点 segment 上把本帧的 shortcut 触发结算进 consequence
 *
 * 仅当当前段携带 choicePoint、已触发其 shortcut zone 且该 id 尚未结算时，
 * 调用 spendShortcut（幂等、唯一扣光入口）。death/reset 不会进入此路径。
 *
 * @param state journey 状态（可能原地替换 consequence）
 * @returns 无返回值
 */
function settleShortcut(state: JourneyState): void {
  const cp = state.active.data.choicePoint;
  if (cp === undefined || !state.active.shortcutTriggered) {
    return;
  }
  if (state.consequence.choices[cp.id] === "unresolved") {
    state.consequence = spendShortcut(state.consequence, cp.id, cp.cost);
  }
}

/**
 * 处理当前 segment 通关：结算 whole 路线、推进过渡或解析终章结局
 *
 * - 若该段是未触发 shortcut 的选择点，记一次 whole（不扣光）
 * - 若是末段：解析 consequence → 结局，进入 "ending"
 * - 否则进入 transitioning 并启动相机过渡
 *
 * @param state journey 状态
 * @returns 无返回值
 */
function handleSegmentWon(state: JourneyState): void {
  const cp = state.active.data.choicePoint;
  if (cp !== undefined && state.consequence.choices[cp.id] === "unresolved") {
    state.consequence = recordWhole(state.consequence, cp.id);
  }

  const isLast = state.activeIndex >= state.segments.length - 1;
  if (isLast) {
    state.status = "ending";
    state.resolvedEnding = resolveEnding(state.consequence);
    return;
  }

  state.status = "transitioning";
  // 单 segment loop：下一段在 segment-local 坐标下从 0 开始，targetX = 0。
  startTransition(state.camera, 0);
}

/**
 * 推进一帧 journey
 *
 * 流程（对应 design.md §3/§6）：
 * 1. 处理 restart 边沿：
 *    - status === "ending"（终态）：重开整段 journey，回到首段并重置 consequence
 *    - 其余（playing / transitioning，航程中）：只重置当前 segment checkpoint，consequence 原样保留
 * 2. status === "playing"：委托 `updateSegment`；结算 shortcut；通关则走 handleSegmentWon
 * 3. status === "transitioning"：推进相机一帧；transition 结束则载入下一段并回到 playing
 * 4. status === "ending"：终态，除 restart 外不再推进
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

  if (restartEdge) {
    // ending 终态下的 restart：重开整段 journey（回到首段、重置 consequence）。
    if (state.status === "ending") {
      restartJourney(state);
      return;
    }
    // 航程中（playing / transitioning）的 restart：只重置当前 segment checkpoint，
    // consequence 原样保留（design.md §3，作者代价在一次 run 内必须延续）。
    resetSegment(state.active);
    state.status = "playing";
    state.resolvedEnding = undefined;
    state.camera.transitionFramesRemaining = 0;
    state.camera.x = 0;
    state.camera.targetX = 0;
    return;
  }

  if (state.status === "playing") {
    updateSegment(state.active, input, dt);
    settleShortcut(state);
    if (state.active.status === "won") {
      handleSegmentWon(state);
    }
    return;
  }

  if (state.status === "transitioning") {
    stepCamera(state.camera);
    if (state.camera.transitionFramesRemaining === 0) {
      const nextIndex = state.activeIndex + 1;
      loadSegment(state, nextIndex);
      state.status = "playing";
    }
    return;
  }

  // status === "ending"：终态，等待 restart 或外部重开；不再推进模拟
}
