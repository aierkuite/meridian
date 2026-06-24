import type { SegmentData } from "../../game/segment";

/**
 * beat-2-night-bridge：反相黑夜冰桥教学（plan.md §5 B2）
 *
 * 镜像于 beat-1：黑夜地板在 x520..760 断开，由 night ice 桥接（s > 0.5 凝结）。
 * 白昼地板连续，Sol 直接走。解法：把太阳升到 0.5 以上让黑夜冰桥凝结，再同步走。
 */
const beat2NightBridge: SegmentData = {
  id: "beat-2-night-bridge",
  dayTerrain: [
    { x: 0, y: 320, w: 1280, h: 40 },
    { x: -20, y: 0, w: 20, h: 360 },
    { x: 1280, y: 0, w: 20, h: 360 },
  ],
  nightTerrain: [
    { x: 0, y: 360, w: 520, h: 40 },
    { x: 760, y: 360, w: 520, h: 40 },
    { x: -20, y: 360, w: 20, h: 360 },
    { x: 1280, y: 360, w: 20, h: 360 },
  ],
  elements: [
    // 黑夜冰桥：s > 0.5 实体，跨越 x520..760 的断口
    { kind: "ice", world: "night", box: { x: 520, y: 360, w: 240, h: 40 } },
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
        // 升太阳到 0.5 以上，黑夜冰桥凝结
        { frames: 20, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 同步向右：Luna 走过黑夜冰桥，Sol 走连续地板，各自抵达出口
        { frames: 400, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default beat2NightBridge;
