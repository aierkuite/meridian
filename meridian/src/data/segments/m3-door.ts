import type { SegmentData } from "../../game/segment";

/**
 * m3-door：light-door / dark-gate 非漂移教学 fixture
 *
 * 目的：用回放覆盖 door（day light-door，s >= 0.7 打开）与 gate（night dark-gate，
 * s <= 0.3 打开）的开闭行为。
 *
 * 关卡结构（两个世界都有连续地板）：
 * - day：x≈520 处一道 light-door 墙，s < 0.7 时关闭/实体挡路，s >= 0.7 时打开可穿
 * - night：x≈520 处一道 dark-gate 墙，s > 0.3 时关闭/实体挡路，s <= 0.3 时打开可穿
 *
 * 两者不能同时打开。解法分两阶段：
 * 1. 把 s 抬到 >= 0.7（light-door 打开），Sol 先向右走到出口；Luna 被 dark-gate 挡住
 * 2. 把 s 降到 <= 0.3（dark-gate 打开），Luna 继续向右穿过原 gate 位置抵达出口
 */
const m3Door: SegmentData = {
  id: "m3-door",
  dayTerrain: [
    { x: 0, y: 320, w: 1280, h: 40 },
    { x: -20, y: 0, w: 20, h: 360 },
    { x: 1280, y: 0, w: 20, h: 360 },
  ],
  nightTerrain: [
    { x: 0, y: 360, w: 1280, h: 40 },
    { x: -20, y: 360, w: 20, h: 360 },
    { x: 1280, y: 360, w: 20, h: 360 },
  ],
  elements: [
    // day light-door：s < 0.7 时实体（关闭挡路）
    { kind: "door", world: "day", box: { x: 500, y: 280, w: 28, h: 40 } },
    // night dark-gate：s > 0.3 时实体（关闭挡路）
    { kind: "door", world: "night", box: { x: 500, y: 400, w: 28, h: 40 } },
  ],
  starts: {
    sol: { x: 80, y: 300 },
    luna: { x: 80, y: 420 },
  },
  exits: {
    sol: { x: 900, y: 280, w: 100, h: 40 },
    luna: { x: 900, y: 400, w: 100, h: 40 },
  },
  initialSun: 0.5,
  solutionPaths: [
    {
      id: "main-day-then-night",
      branch: "main",
      maxFrames: 2400,
      steps: [
        // 阶段 0：抬 s 到 >= 0.7，light-door 打开（Sol 可通过），dark-gate 仍关闭（Luna 被挡）
        { frames: 35, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 阶段 1：Sol 向右走到出口；Luna 撞 dark-gate 原地停住
        { frames: 320, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 阶段 2：降 s 到 <= 0.3，dark-gate 打开（Luna 可通过），light-door 关闭（Sol 已在出口内）
        { frames: 75, input: { moveX: 0, jump: false, sunDelta: -1 } },
        // 阶段 3：Luna 继续向右穿过原 gate 位置抵达出口
        { frames: 360, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default m3Door;
