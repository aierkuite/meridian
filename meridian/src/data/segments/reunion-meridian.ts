import type { SegmentData } from "../../game/segment";

/**
 * reunion-meridian：机械融合终章（plan.md §5 Reunion，design.md §7）
 *
 * 两世界连续地板。太阳缓慢漂移（rate 0.04），但胜利不由出口判定，而由 finale
 * 门控：双方各自走到最右的 solstice 标记并站定、太阳保持在窗口内连续 holdFrames，
 * 随后确定性 dissolve 计数器跑满 dissolveFrames，即判定通关——journey 据累积
 * consequence 解析出已挣得的结局。无最后一刻选择（design.md §7）。
 *
 * initialSun=0.5 落在窗口 [0.35,0.8] 内；rate 0.04 极缓，整段 hold 期间太阳都
 * 留在窗口内，故双方走到标记站定即可挣得通关。
 */
const reunionMeridian: SegmentData = {
  id: "reunion-meridian",
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
  elements: [],
  starts: {
    sol: { x: 80, y: 300 },
    luna: { x: 80, y: 420 },
  },
  // finale 段不用 exits 判定；保留合法占位（与 solstice 标记重合）
  exits: {
    sol: { x: 1140, y: 270, w: 140, h: 60 },
    luna: { x: 1140, y: 390, w: 140, h: 60 },
  },
  initialSun: 0.5,
  drift: { direction: 1, rate: 0.04 },
  finale: {
    solsticeMarks: {
      sol: { x: 1140, y: 270, w: 140, h: 60 },
      luna: { x: 1140, y: 390, w: 140, h: 60 },
    },
    sunWindow: { min: 0.35, max: 0.8 },
    holdFrames: 90,
    dissolveFrames: 90,
  },
  solutionPaths: [
    {
      id: "main-reach-marks-and-hold",
      branch: "main",
      maxFrames: 1000,
      steps: [
        // 同步向右走到最右贴墙的 solstice 标记并站定；之后保持 moveX=1 钉在墙边，
        // 太阳留在窗口内，hold 累满后 dissolve 跑满即通关
        { frames: 720, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default reunionMeridian;
