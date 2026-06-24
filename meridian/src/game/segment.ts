import type { AABB, Vec2 } from "../engine/math";
import type { InputSnapshot } from "../engine/input";
import type { PhysicsBody } from "../engine/physics";
import { bodyOverlaps } from "../engine/physics";
import { HORIZON_Y, WORLD_H, type WorldId } from "./world";
import type { Sun, Sun01 } from "./sun";
import type { DriftProfile } from "./sun";
import { createSun } from "./sun";
import type { Player, Avatar } from "./player";
import { createPlayer, updatePlayer } from "./player";
import type { Element, ElementPlacement } from "./element";
import { createElement } from "./element";
import type { ChoicePointId, LightCost } from "./consequence";

export interface ExitZones {
  readonly sol: AABB;
  readonly luna: AABB;
}

/**
 * 紧凑解法输入：仅包含影响模拟的玩者意图字段
 *
 * `restart` 与 `pause` 留在 UI 层；回放只复现设计者-authored 的关卡内操作。
 */
export type SolutionInput = Pick<InputSnapshot, "moveX" | "jump" | "sunDelta">;

/**
 * 解法中的一段持续输入：在 `frames` 帧内保持同一组 `input`
 *
 * 回放展开器会将其扩写成等价的固定步长 `InputSnapshot` 序列。
 */
export interface SolutionStep {
  readonly frames: number;
  readonly input: SolutionInput;
}

/**
 * 单条可回放解法路径
 *
 * - `id` 用于回放报告与诊断
 * - `branch` 在 M4 选择点出现前可省略
 * - `maxFrames` 是回放超时阈值，避免无限循环
 * - `steps` 为紧凑的持续输入段，按顺序展开
 */
export interface SolutionPath {
  readonly id: string;
  readonly branch?: "main" | "whole" | "shortcut";
  readonly maxFrames: number;
  readonly steps: readonly SolutionStep[];
}

/**
 * 选择点数据（design.md §3，仅 ~2–3 个 segment 携带）
 *
 * 纯数据声明：当 `shortcutZone.world` 对应的 avatar 与 `box` 交叠时，runtime
 * 记一次 shortcut 并按 `cost` 扣光（写入 journey 的 consequence）。whole 路线
 * 指通关该 segment 时从未触发该 zone。`storyKey` 供叙事选词。
 */
export interface ChoicePointData {
  readonly id: ChoicePointId;
  readonly shortcutZone: {
    readonly world: WorldId;
    readonly box: AABB;
  };
  readonly cost: LightCost;
  readonly storyKey: string;
}

/**
 * 终章 Reunion 的机械门控数据（design.md §7）
 *
 * - solsticeMarks：两位 avatar 各自必须站定的 solstice 标记区
 * - sunWindow：hold 阶段太阳必须落入的窗口 [min,max]
 * - holdFrames：双方站定且太阳在窗口内需连续保持的固定帧数
 * - dissolveFrames：hold 完成后确定性 dissolve/fusion 计数器的帧数
 */
export interface FinaleData {
  readonly solsticeMarks: {
    readonly sol: AABB;
    readonly luna: AABB;
  };
  readonly sunWindow: { readonly min: Sun01; readonly max: Sun01 };
  readonly holdFrames: number;
  readonly dissolveFrames: number;
}

export interface SegmentData {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];
  readonly nightTerrain: readonly AABB[];
  readonly elements: readonly ElementPlacement[];
  readonly starts: { readonly sol: Vec2; readonly luna: Vec2 };
  readonly exits: ExitZones;
  /**
   * 可选初始太阳值（design.md §4）
   *
   * 缺省 0.5。teaching beat 保持缺省即可；drift/mote 关卡可按需设定。
   */
  readonly initialSun?: Sun01;
  /**
   * 可选太阳漂移剖面（design.md §4，back-third / drift zone 段使用）
   *
   * 缺省（undefined）即 M2 holding dial 行为。
   */
  readonly drift?: DriftProfile;
  /**
   * 可选选择点（design.md §3，~2–3 个 segment 携带）
   *
   * 携带时该 segment 必须同时提供 whole 与 shortcut 两条 solutionPath。
   */
  readonly choicePoint?: ChoicePointData;
  /**
   * 可选终章门控（design.md §7，仅 Reunion 段携带）
   *
   * 携带时 segment 的胜利条件改为「双方站定 solstice 标记 + 太阳保持窗口
   * holdFrames + dissolve dissolveFrames」，不再使用 exits 判定。
   */
  readonly finale?: FinaleData;
  readonly solutionPaths: readonly SolutionPath[];
}

export interface SegmentState {
  readonly data: SegmentData;
  readonly player: Player;
  readonly sun: Sun;
  readonly elements: readonly Element[];
  status: "playing" | "won";
  solReached: boolean;
  lunaReached: boolean;
  readonly solSolids: AABB[];
  readonly lunaSolids: AABB[];
  /**
   * 本 segment 内已推进的固定帧数（playing 期间累加）
   *
   * 由 createSegment / resetSegment 归零；narration 的 graduated hint
   * 阶梯以此作为确定性 stuck 计数器。
   */
  frameInSegment: number;
  /**
   * 本 segment 内是否已触发其 choicePoint 的 shortcut zone
   *
   * 仅作「本次 run 是否踩过 zone」的标志；真正扣光由 journey 读取本标志后
   * 写入 consequence（幂等）。resetSegment 会清此标志，但绝不清 consequence。
   */
  shortcutTriggered: boolean;
  /** 终章 hold 阶段已连续保持的帧数（仅 finale 段使用） */
  finaleHoldFrames: number;
  /** 终章 dissolve 阶段已推进的帧数（仅 finale 段，hold 完成后累加） */
  finaleDissolveFrames: number;
}

/**
 * 解析 segment 的初始太阳值（缺省 0.5）
 *
 * @param data segment 静态数据
 * @returns 该段应使用的初始 s（已落入 [0,1]，由 createSun 内部 clamp 兜底）
 */
function initialSunFor(data: SegmentData): Sun01 {
  return data.initialSun ?? 0.5;
}

export function createSegment(data: SegmentData): SegmentState {
  return {
    data,
    player: createPlayer(data.starts.sol, data.starts.luna),
    sun: createSun(initialSunFor(data)),
    elements: data.elements.map(createElement),
    status: "playing",
    solReached: false,
    lunaReached: false,
    solSolids: [],
    lunaSolids: [],
    frameInSegment: 0,
    shortcutTriggered: false,
    finaleHoldFrames: 0,
    finaleDissolveFrames: 0,
  };
}

/**
 * 重置单个 avatar 到 checkpoint 起点
 *
 * 同时清零位移、速度、着地状态与所有手感计数器，确保回放/玩家重置
 * 后从完全干净的初始条件重新出发。手感计数器未清零会让 coyote/buffer
 * 跨越重置泄漏，破坏确定性。
 *
 * @param a 待重置的 avatar
 * @param start 该 avatar 的 checkpoint 起点
 * @returns 无返回值
 */
function resetAvatar(a: Avatar, start: Vec2): void {
  a.pos.x = start.x;
  a.pos.y = start.y;
  a.vel.x = 0;
  a.vel.y = 0;
  a.onGround = false;
  a.coyoteFramesRemaining = 0;
}

export function resetSegment(state: SegmentState): void {
  resetAvatar(state.player.sol, state.data.starts.sol);
  resetAvatar(state.player.luna, state.data.starts.luna);
  state.player.prevJump = false;
  state.player.jumpBufferFramesRemaining = 0;
  // 重置回该 segment 的 initialSun（design.md §4：data.initialSun ?? 0.5）
  state.sun.reset(initialSunFor(state.data));
  state.status = "playing";
  state.solReached = false;
  state.lunaReached = false;
  // 归零本段内的确定性计数器与 shortcut 标志。注意：consequence 由 journey
  // 持有，不在此处——因此 reset 永远不会清除已记录的 consequence（design.md §3）。
  state.frameInSegment = 0;
  state.shortcutTriggered = false;
  state.finaleHoldFrames = 0;
  state.finaleDissolveFrames = 0;
}

function gatherSolids(state: SegmentState): void {
  const s = state.sun.value;
  const solSolids = state.solSolids;
  const lunaSolids = state.lunaSolids;
  solSolids.length = 0;
  lunaSolids.length = 0;
  for (const t of state.data.dayTerrain) {
    solSolids.push(t);
  }
  for (const t of state.data.nightTerrain) {
    lunaSolids.push(t);
  }
  for (const e of state.elements) {
    if (!e.solidAt(s)) {
      continue;
    }
    if (e.world === "day") {
      solSolids.push(e.box);
    } else {
      lunaSolids.push(e.box);
    }
  }
}

function isDead(a: PhysicsBody): boolean {
  if (a.gravitySign > 0) {
    return a.pos.y - a.half.y > HORIZON_Y || a.pos.y + a.half.y < 0;
  }
  return a.pos.y + a.half.y < HORIZON_Y || a.pos.y - a.half.y > WORLD_H;
}

/**
 * 检测并标记 choicePoint 的 shortcut zone 触发
 *
 * 仅当 segment 携带 choicePoint 且尚未触发时，检查对应世界的 avatar 是否与
 * zone box 交叠；交叠即置位 `shortcutTriggered`。本函数只设标志、不扣光，
 * 真正写 consequence 由 journey 完成。死亡/重置不会经由此函数写入任何状态。
 *
 * @param state 当前 segment 状态
 * @returns 无返回值
 */
function detectShortcut(state: SegmentState): void {
  const cp = state.data.choicePoint;
  if (cp === undefined || state.shortcutTriggered) {
    return;
  }
  const avatar = cp.shortcutZone.world === "day" ? state.player.sol : state.player.luna;
  if (bodyOverlaps(avatar, cp.shortcutZone.box)) {
    state.shortcutTriggered = true;
  }
}

/**
 * 推进终章 Reunion 的机械门控（design.md §7）
 *
 * 流程：双方站定各自 solstice 标记且太阳落入窗口时连续累加 hold；任一条件
 * 中断则 hold 归零（要求连续保持）。hold 达标后启动确定性 dissolve 计数器，
 * 到达 dissolveFrames 即判定通关（并置位双方 reached，使回放成功判据成立）。
 *
 * @param state 当前 segment 状态（必须携带 finale）
 * @param finale 终章门控数据
 * @returns 无返回值
 */
function updateFinale(state: SegmentState, finale: FinaleData): void {
  const onSolMark = bodyOverlaps(state.player.sol, finale.solsticeMarks.sol);
  const onLunaMark = bodyOverlaps(state.player.luna, finale.solsticeMarks.luna);
  const s = state.sun.value;
  const inWindow = s >= finale.sunWindow.min && s <= finale.sunWindow.max;

  if (state.finaleHoldFrames < finale.holdFrames) {
    if (onSolMark && onLunaMark && inWindow) {
      state.finaleHoldFrames += 1;
    } else {
      state.finaleHoldFrames = 0;
    }
    return;
  }

  // hold 已达标：dissolve 确定性推进，不再要求站定（融合时刻已锁定）
  state.finaleDissolveFrames += 1;
  if (state.finaleDissolveFrames >= finale.dissolveFrames) {
    state.solReached = true;
    state.lunaReached = true;
    state.status = "won";
  }
}

/**
 * 终章 fusion 进度 [0,1]，供表现层读取（render-free 的纯派生量）
 *
 * 前半段表示 hold 进度，后半段表示 dissolve 进度。非 finale 段恒返回 0。
 *
 * @param state 当前 segment 状态
 * @returns [0,1] 的融合进度
 */
export function finaleFusionProgress(state: SegmentState): number {
  const finale = state.data.finale;
  if (finale === undefined) {
    return 0;
  }
  const hold = Math.min(state.finaleHoldFrames / finale.holdFrames, 1);
  const dissolve = Math.min(state.finaleDissolveFrames / finale.dissolveFrames, 1);
  return hold * 0.5 + dissolve * 0.5;
}

export function updateSegment(state: SegmentState, input: InputSnapshot, dt: number): void {
  if (state.status !== "playing") {
    return;
  }
  state.frameInSegment += 1;
  // 把 segment 自带的 drift 喂给 sun.apply（design.md §4）；无 drift 时退化为 M2 行为
  state.sun.apply(input, dt, state.data.drift);
  gatherSolids(state);
  updatePlayer(state.player, input, dt, state.solSolids, state.lunaSolids);

  if (isDead(state.player.sol) || isDead(state.player.luna)) {
    resetSegment(state);
    return;
  }

  // shortcut zone 检测在死亡判定之后：踩入 zone 是「位置已确实抵达」的事实，
  // 不依赖后续是否死亡；死亡本身永不写 consequence（journey 只读本标志）。
  detectShortcut(state);

  // 终章段走专属门控，不使用 exits 判定胜利
  const finale = state.data.finale;
  if (finale !== undefined) {
    updateFinale(state, finale);
    return;
  }

  if (!state.solReached && bodyOverlaps(state.player.sol, state.data.exits.sol)) {
    state.solReached = true;
  }
  if (!state.lunaReached && bodyOverlaps(state.player.luna, state.data.exits.luna)) {
    state.lunaReached = true;
  }
  if (state.solReached && state.lunaReached) {
    state.status = "won";
  }
}
