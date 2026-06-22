import type { AABB, Vec2 } from "../engine/math";
import type { InputSnapshot } from "../engine/input";
import type { PhysicsBody } from "../engine/physics";
import { bodyOverlaps } from "../engine/physics";
import { HORIZON_Y, WORLD_H } from "./world";
import type { Sun } from "./sun";
import { createSun } from "./sun";
import type { Player } from "./player";
import { createPlayer, updatePlayer } from "./player";
import type { Element, ElementPlacement } from "./element";
import { createElement } from "./element";

export interface ExitZones {
  readonly sol: AABB;
  readonly luna: AABB;
}

export interface SegmentData {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];
  readonly nightTerrain: readonly AABB[];
  readonly elements: readonly ElementPlacement[];
  readonly starts: { readonly sol: Vec2; readonly luna: Vec2 };
  readonly exits: ExitZones;
  readonly solutionPaths?: readonly InputSnapshot[][];
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

function resetAvatar(a: PhysicsBody, start: Vec2): void {
  a.pos.x = start.x;
  a.pos.y = start.y;
  a.vel.x = 0;
  a.vel.y = 0;
  a.onGround = false;
}

export function resetSegment(state: SegmentState): void {
  resetAvatar(state.player.sol, state.data.starts.sol);
  resetAvatar(state.player.luna, state.data.starts.luna);
  state.player.prevJump = false;
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
