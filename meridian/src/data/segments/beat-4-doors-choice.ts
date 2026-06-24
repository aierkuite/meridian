import type { SegmentData } from "../../game/segment";

/**
 * beat-4-doors-choice：光之门选择点（plan.md §5 B4，design.md §3，消耗 Sol 光）
 *
 * 白昼连续地板上立着一道 light-door（s<0.7 关闭/实体）。两条解法：
 * - whole：把太阳抬到 >=0.7 让门开启，Sol 在地面平走穿过，不触发任何代价
 * - shortcut：保持太阳低位让门关着，Sol 直接起跳越过门——跳跃弧线穿过门顶上方
 *   的 shortcut zone，记一次 shortcut 并扣 Sol 0.5 光（一个核黯淡，不再点亮）
 *
 * 黑夜地板连续，Luna 走到出口；镜像跳跃落回连续地板，无碍。zone 高悬于门顶，
 * whole 路线（地面 y300）不会误触。
 */
const beat4DoorsChoice: SegmentData = {
  id: "beat-4-doors-choice",
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
    // 白昼 light-door：s < 0.7 关闭（实体），s >= 0.7 开启（虚化）
    { kind: "door", world: "day", box: { x: 620, y: 270, w: 28, h: 50 } },
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
  choicePoint: {
    id: "doors-cost",
    // 高悬于门顶上方：仅当 Sol 起跳越门时穿过
    shortcutZone: { world: "day", box: { x: 560, y: 160, w: 160, h: 100 } },
    cost: { sol: 0.5, luna: 0 },
    storyKey: "doors-cost",
  },
  solutionPaths: [
    {
      id: "whole-open-the-door",
      branch: "whole",
      maxFrames: 1500,
      steps: [
        // 抬太阳到 >=0.7，门开启
        { frames: 35, input: { moveX: 0, jump: false, sunDelta: 1 } },
        // 地面平走穿过开启的门，抵达出口（不触发 zone）
        { frames: 420, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
    {
      id: "shortcut-leap-the-door",
      branch: "shortcut",
      maxFrames: 1500,
      steps: [
        // 保持太阳 0.5（门关闭），走到门前
        { frames: 150, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 起跳越过关闭的门：弧线穿过门顶 zone，触发 shortcut（扣 Sol 光）
        { frames: 100, input: { moveX: 1, jump: true, sunDelta: 0 } },
        // 落地继续走到出口
        { frames: 250, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default beat4DoorsChoice;
