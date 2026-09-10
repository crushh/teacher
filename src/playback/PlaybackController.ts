import type { GsapTimeline } from '../scenes/Scene';

export type PlaybackState =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'resetting'
  | 'finished'
  | 'error';

export interface PlaybackSnapshot {
  state: PlaybackState;
  time: number;
  progress: number;
  duration: number;
  speed: number;
  generation: number;
  activeTimelines: number;
}

export type PlaybackListener = (snapshot: PlaybackSnapshot) => void;

interface PlaybackControllerOptions {
  createTimeline: () => GsapTimeline;
  reset: () => void;
  minSpeed?: number;
  maxSpeed?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: (generation: number) => void;
}

export class PlaybackController {
  private readonly createTimeline: () => GsapTimeline;
  private readonly resetRuntime: () => void;
  private readonly minSpeed: number;
  private readonly maxSpeed: number;
  private readonly onPlay: (() => void) | undefined;
  private readonly onPause: (() => void) | undefined;
  private readonly onResume: (() => void) | undefined;
  private readonly onReset: ((generation: number) => void) | undefined;
  private readonly listeners = new Set<PlaybackListener>();

  private masterTimeline: GsapTimeline | undefined;
  private restartPromise: Promise<void> | undefined;
  private state: PlaybackState = 'loading';
  private speed = 1;
  private generation = 0;

  constructor(options: PlaybackControllerOptions) {
    this.createTimeline = options.createTimeline;
    this.resetRuntime = options.reset;
    this.minSpeed = options.minSpeed ?? 0.25;
    this.maxSpeed = options.maxSpeed ?? 2;
    this.onPlay = options.onPlay;
    this.onPause = options.onPause;
    this.onResume = options.onResume;
    this.onReset = options.onReset;
  }

  initialize(): void {
    if (this.state !== 'loading') return;

    try {
      this.resetRuntime();
      this.onReset?.(this.generation);
      this.rebuildTimeline();
      this.setState('ready');
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  play(): void {
    if (this.state === 'finished') {
      this.onPlay?.();
      void this.restart();
      return;
    }
    if (this.state === 'paused') {
      this.resume();
      return;
    }
    if (this.state !== 'ready' && this.state !== 'playing') return;
    if (this.state === 'playing') return;
    if (!this.masterTimeline) return;

    this.onPlay?.();
    this.masterTimeline.play(0);
    this.setState('playing');
  }

  pause(): void {
    if (this.state !== 'playing' || !this.masterTimeline) return;

    this.masterTimeline.pause();
    this.onPause?.();
    this.setState('paused');
  }

  resume(): void {
    if (this.state !== 'paused' || !this.masterTimeline) return;

    this.masterTimeline.resume();
    this.onResume?.();
    this.setState('playing');
  }

  restart(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    if (this.state === 'loading' || this.state === 'error') return Promise.resolve();

    this.setState('resetting');
    this.restartPromise = Promise.resolve()
      .then(() => {
        this.masterTimeline?.kill();
        this.masterTimeline = undefined;
        this.resetRuntime();
        this.onReset?.(this.generation);
        this.rebuildTimeline();
        this.setState('ready');
        this.play();
      })
      .catch((error: unknown) => {
        this.setState('error');
        throw error;
      })
      .finally(() => {
        this.restartPromise = undefined;
      });

    return this.restartPromise;
  }

  setSpeed(value: number): void {
    if (!Number.isFinite(value)) return;

    this.speed = Math.min(this.maxSpeed, Math.max(this.minSpeed, value));
    this.masterTimeline?.timeScale(this.speed);
    this.notify();
  }

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PlaybackSnapshot {
    return {
      state: this.state,
      time: this.masterTimeline?.time() ?? 0,
      progress: this.masterTimeline?.progress() ?? 0,
      duration: this.masterTimeline?.duration() ?? 0,
      speed: this.speed,
      generation: this.generation,
      activeTimelines: this.masterTimeline ? 1 : 0,
    };
  }

  private rebuildTimeline(): void {
    const timeline = this.createTimeline();

    this.generation += 1;
    this.masterTimeline = timeline;
    this.masterTimeline.timeScale(this.speed);
    this.masterTimeline.eventCallback('onUpdate', () => this.notify());
    this.masterTimeline.eventCallback('onComplete', () => this.setState('finished'));
    this.notify();
  }

  private setState(state: PlaybackState): void {
    this.state = state;
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();

    this.listeners.forEach((listener) => listener(snapshot));
  }
}
