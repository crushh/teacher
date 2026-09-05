import type { PlaybackController, PlaybackSnapshot } from '../playback/PlaybackController';

export interface RuntimeResetChecks {
  panRoot: boolean;
  shakeRoot: boolean;
  teacher: boolean;
  sceneRoots: boolean;
}

export interface TuningPanel {
  destroy(): void;
}

export function createTuningPanel(
  parent: HTMLElement,
  controller: PlaybackController,
  getResetChecks: () => RuntimeResetChecks,
): TuningPanel {
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

  playButton.addEventListener('click', onPlay);
  pauseButton.addEventListener('click', onPause);
  resumeButton.addEventListener('click', onResume);
  restartButton.addEventListener('click', onRestart);
  speedInput.addEventListener('input', onSpeed);

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
  });

  return {
    destroy(): void {
      unsubscribe();
      playButton.removeEventListener('click', onPlay);
      pauseButton.removeEventListener('click', onPause);
      resumeButton.removeEventListener('click', onResume);
      restartButton.removeEventListener('click', onRestart);
      speedInput.removeEventListener('input', onSpeed);
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
