import type { AABB } from "../engine/math";
import type { Sun01 } from "./sun";
import { createIceElement } from "./elements/ice";
import { createVineElement } from "./elements/vine";
import { createDoorElement } from "./elements/door";
import { createMoteElement } from "./elements/mote";

/**
 * MVP 元素词表（plan.md §4 + design.md §2）
 *
 * 闭合判别联合：新增 variant 时编译器会强制 `createElement` 的 switch 补齐。
 */
export type ElementKind = "ice" | "vine" | "door" | "mote";
export type ElementWorld = "day" | "night";

/**
 * 渲染层只读的视觉描述
 *
 * 仅用于表现层；gameplay 不得读取此结构的字段。
 */
export interface ElementVisual {
  readonly alpha: number;
}

export interface Element {
  readonly kind: ElementKind;
  readonly world: ElementWorld;
  readonly box: AABB;
  solidAt(s: Sun01): boolean;
  visualAt(s: Sun01): ElementVisual;
}

/**
 * 平衡光尘（mote）使用的太阳带
 *
 * - min / max 均落在 [0, 1] 且 min <= max
 * - 非 mote 元素忽略 `band`
 */
export interface SunBand {
  readonly min: Sun01;
  readonly max: Sun01;
}

export interface ElementPlacement {
  readonly kind: ElementKind;
  readonly world: ElementWorld;
  readonly box: AABB;
  /**
   * 可选太阳带
   *
   * mote 必须提供有效 band；其余 kind 会忽略此字段。
   */
  readonly band?: SunBand;
}

/**
 * 工厂：根据 placement 创建对应的元素运行时
 *
 * switch 穷尽所有 ElementKind；新增 kind 时 tsc 会强制补齐分支。
 *
 * @param placement 元素静态配置（含 kind/world/box，mote 还需 band）
 * @returns 对应的 Element 运行时实例
 */
export function createElement(placement: ElementPlacement): Element {
  switch (placement.kind) {
    case "ice":
      return createIceElement(placement);
    case "vine":
      return createVineElement(placement);
    case "door":
      return createDoorElement(placement);
    case "mote":
      return createMoteElement(placement);
  }
}
