import type { SegmentData } from "../../game/segment";

/**
 * beat-6-drift-choice：漂移区选择点（plan.md §5 B6，design.md §3，消耗 Luna 光）
 *
 * 太阳在此自行漂移（direction +1, rate 0.15 < SUN_INPUT_RATE，可反向 counter）。
 * 黑夜连续地板上挂着一道 dark-gate（s>0.3 关闭/实体，s<=0.3 开启）。两条解法：
 * - whole：持续按下太阳（counter 漂移）把 s 压到 <=0.3 让门开启，Luna 在原位
 *   平走穿过，不触发代价
 * - shortcut：放任太阳漂在高位让门关着，Luna 起跳从门下方俯冲穿过——下潜弧线
 *   穿过门下方的 shortcut zone，记一次 shortcut 并扣 Luna 0.5 光
 *
 * 白昼地板连续，Sol 走到出口；镜像跳跃（向上）落回连续地板，无碍。
 */
const beat6DriftChoice: SegmentData = {
  id: "beat-6-drift-choice",
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
    // 黑夜 dark-gate：s > 0.3 关闭（实体，挂在地板下伸入 Luna 行走空间），s <= 0.3 开启
    { kind: "door", world: "night", box: { x: 620, y: 400, w: 28, h: 60 } },
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
  drift: { direction: 1, rate: 0.15 },
  choicePoint: {
    id: "drift-cost",
    // 悬于门下方（远离地平线一侧）：仅当 Luna 俯冲越门时穿过
    shortcutZone: { world: "night", box: { x: 560, y: 470, w: 160, h: 120 } },
    cost: { sol: 0, luna: 0.5 },
    storyKey: "drift-cost",
  },
  solutionPaths: [
    {
      id: "whole-hold-the-gate-open",
      branch: "whole",
      maxFrames: 1500,
      steps: [
        // 持续按下太阳 counter 漂移，把 s 压到 <=0.3 让门开启，同时平走穿过到出口
        { frames: 600, input: { moveX: 1, jump: false, sunDelta: -1 } },
      ],
    },
    {
      id: "shortcut-dive-the-gate",
      branch: "shortcut",
      maxFrames: 1500,
      steps: [
        // 放任太阳漂在高位（门关闭），走到门前
        { frames: 173, input: { moveX: 1, jump: false, sunDelta: 0 } },
        // 起跳俯冲：弧线从门下方穿过 zone，触发 shortcut（扣 Luna 光）
        { frames: 90, input: { moveX: 1, jump: true, sunDelta: 0 } },
        // 浮回地板继续走到出口
        { frames: 250, input: { moveX: 1, jump: false, sunDelta: 0 } },
      ],
    },
  ],
};

export default beat6DriftChoice;
