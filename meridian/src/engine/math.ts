export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/**
 * 创建一个不可变二维向量
 *
 * @param x 横向坐标
 * @param y 纵向坐标
 * @returns 包含 x 与 y 的二维向量
 */
export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

/**
 * 将数值限制在指定闭区间内
 *
 * @param value 待限制的原始数值
 * @param min 允许的最小值
 * @param max 允许的最大值
 * @returns 落在 min 与 max 之间的数值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
