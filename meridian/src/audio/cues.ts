/**
 * 表现层音频帧与提示派生（presentation-only）
 *
 * 本模块把「最新输入快照 + JourneyState」折叠为一个轻量 `AudioFrame`：
 * 持续量（sun / status / ending）加一组短命的 `AudioCue`（边沿事件）。
 * 适配器持有上一帧快照做边沿检测，状态完全属于表现层。
 *
 * 边界（design.md §1 / project/directory-structure）：
 * - 只读模拟状态，绝不写回 journey / segment / consequence / ending / input。
 * - 仅 `main.ts` 引入本文件；engine / game / dev（尤其 dev/replay.ts）永不
 *   引入 src/audio/*，从而 determinism / replay 与音频彻底解耦。
 * - 仅 import type（无运行时依赖）：依赖箭头始终是 presentation → simulation。
 */

import type { InputSnapshot } from "../engine/input";
import type { JourneyState, JourneyStatus } from "../game/journey";
import type { SegmentState } from "../game/segment";
import type { ElementKind, ElementWorld } from "../game/element";
import type { EndingId } from "../game/ending";
import type { Sun01 } from "../game/sun";

/** 终章 fusion 的三个相位（hold → dissolve → complete） */
export type FusionPhase = "hold" | "dissolve" | "complete";

/**
 * 单个表现层音频事件（闭合联合，design.md §2）
 *
 * 全部为「本帧发生的边沿」；持续量不放进 cue，而是放在 `AudioFrame` 顶层。
 */
export type AudioCue =
  | { readonly kind: "jump" }
  | { readonly kind: "sun"; readonly direction: -1 | 1; readonly pressure: number }
  | {
      readonly kind: "element";
      readonly elementKind: ElementKind;
      readonly world: ElementWorld;
      readonly active: boolean;
    }
  | { readonly kind: "choice-cost" }
  | { readonly kind: "fusion"; readonly phase: FusionPhase }
  | { readonly kind: "ending"; readonly ending: EndingId };

/**
 * 单帧音频契约：持续量 + 本帧 cue 列表
 *
 * - `sun` 驱动低通/混响（连续）
 * - `status` / `ending` 供音频引擎做终态解析（一次性）
 * - `cues` 为本帧检测到的边沿事件，通常为 0–2 个
 */
export interface AudioFrame {
  readonly sun: Sun01;
  readonly status: JourneyStatus;
  readonly ending: EndingId | undefined;
  readonly cues: readonly AudioCue[];
}

/** 表现层 cue 适配器：把当前帧折叠为 `AudioFrame` 并维护上一帧快照 */
export interface CueAdapter {
  derive(journey: JourneyState, input: InputSnapshot): AudioFrame;
}

/** 终章 fusion 相位（含 "none" 表示尚未进入）的内部判定结果 */
type FusionBand = "none" | FusionPhase;

/** 持续同向推 dial 多少帧后 sun pressure 达到 1（按 render 帧计，约 0.5s @60fps） */
const SUN_PRESSURE_RAMP = 30;

/**
 * 由 segment 运行时状态判定当前 fusion 相位（render-free 的纯读取）
 *
 * 仅终章段携带 `finale`；非终章段恒为 "none"。相位边界取自原始帧计数器，
 * 比 `finaleFusionProgress` 的单一数值更能精确区分 hold / dissolve。
 *
 * @param active 当前活动 segment 状态
 * @returns "none" | "hold" | "dissolve" | "complete"
 */
function fusionBand(active: SegmentState): FusionBand {
  const finale = active.data.finale;
  if (finale === undefined) {
    return "none";
  }
  if (active.status === "won") {
    return "complete";
  }
  if (active.finaleHoldFrames >= finale.holdFrames) {
    return "dissolve";
  }
  if (active.finaleHoldFrames > 0) {
    return "hold";
  }
  return "none";
}

/**
 * 创建表现层 cue 适配器
 *
 * 内部持有上一帧快照：jump、sunDelta 符号与持续帧数、segment id、各元素的
 * solid 签名、consequence 的 shortcut 计数、fusion 相位、是否已触发结局。
 * 当 segment id 改变或整段 journey 重开（consequence 归零）时复位相关基线，
 * 避免跨段/重开时误触发 cue。
 *
 * @returns CueAdapter（仅暴露 derive）
 */
export function createCueAdapter(): CueAdapter {
  let prevJump = false;
  let sunDir: -1 | 0 | 1 = 0;
  let sunHeldFrames = 0;
  let prevSegmentId: string | null = null;
  let prevSolid: boolean[] = [];
  let prevShortcuts = 0;
  let prevFusion: FusionBand = "none";
  let endingFired = false;

  /**
   * 重建与 segment 强绑定的快照基线（元素 solid 签名 + fusion 相位）
   *
   * @param active 当前活动 segment 状态
   * @returns 无返回值
   */
  function rebindSegment(active: SegmentState): void {
    prevSegmentId = active.data.id;
    prevSolid = active.elements.map((e) => e.solidAt(active.sun.value));
    prevFusion = fusionBand(active);
  }

  function derive(journey: JourneyState, input: InputSnapshot): AudioFrame {
    const seg = journey.active;
    const s = seg.sun.value;
    const cues: AudioCue[] = [];

    // segment 切换 / journey 重开回首段：重建元素与 fusion 基线（不发 cue）
    if (prevSegmentId !== seg.data.id) {
      rebindSegment(seg);
    }
    // consequence 在整段重开时归零：shortcut 计数回落则只回填基线（不发 cue）
    if (journey.consequence.shortcutsTaken < prevShortcuts) {
      prevShortcuts = journey.consequence.shortcutsTaken;
    }

    // --- jump：输入按下边沿 ---
    if (input.jump && !prevJump) {
      cues.push({ kind: "jump" });
    }
    prevJump = input.jump;

    // --- sun：方向敏感的「压力」。单帧至多一个；音频引擎当作连续控制信号。 ---
    const dir = input.sunDelta;
    if (dir === 0) {
      sunHeldFrames = 0;
      sunDir = 0;
    } else {
      if (dir !== sunDir) {
        sunHeldFrames = 0;
        sunDir = dir;
      }
      sunHeldFrames += 1;
      const pressure = Math.min(sunHeldFrames / SUN_PRESSURE_RAMP, 1);
      cues.push({ kind: "sun", direction: dir, pressure });
    }

    // --- 元素：仅在 solid（active）翻转的跨越帧触发 ---
    const elements = seg.elements;
    for (let i = 0; i < elements.length; i += 1) {
      const el = elements[i];
      if (el === undefined) {
        continue;
      }
      const isActive = el.solidAt(s);
      if (isActive !== prevSolid[i]) {
        cues.push({ kind: "element", elementKind: el.kind, world: el.world, active: isActive });
        prevSolid[i] = isActive;
      }
    }

    // --- choice cost：shortcutsTaken 自增即一次扣光（唯一花费光的事件） ---
    if (journey.consequence.shortcutsTaken > prevShortcuts) {
      cues.push({ kind: "choice-cost" });
      prevShortcuts = journey.consequence.shortcutsTaken;
    }

    // --- finale fusion：相位跃迁时各触发一次 ---
    const band = fusionBand(seg);
    if (band !== prevFusion) {
      if (band !== "none") {
        cues.push({ kind: "fusion", phase: band });
      }
      prevFusion = band;
    }

    // --- ending：进入终态仅触发一次；离开终态（重开）后复位标志 ---
    if (journey.status === "ending" && journey.resolvedEnding !== undefined) {
      if (!endingFired) {
        cues.push({ kind: "ending", ending: journey.resolvedEnding });
        endingFired = true;
      }
    } else {
      endingFired = false;
    }

    return {
      sun: s,
      status: journey.status,
      ending: journey.resolvedEnding,
      cues,
    };
  }

  return { derive };
}
