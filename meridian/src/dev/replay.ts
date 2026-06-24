/**
 * 回放解题验证器（仅模拟层）
 *
 * 目的：把每个 segment 的 `solutionPaths` 用与 gameplay 完全相同的固定步长
 * 更新路径回放一遍，确认确实能让 Sol 与 Luna 都抵达出口、且不会触发非预期
 * 重置或超时。
 *
 * 约束：本模块只允许 import 模拟层（`engine/` + `game/`）与数据层（`data/`），
 * 严禁引入 `render/` / `audio/` / `ui/`，以保证 CI 中可以无渲染器运行。
 */

import type { InputSnapshot } from "../engine/input";
import { DT } from "../engine/loop";
import {
  createSegment,
  updateSegment,
  type SegmentData,
  type SegmentState,
  type SolutionInput,
  type SolutionPath,
} from "../game/segment";
import {
  createConsequence,
  recordWhole,
  spendShortcut,
  type Consequence,
} from "../game/consequence";
import { ALL_ENDING_IDS, resolveEnding, type EndingId } from "../game/ending";

/** 回放停止原因 */
export type ReplayStopReason = "won" | "timeout" | "reset" | "missing-path";

/** 单条解法路径的回放结果 */
export interface ReplayResult {
  /** 被回放的 segment id */
  readonly segmentId: string;
  /** 被回放的解法路径 id */
  readonly pathId: string;
  /** 该路径声明的分支（main / whole / shortcut；未声明为 undefined） */
  readonly branch: SolutionPath["branch"];
  /** 是否最终取得胜利（两位 avatar 都抵达出口 / 终章融合完成） */
  readonly reachedExit: boolean;
  /** 回放过程中由死亡触发的重置次数（>0 即视为异常） */
  readonly resetCount: number;
  /** 实际跑过的固定步数 */
  readonly framesRun: number;
  /** 回放结束时是否踩到了该段 choicePoint 的 shortcut zone */
  readonly shortcutTriggered: boolean;
  /** 停止原因 */
  readonly reason: ReplayStopReason;
}

/**
 * 将一段紧凑的 `SolutionInput` 扩展为完整的 `InputSnapshot`
 *
 * @param input 设计者记录的紧凑输入（仅含 moveX / jump / sunDelta）
 * @returns 回放器可送入 `updateSegment` 的完整输入快照（restart / pause 恒为 false）
 */
function toInputSnapshot(input: SolutionInput): InputSnapshot {
  return {
    moveX: input.moveX,
    jump: input.jump,
    sunDelta: input.sunDelta,
    restart: false,
    pause: false,
  };
}

/**
 * 将一条 `SolutionPath` 的紧凑步骤序列展开为固定步长输入快照数组
 *
 * @param path 待展开的解法路径
 * @returns 长度等于所有步骤帧数之和的输入快照数组
 */
function expandPath(path: SolutionPath): InputSnapshot[] {
  const snapshots: InputSnapshot[] = [];
  for (const step of path.steps) {
    const snapshot = toInputSnapshot(step.input);
    for (let i = 0; i < step.frames; i += 1) {
      snapshots.push(snapshot);
    }
  }
  return snapshots;
}

/**
 * 判定一帧更新是否触发了死亡重置
 *
 * `updateSegment` 内部在任一 avatar 死亡时调用 `resetSegment`，会把两位 avatar
 * 同时拉回起点。我们以“两位 avatar 的中心位置都回到了起点”作为信号——正常
 * 物理积分不可能在一帧内把二者同时送回起点，因此该信号可靠。
 *
 * @param state 当前 segment 状态
 * @returns 当帧是否触发了重置
 */
function isResetFrame(state: SegmentState): boolean {
  const solBack =
    state.player.sol.pos.x === state.data.starts.sol.x &&
    state.player.sol.pos.y === state.data.starts.sol.y;
  const lunaBack =
    state.player.luna.pos.x === state.data.starts.luna.x &&
    state.player.luna.pos.y === state.data.starts.luna.y;
  return solBack && lunaBack;
}

/**
 * 在调用 `updateSegment` 之前缓存 avatar 位置，用于事后判断是否回到起点
 *
 * @param state 当前 segment 状态
 * @returns 包含 Sol / Luna 当前中心位置的快照
 */
function snapshotPositions(state: SegmentState): {
  solX: number;
  solY: number;
  lunaX: number;
  lunaY: number;
} {
  return {
    solX: state.player.sol.pos.x,
    solY: state.player.sol.pos.y,
    lunaX: state.player.luna.pos.x,
    lunaY: state.player.luna.pos.y,
  };
}

/**
 * 回放单条解法路径并报告结果
 *
 * @param data segment 静态数据
 * @param path 待回放的解法路径
 * @returns 包含胜利状态、重置次数、实际帧数与停止原因的结果对象
 */
export function replayPath(data: SegmentData, path: SolutionPath): ReplayResult {
  const state: SegmentState = createSegment(data);
  const inputs = expandPath(path);
  const maxFrames = Math.min(path.maxFrames, inputs.length);

  let resetCount = 0;
  let framesRun = 0;
  let reason: ReplayStopReason = "timeout";

  for (let i = 0; i < maxFrames; i += 1) {
    const input = inputs[i];
    if (input === undefined) {
      // 理论上不可达：maxFrames 已被钳制为 inputs.length
      break;
    }
    const before = snapshotPositions(state);
    updateSegment(state, input, DT);
    framesRun += 1;

    // 正常情况下两位 avatar 不可能同时回到起点；若发生即视为死亡触发重置。
    if (isResetFrame(state) && (before.solX !== state.data.starts.sol.x || before.lunaX !== state.data.starts.luna.x)) {
      resetCount += 1;
      reason = "reset";
      break;
    }

    if (state.status === "won") {
      reason = "won";
      break;
    }
  }

  return {
    segmentId: data.id,
    pathId: path.id,
    branch: path.branch,
    reachedExit: state.status === "won" && state.solReached && state.lunaReached,
    resetCount,
    framesRun,
    shortcutTriggered: state.shortcutTriggered,
    reason,
  };
}

/**
 * 对所有 segment 的所有解法路径批量回放
 *
 * @param segments 待校验的 segment 数据列表
 * @returns 每条路径的回放结果；缺路径的 segment 会以 "missing-path" 标记失败
 */
export function runReplaySuite(segments: readonly SegmentData[]): ReplayResult[] {
  const results: ReplayResult[] = [];

  for (const segment of segments) {
    if (segment.solutionPaths.length === 0) {
      results.push({
        segmentId: segment.id,
        pathId: "<missing>",
        branch: undefined,
        reachedExit: false,
        resetCount: 0,
        framesRun: 0,
        shortcutTriggered: false,
        reason: "missing-path",
      });
      continue;
    }

    for (const path of segment.solutionPaths) {
      results.push(replayPath(segment, path));
    }
  }

  return results;
}

/**
 * 将回放结果汇总为可读字符串，便于在 CI 中输出
 *
 * @param results 回放结果列表
 * @returns 多行汇总文本
 */
export function summarizeReplay(results: readonly ReplayResult[]): string {
  return results
    .map((r) => {
      return `${r.segmentId}/${r.pathId}: reason=${r.reason} reachedExit=${r.reachedExit} resets=${r.resetCount} frames=${r.framesRun} branch=${r.branch ?? "-"} shortcut=${r.shortcutTriggered}`;
    })
    .join("\n");
}

/**
 * 校验所有 choicePoint 段的分支覆盖与代价行为（design.md §10）
 *
 * 对每个携带 choicePoint 的 segment 断言：
 * - 至少各有一条 branch === "whole" 与 branch === "shortcut" 的解法路径
 * - 回放 shortcut 路径必须踩到 zone（shortcutTriggered === true）
 * - 回放 whole 路径必须不踩 zone（shortcutTriggered === false）
 * 后两条等价于「shortcut 路线确实施加了 cost、whole 路线未施加任何 cost」，
 * 因为扣光在 journey 中是「踩到 zone 才发生」的确定性结果。
 *
 * @param segments 待校验的 segment 数据列表
 * @returns 违规描述列表；为空表示全部通过
 */
export function checkBranchCoverage(segments: readonly SegmentData[]): string[] {
  const problems: string[] = [];

  for (const segment of segments) {
    const cp = segment.choicePoint;
    if (cp === undefined) {
      continue;
    }
    const wholePaths = segment.solutionPaths.filter((p) => p.branch === "whole");
    const shortcutPaths = segment.solutionPaths.filter((p) => p.branch === "shortcut");

    if (wholePaths.length === 0) {
      problems.push(`${segment.id}: missing "whole" branch path`);
    }
    if (shortcutPaths.length === 0) {
      problems.push(`${segment.id}: missing "shortcut" branch path`);
    }

    for (const path of wholePaths) {
      const result = replayPath(segment, path);
      if (result.shortcutTriggered) {
        problems.push(`${segment.id}/${path.id}: whole path unexpectedly triggered shortcut zone`);
      }
    }
    for (const path of shortcutPaths) {
      const result = replayPath(segment, path);
      if (!result.shortcutTriggered) {
        problems.push(`${segment.id}/${path.id}: shortcut path did not trigger shortcut zone`);
      }
    }
  }

  return problems;
}

/** ending 可达性枚举报告 */
export interface EndingReachabilityReport {
  /** 由 authored 选择组合实际可达的结局 id（有序去重） */
  readonly observed: readonly EndingId[];
  /** 四种结局中尚未被任何组合命中的 id */
  readonly missing: readonly EndingId[];
}

/**
 * 枚举 authored choicePoint 的 whole/shortcut 组合，证明四种结局均可达（design.md §10）
 *
 * 对所有携带 choicePoint 的 segment 取 2^n 种 whole/shortcut 组合，从满光
 * consequence 出发应用各自的 cost（shortcut 走 spendShortcut，whole 走 recordWhole），
 * 再 resolveEnding；汇总命中的结局集合并与四种 ending id 比对。
 *
 * @param segments 待枚举的 segment 数据列表
 * @returns 可达结局与缺失结局报告
 */
export function endingReachabilityReport(segments: readonly SegmentData[]): EndingReachabilityReport {
  const choiceSegments = segments.filter((s) => s.choicePoint !== undefined);
  const observed = new Set<EndingId>();
  const combos = 1 << choiceSegments.length;

  for (let mask = 0; mask < combos; mask += 1) {
    let consequence: Consequence = createConsequence();
    for (let i = 0; i < choiceSegments.length; i += 1) {
      const cp = choiceSegments[i]?.choicePoint;
      if (cp === undefined) {
        continue;
      }
      const takeShortcut = (mask & (1 << i)) !== 0;
      consequence = takeShortcut
        ? spendShortcut(consequence, cp.id, cp.cost)
        : recordWhole(consequence, cp.id);
    }
    observed.add(resolveEnding(consequence));
  }

  const missing = ALL_ENDING_IDS.filter((id) => !observed.has(id));
  const orderedObserved = ALL_ENDING_IDS.filter((id) => observed.has(id));
  return { observed: orderedObserved, missing };
}
