import type { Element, ElementPlacement, ElementVisual } from "../element";
import type { Sun01 } from "../sun";

/**
 * door / gate 的开闭阈值
 *
 * - day light-door 在 s >= DOOR_DAY_OPEN 时打开（开启前为实体屏障）
 * - night dark-gate 在 s <= DOOR_NIGHT_OPEN 时打开（开启前为实体屏障）
 *
 * 来源：design.md §3。
 */
const DOOR_DAY_OPEN: Sun01 = 0.7;
const DOOR_NIGHT_OPEN: Sun01 = 0.3;

const CLOSED: ElementVisual = { alpha: 0.55 };
const OPEN: ElementVisual = { alpha: 0 };

/**
 * 创建 light-door / dark-gate 屏障元素
 *
 * 行为（design.md §3）：
 * - day: closed（solid） iff s < 0.7
 * - night: closed（solid） iff s > 0.3
 *
 * @param placement 元素静态配置
 * @returns door 元素运行时
 */
export function createDoorElement(placement: ElementPlacement): Element {
  const { world, box } = placement;
  const isClosed = (s: Sun01): boolean =>
    world === "day" ? s < DOOR_DAY_OPEN : s > DOOR_NIGHT_OPEN;
  return {
    kind: "door",
    world,
    box,
    solidAt: isClosed,
    visualAt: (s: Sun01): ElementVisual => (isClosed(s) ? CLOSED : OPEN),
  };
}
