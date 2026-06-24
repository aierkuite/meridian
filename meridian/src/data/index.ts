/**
 * 数据层入口：导出有序的正式 M4 旅程
 *
 * gameplay（main.ts）与回放（scripts/check-replay.mjs）消费同一列表，避免 fixture 漂移。
 * 顺序即 plan.md §5 的正式内容：Prologue + 7 beats + Reunion，以 Reunion 收尾（不 loop-back）。
 *
 * M1/M3 机制 fixture（m1-slice / m3-*）保留在 segments/ 目录仅作开发期参考，
 * 不再出现在这条玩家可玩链中。
 */
import type { SegmentData } from "../game/segment";
import prologueSplitting from "./segments/prologue-splitting";
import beat1DayIce from "./segments/beat-1-day-ice";
import beat2NightBridge from "./segments/beat-2-night-bridge";
import interludeIceEcho from "./segments/interlude-ice-echo";
import beat3VineFungi from "./segments/beat-3-vine-fungi";
import beat4DoorsChoice from "./segments/beat-4-doors-choice";
import beat5BalanceMote from "./segments/beat-5-balance-mote";
import beat6DriftChoice from "./segments/beat-6-drift-choice";
import beat7MasterChoice from "./segments/beat-7-master-choice";
import reunionMeridian from "./segments/reunion-meridian";

export const segments: readonly SegmentData[] = [
  prologueSplitting,
  beat1DayIce,
  beat2NightBridge,
  interludeIceEcho,
  beat3VineFungi,
  beat4DoorsChoice,
  beat5BalanceMote,
  beat6DriftChoice,
  beat7MasterChoice,
  reunionMeridian,
];
