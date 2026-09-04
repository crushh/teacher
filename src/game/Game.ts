import { Application, Container } from 'pixi.js';

import { createTuningPanel, type RuntimeResetChecks, type TuningPanel } from '../dev/createTuningPanel';
import { FoundationScene } from '../scenes/FoundationScene';
import { createMasterTimeline } from '../timeline/createMasterTimeline';
import { PlaybackController } from '../playback/PlaybackController';
import { GAME_HEIGHT, GAME_WIDTH, RENDERER_CONFIG, RUNTIME_CONFIG } from './config';

export class Game {
  readonly panRoot = new Container({ label: 'panRoot' });
  readonly shakeRoot = new Container({ label: 'shakeRoot' });
  readonly sceneHost = new Container({ label: 'sceneHost' });

  private readonly mount: HTMLElement;
  private readonly handleResize = (): void => this.resize();
  private app: Application | undefined;
  private foundationScene: FoundationScene | undefined;
  private playbackController: PlaybackController | undefined;
  private tuningPanel: TuningPanel | undefined;

  constructor(mount: HTMLElement) {
    this.mount = mount;
  }

  async init(): Promise<void> {
    const app = new Application();

    await app.init(RENDERER_CONFIG);

    this.app = app;
    app.stage.label = 'stage';
    app.stage.addChild(this.panRoot);
    this.panRoot.addChild(this.shakeRoot);
    this.shakeRoot.addChild(this.sceneHost);

    this.mount.replaceChildren(app.canvas);
    this.createRuntimeFoundation();
    this.setCanvasMetadata();

    window.addEventListener('resize', this.handleResize, { passive: true });
    window.visualViewport?.addEventListener('resize', this.handleResize, { passive: true });
    this.resize();
  }

  destroy(): void {
    this.tuningPanel?.destroy();
    this.tuningPanel = undefined;
    this.foundationScene?.dispose();
    this.foundationScene = undefined;
    window.removeEventListener('resize', this.handleResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    this.playbackController = undefined;

    if (this.app) {
      this.app.destroy(true, true);
      this.app = undefined;
    }
  }

  private createRuntimeFoundation(): void {
    this.foundationScene = new FoundationScene(this.sceneHost, this.panRoot, this.shakeRoot);
    this.foundationScene.build();

    this.playbackController = new PlaybackController({
      createTimeline: () => createMasterTimeline([this.foundationScene!]),
      reset: () => this.resetRuntimeState(),
      minSpeed: RUNTIME_CONFIG.speed.min,
      maxSpeed: RUNTIME_CONFIG.speed.max,
    });
    this.playbackController.initialize();
    this.tuningPanel = createTuningPanel(this.mount, this.playbackController, () => this.getResetChecks());
  }

  private resetRuntimeState(): void {
    this.resetContainer(this.panRoot, 0, 0);
    this.resetContainer(this.shakeRoot, 0, 0);
    this.resetContainer(this.sceneHost, 0, 0);
    this.foundationScene?.reset();
  }

  private getResetChecks(): RuntimeResetChecks {
    return {
      panRoot: this.isContainerReset(this.panRoot, 0, 0),
      shakeRoot: this.isContainerReset(this.shakeRoot, 0, 0),
      teacher: this.foundationScene?.teacher.isReset() ?? false,
    };
  }

  private resetContainer(container: Container, x: number, y: number): void {
    container.position.set(x, y);
    container.rotation = 0;
    container.scale.set(1, 1);
    container.pivot.set(0, 0);
    container.skew.set(0, 0);
    container.alpha = 1;
    container.visible = true;
    container.tint = 0xffffff;
  }

  private isContainerReset(container: Container, x: number, y: number): boolean {
    return (
      nearlyEqual(container.x, x) &&
      nearlyEqual(container.y, y) &&
      nearlyEqual(container.rotation, 0) &&
      nearlyEqual(container.scale.x, 1) &&
      nearlyEqual(container.scale.y, 1) &&
      nearlyEqual(container.pivot.x, 0) &&
      nearlyEqual(container.pivot.y, 0) &&
      nearlyEqual(container.skew.x, 0) &&
      nearlyEqual(container.skew.y, 0) &&
      nearlyEqual(container.alpha, 1) &&
      container.visible &&
      container.tint === 0xffffff
    );
  }

  private setCanvasMetadata(): void {
    if (!this.app) return;

    const { canvas, renderer } = this.app;
    canvas.classList.add('pixel-canvas');
    canvas.dataset.logicalWidth = String(GAME_WIDTH);
    canvas.dataset.logicalHeight = String(GAME_HEIGHT);
    canvas.dataset.resolution = String(renderer.resolution);
    canvas.dataset.pixelSampling = 'nearest';
  }

  private resize(): void {
    if (!this.app) return;

    const viewportWidth = Math.max(window.visualViewport?.width ?? window.innerWidth, 1);
    const viewportHeight = Math.max(window.visualViewport?.height ?? window.innerHeight, 1);
    const displayScale = Math.min(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);
    const canvas = this.app.canvas;

    canvas.style.width = `${GAME_WIDTH * displayScale}px`;
    canvas.style.height = `${GAME_HEIGHT * displayScale}px`;
    canvas.dataset.displayScale = displayScale.toFixed(4);
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}
