import type { Element, ElementPlacement, ElementVisual, SunBand } from "../element";
import type { Sun01 } from "../sun";

const SOLID: ElementVisual = { alpha: 1 };
const OUT_OF_BAND: ElementVisual = { alpha: 0 };

/**
 * 校验 mote 的太阳带是否合法
 *
 * 合约（design.md §2 + R4）：min/max 必须落在 [0,1] 且 min <= max。
 * 否则立即抛错，让回放/构建在数据接入点暴露非法配置。
 *
 * @param band 待校验的太阳带
 * @returns 无返回值；非法时抛错
 */
function assertValidBand(band: SunBand | undefined): asserts band is SunBand {
  if (band === undefined) {
    throw new Error('mote element requires a "band"');
  }
  const { min, max } = band;
  if (!(min >= 0 && min <= 1 && max >= 0 && max <= 1) || !(min <= max)) {
    throw new Error(
      `mote band invalid: expected 0<=min<=max<=1, got min=${min} max=${max}`,
    );
  }
}

/**
 * 创建 balance mote 平台元素
 *
 * 行为（design.md §3）：solid iff `band.min <= s && s <= band.max`；
 * 两个世界共用同一规则。
 *
 * @param placement 元素静态配置（必须携带合法 `band`）
 * @returns mote 元素运行时
 */
export function createMoteElement(placement: ElementPlacement): Element {
  assertValidBand(placement.band);
  const band: SunBand = placement.band;
  const { world, box } = placement;
  const isSolid = (s: Sun01): boolean => s >= band.min && s <= band.max;
  return {
    kind: "mote",
    world,
    box,
    solidAt: isSolid,
    visualAt: (s: Sun01): ElementVisual => (isSolid(s) ? SOLID : OUT_OF_BAND),
  };
}
