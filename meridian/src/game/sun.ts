import type { InputSnapshot } from "../engine/input";
import { clamp } from "../engine/math";

export type Sun01 = number;

/**
 * 玩家通过 ↑/↓ 调整太阳的速率（s 单位/秒）
 *
 * 必须严格大于早期 drift fixture 的 drift rate，否则反向按键无法 hold/recover
 * （见 design.md §4）。当前 drift fixture 的 rate 上限远低于此值。
 */
const SUN_INPUT_RATE = 0.8;

/**
 * 太阳漂移剖面（back-third / drift zone 段使用）
 *
 * - direction：漂移方向，-1 朝向 night（s→0），+1 朝向 day（s→1）
 * - rate：漂移速率，s 单位/秒，必须非负
 *
 * 来源：design.md §4。`sun.ts` 仍是 `s` 的唯一 mutation/clamp 点。
 */
export interface DriftProfile {
  readonly direction: -1 | 1;
  readonly rate: number;
}

export interface Sun {
  readonly value: Sun01;
  apply(input: InputSnapshot, dt: number, drift?: DriftProfile): void;
  reset(to?: Sun01): void;
}

/**
 * 校验 drift profile 是否合法
 *
 * 合约（design.md §4）：rate 必须 >= 0；direction 只能是 -1 / +1（由类型保证）。
 * 非法数据立即抛错，使回放/构建在数据接入点暴露。
 *
 * @param drift 待校验的漂移剖面
 * @returns 无返回值；rate 为负时抛错
 */
function assertValidDrift(drift: DriftProfile): void {
  if (!(drift.rate >= 0)) {
    throw new Error(
      `drift rate must be non-negative, got rate=${drift.rate} direction=${drift.direction}`,
    );
  }
}

/**
 * 创建太阳值拥有者
 *
 * `s` 的唯一 mutation/clamp 点。无 drift 时行为与 M2 holding dial 完全一致；
 * 有 drift 时按 design.md §4 的公式叠加漂移项，玩家输入仍可反向 counter。
 *
 * @param initial 初始 s 值，默认 0.5；由 segment 的 initialSun 提供
 * @returns Sun 实例（含 value / apply / reset）
 */
export function createSun(initial: Sun01 = 0.5): Sun {
  const initialClamped = clamp(initial, 0, 1);
  let value = initialClamped;
  return {
    get value() {
      return value;
    },
    apply(input, dt, drift) {
      // 无 drift 时 driftDelta = 0，公式退化为 M2 holding dial（design.md §4）
      let driftDelta = 0;
      if (drift !== undefined) {
        assertValidDrift(drift);
        driftDelta = drift.direction * drift.rate;
      }
      value = clamp(
        value + (input.sunDelta * SUN_INPUT_RATE + driftDelta) * dt,
        0,
        1,
      );
    },
    reset(to: Sun01 = initialClamped) {
      value = clamp(to, 0, 1);
    },
  };
}
