import type { Element, ElementPlacement, ElementVisual } from "../element";
import type { Sun01 } from "../sun";

/**
 * vine / fungi 的太阳阈值
 *
 * - day vine 在 s >= VINE_DAY_SOLID 时生长为实体平台
 * - night fungi 在 s <= VINE_NIGHT_SOLID 时显形为实体平台
 *
 * 来源：design.md §3。
 */
const VINE_DAY_SOLID: Sun01 = 0.65;
const VINE_NIGHT_SOLID: Sun01 = 0.35;

const SOLID: ElementVisual = { alpha: 1 };
const HIDDEN: ElementVisual = { alpha: 0 };

/**
 * 创建 vine / fungi 平台元素
 *
 * 行为（design.md §3）：
 * - day: solid iff s >= 0.65（高温让藤蔓生长）
 * - night: solid iff s <= 0.35（低温让真菌显形）
 *
 * M3 不引入爬梯物理，仅作为 AABB 平台参与碰撞。
 *
 * @param placement 元素静态配置
 * @returns vine 元素运行时
 */
export function createVineElement(placement: ElementPlacement): Element {
  const { world, box } = placement;
  const isSolid = (s: Sun01): boolean =>
    world === "day" ? s >= VINE_DAY_SOLID : s <= VINE_NIGHT_SOLID;
  return {
    kind: "vine",
    world,
    box,
    solidAt: isSolid,
    visualAt: (s: Sun01): ElementVisual => (isSolid(s) ? SOLID : HIDDEN),
  };
}
