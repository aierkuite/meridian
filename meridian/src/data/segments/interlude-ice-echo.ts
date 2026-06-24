import type { SegmentData } from "../../game/segment";

/**
 * interlude-ice-echo：双世界冰的巩固关（plan.md §5 interlude，无新元素）
 *
 * 沿用 M1 双相结构：白昼断口由 day ice 桥接（s<0.5），黑夜断口由 night ice
 * 桥接（s>0.5），两者错开 x 且需相反太阳值，故必须分两相。
 * 1. 降太阳：day ice 凝结，Sol 过桥；Luna 仍在黑夜连续段（0..800）安全
 * 2. 升太阳：night ice 凝结，Luna 过桥；Sol 已在白昼右段（600..1280）安全
 */
const interludeIceEcho: SegmentData = {
  id: "interlude-ice-echo",
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
  initialSun: 0.5,
  solutionPaths: [
    {
      id: "main-low-then-high",
      branch: "main",
      maxFrames: 1500,
      steps: [
        // 相 0：降太阳到 0.5 以下，白昼冰桥凝结
        { frames: 5, input: { moveX: 0, jump: false, sunDelta: -1 } },
        // 相 1：Sol 过白昼冰桥到右岸（Luna 在黑夜连续段 0..800 上安全）
        { frames: 220, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 相 2：升太阳到 0.5 以上，黑夜冰桥凝结（Sol 已在右岸平台）
        { frames: 10, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 相 3：Luna 过黑夜冰桥抵达出口
        { frames: 200, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default interludeIceEcho;
