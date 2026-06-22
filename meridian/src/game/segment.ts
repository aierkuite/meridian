import type { AABB, Vec2 } from "../engine/math";
import type { InputSnapshot } from "../engine/input";
import type { PhysicsBody } from "../engine/physics";
import { bodyOverlaps } from "../engine/physics";
import { HORIZON_Y, WORLD_H } from "./world";
import type { Sun } from "./sun";
import { createSun } from "./sun";
import type { Player, Avatar } from "./player";
import { createPlayer, updatePlayer } from "./player";
import type { Element, ElementPlacement } from "./element";
import { createElement } from "./element";

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

export interface SegmentData {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];
  readonly nightTerrain: readonly AABB[];
  readonly elements: readonly ElementPlacement[];
  readonly starts: { readonly sol: Vec2; readonly luna: Vec2 };
  readonly exits: ExitZones;
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
}

export function createSegment(data: SegmentData): SegmentState {
  return {
    data,
    player: createPlayer(data.starts.sol, data.starts.luna),
    sun: createSun(0.5),
    elements: data.elements.map(createElement),
    status: "playing",
    solReached: false,
    lunaReached: false,
    solSolids: [],
    lunaSolids: [],
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
  state.sun.reset(0.5);
  state.status = "playing";
  state.solReached = false;
  state.lunaReached = false;
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

export function updateSegment(state: SegmentState, input: InputSnapshot, dt: number): void {
  if (state.status !== "playing") {
    return;
  }
  state.sun.apply(input, dt);
  gatherSolids(state);
  updatePlayer(state.player, input, dt, state.solSolids, state.lunaSolids);

  if (isDead(state.player.sol) || isDead(state.player.luna)) {
    resetSegment(state);
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
