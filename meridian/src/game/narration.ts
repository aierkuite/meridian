import { STORY, type EndingText } from "../data/story";
import {
  consequenceBand,
  type ChoicePointId,
  type Consequence,
} from "./consequence";
import type { EndingId } from "./ending";

/**
 * graduated hint 阶梯的触发帧阈值（DT = 1/120，故 120 帧 ≈ 1s）
 *
 * 由「本段已推进帧数」（SegmentState.frameInSegment）确定性驱动：
 * - < 第 0 阈值：不出 hint
 * - 跨过越多阈值，给出越靠后（越具体）的提示
 *
 * 取约 7s / 12s / 18s，作为真正卡关时的人性化兜底，绝不等同跳关。
 */
const HINT_THRESHOLDS: readonly number[] = [840, 1440, 2160];

/**
 * 选取某 segment 的 beat / 开场行（design.md §8）
 *
 * 优先返回开场白（仅 prologue 等少数段有），否则返回 beat 行；都没有则 undefined。
 *
 * @param segmentId 当前 segment id
 * @returns 该段的叙事行；无词条时为 undefined
 */
export function beatLineFor(segmentId: string): string | undefined {
  return STORY.openings[segmentId] ?? STORY.beats[segmentId];
}

/**
 * 选取与当前 consequence 情绪 band 匹配的自适应行（design.md §8）
 *
 * @param consequence 累积 consequence
 * @returns 对应 band 的自适应叙事行
 */
export function adaptiveLineFor(consequence: Consequence): string {
  return STORY.adaptive[consequenceBand(consequence)];
}

/**
 * 选取某选择点的提示行（转第二人称，落下代价）
 *
 * @param id 选择点 id
 * @returns 该选择点的提示行
 */
export function choicePromptFor(id: ChoicePointId): string {
  return STORY.choicePrompts[id];
}

/**
 * 依据本段已推进帧数选取 graduated hint（design.md §8）
 *
 * 纯函数、确定性：仅读 segment id 与帧计数器，不改变任何 gameplay 状态。
 * 帧数尚未跨过第 0 阈值，或该段无 hint 阶梯时返回 undefined。
 *
 * @param segmentId 当前 segment id
 * @param frameInSegment 本段已推进的固定帧数（SegmentState.frameInSegment）
 * @returns 当前应展示的 hint 行；不应展示时为 undefined
 */
export function hintLineFor(segmentId: string, frameInSegment: number): string | undefined {
  const ladder = STORY.hints[segmentId];
  if (ladder === undefined || ladder.length === 0) {
    return undefined;
  }
  let reached = -1;
  for (let i = 0; i < HINT_THRESHOLDS.length; i += 1) {
    const threshold = HINT_THRESHOLDS[i];
    if (threshold !== undefined && frameInSegment >= threshold) {
      reached = i;
    }
  }
  if (reached < 0) {
    return undefined;
  }
  const capped = Math.min(reached, ladder.length - 1);
  return ladder[capped];
}

/**
 * 选取某结局的标题与收束句
 *
 * @param id 结局 id
 * @returns 该结局的标题与收束文本
 */
export function endingTextFor(id: EndingId): EndingText {
  return STORY.endings[id];
}
