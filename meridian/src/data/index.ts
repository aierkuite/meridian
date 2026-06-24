/**
 * 数据层入口：导出有序 segment 列表
 *
 * gameplay（main.ts）与回放（scripts/check-replay.mjs）消费同一列表，避免 fixture 漂移。
 * 顺序：先保留 m1-slice 作为既有证明，再追加 M3 fixture。
 */
import type { SegmentData } from "../game/segment";
import m1Slice from "./segments/m1-slice";
import m3Vine from "./segments/m3-vine";
import m3Door from "./segments/m3-door";
import m3Mote from "./segments/m3-mote";
import m3Drift from "./segments/m3-drift";

export const segments: readonly SegmentData[] = [
  m1Slice,
  m3Vine,
  m3Door,
  m3Mote,
  m3Drift,
];
