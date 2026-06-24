import type { ChoicePointId, ConsequenceBand } from "../game/consequence";
import type { EndingId } from "../game/ending";

/**
 * 单个结局的标题与收束句
 */
export interface EndingText {
  readonly title: string;
  readonly closer: string;
}

/**
 * 叙事文本表（design.md §8 / narration-text 规范）
 *
 * 纯文本数据：选择逻辑在 `game/narration.ts`，本文件只存词条。键为 segment id /
 * 选择点 id / consequence band / 结局 id；Record<string,...> 让按 id 查询自然
 * 返回 `T | undefined`，逼出叙事层的缺省处理。所有玩家可见文本为英文。
 */
export interface StoryTable {
  /** 开场白（按 segment id；通常只有 prologue 有） */
  readonly openings: Readonly<Record<string, string>>;
  /** beat 行（按 segment id） */
  readonly beats: Readonly<Record<string, string>>;
  /** 选择点提示（按选择点 id，转向第二人称） */
  readonly choicePrompts: Readonly<Record<ChoicePointId, string>>;
  /** 自适应行（按 consequence 粗粒度 band） */
  readonly adaptive: Readonly<Record<ConsequenceBand, string>>;
  /** graduated hint 阶梯（按 segment id，由 subtle → concrete 升级） */
  readonly hints: Readonly<Record<string, readonly string[]>>;
  /** 结局标题与收束句（按结局 id） */
  readonly endings: Readonly<Record<EndingId, EndingText>>;
}

/**
 * Meridian 的叙事词表
 *
 * 声音：神话式全知（"Once, the sun and the moon…"），在选择点与结局转向第二
 * 人称 "you" 以落下代价。稀疏、克制、诗化。
 */
export const STORY: StoryTable = {
  openings: {
    "prologue-splitting": "Once, the sun and the moon shared one sky.",
  },
  beats: {
    "prologue-splitting": "Then came the longest day — and the longest night. And they were two.",
    "beat-1-day-ice": "In the day world, the unwarmed water remembers how to be a road.",
    "beat-2-night-bridge": "What the day melts, the night keeps. A bridge of cold, on the far shore.",
    "interlude-ice-echo": "One sun, two answers. Lower it for one, raise it for the other.",
    "beat-3-vine-fungi": "What lifts one world drowns the other. Still — they move as one.",
    "beat-4-doors-choice": "A gate of light. A gate of dark. Neither opens for both at once.",
    "beat-5-balance-mote": "There is a moment that holds both. Find it, and do not let it widen.",
    "beat-6-drift-choice": "The sun will not stay where you leave it now. You must keep holding.",
    "beat-7-master-choice": "Everything you learned, at once. The line is close.",
    "reunion-meridian": "All lines meet somewhere. Not all who reach them remain.",
  },
  choicePrompts: {
    "doors-cost": "There is a faster way. It costs a piece of the light.",
    "drift-cost": "Let the dark have one thread of you, and the crossing is quick.",
    "master-cost": "Spend from both, and the last wall simply falls. It will not rekindle.",
  },
  adaptive: {
    whole: "You have given up nothing. The light is whole.",
    spent: "A little dimmer now — but you walk together still.",
    lopsided: "One of you burns low. The other carries the glow.",
    dark: "So little light left. You move by memory of it.",
  },
  hints: {
    "beat-1-day-ice": [
      "The water will not hold you while the sun warms it.",
      "Lower the sun until the day world cools.",
      "Press the sun down before you step onto the gap.",
    ],
    "beat-2-night-bridge": [
      "The far bridge waits for the sun to leave the day.",
      "Raise the sun so the night world freezes hard.",
      "Press the sun up, then cross on the far side.",
    ],
    "interlude-ice-echo": [
      "Each shore answers to a different sun.",
      "Cross one half low, then raise the sun for the other.",
      "Sol crosses while the sun is low; Luna while it is high.",
    ],
    "beat-3-vine-fungi": [
      "The vine and the fungus never wake together.",
      "High sun grows the vine; low sun blooms the fungus.",
      "Send one across high, then the other low.",
    ],
    "beat-4-doors-choice": [
      "Light opens the door; you need not leap.",
      "Hold the sun high and the way simply opens.",
      "Raise the sun past the door's threshold and walk through.",
    ],
    "beat-5-balance-mote": [
      "The mote is solid only at the middle of the light.",
      "Hold the sun near the edge of its window — not the center.",
      "Lift the sun just out of the band, then cross both worlds.",
    ],
    "beat-6-drift-choice": [
      "The sun drifts on its own here. Push back against it.",
      "Hold the sun down to keep the night gate open.",
      "Keep pressing the sun down as you cross — do not release.",
    ],
    "beat-7-master-choice": [
      "The wall melts when the sun warms it.",
      "Raise the sun above the ice and the wall is gone.",
      "Hold the sun high, then walk the floor through.",
    ],
    "reunion-meridian": [
      "Stand on your marks. The sun will quiet when you do.",
      "Both of you must hold the marks at once.",
      "Reach the marks together and keep still while the sun stands.",
    ],
  },
  endings: {
    "one-sky": {
      title: "One Sky",
      closer: "Two became one light. And the sky forgot it was ever torn.",
    },
    vow: {
      title: "The Vow",
      closer: "Until the next longest day.",
    },
    afterglow: {
      title: "The Afterglow",
      closer: "Whole again. One short.",
    },
    "long-dark": {
      title: "The Long Dark",
      closer: "The line held. They did not cross.",
    },
  },
};
