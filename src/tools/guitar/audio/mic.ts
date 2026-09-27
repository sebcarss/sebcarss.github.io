/**
 * Microphone capture for the timing check. Audio stays in memory for the
 * length of one take and is dropped after analysis; nothing is stored or sent.
 * Echo cancellation, noise suppression and auto gain are all off: they smear
 * the note attacks the detector relies on.
 */

export function micSupported() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export class Mic {
  private chunks: Float32Array[] = [];
  private starts: number[] = [];
  private proc: ScriptProcessorNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private sink: GainNode | null = null;
  private count = 0;

  private constructor(
    private ctx: AudioContext,
    private stream: MediaStream,
  ) {}

  static async open(ctx: AudioContext): Promise<Mic> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    return new Mic(ctx, stream);
  }

  start() {
    const B = 2048;
    this.chunks = [];
    this.starts = [];
    this.count = 0;
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.proc = this.ctx.createScriptProcessor(B, 1, 1);
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.proc.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      // Time of this buffer's first sample on the context clock, less a
      // constant pipeline delay that the calibration step measures.
      this.starts.push(e.playbackTime - B / this.ctx.sampleRate - this.count / this.ctx.sampleRate);
      this.count += data.length;
      this.chunks.push(new Float32Array(data));
    };
    this.src.connect(this.proc).connect(this.sink).connect(this.ctx.destination);
  }

  /** The take so far: samples and the context time of sample 0. */
  stop(): { samples: Float32Array; sampleRate: number; startTime: number } {
    this.proc?.disconnect();
    this.src?.disconnect();
    this.sink?.disconnect();
    if (this.proc) this.proc.onaudioprocess = null;
    const samples = new Float32Array(this.count);
    let off = 0;
    for (const c of this.chunks) {
      samples.set(c, off);
      off += c.length;
    }
    const s = [...this.starts].sort((a, b) => a - b);
    const startTime = s.length ? s[Math.floor(s.length / 2)]! : this.ctx.currentTime;
    this.chunks = [];
    return { samples, sampleRate: this.ctx.sampleRate, startTime };
  }

  close() {
    this.stream.getTracks().forEach((t) => t.stop());
  }
}
