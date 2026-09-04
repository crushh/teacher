import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH, RUNTIME_CONFIG } from '../game/config';
import { Teacher } from '../entities/Teacher';
import type { Scene } from './Scene';

const COLORS = {
  background: 0x0b1018,
  panel: 0x121c2a,
  panelHighlight: 0x1d2d41,
  grid: 0x7ca5c6,
  primary: 0xf6f0d7,
  muted: 0x91a8b9,
  accent: 0xffc857,
  success: 0x6ee7b7,
  route: 0x57c7ff,
} as const;

export class FoundationScene implements Scene {
  readonly id = 'runtime-foundation';
  readonly teacher = new Teacher();

  private readonly sceneHost: Container;
  private readonly panRoot: Container;
  private readonly shakeRoot: Container;
  private readonly timelines = new Set<gsap.core.Timeline>();
  private built = false;

  constructor(sceneHost: Container, panRoot: Container, shakeRoot: Container) {
    this.sceneHost = sceneHost;
    this.panRoot = panRoot;
    this.shakeRoot = shakeRoot;
  }

  build(): void {
    if (this.built) return;

    this.sceneHost.addChild(this.createBackground());
    this.sceneHost.addChild(this.createHeader());
    this.sceneHost.addChild(this.createPanel());
    this.sceneHost.addChild(this.createTrack());
    this.sceneHost.addChild(this.teacher.root);
    this.sceneHost.addChild(this.createFooter());
    this.built = true;
  }

  createTimeline(): gsap.core.Timeline {
    if (!this.built) {
      this.build();
    }

    const timeline = gsap.timeline({
      id: `scene:${this.id}`,
      defaults: { overwrite: 'auto' },
    });

    timeline.to(
      this.teacher.root,
      {
        x: RUNTIME_CONFIG.teacher.endX,
        duration: RUNTIME_CONFIG.probe.duration,
        ease: 'power2.inOut',
      },
      0,
    );
    timeline.to(
      this.teacher.visual,
      {
        y: -RUNTIME_CONFIG.probe.bobHeight,
        rotation: RUNTIME_CONFIG.probe.visualRotation,
        duration: RUNTIME_CONFIG.probe.bobDuration,
        ease: 'sine.inOut',
        repeat: RUNTIME_CONFIG.probe.bobRepeats,
        yoyo: true,
      },
      0,
    );
    timeline.to(
      this.panRoot,
      {
        x: -RUNTIME_CONFIG.probe.panDistance,
        duration: RUNTIME_CONFIG.probe.duration / 2,
        ease: 'sine.inOut',
      },
      RUNTIME_CONFIG.probe.panStart,
    );
    timeline.to(
      this.panRoot,
      {
        x: 0,
        duration: RUNTIME_CONFIG.probe.duration / 2,
        ease: 'sine.inOut',
      },
      RUNTIME_CONFIG.probe.panStart + RUNTIME_CONFIG.probe.duration / 2,
    );
    timeline.to(
      this.shakeRoot,
      {
        x: RUNTIME_CONFIG.probe.shakeStrength,
        duration: RUNTIME_CONFIG.probe.shakeStep,
        ease: 'none',
        repeat: RUNTIME_CONFIG.probe.shakeRepeats,
        yoyo: true,
      },
      RUNTIME_CONFIG.probe.shakeStart,
    );
    timeline.to(
      this.shakeRoot,
      {
        x: 0,
        duration: RUNTIME_CONFIG.probe.shakeStep,
        ease: 'none',
      },
      RUNTIME_CONFIG.probe.shakeStart + RUNTIME_CONFIG.probe.shakeStep * (RUNTIME_CONFIG.probe.shakeRepeats + 1),
    );

    this.timelines.add(timeline);

    return timeline;
  }

  reset(): void {
    this.teacher.reset();
  }

  dispose(): void {
    this.timelines.forEach((timeline) => timeline.kill());
    this.timelines.clear();
    this.sceneHost.removeChildren();
    this.built = false;
  }

  private createBackground(): Graphics {
    const background = new Graphics()
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill(COLORS.background);

    for (let x = 0; x <= GAME_WIDTH; x += 40) {
      background.rect(x, 0, 1, GAME_HEIGHT).fill({ color: COLORS.grid, alpha: 0.08 });
    }
    for (let y = 0; y <= GAME_HEIGHT; y += 40) {
      background.rect(0, y, GAME_WIDTH, 1).fill({ color: COLORS.grid, alpha: 0.08 });
    }

    return background;
  }

  private createHeader(): Graphics {
    return new Graphics()
      .rect(0, 0, GAME_WIDTH, 48)
      .fill({ color: COLORS.panel, alpha: 0.98 });
  }

  private createPanel(): Container {
    const panel = new Container({ label: 'foundationPanel' });
    const card = new Graphics()
      .roundRect(32, 66, GAME_WIDTH - 64, 152, 8)
      .fill({ color: COLORS.panel, alpha: 0.94 })
      .stroke({ color: COLORS.panelHighlight, width: 2, alpha: 0.9 });
    panel.addChild(card);

    const title = new Text({
      text: 'RUNTIME FOUNDATION',
      style: {
        fill: COLORS.success,
        fontFamily: 'monospace',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 1.3,
      },
    });
    title.position.set(54, 86);
    panel.addChild(title);

    const description = new Text({
      text: 'A single master clock drives this placeholder probe.\nUse the panel to test deterministic playback and reset.',
      style: {
        fill: COLORS.muted,
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: 16,
      },
    });
    description.position.set(54, 114);
    panel.addChild(description);

    const architecture = new Text({
      text: 'Teacher.root  ›  Teacher.visual',
      style: {
        fill: COLORS.accent,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
      },
    });
    architecture.position.set(54, 160);
    panel.addChild(architecture);

    const camera = new Text({
      text: 'panRoot  ≠  shakeRoot',
      style: {
        fill: COLORS.route,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
      },
    });
    camera.position.set(54, 183);
    panel.addChild(camera);

    const phase = new Text({
      text: 'PHASE 1 / RUNTIME FOUNDATION',
      style: {
        fill: COLORS.accent,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
      },
    });
    phase.anchor.set(1, 0);
    phase.position.set(GAME_WIDTH - 22, 19);
    panel.addChild(phase);

    const titleBrand = new Text({
      text: 'PIXEL TEACHER ADVENTURE',
      style: {
        fill: COLORS.primary,
        fontFamily: 'monospace',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.7,
      },
    });
    titleBrand.position.set(22, 16);
    panel.addChild(titleBrand);

    return panel;
  }

  private createTrack(): Container {
    const track = new Container({ label: 'timelineProbeTrack' });
    track.position.set(58, 266);

    track.addChild(new Graphics()
      .roundRect(0, 0, GAME_WIDTH - 116, 2, 1)
      .fill({ color: COLORS.route, alpha: 0.35 }));

    const markers = [0, 1, 2, 3, 4].map((second) => {
      const marker = new Graphics()
        .circle((GAME_WIDTH - 116) * (second / 4), 1, 4)
        .fill(second === 0 || second === 4 ? COLORS.accent : COLORS.route);
      track.addChild(marker);

      const label = new Text({
        text: `${second}s`,
        style: {
          fill: COLORS.muted,
          fontFamily: 'monospace',
          fontSize: 9,
        },
      });
      label.anchor.set(0.5, 0);
      label.position.set((GAME_WIDTH - 116) * (second / 4), 9);
      track.addChild(label);

      return marker;
    });

    void markers;
    return track;
  }

  private createFooter(): Text {
    const footer = new Text({
      text: 'stage  ›  panRoot  ›  shakeRoot  ›  sceneHost       fixed world 640 × 360',
      style: {
        fill: COLORS.muted,
        fontFamily: 'monospace',
        fontSize: 9,
      },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(GAME_WIDTH / 2, 316);

    return footer;
  }
}
