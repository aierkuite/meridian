import type { AABB } from "../engine/math";

export const WORLD_W = 1280;
export const WORLD_H = 720;
export const HORIZON_Y = WORLD_H / 2;
export const WORLD_BOUNDS: AABB = { x: 0, y: 0, w: WORLD_W, h: WORLD_H };

export type WorldId = "day" | "night";

export function gravitySignFor(world: WorldId): 1 | -1 {
  return world === "day" ? 1 : -1;
}
