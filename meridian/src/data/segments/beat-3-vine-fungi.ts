import type { SegmentData } from "../../game/segment";

/**
 * beat-3-vine-fungi：vine / fungi 教学（plan.md §5 B3，沿用 M3 vine 结构）
 *
 * 白昼 vine 墙 s>=0.65 实体；黑夜 fungi 墙 s<=0.35 实体——两者不能同时实体。
 * 1. 抬 s>=0.65：vine 实体挡 Sol，fungi 虚化放 Luna 过
 * 2. 降 s<=0.35：vine 虚化放 Sol 过（Luna 已在出口）
 */
const beat3VineFungi: SegmentData = {
  id: "beat-3-vine-fungi",
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
    { kind: "vine", world: "day", box: { x: 500, y: 280, w: 28, h: 40 } },
    { kind: "vine", world: "night", box: { x: 500, y: 400, w: 28, h: 40 } },
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
      id: "main-high-then-low",
      branch: "main",
      maxFrames: 2400,
      steps: [
        { frames: 30, input: { moveX: 0, jump: false, sunDelta: 1 } },
        { frames: 320, input: { moveX: 1, jump: false, sunDelta: 0 } },
        { frames: 50, input: { moveX: 0, jump: false, sunDelta: -1 } },
        { frames: 360, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default beat3VineFungi;
