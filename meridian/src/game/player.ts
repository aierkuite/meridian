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

export interface Avatar extends PhysicsBody {
  readonly id: "sol" | "luna";
}

export interface Player {
  sol: Avatar;
  luna: Avatar;
  prevJump: boolean;
}

export function createAvatar(id: "sol" | "luna", world: WorldId, start: Vec2): Avatar {
  return {
    id,
    pos: vec2(start.x, start.y),
    vel: vec2(0, 0),
    half: vec2(AVATAR_HALF.x, AVATAR_HALF.y),
    gravitySign: gravitySignFor(world),
    onGround: false,
  };
}

export function createPlayer(solStart: Vec2, lunaStart: Vec2): Player {
  return {
    sol: createAvatar("sol", "day", solStart),
    luna: createAvatar("luna", "night", lunaStart),
    prevJump: false,
  };
}

function stepAvatar(
  avatar: Avatar,
  jumpEdge: boolean,
  input: InputSnapshot,
  dt: number,
  solids: readonly AABB[],
): void {
  avatar.vel.x = input.moveX * MOVE_SPEED;
  if (jumpEdge && avatar.onGround) {
    avatar.vel.y = -avatar.gravitySign * JUMP_SPEED;
  }
  integrateBody(avatar, dt, solids);
}

export function updatePlayer(
  player: Player,
  input: InputSnapshot,
  dt: number,
  solSolids: readonly AABB[],
  lunaSolids: readonly AABB[],
): void {
  const jumpEdge = input.jump && !player.prevJump;
  stepAvatar(player.sol, jumpEdge, input, dt, solSolids);
  stepAvatar(player.luna, jumpEdge, input, dt, lunaSolids);
  player.prevJump = input.jump;
}
