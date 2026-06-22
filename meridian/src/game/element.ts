import type { AABB } from "../engine/math";
import type { Sun01 } from "./sun";
import { createIceElement } from "./elements/ice";

export type ElementKind = "ice";
export type ElementWorld = "day" | "night";

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

export interface ElementPlacement {
  readonly kind: ElementKind;
  readonly world: ElementWorld;
  readonly box: AABB;
}

export function createElement(placement: ElementPlacement): Element {
  switch (placement.kind) {
    case "ice":
      return createIceElement(placement);
  }
}
