import type { InputSnapshot } from "../engine/input";
import { clamp } from "../engine/math";

export type Sun01 = number;

const SUN_RATE = 0.8;

export interface Sun {
  readonly value: Sun01;
  apply(input: InputSnapshot, dt: number): void;
  reset(to?: Sun01): void;
}

export function createSun(initial: Sun01 = 0.5): Sun {
  let value = clamp(initial, 0, 1);
  return {
    get value() {
      return value;
    },
    apply(input, dt) {
      value = clamp(value + input.sunDelta * SUN_RATE * dt, 0, 1);
    },
    reset(to: Sun01 = initial) {
      value = clamp(to, 0, 1);
    },
  };
}
