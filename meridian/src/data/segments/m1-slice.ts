import type { SegmentData } from "../../game/segment";

const m1Slice: SegmentData = {
  id: "m1-slice",
  dayTerrain: [
    { x: 0, y: 320, w: 300, h: 40 },
    { x: 600, y: 320, w: 680, h: 40 },
    { x: -20, y: 0, w: 20, h: 360 },
    { x: 1280, y: 0, w: 20, h: 360 },
  ],
  nightTerrain: [
    { x: 0, y: 360, w: 800, h: 40 },
    { x: 1100, y: 360, w: 180, h: 40 },
    { x: -20, y: 360, w: 20, h: 360 },
    { x: 1280, y: 360, w: 20, h: 360 },
  ],
  elements: [
    { kind: "ice", world: "day", box: { x: 300, y: 320, w: 300, h: 40 } },
    { kind: "ice", world: "night", box: { x: 800, y: 360, w: 300, h: 40 } },
  ],
  starts: {
    sol: { x: 80, y: 300 },
    luna: { x: 80, y: 420 },
  },
  exits: {
    sol: { x: 640, y: 280, w: 100, h: 40 },
    luna: { x: 1140, y: 400, w: 100, h: 40 },
  },
};

export default m1Slice;
