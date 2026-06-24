import type { SegmentData } from "../../game/segment";

/**
 * beat-5-balance-mote：平衡光尘窗口带（plan.md §5 B5，沿用 M3 mote 结构）
 *
 * 两世界各一道 mote 墙，共用 band [0.4,0.6]：band 内实体挡路，band 外虚化。
 * initialSun=0.5 在带内（实体），解法先抬 s 出带（虚化），再同步走。
 */
const beat5BalanceMote: SegmentData = {
  id: "beat-5-balance-mote",
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
    {
      kind: "mote",
      world: "day",
      box: { x: 500, y: 280, w: 28, h: 40 },
      band: { min: 0.4, max: 0.6 },
    },
    {
      kind: "mote",
      world: "night",
      box: { x: 500, y: 400, w: 28, h: 40 },
      band: { min: 0.4, max: 0.6 },
    },
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
      id: "main-lift-out-of-band",
      branch: "main",
      maxFrames: 2000,
      steps: [
        { frames: 30, input: { moveX: 0, jump: false, sunDelta: 1 } },
        { frames: 420, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default beat5BalanceMote;
