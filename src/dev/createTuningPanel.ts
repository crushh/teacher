import type { PlaybackController, PlaybackSnapshot } from '../playback/PlaybackController';
import { UI_CONFIG, type CitySkyMode } from '../game/config';

export interface RuntimeResetChecks {
  panRoot: boolean;
  shakeRoot: boolean;
  teacher: boolean;
  sceneRoots: boolean;
}

export interface TuningPanel {
  destroy(): void;
}

export interface SkyTuningControls {
  getMode(): CitySkyMode;
  setMode(mode: CitySkyMode): void;
}

export function createTuningPanel(
  parent: HTMLElement,
  controller: PlaybackController,
  _getResetChecks: () => RuntimeResetChecks,
  _skyTuning: SkyTuningControls,
  _getCatPreviewTime: () => number,
): TuningPanel {
  if (!UI_CONFIG.showPlaybackControls) {
    const canvas = parent.querySelector('canvas');
    const events = new AbortController();
    const togglePlayback = (): void => {
      if (controller.getSnapshot().state === 'playing') controller.pause();
      else controller.play();
    };
    const previousTabIndex = canvas?.getAttribute('tabindex') ?? null;
    if (canvas) canvas.tabIndex = 0;
    canvas?.addEventListener('click', togglePlayback, { signal: events.signal });
    canvas?.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        togglePlayback();
      }
    }, { signal: events.signal });
    return { destroy(): void {
      events.abort();
      if (previousTabIndex === null) canvas?.removeAttribute('tabindex');
      else canvas?.setAttribute('tabindex', previousTabIndex);
    } };
  }

  const panel = document.createElement('aside');
  panel.className = 'player-hud';
  panel.setAttribute('aria-label', 'Adventure playback');
  panel.innerHTML = `
    <span class="player-hud__status" role="status">READY TO PLAY</span>
    <div class="player-hud__controls">
      <button class="player-hud__play" type="button" aria-label="Play" data-testid="play"><span aria-hidden="true">▶</span></button>
      <div class="player-hud__track"><div class="player-hud__time"><output data-testid="timeline-progress">0:00 / 0:00</output></div><input aria-label="Story progress" data-testid="timeline-progress-bar" type="range" min="0" max="1" step="0.01" value="0"></div>
      <button class="player-hud__restart" type="button" aria-label="Replay from beginning" title="Replay from beginning">↺</button>
    </div>
  `;
  parent.appendChild(panel);
  const play = panel.querySelector<HTMLButtonElement>('.player-hud__play')!;
  const restart = panel.querySelector<HTMLButtonElement>('.player-hud__restart')!;
  const slider = panel.querySelector<HTMLInputElement>('input')!;
  const time = panel.querySelector('output')!;
  const status = panel.querySelector<HTMLElement>('.player-hud__status')!;
  let scrubbing = false;
  let wasPlaying = false;
  const events = new AbortController();
  const options = { signal: events.signal };
  const beginScrub = (): void => {
    if (scrubbing || slider.disabled) return;
    wasPlaying = controller.getSnapshot().state === 'playing';
    scrubbing = true;
    controller.pause();
  };
  const endScrub = (): void => {
    if (!scrubbing) return;
    scrubbing = false;
    if (wasPlaying) controller.resume();
    render(controller.getSnapshot());
  };
  play.addEventListener('click', () => {
    if (controller.getSnapshot().state === 'playing') controller.pause();
    else controller.play();
  }, options);
  restart.addEventListener('click', () => { void controller.restart().catch(() => undefined); }, options);
  slider.addEventListener('pointerdown', beginScrub, options);
  slider.addEventListener('input', () => {
    beginScrub();
    controller.seek(Number(slider.value));
  }, options);
  slider.addEventListener('change', endScrub, options);
  slider.addEventListener('blur', endScrub, options);
  window.addEventListener('pointerup', endScrub, options);
  window.addEventListener('pointercancel', endScrub, options);
  const render = (snapshot: PlaybackSnapshot): void => {
    const blocked = ['loading', 'resetting', 'error'].includes(snapshot.state);
    play.disabled = restart.disabled = slider.disabled = blocked;
    const playing = snapshot.state === 'playing';
    play.innerHTML = `<span aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span>`;
    play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    play.title = playing ? 'Pause' : 'Play';
    status.textContent = snapshot.state === 'error' ? 'UNABLE TO PLAY · REFRESH TO RETRY' : scrubbing ? 'FIND YOUR MOMENT' : playing ? 'ADVENTURE IN MOTION' : snapshot.state === 'paused' ? 'TAKE YOUR TIME' : blocked ? 'LOADING ADVENTURE…' : 'READY TO PLAY';
    slider.max = String(snapshot.duration || 1);
    if (!scrubbing) slider.value = String(snapshot.time);
    slider.style.setProperty('--progress', `${snapshot.progress * 100}%`);
    slider.setAttribute('aria-valuetext', `${formatTime(snapshot.time)} of ${formatTime(snapshot.duration)}`);
    time.value = `${formatTime(snapshot.time)} / ${formatTime(snapshot.duration)}`;
  };
  const unsubscribe = controller.subscribe(render);
  return { destroy(): void { events.abort(); unsubscribe(); panel.remove(); } };
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
