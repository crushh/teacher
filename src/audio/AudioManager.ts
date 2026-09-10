import { gsap } from 'gsap';

import { AUDIO_CONFIG } from '../game/config';
import { AUDIO_ASSETS, type AudioId } from './audioAssets';
import type { GsapTimeline } from '../scenes/Scene';

interface AudioChannel {
  readonly id: AudioId;
  readonly element: HTMLAudioElement;
  readonly defaultVolume: number;
  readonly level: { value: number };
  activeLoop: boolean;
  wasPlayingBeforePause: boolean;
}

export class AudioManager {
  private readonly channels = new Map<AudioId, AudioChannel>();
  private readonly fadeTimelines = new Set<GsapTimeline>();
  private masterVolume: number = AUDIO_CONFIG.master;
  private unlocked = false;

  constructor() {
    (Object.keys(AUDIO_ASSETS) as AudioId[]).forEach((id) => {
      const element = new Audio(AUDIO_ASSETS[id]);
      element.preload = 'auto';
      element.loop = false;

      const channel: AudioChannel = {
        id,
        element,
        defaultVolume: AUDIO_CONFIG[id],
        level: { value: AUDIO_CONFIG[id] },
        activeLoop: false,
        wasPlayingBeforePause: false,
      };
      this.channels.set(id, channel);
      this.applyVolume(channel);
    });
  }

  preload(): void {
    this.channels.forEach(({ element }) => {
      element.load();
    });
  }

  /**
   * Called synchronously by the Play button before the master timeline starts.
   * The real audio play() calls are made by timeline callbacks in that same
   * call stack, which preserves the browser's user-gesture unlock window.
   */
  unlock(): void {
    this.unlocked = true;
  }

  play(id: AudioId): void {
    const channel = this.getChannel(id);
    this.prepareForPlayback(channel, false);
    this.startElement(channel);
  }

  playLoop(id: AudioId): void {
    const channel = this.getChannel(id);
    if (channel.activeLoop && !channel.element.ended) return;

    this.prepareForPlayback(channel, true);
    channel.activeLoop = true;
    this.startElement(channel);
  }

  stop(id: AudioId): void {
    const channel = this.getChannel(id);
    channel.element.pause();
    resetCurrentTime(channel.element);
    channel.element.loop = false;
    channel.activeLoop = false;
    channel.wasPlayingBeforePause = false;
    channel.level.value = channel.defaultVolume;
    this.applyVolume(channel);
  }

  stopAll(): void {
    this.channels.forEach((channel) => this.stopChannel(channel));
  }

  fade(id: AudioId, targetVolume: number, duration: number): GsapTimeline {
    const channel = this.getChannel(id);
    const fadeTimeline = gsap.timeline({
      id: `audio:fade:${id}`,
      defaults: { overwrite: 'auto' },
    });

    fadeTimeline.to(channel.level, {
      value: clamp01(targetVolume),
      duration: Math.max(0, duration),
      ease: 'none',
      onUpdate: () => this.applyVolume(channel),
    });

    // Build the fade detached from GSAP's root timeline. The owning Scene
    // timeline adds it at its story label, so pause/resume and timeScale are
    // inherited from the master timeline.
    gsap.globalTimeline.remove(fadeTimeline);
    this.fadeTimelines.add(fadeTimeline);
    return fadeTimeline;
  }

  pause(): void {
    this.channels.forEach((channel) => {
      channel.wasPlayingBeforePause = !channel.element.paused && !channel.element.ended;
      channel.element.pause();
    });
  }

  resume(): void {
    this.channels.forEach((channel) => {
      if (!channel.wasPlayingBeforePause || !channel.activeLoop && channel.element.ended) return;

      this.startElement(channel);
      channel.wasPlayingBeforePause = false;
    });
  }

  reset(): void {
    this.fadeTimelines.forEach((timeline) => timeline.kill());
    this.fadeTimelines.clear();
    this.channels.forEach((channel) => this.stopChannel(channel));
    this.unlocked = false;
  }

  volume(id: AudioId, value?: number): number {
    const channel = this.getChannel(id);
    if (value !== undefined) {
      channel.level.value = clamp01(value);
      this.applyVolume(channel);
    }

    return channel.level.value;
  }

  setMasterVolume(value: number): void {
    this.masterVolume = clamp01(value);
    this.channels.forEach((channel) => this.applyVolume(channel));
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  private prepareForPlayback(channel: AudioChannel, loop: boolean): void {
    channel.element.pause();
    resetCurrentTime(channel.element);
    channel.element.loop = loop;
    channel.activeLoop = loop;
    channel.wasPlayingBeforePause = false;
    channel.level.value = channel.defaultVolume;
    this.applyVolume(channel);
  }

  private startElement(channel: AudioChannel): void {
    // play() must remain synchronous here. We intentionally do not await it,
    // so a browser can associate the call with the Play button gesture.
    void channel.element.play().catch(() => undefined);
  }

  private stopChannel(channel: AudioChannel): void {
    channel.element.pause();
    resetCurrentTime(channel.element);
    channel.element.loop = false;
    channel.activeLoop = false;
    channel.wasPlayingBeforePause = false;
    channel.level.value = channel.defaultVolume;
    this.applyVolume(channel);
  }

  private applyVolume(channel: AudioChannel): void {
    channel.element.volume = clamp01(channel.level.value * this.masterVolume);
  }

  private getChannel(id: AudioId): AudioChannel {
    const channel = this.channels.get(id);
    if (!channel) throw new Error(`Unknown audio id: ${id}`);
    return channel;
  }
}

function resetCurrentTime(element: HTMLAudioElement): void {
  try {
    element.currentTime = 0;
  } catch {
    // Some browsers can reject seeking until media metadata is available.
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
