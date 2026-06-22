import type { AABB } from "./math";

export const GRAVITY = 2200;

export interface PhysicsBody {
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  half: { x: number; y: number };
  gravitySign: 1 | -1;
  onGround: boolean;
}

export function bodyOverlaps(body: PhysicsBody, box: AABB): boolean {
  return (
    body.pos.x + body.half.x > box.x &&
    body.pos.x - body.half.x < box.x + box.w &&
    body.pos.y + body.half.y > box.y &&
    body.pos.y - body.half.y < box.y + box.h
  );
}

export function integrateBody(body: PhysicsBody, dt: number, solids: readonly AABB[]): void {
  body.vel.y += body.gravitySign * GRAVITY * dt;

  body.pos.x += body.vel.x * dt;
  for (const s of solids) {
    if (!bodyOverlaps(body, s)) {
      continue;
    }
    if (body.vel.x > 0) {
      body.pos.x = s.x - body.half.x;
    } else if (body.vel.x < 0) {
      body.pos.x = s.x + s.w + body.half.x;
    }
    body.vel.x = 0;
  }

  body.onGround = false;
  body.pos.y += body.vel.y * dt;
  for (const s of solids) {
    if (!bodyOverlaps(body, s)) {
      continue;
    }
    if (body.vel.y > 0) {
      body.pos.y = s.y - body.half.y;
      if (body.gravitySign > 0) {
        body.onGround = true;
      }
    } else if (body.vel.y < 0) {
      body.pos.y = s.y + s.h + body.half.y;
      if (body.gravitySign < 0) {
        body.onGround = true;
      }
    }
    body.vel.y = 0;
  }
}
