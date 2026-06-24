import type { Consequence } from "./consequence";

/**
 * 闭合结局 id 集合（plan.md §3.5 / design.md §5）
 *
 * - one-sky：双核之光（近乎）全满且从未走过 shortcut —— 最难得的圆满
 * - vow：付出部分光但双方仍均衡 —— 苦乐参半（最常见）
 * - afterglow：消费偏侧 / 某一核濒临熄灭 —— 不均的遗憾
 * - long-dark：双核之光几近耗尽 —— 挥霍后的黯淡
 *
 * 用闭合联合让 resolveEnding 的 switch / 表现层映射可被穷尽检查。
 */
export type EndingId = "one-sky" | "vow" | "afterglow" | "long-dark";

/**
 * 结局判定阈值（design.md §5）
 *
 * 集中存放于本模块并由 replay 的 ending 可达性检查校验；表现层只读取
 * resolveEnding 的结果，绝不重算这些规则。
 */
const NEAR_FULL = 0.85;
const NEAR_ZERO = 0.1;
const LOPSIDED_FLOOR = 0.25;
const LOPSIDED_GAP = 0.4;

/**
 * 由累积 consequence 纯函数式地解析唯一结局（design.md §5）
 *
 * 判定顺序（互斥、穷尽）：
 * 1. one-sky：双核 >= NEAR_FULL 且 shortcutsTaken === 0
 * 2. long-dark：双核 <= NEAR_ZERO
 * 3. afterglow：较低一核 <= LOPSIDED_FLOOR 或双核差距 >= LOPSIDED_GAP
 * 4. vow：其余（付出部分光但未濒临耗尽且较均衡）
 *
 * 纯函数：相同输入恒返回相同 id，可被回放可达性枚举覆盖四种结局。
 *
 * @param consequence 累积的 consequence 状态
 * @returns 唯一结局 id
 */
export function resolveEnding(consequence: Consequence): EndingId {
  const { solLight, lunaLight, shortcutsTaken } = consequence;

  if (solLight >= NEAR_FULL && lunaLight >= NEAR_FULL && shortcutsTaken === 0) {
    return "one-sky";
  }
  if (solLight <= NEAR_ZERO && lunaLight <= NEAR_ZERO) {
    return "long-dark";
  }
  const lowest = Math.min(solLight, lunaLight);
  const gap = Math.abs(solLight - lunaLight);
  if (lowest <= LOPSIDED_FLOOR || gap >= LOPSIDED_GAP) {
    return "afterglow";
  }
  return "vow";
}

/** 四种结局 id 的权威有序清单，供回放可达性检查穷尽比对 */
export const ALL_ENDING_IDS: readonly EndingId[] = ["one-sky", "vow", "afterglow", "long-dark"];
