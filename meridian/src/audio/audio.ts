import type { Sun01 } from "../game/sun";

const MUTED_HZ = 200;
const OPEN_HZ = 3000;

export interface AudioEngine {
  unlock(): void;
  update(s: Sun01): void;
}

function createImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buf;
}

export function createAudio(): AudioEngine {
  let ctx: AudioContext | null = null;
  let lp: BiquadFilterNode | null = null;
  let wet: GainNode | null = null;

  function unlock(): void {
    if (ctx) {
      void ctx.resume();
      return;
    }
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) {
      return;
    }
    ctx = new Ctor();

    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = createImpulse(ctx, 2.4, 2.5);
    wet = ctx.createGain();
    wet.gain.value = 0.35;
    convolver.connect(wet);
    wet.connect(master);

    lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = MUTED_HZ;
    lp.connect(master);
    lp.connect(convolver);

    for (const f of [110, 164.81, 220]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.12;
      osc.connect(g);
      g.connect(lp);
      osc.start();
    }

    void ctx.resume();
  }

  function update(s: Sun01): void {
    if (!ctx || !lp || !wet) {
      return;
    }
    lp.frequency.value = MUTED_HZ + (OPEN_HZ - MUTED_HZ) * s;
    wet.gain.value = 0.2 + 0.6 * s;
  }

  return { unlock, update };
}
