import type { SegmentData } from "../../game/segment";

/**
 * beat-7-master-choice：综合选择点（plan.md §5 B7，design.md §3，同时消耗双方光）
 *
 * 白昼连续地板上立着一道 ice 墙（s<0.5 实体）。initialSun=0.35 让墙默认实体。
 * 两条解法：
 * - whole：把太阳抬过 0.5 让冰墙融化，Sol 地面平走穿过，不触发代价
 * - shortcut：保持低位让冰墙实体，Sol 起跳越过——弧线穿过墙顶上方 shortcut zone，
 *   记一次 shortcut 并同时扣 Sol 与 Luna 各 0.5 光（最后一墙的双重代价）
 *
 * 黑夜地板连续，Luna 走到出口；镜像跳跃落回连续地板，无碍。
 */
const beat7MasterChoice: SegmentData = {
  id: "beat-7-master-choice",
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
    // 白昼 ice 墙：s < 0.5 实体（挡路），s >= 0.5 融化（虚化）
    { kind: "ice", world: "day", box: { x: 620, y: 270, w: 28, h: 50 } },
  ],
  starts: {
    sol: { x: 80, y: 300 },
    luna: { x: 80, y: 420 },
  },
  exits: {
    sol: { x: 900, y: 280, w: 100, h: 40 },
    luna: { x: 900, y: 400, w: 100, h: 40 },
  },
  initialSun: 0.35,
  choicePoint: {
    id: "master-cost",
    shortcutZone: { world: "day", box: { x: 560, y: 160, w: 160, h: 100 } },
    cost: { sol: 0.5, luna: 0.5 },
    storyKey: "master-cost",
  },
  solutionPaths: [
    {
      id: "whole-melt-the-wall",
      branch: "whole",
      maxFrames: 1500,
      steps: [
        // 抬太阳过 0.5，冰墙融化
        { frames: 30, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 地面平走穿过原墙位，抵达出口（不触发 zone）
        { frames: 420, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
    {
      id: "shortcut-leap-the-wall",
      branch: "shortcut",
      maxFrames: 1500,
      steps: [
        // 保持 s=0.35（冰墙实体），走到墙前
        { frames: 150, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 起跳越过冰墙：弧线穿过墙顶 zone，触发 shortcut（扣双方光）
        { frames: 100, input: { moveX: 1, jump: true, sunDelta: 0 } },
        // 落地继续走到出口
        { frames: 250, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default beat7MasterChoice;
