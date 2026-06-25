/**
 * 池化大气粒子（presentation-only，design.md §2–§4 / spec render/particles.md）
 *
 * 三层纯装饰粒子，强化双世界氛围而不干扰 gameplay 可读性：
 * - 白昼尘埃（dust）：顶半（day）暖色微尘，高 s 时更明显。
 * - 夜间孢子（spore）：底半（night）冷色生物荧光，向倒置世界的「上」漂移，低 s 时更明显。
 * - 跨缝光点（mote）：HORIZON_Y 附近稀疏生成并穿越接缝，强化 meridian。
 *
 * 性能与边界（spec error-handling-and-perf / silhouette-glow-pipeline）：
 * - 每层为定容池：创建时一次性预分配所有 slot，update/draw 内绝不 new 对象、
 *   不增长数组、不每帧创建 canvas。死亡 slot 原地复用（respawn）。
 * - 辉光来自一次性预渲染的小尺寸精灵 + 加性合成（globalCompositeOperation =
 *   "lighter"），绝不使用 per-frame ctx.shadowBlur。
 * - 纯装饰：只读 sun / cameraX，绝不写回模拟。确定性守卫只扫描 engine/game，
 *   故此处允许 Math.random（粒子抖动）与 render-frame 固定步进。
 */

import { HORIZON_Y, WORLD_H, WORLD_W } from "../game/world";
import type { Sun01 } from "../game/sun";

/**
 * 装饰粒子的固定视觉步长（秒）
 *
 * render() 每个 RAF 帧调用一次 update，按 ~60fps 实时步进推进粒子。该步长独立于
 * 模拟固定步长（DT=1/120），且不进入 engine/game，故不影响回放/确定性
 * （design.md §4 选项 B：renderer 内部固定步进，无需从 main.ts 透传 dt）。
 */
export const PARTICLE_VISUAL_STEP = 1 / 60;

/** 加性辉光精灵的半径（px）；drawImage 时按 slot.size 缩放 */
const SPRITE_RADIUS = 16;
/** 跨缝 mote 离接缝多远即回收复用（px，单侧） */
const MOTE_REACH = 130;
/** 顶/底半的生成内缩（px），避免粒子贴边生成 */
const EDGE_MARGIN = 10;

type RGB = readonly [number, number, number];

/** 层可见度随 s 的剖面：白昼显著 / 夜显著 / 接缝平衡（s≈0.5 最盛） */
type VisProfile = "high-sun" | "low-sun" | "balanced";

/** 单个粒子 slot（预分配后原地复用，字段对应 design.md §2） */
interface ParticleSlot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 已存活秒数 */
  age: number;
  /** 总寿命秒数 */
  life: number;
  /** 绘制直径（px） */
  size: number;
  /** 基础峰值 alpha（再受层可见度与生灭淡入淡出调制） */
  alpha: number;
}

/** 单层静态配置（全部 readonly，创建时固定） */
interface LayerConfig {
  readonly cap: number;
  readonly color: RGB;
  readonly vis: VisProfile;
  /** 生成区域的世界 y 范围（mote 用 MOTE_REACH 而非此范围回收，字段仅作文档） */
  readonly yMin: number;
  readonly yMax: number;
  /** 水平漂移幅度（px/s，随机 ±） */
  readonly vxMag: number;
  /** 垂直漂移区间（px/s，带符号；mote 由 respawn 决定穿越方向） */
  readonly vyMin: number;
  readonly vyMax: number;
  readonly sizeMin: number;
  readonly sizeMax: number;
  readonly lifeMin: number;
  readonly lifeMax: number;
  readonly peakAlpha: number;
  /** 是否为跨缝层：在 HORIZON_Y 一侧生成并给一个穿越接缝的垂直速度 */
  readonly crossSeam: boolean;
}

/** 单层粒子接口：自更新 + 自绘制 */
interface ParticleLayer {
  update(step: number, sun: Sun01, cameraX: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

/** 粒子系统：聚合三层，按 day/night/horizon 分别暴露绘制以便渲染器自由分层 */
export interface ParticleSystem {
  update(step: number, sun: Sun01, cameraX: number): void;
  drawDay(ctx: CanvasRenderingContext2D): void;
  drawNight(ctx: CanvasRenderingContext2D): void;
  drawHorizon(ctx: CanvasRenderingContext2D): void;
}

/** [min,max) 均匀随机（装饰用途，render 层允许 Math.random） */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 由可见度剖面与 s 计算层级 alpha 乘子（[0,1]）
 *
 * @param profile 该层的可见度剖面
 * @param s 当前太阳值 [0,1]
 * @returns 层级整体 alpha 乘子
 */
function visibilityFor(profile: VisProfile, s: Sun01): number {
  switch (profile) {
    case "high-sun":
      return 0.2 + 0.8 * s;
    case "low-sun":
      return 0.2 + 0.8 * (1 - s);
    case "balanced":
      // s≈0.5（双世界均衡）时接缝最显著
      return 0.55 + 0.45 * (1 - Math.abs(2 * s - 1));
  }
}

/**
 * 生灭淡入淡出包络（避免粒子硬生硬灭的突兀闪烁）
 *
 * @param age 当前年龄（秒）
 * @param life 总寿命（秒）
 * @returns [0,1] 的 alpha 包络
 */
function fadeEnvelope(age: number, life: number): number {
  const t = age / life;
  if (t < 0.15) {
    return t / 0.15;
  }
  if (t > 0.75) {
    return (1 - t) / 0.25;
  }
  return 1;
}

/**
 * 一次性预渲染小尺寸径向辉光精灵（中心峰值→透明）
 *
 * 与 renderer.ts 的核心/元素辉光同一套「预渲染精灵 + 加性合成」纪律，杜绝
 * per-frame shadowBlur。每层仅创建一次。
 *
 * @param color 精灵基色
 * @returns 预渲染好的离屏 canvas
 */
function createGlowSprite(color: RGB): HTMLCanvasElement {
  const size = SPRITE_RADIUS * 2;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return c;
  }
  const [r, g, b] = color;
  const grad = ctx.createRadialGradient(SPRITE_RADIUS, SPRITE_RADIUS, 0, SPRITE_RADIUS, SPRITE_RADIUS, SPRITE_RADIUS);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/**
 * 创建单层粒子（定容池 + 预渲染辉光精灵）
 *
 * 池在此处一次性分配 cap 个 slot 并预热（随机年龄铺满初始场）；此后 update/draw
 * 仅原地读写、复用死亡 slot，绝无堆分配。
 *
 * @param config 该层静态配置
 * @returns ParticleLayer（update + draw）
 */
function createLayer(config: LayerConfig): ParticleLayer {
  const sprite = createGlowSprite(config.color);
  const slots: ParticleSlot[] = [];
  for (let i = 0; i < config.cap; i += 1) {
    slots.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, alpha: 0 });
  }
  // 当前帧的层级可见度乘子（update 写、draw 读），避免在 draw 内重复算
  let visMul = 1;

  /**
   * 把一个 slot 复位为全新粒子（死亡复用 / 预热共用）
   *
   * @param p 待复位的 slot
   * @param cameraX 当前相机 x，用于把粒子落进可视世界窗口
   * @returns 无返回值
   */
  function respawn(p: ParticleSlot, cameraX: number): void {
    p.age = 0;
    p.life = rand(config.lifeMin, config.lifeMax);
    p.size = rand(config.sizeMin, config.sizeMax);
    p.alpha = config.peakAlpha;
    p.x = cameraX + Math.random() * WORLD_W;
    p.vx = rand(-config.vxMag, config.vxMag);
    if (config.crossSeam) {
      // 跨缝 mote：在接缝一侧生成，速度指向并穿越接缝（dir=±1 决定首侧）
      const dir = Math.random() < 0.5 ? -1 : 1;
      p.y = HORIZON_Y + dir * rand(20, MOTE_REACH);
      p.vy = -dir * rand(config.vyMin, config.vyMax);
    } else {
      p.y = rand(config.yMin, config.yMax);
      p.vy = rand(config.vyMin, config.vyMax);
    }
  }

  /**
   * 判定 slot 是否应回收（寿命耗尽或离开本层有效区域）
   *
   * @param p 待判定的 slot
   * @returns 是否回收
   */
  function isDead(p: ParticleSlot): boolean {
    if (p.age >= p.life) {
      return true;
    }
    if (config.crossSeam) {
      return Math.abs(p.y - HORIZON_Y) > MOTE_REACH;
    }
    return p.y < config.yMin || p.y > config.yMax;
  }

  // 预热：随机年龄铺满初始场并按速度推进，使首帧即有错峰分布而非「同时新生」
  for (let i = 0; i < slots.length; i += 1) {
    const p = slots[i];
    if (p === undefined) {
      continue;
    }
    respawn(p, 0);
    p.age = Math.random() * p.life;
    p.x += p.vx * p.age;
    p.y += p.vy * p.age;
    if (p.x < 0) {
      p.x += WORLD_W;
    } else if (p.x > WORLD_W) {
      p.x -= WORLD_W;
    }
  }

  function update(step: number, sun: Sun01, cameraX: number): void {
    visMul = visibilityFor(config.vis, sun);
    for (let i = 0; i < slots.length; i += 1) {
      const p = slots[i];
      if (p === undefined) {
        continue;
      }
      p.age += step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      // 水平环绕，保持在当前可视世界窗口 [cameraX, cameraX+WORLD_W] 内
      if (p.x < cameraX) {
        p.x += WORLD_W;
      } else if (p.x > cameraX + WORLD_W) {
        p.x -= WORLD_W;
      }
      if (isDead(p)) {
        respawn(p, cameraX);
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D): void {
    if (visMul <= 0.001) {
      return;
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < slots.length; i += 1) {
      const p = slots[i];
      if (p === undefined) {
        continue;
      }
      const a = p.alpha * visMul * fadeEnvelope(p.age, p.life);
      if (a <= 0.003) {
        continue;
      }
      ctx.globalAlpha = a;
      const d = p.size;
      ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
    }
    // 复位加性绘制留下的状态，避免污染后续绘制（silhouette-glow-pipeline 纪律）
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  return { update, draw };
}

/** 白昼尘埃：顶半暖色微尘，高 s 更明显，缓慢轻盈漂移 */
const DUST: LayerConfig = {
  cap: 90,
  color: [255, 224, 170],
  vis: "high-sun",
  yMin: EDGE_MARGIN,
  yMax: HORIZON_Y - EDGE_MARGIN,
  vxMag: 12,
  vyMin: -3,
  vyMax: 8,
  sizeMin: 2,
  sizeMax: 5,
  lifeMin: 6,
  lifeMax: 13,
  peakAlpha: 0.16,
  crossSeam: false,
};

/** 夜间孢子：底半冷色生物荧光，向倒置世界的「上」（+y，远离接缝）漂移，低 s 更明显 */
const SPORE: LayerConfig = {
  cap: 70,
  color: [150, 220, 255],
  vis: "low-sun",
  yMin: HORIZON_Y + EDGE_MARGIN,
  yMax: WORLD_H - EDGE_MARGIN,
  vxMag: 9,
  vyMin: 3,
  vyMax: 11,
  sizeMin: 2,
  sizeMax: 6,
  lifeMin: 7,
  lifeMax: 15,
  peakAlpha: 0.18,
  crossSeam: false,
};

/** 跨缝光点：接缝附近稀疏生成、垂直穿越接缝，强化 meridian（s≈0.5 最盛） */
const MOTE: LayerConfig = {
  cap: 24,
  color: [255, 243, 196],
  vis: "balanced",
  yMin: HORIZON_Y - MOTE_REACH,
  yMax: HORIZON_Y + MOTE_REACH,
  vxMag: 5,
  vyMin: 10,
  vyMax: 26,
  sizeMin: 3,
  sizeMax: 7,
  lifeMin: 6,
  lifeMax: 12,
  peakAlpha: 0.22,
  crossSeam: true,
};

/**
 * 创建装饰粒子系统（三层定容池，一次性预分配）
 *
 * 由 renderer 在 createRenderer() 中创建并持有；update 每帧推进三层，drawDay/
 * drawNight/drawHorizon 供 renderScene 按所需图层顺序分别绘制。
 *
 * @returns ParticleSystem
 */
export function createParticleSystem(): ParticleSystem {
  const dust = createLayer(DUST);
  const spore = createLayer(SPORE);
  const mote = createLayer(MOTE);
  return {
    update(step: number, sun: Sun01, cameraX: number): void {
      dust.update(step, sun, cameraX);
      spore.update(step, sun, cameraX);
      mote.update(step, sun, cameraX);
    },
    drawDay(ctx: CanvasRenderingContext2D): void {
      dust.draw(ctx);
    },
    drawNight(ctx: CanvasRenderingContext2D): void {
      spore.draw(ctx);
    },
    drawHorizon(ctx: CanvasRenderingContext2D): void {
      mote.draw(ctx);
    },
  };
}
