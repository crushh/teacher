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
  getResetChecks: () => RuntimeResetChecks,
  skyTuning: SkyTuningControls,
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
  panel.className = 'tuning-panel';
  panel.dataset.testid = 'runtime-controls';
  panel.innerHTML = `
    <div class="tuning-panel__header">
      <div>
        <p class="tuning-panel__eyebrow">DEV TUNING</p>
        <h1>Runtime controls</h1>
      </div>
      <output class="tuning-panel__state" data-testid="playback-state">LOADING</output>
    </div>
    <div class="tuning-panel__buttons" aria-label="Playback controls">
      <button type="button" data-action="play" data-testid="play">Play</button>
      <button type="button" data-action="pause" data-testid="pause">Pause</button>
      <button type="button" data-action="resume" data-testid="resume">Resume</button>
      <button type="button" data-action="restart" data-testid="restart">Restart</button>
    </div>
    <label class="tuning-panel__speed" for="time-scale">
      <span>timeScale</span>
      <input id="time-scale" data-testid="time-scale" type="range" min="0.25" max="2" step="0.25" value="1">
      <output data-testid="time-scale-value">1.00×</output>
    </label>
    <div class="tuning-panel__sky" aria-label="Sky mode">
      <div class="tuning-panel__sky-label">
        <span>SKY MODE</span>
        <output data-testid="sky-state-value">AUTO</output>
      </div>
      <div class="tuning-panel__sky-buttons">
        <button type="button" data-sky-mode="auto" data-testid="sky-auto">AUTO</button>
        <button type="button" data-sky-mode="day" data-testid="sky-day">DAY</button>
        <button type="button" data-sky-mode="sunset" data-testid="sky-sunset">SUNSET</button>
        <button type="button" data-sky-mode="night" data-testid="sky-night">NIGHT</button>
      </div>
    </div>
    <div class="tuning-panel__progress">
      <div class="tuning-panel__progress-label">
        <span>masterTimeline</span>
        <output data-testid="timeline-progress">0.00s / 0.00s</output>
      </div>
      <progress data-testid="timeline-progress-bar" max="1" value="0"></progress>
    </div>
    <div class="tuning-panel__checks" data-testid="reset-checks">
      <span>reset checks</span>
      <output data-testid="reset-check-value">pending</output>
    </div>
    <p class="tuning-panel__meta"><output data-testid="timeline-generation">master timeline #0 · 0 active</output></p>
  `;
  parent.appendChild(panel);

  const playButton = getButton(panel, 'play');
  const pauseButton = getButton(panel, 'pause');
  const resumeButton = getButton(panel, 'resume');
  const restartButton = getButton(panel, 'restart');
  const speedInput = panel.querySelector<HTMLInputElement>('[data-testid="time-scale"]');
  const speedOutput = getOutput(panel, 'time-scale-value');
  const progressBar = panel.querySelector<HTMLProgressElement>('[data-testid="timeline-progress-bar"]');
  const skyButtons = getSkyButtons(panel);

  if (!speedInput || !progressBar) {
    throw new Error('Missing timeScale or timeline progress control.');
  }

  const onPlay = (): void => controller.play();
  const onPause = (): void => controller.pause();
  const onResume = (): void => controller.resume();
  const onRestart = (): void => {
    void controller.restart().catch(() => undefined);
  };
  const onSpeed = (): void => controller.setSpeed(Number(speedInput.value));
  const onSkyMode = (event: Event): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const mode = button.dataset.skyMode as CitySkyMode | undefined;
    if (!mode) return;

    skyTuning.setMode(mode);
    updateSkyModeButtons(panel, skyButtons, skyTuning.getMode());
  };

  playButton.addEventListener('click', onPlay);
  pauseButton.addEventListener('click', onPause);
  resumeButton.addEventListener('click', onResume);
  restartButton.addEventListener('click', onRestart);
  speedInput.addEventListener('input', onSpeed);
  skyButtons.forEach((button) => button.addEventListener('click', onSkyMode));
  updateSkyModeButtons(panel, skyButtons, skyTuning.getMode());

  const unsubscribe = controller.subscribe((snapshot) => {
    updatePanel(
      snapshot,
      panel,
      playButton,
      pauseButton,
      resumeButton,
      restartButton,
      speedInput,
      speedOutput,
      progressBar,
    );
    updateResetChecks(panel, getResetChecks());
    updateSkyModeButtons(panel, skyButtons, skyTuning.getMode());
  });

  return {
    destroy(): void {
      unsubscribe();
      playButton.removeEventListener('click', onPlay);
      pauseButton.removeEventListener('click', onPause);
      resumeButton.removeEventListener('click', onResume);
      restartButton.removeEventListener('click', onRestart);
      speedInput.removeEventListener('input', onSpeed);
      skyButtons.forEach((button) => button.removeEventListener('click', onSkyMode));
      panel.remove();
    },
  };
}

function updatePanel(
  snapshot: PlaybackSnapshot,
  panel: HTMLElement,
  playButton: HTMLButtonElement,
  pauseButton: HTMLButtonElement,
  resumeButton: HTMLButtonElement,
  restartButton: HTMLButtonElement,
  speedInput: HTMLInputElement,
  speedOutput: HTMLOutputElement,
  progressBar: HTMLProgressElement,
): void {
  getOutput(panel, 'playback-state').value = snapshot.state.toUpperCase();
  getOutput(panel, 'timeline-progress').value = `${(snapshot.progress * snapshot.duration).toFixed(2)}s / ${snapshot.duration.toFixed(2)}s`;
  getOutput(panel, 'timeline-generation').value = `master timeline #${snapshot.generation} · ${snapshot.activeTimelines} active`;
  progressBar.value = snapshot.progress;
  speedInput.value = String(snapshot.speed);
  speedOutput.value = `${snapshot.speed.toFixed(2)}×`;

  const isBlocked = snapshot.state === 'loading' || snapshot.state === 'resetting' || snapshot.state === 'error';
  playButton.disabled = isBlocked;
  pauseButton.disabled = snapshot.state !== 'playing';
  resumeButton.disabled = snapshot.state !== 'paused';
  restartButton.disabled = isBlocked;
  panel.dataset.state = snapshot.state;
}

function updateResetChecks(panel: HTMLElement, checks: RuntimeResetChecks): void {
  const value = getOutput(panel, 'reset-check-value');
  const allPassed = checks.panRoot && checks.shakeRoot && checks.teacher && checks.sceneRoots;
  value.value = allPassed ? 'PASS · scene roots · panRoot · shakeRoot · Teacher' : 'pending';
  value.className = allPassed ? 'is-passed' : '';
}

function updateSkyModeButtons(
  panel: HTMLElement,
  buttons: readonly HTMLButtonElement[],
  mode: CitySkyMode,
): void {
  getOutput(panel, 'sky-state-value').value = mode.toUpperCase();
  buttons.forEach((button) => {
    const isActive = button.dataset.skyMode === mode;
    button.dataset.active = String(isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function getSkyButtons(panel: HTMLElement): HTMLButtonElement[] {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-sky-mode]'));
}

function getButton(panel: HTMLElement, action: string): HTMLButtonElement {
  const button = panel.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);

  if (!button) {
    throw new Error(`Missing ${action} control.`);
  }

  return button;
}

function getOutput(panel: HTMLElement, testId: string): HTMLOutputElement {
  const output = panel.querySelector<HTMLOutputElement>(`[data-testid="${testId}"]`);

  if (!output) {
    throw new Error(`Missing ${testId} output.`);
  }

  return output;
}
