import type { SegmentData } from "../../game/segment";

/**
 * m3-vine：vine / fungi 非漂移教学 fixture
 *
 * 目的：用回放覆盖 vine（day）与 fungi（night）的实体/虚化切换。
 *
 * 关卡结构（两个世界都有连续地板，杜绝软锁）：
 * - day：在 x≈520 处有一道 vine 墙（s >= 0.65 时实体挡路，低于阈值时虚化可穿过）
 * - night：在 x≈520 处有一道 fungi 墙（s <= 0.35 时实体挡路，高于阈值时虚化可穿过）
 *
 * 两者不能同时实体：vine 实体需要高 s，fungi 实体需要低 s。解法分两阶段：
 * 1. 先把 s 抬到 >= 0.65（fungi 虚化），Luna 先向右走到出口；Sol 被 vine 挡住停在中段
 * 2. 再把 s 降到 <= 0.35（vine 虚化），Sol 继续向右穿过原 vine 位置抵达出口
 *
 * 由于两个 avatar 共享 moveX，Luna 在阶段 1 走完后需要在「安全地带」停留——
 * night 地板连续，Luna 即使继续右移也不会掉坑，最终也会落在 luna 出口内。
 */
const m3Vine: SegmentData = {
  id: "m3-vine",
  dayTerrain: [
    // day 连续地板（顶面 y=320），从 x=0 贯通到右墙
    { x: 0, y: 320, w: 1280, h: 40 },
    { x: -20, y: 0, w: 20, h: 360 },
    { x: 1280, y: 0, w: 20, h: 360 },
  ],
  nightTerrain: [
    // night 连续地板（顶面 y=400，重力翻转后 Luna 站在其上）
    { x: 0, y: 360, w: 1280, h: 40 },
    { x: -20, y: 360, w: 20, h: 360 },
    { x: 1280, y: 360, w: 20, h: 360 },
  ],
  elements: [
    // day vine 墙：s >= 0.65 实体（挡路），否则虚化可穿
    { kind: "vine", world: "day", box: { x: 500, y: 280, w: 28, h: 40 } },
    // night fungi 墙：s <= 0.35 实体（挡路），否则虚化可穿
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
        // 阶段 0：抬 s 到 >= 0.65，vine 实体（Sol 暂时被挡），fungi 虚化（Luna 可通过）
        { frames: 30, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 阶段 1：Luna 向右走到出口；Sol 撞 vine 墙原地停住
        { frames: 320, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 阶段 2：降 s 到 <= 0.35，vine 虚化（Sol 可通过），fungi 实体（Luna 已在出口内不受影响）
        { frames: 50, input: { moveX: 0, jump: false, sunDelta: -1 } },
        // 阶段 3：Sol 继续向右穿过原 vine 位置抵达出口
        { frames: 360, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default m3Vine;
