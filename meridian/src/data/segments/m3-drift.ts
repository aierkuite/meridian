import type { SegmentData } from "../../game/segment";

/**
 * m3-drift：太阳漂移 fixture
 *
 * 目的：用回放覆盖 drift 路径，证明玩家反向输入可以 counter 漂移，仍能让两位
 * avatar 抵达出口。
 *
 * 漂移剖面选择：{ direction: +1, rate: 0.2 }。选 +1 是为了让 drift 自然把 s 推向
 * night ice 的实体区间（s > 0.5），与玩家用 sunDelta = -1 主动 counter 的阶段形成
 * 正反两向的对照，从而一条路径同时验证「drift 推进 s」与「反向输入压回 s」。
 * rate = 0.2 远低于 SUN_INPUT_RATE（0.8），保证反向输入净压回（-0.6/s）可生效。
 *
 * 关卡结构：两世界连续地板；day ice 墙与 night ice 墙同在 x≈520，分别在
 * s < 0.5 / s > 0.5 实体，故不能同时放行。initialSun = 0.3，让 drift 起始即有用武之地。
 *
 * 解法四阶段（详见 solutionPaths）：
 * 1. sunDelta = +1 叠加 drift，把 s 推到 > 0.5，放行 Sol（day ice 虚化）
 * 2. Sol 走到出口；Luna 被 night ice 挡住停在中段（drift 继续把 s 钉在高位，安全）
 * 3. sunDelta = -1 反向 counter drift，把 s 压回 < 0.5，虚化 night ice，放行 Luna
 * 4. Luna 穿过原 night ice 位置抵达出口
 */
const m3Drift: SegmentData = {
  id: "m3-drift",
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
    // day ice 墙：s < 0.5 实体
    { kind: "ice", world: "day", box: { x: 500, y: 280, w: 28, h: 40 } },
    // night ice 墙：s > 0.5 实体
    { kind: "ice", world: "night", box: { x: 500, y: 400, w: 28, h: 40 } },
  ],
  starts: {
    sol: { x: 80, y: 300 },
    luna: { x: 80, y: 420 },
  },
  exits: {
    sol: { x: 900, y: 280, w: 100, h: 40 },
    luna: { x: 900, y: 400, w: 100, h: 40 },
  },
  initialSun: 0.3,
  drift: { direction: 1, rate: 0.2 },
  solutionPaths: [
    {
      id: "main-counter-drift",
      branch: "main",
      maxFrames: 2400,
      steps: [
        // 阶段 0：sunDelta=+1 + drift(+0.2) 共同把 s 推到 > 0.5（net +1.0/s），
        // night ice 实体（Luna 暂被挡），day ice 虚化（Sol 可通过）
        { frames: 30, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 阶段 1：Sol 向右走到出口；Luna 撞 night ice 墙原地停住
        // 期间不带 sunDelta，drift 仍把 s 向 1 推，night ice 保持实体（Luna 被挡是安全的）
        { frames: 320, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 阶段 2：sunDelta=-1 反向 counter drift，把 s 压回 < 0.5，
        // night ice 虚化（Luna 可通过），day ice 实体（Sol 已在出口内不受影响）
        { frames: 130, input: { moveX: 0, jump: false, sunDelta: -1 } },
        // 阶段 3：Luna 继续向右穿过原 night ice 位置抵达出口。
        // 阶段不带 sunDelta 时 drift 会缓慢推 s 回升，但 Luna 一旦越过 28px 的墙体范围
        // 即不再受 night ice 阻挡；maxFrames 预算留有余量以吸收该回升窗口。
        { frames: 360, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default m3Drift;
