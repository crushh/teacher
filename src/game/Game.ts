import { gsap } from 'gsap';
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH, RENDERER_CONFIG } from './config';
import { configurePixelTexture } from './pixel';

const COLORS = {
  background: 0x0b1018,
  panel: 0x121c2a,
  panelHighlight: 0x1d2d41,
  grid: 0x7ca5c6,
  primary: 0xf6f0d7,
  muted: 0x91a8b9,
  accent: 0xffc857,
  success: 0x6ee7b7,
  pixelPink: 0xff6b9d,
  pixelBlue: 0x57c7ff,
} as const;

export class Game {
  readonly panRoot = new Container({ label: 'panRoot' });
  readonly shakeRoot = new Container({ label: 'shakeRoot' });
  readonly sceneHost = new Container({ label: 'sceneHost' });

  private readonly mount: HTMLElement;
  private readonly handleResize = (): void => this.resize();
  private app: Application | undefined;
  private statusDot: Graphics | undefined;
  private bootTimeline: gsap.core.Timeline | undefined;

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
    this.createBootstrapView();
    this.setCanvasMetadata();

    window.addEventListener('resize', this.handleResize, { passive: true });
    window.visualViewport?.addEventListener('resize', this.handleResize, { passive: true });
    this.resize();

    const statusDot = this.statusDot;
    if (!statusDot) {
      throw new Error('Bootstrap status indicator was not created.');
    }

    this.bootTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    this.bootTimeline.to(statusDot, {
      alpha: 0.35,
      duration: 0.8,
      ease: 'sine.inOut',
    });
  }

  private createBootstrapView(): void {
    const background = new Graphics()
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill(COLORS.background);
    this.sceneHost.addChild(background);

    const grid = new Graphics();
    for (let x = 0; x <= GAME_WIDTH; x += 40) {
      grid.rect(x, 0, 1, GAME_HEIGHT).fill({ color: COLORS.grid, alpha: 0.08 });
    }
    for (let y = 0; y <= GAME_HEIGHT; y += 40) {
      grid.rect(0, y, GAME_WIDTH, 1).fill({ color: COLORS.grid, alpha: 0.08 });
    }
    this.sceneHost.addChild(grid);

    const header = new Graphics()
      .rect(0, 0, GAME_WIDTH, 48)
      .fill({ color: COLORS.panel, alpha: 0.96 });
    this.sceneHost.addChild(header);

    const title = new Text({
      text: 'PIXEL TEACHER ADVENTURE',
      style: {
        fill: COLORS.primary,
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
      },
    });
    title.position.set(24, 16);
    this.sceneHost.addChild(title);

    const phase = new Text({
      text: 'PHASE 0 / BOOTSTRAP',
      style: {
        fill: COLORS.accent,
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
      },
    });
    phase.anchor.set(1, 0);
    phase.position.set(GAME_WIDTH - 24, 18);
    this.sceneHost.addChild(phase);

    const card = new Graphics()
      .roundRect(36, 72, GAME_WIDTH - 72, 236, 8)
      .fill({ color: COLORS.panel, alpha: 0.92 })
      .stroke({ color: COLORS.panelHighlight, width: 2, alpha: 0.9 });
    this.sceneHost.addChild(card);

    const cardTitle = new Text({
      text: 'RUNTIME ONLINE',
      style: {
        fill: COLORS.success,
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1.5,
      },
    });
    cardTitle.position.set(64, 96);
    this.sceneHost.addChild(cardTitle);

    this.statusDot = new Graphics()
      .circle(52, 107, 5)
      .fill(COLORS.success);
    this.sceneHost.addChild(this.statusDot);

    const details = new Text({
      text: 'PixiJS 8 renderer is using a fixed logical world.\nThe canvas below is displayed responsively without stretching.',
      style: {
        fill: COLORS.muted,
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 17,
      },
    });
    details.position.set(64, 128);
    this.sceneHost.addChild(details);

    const worldFrame = new Graphics()
      .roundRect(64, 180, 300, 90, 4)
      .fill({ color: 0x0c1521, alpha: 1 })
      .stroke({ color: COLORS.grid, width: 1, alpha: 0.45 });
    this.sceneHost.addChild(worldFrame);

    const worldLabel = new Text({
      text: 'LOGICAL WORLD',
      style: {
        fill: COLORS.muted,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
      },
    });
    worldLabel.position.set(78, 194);
    this.sceneHost.addChild(worldLabel);

    const worldSize = new Text({
      text: '640 × 360',
      style: {
        fill: COLORS.primary,
        fontFamily: 'monospace',
        fontSize: 26,
        fontWeight: '700',
      },
    });
    worldSize.position.set(78, 216);
    this.sceneHost.addChild(worldSize);

    const worldRatio = new Text({
      text: '16:9  /  RESOLUTION 1',
      style: {
        fill: COLORS.accent,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
      },
    });
    worldRatio.position.set(80, 251);
    this.sceneHost.addChild(worldRatio);

    const samplingFrame = new Graphics()
      .roundRect(382, 180, 162, 90, 4)
      .fill({ color: 0x0c1521, alpha: 1 })
      .stroke({ color: COLORS.grid, width: 1, alpha: 0.45 });
    this.sceneHost.addChild(samplingFrame);

    const samplingLabel = new Text({
      text: 'PIXEL SAMPLING',
      style: {
        fill: COLORS.muted,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
      },
    });
    samplingLabel.position.set(396, 194);
    this.sceneHost.addChild(samplingLabel);

    const pixelTexture = configurePixelTexture(Texture.from(this.createPixelCanvas()));
    const pixelSample = new Sprite(pixelTexture);
    pixelSample.position.set(398, 216);
    pixelSample.width = 40;
    pixelSample.height = 40;
    this.sceneHost.addChild(pixelSample);

    const samplingValue = new Text({
      text: 'NEAREST',
      style: {
        fill: COLORS.success,
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: '700',
      },
    });
    samplingValue.position.set(452, 230);
    this.sceneHost.addChild(samplingValue);

    const hierarchy = new Text({
      text: 'stage  ›  panRoot  ›  shakeRoot  ›  sceneHost',
      style: {
        fill: COLORS.muted,
        fontFamily: 'monospace',
        fontSize: 10,
      },
    });
    hierarchy.anchor.set(0.5, 0);
    hierarchy.position.set(GAME_WIDTH / 2, 326);
    this.sceneHost.addChild(hierarchy);
  }

  private createPixelCanvas(): HTMLCanvasElement {
    const pixelCanvas = document.createElement('canvas');
    pixelCanvas.width = 4;
    pixelCanvas.height = 4;

    const context = pixelCanvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create the pixel sampling test texture.');
    }

    context.imageSmoothingEnabled = false;
    const pixels = [
      [COLORS.pixelPink, COLORS.pixelBlue, COLORS.pixelPink, COLORS.pixelBlue],
      [COLORS.pixelBlue, COLORS.pixelPink, COLORS.pixelBlue, COLORS.pixelPink],
      [COLORS.pixelPink, COLORS.pixelBlue, COLORS.pixelPink, COLORS.pixelBlue],
      [COLORS.pixelBlue, COLORS.pixelPink, COLORS.pixelBlue, COLORS.pixelPink],
    ];

    pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillRect(x, y, 1, 1);
      });
    });

    return pixelCanvas;
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
