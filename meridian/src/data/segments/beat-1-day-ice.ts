import type { SegmentData } from "../../game/segment";

/**
 * beat-1-day-ice：白昼冰桥教学（plan.md §5 B1）
 *
 * 白昼地板在 x520..760 处断开，由 day ice 桥接（s < 0.5 时凝结为实体）。
 * 黑夜地板连续，Luna 直接走到出口。解法：先把太阳降到 0.5 以下让冰桥凝结，
 * 再同步向右走。
 */
const beat1DayIce: SegmentData = {
  id: "beat-1-day-ice",
  dayTerrain: [
    { x: 0, y: 320, w: 520, h: 40 },
    { x: 760, y: 320, w: 520, h: 40 },
    { x: -20, y: 0, w: 20, h: 360 },
    { x: 1280, y: 0, w: 20, h: 360 },
  ],
  nightTerrain: [
    { x: 0, y: 360, w: 1280, h: 40 },
    { x: -20, y: 360, w: 20, h: 360 },
    { x: 1280, y: 360, w: 20, h: 360 },
  ],
  elements: [
    // 白昼冰桥：s < 0.5 实体，跨越 x520..760 的断口
    { kind: "ice", world: "day", box: { x: 520, y: 320, w: 240, h: 40 } },
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
      id: "main-freeze-and-cross",
      branch: "main",
      maxFrames: 1500,
      steps: [
        // 降太阳到 0.5 以下，冰桥凝结
        { frames: 20, input: { moveX: 0, jump: false, sunDelta: -1 } },
        // 同步向右：Sol 走过冰桥，Luna 走连续地板，各自抵达出口
        { frames: 400, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default beat1DayIce;
