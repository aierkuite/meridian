import type { SegmentData } from "../../game/segment";

const m1Slice: SegmentData = {
  id: "m1-slice",
  dayTerrain: [
    { x: 0, y: 320, w: 300, h: 40 },
    { x: 600, y: 320, w: 680, h: 40 },
    { x: -20, y: 0, w: 20, h: 360 },
    { x: 1280, y: 0, w: 20, h: 360 },
  ],
  nightTerrain: [
    { x: 0, y: 360, w: 800, h: 40 },
    { x: 1100, y: 360, w: 180, h: 40 },
    { x: -20, y: 360, w: 20, h: 360 },
    { x: 1280, y: 360, w: 20, h: 360 },
  ],
  elements: [
    { kind: "ice", world: "day", box: { x: 300, y: 320, w: 300, h: 40 } },
    { kind: "ice", world: "night", box: { x: 800, y: 360, w: 300, h: 40 } },
  ],
  starts: {
    sol: { x: 80, y: 300 },
    luna: { x: 80, y: 420 },
  },
  exits: {
    sol: { x: 640, y: 280, w: 100, h: 40 },
    luna: { x: 1140, y: 400, w: 100, h: 40 },
  },
  solutionPaths: [
    {
      id: "main-hold-then-cross",
      branch: "main",
      // 留出充足预算：模拟约 425 帧，阈值给到 1500 帧以防边界微差。
      maxFrames: 1500,
      steps: [
        // 阶段 0：把太阳降到 0.5 以下，使白昼冰桥凝结、黑夜冰桥融化。
        { frames: 5, input: { moveX: 0, jump: false, sunDelta: -1 } },
        // 阶段 1：在白昼冰桥上同步向右走，把 Sol 送到右岸（黑夜侧 Luna 仍在 0..800 实地上）。
        { frames: 220, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 阶段 2：把太阳升到 0.5 以上，使黑夜冰桥凝结、白昼冰桥融化（Sol 已在右岸稳固平台）。
        { frames: 10, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 阶段 3：在黑夜冰桥上同步向右走，Sol 沿右岸平台继续向右滑向墙壁，Luna 越过黑夜冰桥抵达出口。
        { frames: 200, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default m1Slice;
