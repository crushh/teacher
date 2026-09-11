import type { PlaybackSnapshot } from '../playback/PlaybackController';

/** Original 160 BPM arcade cue. Generated locally; no remote audio dependency. */
export class RunningMusic {
  private context: AudioContext | undefined;
  private buffer: AudioBuffer | undefined;
  private source: AudioBufferSourceNode | undefined;
  private gain: GainNode | undefined;
  private previousTime = -1;
  private speed = 1;
  private muted = false;
  private needsActivation = true;
  private readonly button = document.createElement('button');

  private readonly mount: HTMLElement;
  private readonly onMuteChange: (muted: boolean) => void;

  constructor(mount: HTMLElement, onMuteChange: (muted: boolean) => void) {
    this.mount = mount;
    this.onMuteChange = onMuteChange;
    this.onMuteChange(this.muted);
    this.button.className = 'music-toggle';
    this.button.type = 'button';
    this.updateButton();
    this.button.addEventListener('click', this.toggle);
    mount.appendChild(this.button);
    mount.addEventListener('click', this.unlockFromScene, true);
    this.unlock();
  }

  private readonly unlockFromScene = (event: MouseEvent): void => {
    if (!this.button.contains(event.target as Node)) this.unlock();
  };

  private readonly unlock = (): void => {
    if (!this.context) {
      this.context = new AudioContext();
      this.context.onstatechange = () => {
        this.needsActivation = this.context?.state !== 'running';
        this.updateButton();
      };
      this.buffer = createRunningLoop(this.context);
      this.gain = this.context.createGain();
      this.gain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
    this.needsActivation = this.context.state !== 'running';
    this.updateButton();
  };

  private readonly toggle = (): void => {
    if (this.needsActivation && !this.muted) {
      this.unlock();
      return;
    }
    this.unlock();
    this.muted = !this.muted;
    this.onMuteChange(this.muted);
    this.updateButton();
    if (this.muted) this.stop();
  };

  private updateButton(): void {
    this.button.textContent = this.muted ? '♪ Sound: OFF' : '♪ Sound: ON';
    this.button.title = !this.muted && this.needsActivation ? 'Sound is enabled. Click to allow browser audio.' : 'Toggle all audio';
    this.button.setAttribute('aria-label', 'All audio');
    this.button.setAttribute('aria-pressed', String(!this.muted));
  }

  update(snapshot: PlaybackSnapshot, start: number, end: number): void {
    const { time, state, speed } = snapshot;
    const active = state === 'playing' && time >= start && time < end && !this.muted;
    if (!active || time < this.previousTime || speed !== this.speed) this.stop();
    this.previousTime = time;
    this.speed = speed;
    if (!active || !this.context || !this.buffer || !this.gain || this.context.state !== 'running') return;

    if (!this.source) {
      this.source = this.context.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.loop = true;
      this.source.playbackRate.value = speed;
      this.source.connect(this.gain);
      this.gain.gain.cancelScheduledValues(this.context.currentTime);
      this.gain.gain.setValueAtTime(0, this.context.currentTime);
      this.source.start(0, (time - start) % this.buffer.duration);
    }
    const envelope = Math.min(1, (time - start) / 0.12, (end - time) / 0.65);
    // Keep the running cue behind footsteps and action sound effects.
    this.gain.gain.setTargetAtTime(0.18 * Math.max(0, envelope), this.context.currentTime, 0.015);
  }

  private stop(): void {
    this.source?.stop();
    this.source?.disconnect();
    this.source = undefined;
  }

  destroy(): void {
    this.stop();
    this.mount.removeEventListener('click', this.unlockFromScene, true);
    this.button.removeEventListener('click', this.toggle);
    this.button.remove();
    if (this.context) this.context.onstatechange = null;
    void this.context?.close();
  }
}

function createRunningLoop(context: AudioContext): AudioBuffer {
  const rate = context.sampleRate;
  const beat = 60 / 160;
  const duration = beat * 32;
  const buffer = context.createBuffer(1, Math.round(rate * duration), rate);
  const samples = buffer.getChannelData(0);
  const roots = [45, 45, 41, 41, 48, 48, 43, 43];
  const melody = [0, 7, 12, 7, 15, 12, 7, 3, 0, 7, 12, 19, 15, 12, 10, 7];
  let seed = 17;
  const noise = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  const add = (at: number, length: number, wave: (t: number) => number): void => {
    const offset = Math.round(at * rate);
    const count = Math.floor(length * rate);
    for (let i = 0; i < count; i++) {
      const t = i / rate;
      const edge = Math.min(1, t / 0.003, (length - t) / 0.008);
      const index = (offset + i) % samples.length;
      samples[index] = (samples[index] ?? 0) + wave(t) * edge;
    }
  };
  const note = (at: number, midi: number, length: number, volume: number, bass = false): void => {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    add(at, length, (t) => {
      const phase = 2 * Math.PI * frequency * t;
      // A few harmonics retain a pixel-game timbre without a harsh square wave.
      const tone = Math.sin(phase) + (bass ? 0.2 : 0.32) * Math.sin(3 * phase) + 0.1 * Math.sin(5 * phase);
      return tone * volume * Math.exp(-t * (bass ? 5 : 9));
    });
  };
  for (let bar = 0; bar < 8; bar++) {
    const root = roots[bar]!;
    for (let step = 0; step < 16; step++) {
      const at = (bar * 4 + step / 4) * beat;
      if (step % 4 === 0) {
        add(at, 0.22, (t) => 0.65 * Math.sin(2 * Math.PI * (48 * t + 7 * (1 - Math.exp(-t * 30)))) * Math.exp(-t * 19));
      }
      if (step === 4 || step === 12) {
        add(at, 0.14, (t) => (noise() * 0.3 + Math.sin(2 * Math.PI * 180 * t) * 0.14) * Math.exp(-t * 27));
      }
      if (step % 2 === 0) {
        add(at, 0.045, (t) => noise() * 0.1 * Math.exp(-t * 70));
        note(at, root + (step % 4 === 2 ? 12 : 0), beat * 0.4, 0.22, true);
      }
      note(at, root + 24 + melody[(step + (bar % 2) * 8) % 16]!, beat * 0.21, step % 4 === 0 ? 0.12 : 0.075);
    }
  }
  // Leave mix headroom even when the kick, bass and lead coincide.
  for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i]! * 0.8);
  return buffer;
}
