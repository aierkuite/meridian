import type { SegmentData } from "../../game/segment";

/**
 * prologue-splitting：移动 + 镜像跳跃教学（plan.md §5 Prologue）
 *
 * 关卡结构：两世界连续地板；白昼侧一道矮墙逼 Sol 起跳。Luna 因镜像共享跳跃
 * 输入也会同步起跳，但黑夜侧地板连续，落回即可——这正是「镜像跳」的教学。
 */
const prologueSplitting: SegmentData = {
  id: "prologue-splitting",
  dayTerrain: [
    { x: 0, y: 320, w: 1280, h: 40 },
    { x: 560, y: 280, w: 24, h: 40 },
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
  exits: {
    sol: { x: 900, y: 280, w: 100, h: 40 },
    luna: { x: 900, y: 400, w: 100, h: 40 },
  },
  initialSun: 0.5,
  solutionPaths: [
    {
      id: "main-walk-and-jump",
      branch: "main",
      maxFrames: 1500,
      steps: [
        // 走到矮墙前
        { frames: 150, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 起跳越过白昼矮墙（Luna 同步镜像跳，落回连续地板）
        { frames: 100, input: { moveX: 1, jump: true, sunDelta: 0 } },
        // 落地后继续走到各自出口
        { frames: 250, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default prologueSplitting;
