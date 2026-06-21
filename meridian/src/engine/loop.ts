import type { InputSnapshot } from "./input";
import { clamp } from "./math";

export const DT = 1 / 120;

const MAX_FRAME_DELTA_SECONDS = 0.25;

export interface FixedLoopCallbacks {
  readonly sampleInput: () => InputSnapshot;
  readonly update: (dt: number, input: InputSnapshot) => void;
  readonly render: (alpha: number) => void;
}

/**
 * 启动固定步长主循环并解耦更新与渲染
 *
 * @param callbacks 输入采样、固定步长更新和渲染回调
 * @returns 停止循环并取消下一帧调度的释放函数
 */
export function startFixedLoop(callbacks: FixedLoopCallbacks): () => void {
  let accumulatorSeconds = 0;
  let previousFrameMs = 0;
  let started = false;
  let rafId = 0;

  /**
   * 推进一帧浏览器调度
   *
   * @param nowMs 浏览器帧时间戳，单位毫秒
   * @returns 无返回值
   */
  const frame = (nowMs: number): void => {
    if (!started) {
      previousFrameMs = nowMs;
      started = true;
    }

    const elapsedSeconds = clamp((nowMs - previousFrameMs) / 1000, 0, MAX_FRAME_DELTA_SECONDS);
    previousFrameMs = nowMs;
    accumulatorSeconds += elapsedSeconds;

    while (accumulatorSeconds >= DT) {
      callbacks.update(DT, callbacks.sampleInput());
      accumulatorSeconds -= DT;
    }

    callbacks.render(accumulatorSeconds / DT);
    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return () => cancelAnimationFrame(rafId);
}
