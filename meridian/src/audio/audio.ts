/**
 * 表现层音频引擎（Web Audio）
 *
 * 职责（design.md §3 / spec audio-guidelines）：
 * - 在首个用户手势后才构建 / resume `AudioContext`（浏览器禁止自动播放）。
 * - 播放一段**程序化生成的默认环境垫**（无需提交二进制资源，clone-and-play）；
 *   若存在本地用户曲目（gitignored）则淡入并经同一链路播放，加载失败静默回退。
 * - 默认垫与本地曲目都经「太阳驱动的低通 + 混响」：低太阳沉闷、高太阳通透。
 * - 由 `AudioFrame` 的 cue 列表合成 SFX（跳跃 / 太阳运动 / 元素 / 选择代价 /
 *   终章 fusion），并由 `frame.ending` 一次性触发结局解析。
 *
 * 边界：本引擎只消费 `AudioFrame`（presentation→simulation 单向）；
 * 在 ctx 建立前 `update` 为 no-op。`Math.random`（噪声/混响脉冲）属表现层，
 * 不受 determinism guard 约束（该 guard 仅扫描 engine/ 与 game/）。
 */

import type { AudioCue, AudioFrame, FusionPhase } from "./cues";
import type { EndingId } from "../game/ending";

const MUTED_HZ = 200;
const OPEN_HZ = 3000;

/** 程序化环境垫的一个分量（频率 / 增益 / 波形 / 失谐 cents） */
interface BedPartial {
  readonly hz: number;
  readonly gain: number;
  readonly wave: OscillatorType;
  readonly detune: number;
}

/**
 * 默认环境垫的分量表（原创、可再分发；运行时合成，无二进制资源）
 *
 * 较 M4 的三个裸锯齿更丰富：A 暖色 pad —— sub 低频 + 根/五度/八度 + 大三度色彩，
 * 辅以轻微失谐制造 chorus shimmer。整体落在 A 大调氛围，避免半音相撞。
 */
const BED_PARTIALS: readonly BedPartial[] = [
  { hz: 55, gain: 0.1, wave: "sine", detune: 0 }, // A1 sub 暖底
  { hz: 110, gain: 0.085, wave: "triangle", detune: -4 }, // A2 根
  { hz: 110, gain: 0.05, wave: "sine", detune: 6 }, // A2 失谐叠层（shimmer）
  { hz: 164.81, gain: 0.06, wave: "triangle", detune: 0 }, // E3 五度
  { hz: 220, gain: 0.05, wave: "sine", detune: -3 }, // A3 八度
  { hz: 277.18, gain: 0.03, wave: "sine", detune: 2 }, // C#4 大三度色彩
  { hz: 329.63, gain: 0.028, wave: "sine", detune: 0 }, // E4 高五度
];

/**
 * 本地用户曲目候选文件名（按优先级；全部 gitignored、私有、可热替换）
 *
 * 约定路径：`meridian/public/music/local.<ext>`。任一存在并解码成功即采用，
 * 否则静默回退到程序化默认垫（不抛错、不产生未捕获 promise）。
 */
const LOCAL_TRACK_CANDIDATES: readonly string[] = ["local.mp3", "local.ogg", "local.m4a", "local.wav"];

export interface AudioEngine {
  unlock(): void;
  update(frame: AudioFrame): void;
  dispose?(): void;
}

/**
 * 生成卷积混响用的衰减噪声脉冲（立体声）
 *
 * @param ctx 音频上下文
 * @param duration 脉冲时长（秒）
 * @param decay 衰减指数（越大越快归零）
 * @returns 可作为 ConvolverNode.buffer 的脉冲响应
 */
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

/**
 * 生成一段单声道白噪声缓冲（缓存复用，避免每次 SFX 分配）
 *
 * @param ctx 音频上下文
 * @param seconds 缓冲时长（秒）
 * @returns 白噪声 AudioBuffer
 */
function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(1, length, rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

/** playChord 的可选包络/路由参数 */
interface ChordOptions {
  readonly wave?: OscillatorType;
  readonly attack?: number;
  readonly reverb?: boolean;
}

export function createAudio(): AudioEngine {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let lp: BiquadFilterNode | null = null;
  let wet: GainNode | null = null;
  let convolver: ConvolverNode | null = null;
  let bedGain: GainNode | null = null;
  let sunOsc: OscillatorNode | null = null;
  let sunLayerGain: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  // 已触发解析的结局 id：保证每次进入终态只 bloom/gutter 一次（由 frame.ending 驱动）
  let lastEndingPlayed: EndingId | undefined = undefined;

  /**
   * 合成一个带频率滑音与指数包络的单音
   *
   * @param startHz 起始频率
   * @param endHz 结束频率
   * @param duration 时长（秒）
   * @param gain 峰值增益
   * @param wave 波形（默认 sine）
   * @param out 输出节点（默认 master）
   * @returns 无返回值
   */
  function playTone(
    startHz: number,
    endHz: number,
    duration: number,
    gain: number,
    wave: OscillatorType = "sine",
    out?: AudioNode,
  ): void {
    const context = ctx;
    const mainOut = master;
    if (!context || !mainOut) {
      return;
    }
    const dest = out ?? mainOut;
    const t0 = context.currentTime;
    const osc = context.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(1, startHz), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), t0 + duration);
    const g = context.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.03, duration * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  /**
   * 从缓存噪声缓冲取随机片段，经一个滤波器输出一段短噪声爆裂
   *
   * @param duration 时长（秒）
   * @param filterHz 滤波器中心/截止频率
   * @param gain 峰值增益
   * @param type 滤波器类型（默认 bandpass）
   * @returns 无返回值
   */
  function playNoiseBurst(
    duration: number,
    filterHz: number,
    gain: number,
    type: BiquadFilterType = "bandpass",
  ): void {
    const context = ctx;
    const mainOut = master;
    const buf = noiseBuffer;
    if (!context || !mainOut || !buf) {
      return;
    }
    const t0 = context.currentTime;
    const src = context.createBufferSource();
    src.buffer = buf;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterHz;
    const g = context.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(mainOut);
    const offset = Math.random() * Math.max(0, buf.duration - duration);
    src.start(t0, offset, duration + 0.02);
  }

  /**
   * 合成一组同时发声的频率（和弦），共享一个包络总线；可选送入混响
   *
   * @param freqs 频率列表
   * @param duration 时长（秒）
   * @param gain 峰值增益（总线）
   * @param opts 波形 / attack / 是否经混响
   * @returns 无返回值
   */
  function playChord(
    freqs: readonly number[],
    duration: number,
    gain: number,
    opts: ChordOptions = {},
  ): void {
    const context = ctx;
    const mainOut = master;
    if (!context || !mainOut) {
      return;
    }
    const wave = opts.wave ?? "sine";
    const attack = opts.attack ?? 0.4;
    const t0 = context.currentTime;
    const bus = context.createGain();
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    bus.gain.setValueAtTime(gain, t0 + Math.max(attack, duration * 0.5));
    bus.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    bus.connect(mainOut);
    if (opts.reverb && convolver) {
      bus.connect(convolver);
    }
    for (const f of freqs) {
      const osc = context.createOscillator();
      osc.type = wave;
      osc.frequency.value = f;
      osc.connect(bus);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    }
  }

  /**
   * 元素状态跨越的 SFX：ice 裂/融、vine 扫频、fungi 钟铃、door 门闩、mote 微响
   *
   * @param cue 元素 cue（含 kind/world/active）
   * @returns 无返回值
   */
  function playElement(cue: Extract<AudioCue, { kind: "element" }>): void {
    switch (cue.elementKind) {
      case "ice":
        if (cue.active) {
          // 结冰/凝实：清脆高频裂响
          playNoiseBurst(0.14, 2400, 0.16, "highpass");
          playTone(880, 1320, 0.1, 0.06, "triangle");
        } else {
          // 融化：低而湿润的气流
          playNoiseBurst(0.26, 700, 0.12, "lowpass");
        }
        break;
      case "vine":
        if (cue.world === "night") {
          // 夜侧真菌（fungi）：钟铃般的和声
          const chord = cue.active ? [659.25, 783.99, 987.77] : [415.3, 493.88, 622.25];
          playChord(chord, 0.5, 0.07, { wave: "sine", attack: 0.01, reverb: true });
        } else if (cue.active) {
          // 日侧藤蔓生长：上行扫频
          playTone(200, 470, 0.34, 0.1, "triangle");
        } else {
          // 日侧藤蔓收回：下行扫频
          playTone(470, 200, 0.3, 0.08, "triangle");
        }
        break;
      case "door":
        if (cue.active) {
          // 关闭/成为屏障：低沉门闩
          playTone(150, 90, 0.2, 0.18, "sine");
          playNoiseBurst(0.07, 320, 0.1, "lowpass");
        } else {
          // 开启：气流释放
          playTone(90, 170, 0.22, 0.12, "sine");
          playNoiseBurst(0.18, 1200, 0.06, "bandpass");
        }
        break;
      case "mote":
        // 平衡光尘进/出带：柔和的钟形微响
        if (cue.active) {
          playTone(740, 1000, 0.2, 0.07, "sine");
        } else {
          playTone(620, 440, 0.18, 0.05, "sine");
        }
        break;
    }
  }

  /**
   * 选择代价 SFX：低沉闷击（一核黯淡）+ 渐隐高频微光（被消耗的光）
   *
   * @returns 无返回值
   */
  function playChoiceCost(): void {
    playTone(120, 55, 0.55, 0.2, "sine");
    playTone(1500, 520, 0.7, 0.05, "triangle");
    playNoiseBurst(0.4, 480, 0.05, "lowpass");
  }

  /**
   * 终章 fusion 各相位的层叠 swell（经混响铺底）
   *
   * @param phase hold / dissolve / complete
   * @returns 无返回值
   */
  function playFusion(phase: FusionPhase): void {
    switch (phase) {
      case "hold":
        playChord([220, 277.18, 329.63], 1.6, 0.09, { wave: "sine", attack: 0.7, reverb: true });
        break;
      case "dissolve":
        playChord([329.63, 415.3, 493.88, 659.25], 1.8, 0.08, { wave: "sine", attack: 0.5, reverb: true });
        break;
      case "complete":
        playChord([261.63, 329.63, 392.0, 523.25], 2.4, 0.11, { wave: "sine", attack: 0.5, reverb: true });
        break;
    }
  }

  /**
   * 结局解析音：bright（one-sky/vow）bloom；tragic（afterglow/long-dark）稀薄/gutter
   *
   * 选择完全由 `frame.ending`（= journey.resolvedEnding）决定，绝不重算结局规则。
   *
   * @param id 已解析结局 id
   * @returns 无返回值
   */
  function playEnding(id: EndingId): void {
    switch (id) {
      case "one-sky":
        // 最圆满：饱满明亮的大调 bloom（C 大调 add9）
        playChord([261.63, 329.63, 392.0, 523.25, 659.25], 3.6, 0.13, { wave: "sine", attack: 0.6, reverb: true });
        break;
      case "vow":
        // 苦乐参半：温暖但稍收敛（A 大调）
        playChord([220, 277.18, 329.63, 440.0], 3.0, 0.11, { wave: "sine", attack: 0.7, reverb: true });
        break;
      case "afterglow":
        // 不均的遗憾：低而稀薄的小调三音
        playChord([196.0, 233.08, 293.66], 2.8, 0.08, { wave: "sine", attack: 0.9, reverb: true });
        break;
      case "long-dark":
        // 挥霍后的黯淡：极稀薄的低音双音 gutter
        playChord([110.0, 146.83], 3.2, 0.07, { wave: "sine", attack: 1.1, reverb: true });
        break;
    }
  }

  /**
   * 用解码后的本地曲目接管音乐床：循环播放并经同一 lp 链，淡出程序化默认垫
   *
   * @param context 音频上下文
   * @param buffer 已解码的音频缓冲
   * @param dest 输出节点（lp，共享太阳滤镜 + 混响）
   * @returns 无返回值
   */
  function startLocalSource(context: AudioContext, buffer: AudioBuffer, dest: AudioNode): void {
    const src = context.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(dest);
    src.start();
    if (bedGain) {
      bedGain.gain.setTargetAtTime(0, context.currentTime, 1.2);
    }
  }

  /**
   * 探测并加载可选本地用户曲目（静默优雅回退）
   *
   * 依次尝试候选文件名；任一 fetch 成功且解码成功即接管并返回，否则继续。
   * 404 / 解码失败 / 任意异常都被吞掉——绝不抛出未捕获错误或自动播放异常。
   *
   * @param context 音频上下文
   * @param dest 本地曲目的输出节点（lp）
   * @returns Promise<void>（调用方以 void 吞掉）
   */
  async function tryLoadLocalTrack(context: AudioContext, dest: AudioNode): Promise<void> {
    const base = import.meta.env.BASE_URL;
    for (const name of LOCAL_TRACK_CANDIDATES) {
      try {
        const res = await fetch(`${base}music/${name}`);
        if (!res.ok) {
          continue;
        }
        const bytes = await res.arrayBuffer();
        const buffer = await context.decodeAudioData(bytes);
        startLocalSource(context, buffer, dest);
        return;
      } catch {
        // 静默回退：缺文件 / 非音频内容 / 解码失败都退回程序化默认垫
        continue;
      }
    }
  }

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
    const context = new Ctor();
    ctx = context;

    const masterGain = context.createGain();
    masterGain.gain.value = 0.22;
    masterGain.connect(context.destination);
    master = masterGain;

    const conv = context.createConvolver();
    conv.buffer = createImpulse(context, 2.4, 2.5);
    convolver = conv;
    const wetGain = context.createGain();
    wetGain.gain.value = 0.35;
    conv.connect(wetGain);
    wetGain.connect(masterGain);
    wet = wetGain;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = MUTED_HZ;
    filter.connect(masterGain);
    filter.connect(conv);
    lp = filter;

    // 程序化默认环境垫：所有分量 → bedGain → lp（共享太阳滤镜 + 混响）
    const bed = context.createGain();
    bed.gain.value = 0.5;
    bed.connect(filter);
    bedGain = bed;
    for (const p of BED_PARTIALS) {
      const osc = context.createOscillator();
      osc.type = p.wave;
      osc.frequency.value = p.hz;
      osc.detune.value = p.detune;
      const g = context.createGain();
      g.gain.value = p.gain;
      osc.connect(g);
      g.connect(bed);
      osc.start();
    }
    // 极慢 LFO 调制 bed 总线增益，制造呼吸感（约 16s 周期）
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoDepth = context.createGain();
    lfoDepth.gain.value = 0.12;
    lfo.connect(lfoDepth);
    lfoDepth.connect(bed.gain);
    lfo.start();

    // 太阳运动 hum 层：连续、增益受控；直达 master 作为清晰的拨盘反馈
    const sOsc = context.createOscillator();
    sOsc.type = "sine";
    sOsc.frequency.value = 196;
    const sGain = context.createGain();
    sGain.gain.value = 0;
    sOsc.connect(sGain);
    sGain.connect(masterGain);
    sOsc.start();
    sunOsc = sOsc;
    sunLayerGain = sGain;

    // 缓存噪声缓冲，供后续 SFX 复用（避免每次分配）
    noiseBuffer = createNoiseBuffer(context, 1);

    void context.resume();
    // 可选本地曲目：存在则接管，否则静默回退到上面的程序化默认垫
    void tryLoadLocalTrack(context, filter);
  }

  function update(frame: AudioFrame): void {
    const context = ctx;
    if (!context || !lp || !wet) {
      return;
    }
    const t = context.currentTime;

    // 太阳驱动的低通 + 混响湿度：低太阳沉闷、高太阳通透（对默认垫与本地曲目同效）
    lp.frequency.value = MUTED_HZ + (OPEN_HZ - MUTED_HZ) * frame.sun;
    wet.gain.value = 0.2 + 0.6 * frame.sun;

    // 派发本帧 cue；sun 作为连续控制信号单独累计，结局由 frame.ending 驱动
    let sunCue: Extract<AudioCue, { kind: "sun" }> | null = null;
    for (const cue of frame.cues) {
      switch (cue.kind) {
        case "jump":
          playTone(330, 560, 0.12, 0.16, "triangle");
          break;
        case "sun":
          sunCue = cue;
          break;
        case "element":
          playElement(cue);
          break;
        case "choice-cost":
          playChoiceCost();
          break;
        case "fusion":
          playFusion(cue.phase);
          break;
        case "ending":
          // 结局解析由 frame.ending 一次性驱动（见下），此处不重复触发
          break;
      }
    }

    // 太阳运动 hum：有 sun cue 则按 pressure 淡入、按方向微调音高；否则淡出
    if (sunLayerGain && sunOsc) {
      if (sunCue) {
        sunLayerGain.gain.setTargetAtTime(0.015 + 0.06 * sunCue.pressure, t, 0.05);
        sunOsc.detune.setTargetAtTime(sunCue.direction * 90, t, 0.08);
      } else {
        sunLayerGain.gain.setTargetAtTime(0, t, 0.12);
      }
    }

    // 结局解析：每次进入终态仅触发一次；离开终态（重开）后复位
    if (frame.status === "ending" && frame.ending !== undefined) {
      if (lastEndingPlayed !== frame.ending) {
        playEnding(frame.ending);
        lastEndingPlayed = frame.ending;
      }
    } else {
      lastEndingPlayed = undefined;
    }
  }

  function dispose(): void {
    const context = ctx;
    if (!context) {
      return;
    }
    ctx = null;
    master = null;
    lp = null;
    wet = null;
    convolver = null;
    bedGain = null;
    sunOsc = null;
    sunLayerGain = null;
    noiseBuffer = null;
    lastEndingPlayed = undefined;
    void context.close();
  }

  return { unlock, update, dispose };
}
