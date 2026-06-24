import type { SegmentData } from "../../game/segment";

/**
 * m3-mote：balance mote 窗口带平台 fixture（非漂移）
 *
 * 目的：用回放覆盖 mote 在 `band.min <= s && s <= band.max` 时实体、否则虚化的行为。
 *
 * 关卡结构（两个世界都有连续地板，mote 作为额外的实体平台叠在地板上方——
 * 这里把 mote 设计成水平通道里的实体墙，逻辑与 door/vine 一致，便于回放）：
 * - day：x≈520 处一道 mote 墙，band [0.4, 0.6]，s 落在带内时实体挡路
 * - night：x≈520 处一道 mote 墙，同一 band，规则镜像
 *
 * 两个世界共享同一 band：只要把 s 控制在带外（例如 s >= 0.65），两侧 mote 同时虚化，
 * 两位 avatar 可以一次性同步向右走到出口。initialSun 设为 0.5（带内，mote 实体），
 * 解法先抬 s 到带外（虚化），再走。
 *
 * band 合法性在 createElement 中即时校验；这里给 [0.4, 0.6] 是一个偏宽松的设计带宽。
 */
const m3Mote: SegmentData = {
  id: "m3-mote",
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
        // 阶段 0：抬 s 到 0.65 以上（离开 band），两侧 mote 同时虚化
        { frames: 30, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 阶段 1：两位 avatar 同步向右穿过原 mote 位置抵达各自出口
        { frames: 420, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default m3Mote;
