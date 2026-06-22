import type { Element, ElementPlacement, ElementVisual } from "../element";
import type { Sun01 } from "../sun";

const MELT_THRESHOLD: Sun01 = 0.5;
const SOLID: ElementVisual = { alpha: 1 };
const MELTED: ElementVisual = { alpha: 0 };

export function createIceElement(placement: ElementPlacement): Element {
  const { world, box } = placement;
  const isSolid = (s: Sun01): boolean =>
    world === "day" ? s < MELT_THRESHOLD : s > MELT_THRESHOLD;
  return {
    kind: "ice",
    world,
    box,
    solidAt: isSolid,
    visualAt: (s: Sun01): ElementVisual => (isSolid(s) ? SOLID : MELTED),
  };
}
