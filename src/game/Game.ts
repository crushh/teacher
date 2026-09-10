import { Application, Container } from 'pixi.js';
import { gsap } from 'gsap';

import { loadClassroomAssets, type ClassroomAssets } from '../assets/classroomAssets';
import { loadCityAssets, type CityAssets } from '../assets/cityAssets';
import { loadHallwayAssets, type HallwayAssets } from '../assets/hallwayAssets';
import { AudioManager } from '../audio/AudioManager';
import { createTuningPanel, type RuntimeResetChecks, type TuningPanel } from '../dev/createTuningPanel';
import { Teacher } from '../entities/Teacher';
import { ClassroomScene } from '../scenes/ClassroomScene';
import { CityScene } from '../scenes/CityScene';
import { HallwayScene } from '../scenes/HallwayScene';
import { createMasterTimeline } from '../timeline/createMasterTimeline';
import { createSceneTransitionTimeline, createTransitionEffects, type TransitionEffects } from '../timeline/createTransitionTimeline';
import { PlaybackController } from '../playback/PlaybackController';
import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG, RENDERER_CONFIG } from './config';

export class Game {
  readonly panRoot = new Container({ label: 'panRoot' });
  readonly shakeRoot = new Container({ label: 'shakeRoot' });
  readonly sceneHost = new Container({ label: 'sceneHost' });

  private readonly mount: HTMLElement;
  private readonly handleResize = (): void => this.resize();
  private app: Application | undefined;
  private teacher: Teacher | undefined;
  private classroomScene: ClassroomScene | undefined;
  private cityScene: CityScene | undefined;
  private hallwayScene: HallwayScene | undefined;
  private audioManager: AudioManager | undefined;
  private transitionEffects: TransitionEffects | undefined;
  private transitionContext: gsap.Context | undefined;
  private playbackController: PlaybackController | undefined;
  private tuningPanel: TuningPanel | undefined;
  private unsubscribeSkyTimeline: (() => void) | undefined;
  private cityTimelineRange = { start: 0, end: 1 };

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
    this.setCanvasMetadata();

    window.addEventListener('resize', this.handleResize, { passive: true });
    window.visualViewport?.addEventListener('resize', this.handleResize, { passive: true });
    const [classroomAssets, cityAssets, hallwayAssets] = await Promise.all([
      loadClassroomAssets(),
      loadCityAssets(),
      loadHallwayAssets(),
    ]);
    this.createMovieRuntime(classroomAssets, cityAssets, hallwayAssets);
    this.resize();
  }

  destroy(): void {
    this.audioManager?.reset();
    this.audioManager = undefined;
    this.tuningPanel?.destroy();
    this.tuningPanel = undefined;
    this.unsubscribeSkyTimeline?.();
    this.unsubscribeSkyTimeline = undefined;
    this.classroomScene?.dispose();
    this.cityScene?.dispose();
    this.hallwayScene?.dispose();
    this.transitionContext?.revert();
    this.classroomScene = undefined;
    this.cityScene = undefined;
    this.hallwayScene = undefined;
    this.teacher = undefined;
    this.transitionEffects = undefined;
    this.transitionContext = undefined;
    window.removeEventListener('resize', this.handleResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    this.playbackController = undefined;

    if (this.app) {
      this.app.destroy(true, true);
      this.app = undefined;
    }
  }

  private createMovieRuntime(
    classroomAssets: ClassroomAssets,
    cityAssets: CityAssets,
    hallwayAssets: HallwayAssets,
  ): void {
    const audioManager = new AudioManager();
    audioManager.preload();
    const teacher = new Teacher({
      x: MOVIE_CONFIG.teacher.startX,
      y: MOVIE_CONFIG.teacher.startY,
    }, {
      ...classroomAssets.teacher,
      rollEnd: hallwayAssets.teacherRollEnd,
    }, {
      rollEnd: MOVIE_CONFIG.hallway.rollEndScale,
    }, {
      frames: cityAssets.ninjaRun,
      scale: MOVIE_CONFIG.city.ninjaRunScale,
    });
    const classroomScene = new ClassroomScene(
      teacher,
      this.sceneHost,
      classroomAssets.environment,
      this.mount,
      audioManager,
    );
    const cityScene = new CityScene(
      teacher,
      this.panRoot,
      this.shakeRoot,
      this.sceneHost,
      cityAssets,
      audioManager,
    );
    const hallwayScene = new HallwayScene(
      teacher,
      this.shakeRoot,
      this.sceneHost,
      hallwayAssets,
      audioManager,
    );
    classroomScene.build();
    cityScene.build();
    hallwayScene.build();
    this.sceneHost.addChild(teacher.root);

    this.teacher = teacher;
    this.classroomScene = classroomScene;
    this.cityScene = cityScene;
    this.hallwayScene = hallwayScene;
    this.audioManager = audioManager;
    this.transitionEffects = createTransitionEffects(this.sceneHost);

    this.playbackController = new PlaybackController({
      createTimeline: () => this.createMovieTimeline(),
      reset: () => this.resetMovieState(),
      minSpeed: MOVIE_CONFIG.speed.min,
      maxSpeed: MOVIE_CONFIG.speed.max,
      onPlay: () => this.audioManager?.unlock(),
      onPause: () => this.audioManager?.pause(),
      onResume: () => this.audioManager?.resume(),
    });
    this.playbackController.initialize();
    this.unsubscribeSkyTimeline = this.playbackController.subscribe((snapshot) => {
      this.cityScene?.updateSkyFromTimeline(
        normalizeTimelineTime(snapshot.time, this.cityTimelineRange.start, this.cityTimelineRange.end),
      );
    });
    this.tuningPanel = createTuningPanel(
      this.mount,
      this.playbackController,
      () => this.getResetChecks(),
      {
        getMode: () => this.cityScene?.getSkyMode() ?? 'auto',
        setMode: (mode) => this.cityScene?.setSkyMode(mode),
      },
    );
  }

  private createMovieTimeline() {
    if (!this.classroomScene || !this.cityScene || !this.hallwayScene || !this.transitionEffects) {
      throw new Error('Movie runtime is not ready');
    }
    const classroomScene = this.classroomScene;
    const cityScene = this.cityScene;
    const hallwayScene = this.hallwayScene;
    const transitionEffects = this.transitionEffects;

    this.transitionContext?.revert();
    const transitionContext = gsap.context(() => undefined);
    this.transitionContext = transitionContext;

    const classroomTL = classroomScene.createTimeline();
    const classroomToCityTL = transitionContext.add(() => createSceneTransitionTimeline({
      from: classroomScene.root,
      to: cityScene.root,
      effects: transitionEffects,
      label: 'classroom-to-city',
    }));
    const cityTL = cityScene.createTimeline();
    const cityToHallwayTL = transitionContext.add(() => createSceneTransitionTimeline({
      from: cityScene.root,
      to: hallwayScene.root,
      effects: transitionEffects,
      label: 'city-to-hallway',
    }));
    const hallwayTL = hallwayScene.createTimeline();
    const hallwayExitTL = hallwayScene.createExitTimeline();
    const hallwayToClassroomTransitionTL = transitionContext.add(() => createSceneTransitionTimeline({
      from: hallwayScene.root,
      to: classroomScene.root,
      effects: transitionEffects,
      label: 'hallway-to-classroom',
      onSwap: () => this.resetMovieStateForLoopBoundary(),
    }));

    const masterTimeline = createMasterTimeline([
      classroomTL,
      classroomToCityTL,
      cityTL,
      cityToHallwayTL,
      hallwayTL,
      hallwayExitTL,
      hallwayToClassroomTransitionTL,
    ]);
    this.cityTimelineRange = {
      start: cityTL.startTime(),
      end: cityTL.startTime() + cityTL.duration(),
    };

    return masterTimeline;
  }

  private resetMovieState(): void {
    this.audioManager?.reset();
    this.resetContainer(this.panRoot, 0, 0);
    this.resetContainer(this.shakeRoot, 0, 0);
    this.resetContainer(this.sceneHost, 0, 0);
    this.teacher?.reset();
    this.cityScene?.reset();
    this.hallwayScene?.reset();
    this.classroomScene?.reset();
    this.transitionEffects?.reset();
  }

  private resetMovieStateForLoopBoundary(): void {
    this.audioManager?.stopAll();
    this.resetContainer(this.panRoot, 0, 0);
    this.resetContainer(this.shakeRoot, 0, 0);
    this.resetContainer(this.sceneHost, 0, 0);
    this.teacher?.reset();
    this.cityScene?.reset();
    this.hallwayScene?.reset();
    this.classroomScene?.reset();
  }

  private getResetChecks(): RuntimeResetChecks {
    return {
      panRoot: this.isContainerReset(this.panRoot, 0, 0),
      shakeRoot: this.isContainerReset(this.shakeRoot, 0, 0),
      teacher: this.classroomScene?.isTeacherReset() ?? false,
      sceneRoots: this.areSceneRootsReset(),
    };
  }

  private areSceneRootsReset(): boolean {
    return (
      this.isContainerVisibility(this.classroomScene?.root, true) &&
      this.isContainerVisibility(this.cityScene?.root, false) &&
      this.isContainerVisibility(this.hallwayScene?.root, false) &&
      this.isContainerVisibility(this.transitionEffects?.root, false)
    );
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

  private isContainerVisibility(container: Container | undefined, visible: boolean): boolean {
    return (
      container !== undefined &&
      container.visible === visible &&
      nearlyEqual(container.alpha, visible ? 1 : 0) &&
      nearlyEqual(container.x, 0) &&
      nearlyEqual(container.y, 0) &&
      nearlyEqual(container.rotation, 0) &&
      nearlyEqual(container.scale.x, 1) &&
      nearlyEqual(container.scale.y, 1) &&
      nearlyEqual(container.pivot.x, 0) &&
      nearlyEqual(container.pivot.y, 0) &&
      nearlyEqual(container.skew.x, 0) &&
      nearlyEqual(container.skew.y, 0) &&
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

function normalizeTimelineTime(time: number, start: number, end: number): number {
  if (end <= start) return time >= end ? 1 : 0;
  return Math.max(0, Math.min(1, (time - start) / (end - start)));
}
