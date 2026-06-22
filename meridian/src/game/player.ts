import type { AABB, Vec2 } from "../engine/math";
import { vec2 } from "../engine/math";
import type { InputSnapshot } from "../engine/input";
import type { PhysicsBody } from "../engine/physics";
import { integrateBody } from "../engine/physics";
import type { WorldId } from "./world";
import { gravitySignFor } from "./world";

export const MOVE_SPEED = 320;
export const JUMP_SPEED = 760;
export const AVATAR_HALF: Readonly<Vec2> = { x: 14, y: 20 };

/**
 * 郊狼时间（coyote-time）窗口，以 DT = 1/120 的帧数计量
 *
 * 处于该窗口内的 avatar 即使已经离开地面也仍可起跳。取 8 帧（≈66ms）
 * 属于设计文档建议范围 6–10 的中段，偏向宽容以匹配解谜节奏。
 */
export const COYOTE_FRAMES = 8;

/**
 * 跳跃缓冲（jump-buffer）窗口，以 DT = 1/120 的帧数计量
 *
 * 玩家在落地前提前按下跳跃时，缓冲允许其在着地瞬间触发跳跃。取 8 帧
 * 与郊狼时间对称，同样落在建议范围 6–10 内。
 */
export const JUMP_BUFFER_FRAMES = 8;

export interface Avatar extends PhysicsBody {
  readonly id: "sol" | "luna";
  /** 郊狼时间剩余帧数；avatar 离地后仍可起跳的窗口，每帧递减至 0 */
  coyoteFramesRemaining: number;
}

export interface Player {
  sol: Avatar;
  luna: Avatar;
  prevJump: boolean;
  /**
   * 共享跳跃缓冲剩余帧数
   *
   * 由跳跃边沿设置，Sol 与 Luna 共用同一计数器——两位 avatar 接收的是同
   * 一个输入边沿，不存在独立控制。任意 avatar 实际触发跳跃后该帧末清零。
   */
  jumpBufferFramesRemaining: number;
}

export function createAvatar(id: "sol" | "luna", world: WorldId, start: Vec2): Avatar {
  return {
    id,
    pos: vec2(start.x, start.y),
    vel: vec2(0, 0),
    half: vec2(AVATAR_HALF.x, AVATAR_HALF.y),
    gravitySign: gravitySignFor(world),
    onGround: false,
    coyoteFramesRemaining: 0,
  };
}

export function createPlayer(solStart: Vec2, lunaStart: Vec2): Player {
  return {
    sol: createAvatar("sol", "day", solStart),
    luna: createAvatar("luna", "night", lunaStart),
    prevJump: false,
    jumpBufferFramesRemaining: 0,
  };
}

/**
 * 判定单个 avatar 是否应当在本帧触发跳跃
 *
 * 跳跃触发的充要条件：共享缓冲仍有效，且 avatar 处于地面或郊狼窗口内。
 * 该判定不会独立操控 avatar——缓冲是玩家级共享状态，起跳与否由物理状态
 * 决定，与 M1 原有的「同一跳跃边沿作用于两位 avatar」模型保持一致。
 *
 * @param avatar 待判定的 avatar
 * @param jumpBufferRemaining 玩家级跳跃缓冲剩余帧数
 * @returns 当且仅当满足触发条件时为真
 */
function shouldJumpFire(avatar: Avatar, jumpBufferRemaining: number): boolean {
  return jumpBufferRemaining > 0 && (avatar.onGround || avatar.coyoteFramesRemaining > 0);
}

/**
 * 推进单个 avatar 一帧
 *
 * 处理顺序：
 * 1. 先用上帧积分后的着地状态判定是否起跳，并写入垂直速度
 * 2. 调用物理积分器更新位置与碰撞
 * 3. 用本帧积分后的着地状态刷新郊狼时间（着地则重置，离地则递减）
 *
 * 注意：起跳判定使用的是「进入本帧时」的着地状态，因此跳跃后立刻离地的
 * avatar 仍会在第 3 步被正确识别为离地，进入郊狼递减逻辑。
 *
 * @param avatar 待推进的 avatar
 * @param jumpBufferRemaining 玩家级共享跳跃缓冲剩余帧数
 * @param input 本帧玩家输入
 * @param dt 固定步长（DT = 1/120）
 * @param solids 该 avatar 所在世界的实体碰撞盒列表
 * @returns 当且仅当本帧实际起跳（消费了缓冲）时为真
 */
function stepAvatar(
  avatar: Avatar,
  jumpBufferRemaining: number,
  input: InputSnapshot,
  dt: number,
  solids: readonly AABB[],
): boolean {
  avatar.vel.x = input.moveX * MOVE_SPEED;
  const jumpFired = shouldJumpFire(avatar, jumpBufferRemaining);
  if (jumpFired) {
    avatar.vel.y = -avatar.gravitySign * JUMP_SPEED;
  }
  integrateBody(avatar, dt, solids);
  return jumpFired;
}

/**
 * 依据积分后的着地状态更新郊狼时间计数器
 *
 * - 着地：重置为完整窗口
 * - 离地：每帧递减，下限为 0
 *
 * 必须在 `integrateBody` 之后调用，以保证 `onGround` 反映本帧最新状态。
 *
 * @param avatar 待更新的 avatar
 * @returns 无返回值
 */
function refreshCoyoteAfterIntegrate(avatar: Avatar): void {
  if (avatar.onGround) {
    avatar.coyoteFramesRemaining = COYOTE_FRAMES;
  } else if (avatar.coyoteFramesRemaining > 0) {
    avatar.coyoteFramesRemaining -= 1;
  }
}

export function updatePlayer(
  player: Player,
  input: InputSnapshot,
  dt: number,
  solSolids: readonly AABB[],
  lunaSolids: readonly AABB[],
): void {
  const jumpEdge = input.jump && !player.prevJump;
  if (jumpEdge) {
    player.jumpBufferFramesRemaining = JUMP_BUFFER_FRAMES;
  }

  const solFired = stepAvatar(player.sol, player.jumpBufferFramesRemaining, input, dt, solSolids);
  const lunaFired = stepAvatar(player.luna, player.jumpBufferFramesRemaining, input, dt, lunaSolids);

  refreshCoyoteAfterIntegrate(player.sol);
  refreshCoyoteAfterIntegrate(player.luna);

  if (solFired || lunaFired) {
    // 任一 avatar 在本帧消费了缓冲（实际起跳）即清零，避免下一帧重复触发。
    player.jumpBufferFramesRemaining = 0;
  } else if (player.jumpBufferFramesRemaining > 0) {
    player.jumpBufferFramesRemaining -= 1;
  }

  player.prevJump = input.jump;
}
