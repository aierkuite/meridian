import { clamp } from "../engine/math";

/**
 * 选择点闭合 id 集合（design.md §3）
 *
 * - doors-cost：Beat 4，消耗 Sol 之光
 * - drift-cost：Beat 6，消耗 Luna 之光
 * - master-cost：Beat 7，同时消耗双方之光
 *
 * 用闭合联合替代裸 string，使消费/叙事的 switch 可被编译器穷尽检查。
 */
export type ChoicePointId = "doors-cost" | "drift-cost" | "master-cost";

/**
 * 单个选择点最终走的路线
 *
 * - whole：whole-hearted 的完整解法，不付出光的代价
 * - shortcut：cruel shortcut，付出一段光（dims a core）
 */
export type ChoiceRoute = "whole" | "shortcut";

/**
 * 一次 shortcut 触发要扣除的光代价（design.md §3）
 *
 * sol / luna 均为 [0,1] 区间内要扣除的份额；最终结果在本模块统一 clamp。
 */
export interface LightCost {
  readonly sol: number;
  readonly luna: number;
}

/**
 * consequence 的粗粒度情绪 band（design.md §8，叙事自适应键）
 *
 * - whole：从未走过 shortcut
 * - spent：走过 shortcut 但双方仍较均衡、未濒临耗尽
 * - lopsided：消费偏向一侧 / 某一核濒临熄灭 / 双方差距过大
 * - dark：双方之光几乎耗尽
 */
export type ConsequenceBand = "whole" | "spent" | "lopsided" | "dark";

/**
 * 轻量、可序列化的 consequence 状态（design.md §4）
 *
 * 仅由 choice-point 的 shortcut 触发写入；incidental death / reset / 正常通关
 * 都不得花费光。choices 记录每个选择点最终路线，供回放分支断言与叙事选择使用。
 */
export interface Consequence {
  readonly solLight: number;
  readonly lunaLight: number;
  readonly shortcutsTaken: number;
  readonly choices: Readonly<Record<ChoicePointId, ChoiceRoute | "unresolved">>;
}

/** 双核满光、零 shortcut 的全新 consequence（每段 journey 起点） */
const FULL_LIGHT = 1;

/**
 * 创建初始 consequence
 *
 * 两核满光、未走过任何 shortcut、三个选择点均 "unresolved"。
 *
 * @returns 全新的满光 consequence
 */
export function createConsequence(): Consequence {
  return {
    solLight: FULL_LIGHT,
    lunaLight: FULL_LIGHT,
    shortcutsTaken: 0,
    choices: {
      "doors-cost": "unresolved",
      "drift-cost": "unresolved",
      "master-cost": "unresolved",
    },
  };
}

/**
 * 查询某选择点是否已被记录（whole 或 shortcut）
 *
 * @param consequence 当前 consequence
 * @param id 选择点 id
 * @returns 已记录返回 true；仍为 "unresolved" 返回 false
 */
export function isResolved(consequence: Consequence, id: ChoicePointId): boolean {
  return consequence.choices[id] !== "unresolved";
}

/**
 * 记录一次 shortcut 触发并扣除对应光代价（唯一会花费光的入口）
 *
 * 幂等：若该选择点已记录则原样返回，保证「每个 choice id 只消费一次」。
 * 光值在此统一 clamp 到 [0,1]，不散落到 render / ending 逻辑。
 *
 * @param consequence 当前 consequence
 * @param id 触发的选择点 id
 * @param cost 该 shortcut 的光代价
 * @returns 扣光并标记后的新 consequence；已记录时返回原对象
 */
export function spendShortcut(
  consequence: Consequence,
  id: ChoicePointId,
  cost: LightCost,
): Consequence {
  if (isResolved(consequence, id)) {
    return consequence;
  }
  return {
    solLight: clamp(consequence.solLight - cost.sol, 0, 1),
    lunaLight: clamp(consequence.lunaLight - cost.luna, 0, 1),
    shortcutsTaken: consequence.shortcutsTaken + 1,
    choices: { ...consequence.choices, [id]: "shortcut" },
  };
}

/**
 * 记录一次 whole 路线（不花费光）
 *
 * 仅在某选择点 segment 通关且从未触发其 shortcut zone 时调用，用于回放分支
 * 断言与叙事；不改动任何光值，因此不违反「只有 shortcut 触发才花费光」。
 * 幂等：已记录则原样返回。
 *
 * @param consequence 当前 consequence
 * @param id 通关的选择点 id
 * @returns 标记该选择点为 whole 的新 consequence；已记录时返回原对象
 */
export function recordWhole(consequence: Consequence, id: ChoicePointId): Consequence {
  if (isResolved(consequence, id)) {
    return consequence;
  }
  return {
    ...consequence,
    choices: { ...consequence.choices, [id]: "whole" },
  };
}

/**
 * band 判定阈值
 *
 * 与 ending.ts 的阈值刻意分离：band 只服务叙事粗分类，ending 才是权威结局判定。
 * 取值与 ending 同向以避免叙事与结局相互矛盾。
 */
const DARK_LIGHT = 0.1;
const LOPSIDED_FLOOR = 0.25;
const LOPSIDED_GAP = 0.4;

/**
 * 把 consequence 折叠为粗粒度情绪 band（design.md §8）
 *
 * 阈值与 ending 解析保持同向语义（lopsided / dark），但只用于叙事选词，
 * 不参与 ending 判定本身。
 *
 * @param consequence 当前 consequence
 * @returns 对应的情绪 band
 */
export function consequenceBand(consequence: Consequence): ConsequenceBand {
  if (consequence.shortcutsTaken === 0) {
    return "whole";
  }
  if (consequence.solLight <= DARK_LIGHT && consequence.lunaLight <= DARK_LIGHT) {
    return "dark";
  }
  const lowest = Math.min(consequence.solLight, consequence.lunaLight);
  const gap = Math.abs(consequence.solLight - consequence.lunaLight);
  if (lowest <= LOPSIDED_FLOOR || gap >= LOPSIDED_GAP) {
    return "lopsided";
  }
  return "spent";
}
