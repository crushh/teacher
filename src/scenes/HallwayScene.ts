import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

import { cameraShake } from '../animations/cameraShake';
import { squash } from '../animations/squash';
import { Book } from '../entities/Book';
import { Door } from '../entities/Door';
import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG } from '../game/config';
import { Teacher } from '../entities/Teacher';
import type { Scene, GsapTimeline } from './Scene';

const COLORS = {
  wall: 0x596b89,
  wallDark: 0x3d4b69,
  floor: 0x8f6558,
  tile: 0xb6826b,
  trim: 0xe2c29b,
  text: 0xf6f0d7,
  accent: 0xffc857,
  speed: 0xffe4a6,
} as const;

export class HallwayScene implements Scene {
  readonly id = 'hallway';
  readonly root = new Container({ label: 'HallwayScene.root' });
  readonly book = new Book(318, 224);
  readonly door = new Door(518, 305);

  private readonly teacher: Teacher;
  private readonly shakeRoot: Container;
  private readonly dust = new Container({ label: 'hallwayLandingDust' });
  private readonly endingCard = new Container({ label: 'endingCard' });
  private activeTimeline: GsapTimeline | undefined;
  private context: gsap.Context | undefined;
  private built = false;

  constructor(teacher: Teacher, shakeRoot: Container, sceneHost: Container) {
    this.teacher = teacher;
    this.shakeRoot = shakeRoot;
    sceneHost.addChild(this.root);
  }

  build(): void {
    if (this.built) return;

    this.root.addChild(this.createBackground());
    this.root.addChild(this.createLockers());
    this.root.addChild(this.door.root);
    this.root.addChild(this.createDoorLabel());
    this.root.addChild(this.book.root);
    this.createDust();
    this.root.addChild(this.dust);
    this.createEndingCard();
    this.root.addChild(this.endingCard);
    this.built = true;
    this.reset();
  }

  createTimeline(): GsapTimeline {
    if (!this.built) this.build();

    this.context?.revert();

    let timeline: GsapTimeline | undefined;
    this.context = gsap.context(() => {
      timeline = gsap.timeline({
        id: `scene:${this.id}`,
        defaults: { overwrite: 'auto' },
      });
      this.activeTimeline = timeline;

      timeline.set(this.root, { visible: true, alpha: 1 }, 0);
      timeline.set(this.endingCard, { visible: true, alpha: 0 }, 0);
      timeline.set(this.book.root, { x: 318, y: 224, rotation: 0, visible: false, alpha: 1 }, 0);
      timeline.set(this.teacher.root, {
        x: MOVIE_CONFIG.hallway.fallStartX,
        y: MOVIE_CONFIG.hallway.fallStartY,
        visible: false,
        alpha: 1,
      }, 0);
      timeline.call(() => this.teacher.setPose('fall'), [], 0);
      timeline.set(this.teacher.root, { visible: true }, 0);
      timeline.to(this.teacher.root, {
        y: MOVIE_CONFIG.hallway.landingY,
        duration: 0.95,
        ease: 'bounce.out',
      }, 0);
      timeline.call(() => this.teacher.setPose('idle'), [], 0.95);
      timeline.add(squash(this.teacher.visual, 0.22, 0.2), 0.98);
      timeline.add(cameraShake(this.shakeRoot, { strength: 5, duration: 0.16 }), 0.98);
      timeline.set(this.dust, { x: 185, y: MOVIE_CONFIG.hallway.landingY, visible: true, alpha: 1 }, 0.98);
      timeline.to(this.dust, { y: MOVIE_CONFIG.hallway.landingY - 14, alpha: 0, duration: 0.35, ease: 'power1.out' }, 0.98);

      const rollAt = MOVIE_CONFIG.hallway.rollStartAt;
      const rollEnd = rollAt + MOVIE_CONFIG.hallway.rollDuration;
      timeline.call(() => this.teacher.setPose('roll'), [], rollAt);
      timeline.to(this.teacher.root, {
        x: 312,
        duration: MOVIE_CONFIG.hallway.rollDuration,
        ease: 'power1.inOut',
      }, rollAt);
      timeline.to(this.teacher.visual, {
        rotation: Math.PI * 2,
        duration: MOVIE_CONFIG.hallway.rollDuration,
        ease: 'power1.inOut',
      }, rollAt);
      timeline.set(this.teacher.visual, { rotation: 0 }, rollEnd);
      timeline.call(() => this.teacher.setPose('idle'), [], rollEnd);

      timeline.set(this.book.root, {
        x: 318,
        y: -34,
        rotation: -0.16,
        visible: true,
        alpha: 1,
      }, MOVIE_CONFIG.hallway.bookDropAt);
      timeline.to(this.book.root, {
        x: 312,
        y: 220,
        rotation: 0.9,
        duration: MOVIE_CONFIG.hallway.bookCatchAt - MOVIE_CONFIG.hallway.bookDropAt,
        ease: 'power2.in',
      }, MOVIE_CONFIG.hallway.bookDropAt);
      timeline.call(() => this.teacher.setPose('catch'), [], MOVIE_CONFIG.hallway.bookCatchAt);
      timeline.to(this.book.root, {
        x: 320,
        y: 224,
        rotation: 0,
        duration: 0.18,
        ease: 'back.out(2)',
      }, MOVIE_CONFIG.hallway.bookCatchAt);
      timeline.call(() => this.teacher.setPose('holdBook'), [], MOVIE_CONFIG.hallway.bookCatchAt + 0.18);

      timeline.to(this.teacher.root, {
        x: 442,
        duration: 2.85,
        ease: 'power1.inOut',
      }, 3.45);
      timeline.to(this.book.root, {
        x: 450,
        duration: 2.85,
        ease: 'power1.inOut',
      }, 3.45);
      timeline.call(() => this.teacher.setPose('openDoor'), [], MOVIE_CONFIG.hallway.doorOpenAt);
      timeline.call(() => this.door.open(), [], MOVIE_CONFIG.hallway.doorOpenAt);
      timeline.to(this.teacher.root, {
        x: 596,
        duration: 1.25,
        ease: 'power2.in',
      }, MOVIE_CONFIG.hallway.entryAt);
      timeline.to(this.book.root, {
        x: 604,
        duration: 1.25,
        ease: 'power2.in',
      }, MOVIE_CONFIG.hallway.entryAt);
      timeline.to(this.endingCard, {
        alpha: 1,
        duration: 0.35,
        ease: 'power1.out',
      }, 8.9);
    });

    if (!timeline) {
      throw new Error('HallwayScene timeline was not created.');
    }

    return timeline;
  }

  createExitTimeline(): GsapTimeline {
    if (!this.built || !this.context) {
      throw new Error('HallwayScene exit timeline requires a built scene timeline.');
    }

    return this.context.add(() => {
      const hallwayExitTL = gsap.timeline({
        id: 'hallwayExitTL',
        defaults: { overwrite: 'auto' },
      });

      hallwayExitTL.set(this.teacher.root, {
        x: 596,
        y: MOVIE_CONFIG.hallway.landingY,
        visible: true,
        alpha: 1,
      }, 0);
      hallwayExitTL.set(this.book.root, {
        x: 604,
        y: 224,
        rotation: 0,
        visible: true,
        alpha: 1,
      }, 0);
      hallwayExitTL.call(() => this.teacher.setPose('run'), [], 0);
      hallwayExitTL.to(this.teacher.root, {
        x: MOVIE_CONFIG.hallway.exitX,
        duration: MOVIE_CONFIG.hallway.exitDuration,
        ease: 'power1.in',
      }, 0);
      hallwayExitTL.to(this.book.root, {
        x: MOVIE_CONFIG.hallway.exitX + 8,
        duration: MOVIE_CONFIG.hallway.exitDuration,
        ease: 'power1.in',
      }, 0);
      hallwayExitTL.to(this.endingCard, {
        alpha: 0,
        duration: 0.18,
        ease: 'power1.in',
      }, MOVIE_CONFIG.hallway.exitDuration - 0.28);
      hallwayExitTL.set(this.teacher.root, { visible: false }, MOVIE_CONFIG.hallway.exitDuration);
      hallwayExitTL.set(this.book.root, { visible: false }, MOVIE_CONFIG.hallway.exitDuration);
      hallwayExitTL.set(this.root, { visible: false, alpha: 0 }, MOVIE_CONFIG.hallway.exitDuration);

      return hallwayExitTL;
    });
  }

  reset(): void {
    this.resetContainer(this.root, false);
    this.resetContainer(this.dust, false);
    this.resetContainer(this.endingCard, false);
    this.teacher.reset();
    this.resetTeacherForFall();
    this.book.reset();
    this.door.reset();
  }

  isTeacherReset(): boolean {
    return (
      nearlyEqual(this.teacher.root.x, MOVIE_CONFIG.hallway.fallStartX) &&
      nearlyEqual(this.teacher.root.y, MOVIE_CONFIG.hallway.fallStartY) &&
      nearlyEqual(this.teacher.root.rotation, 0) &&
      nearlyEqual(this.teacher.root.scale.x, 1) &&
      nearlyEqual(this.teacher.root.scale.y, 1) &&
      nearlyEqual(this.teacher.root.alpha, 1) &&
      !this.teacher.root.visible &&
      nearlyEqual(this.teacher.visual.x, 0) &&
      nearlyEqual(this.teacher.visual.y, 0) &&
      nearlyEqual(this.teacher.visual.rotation, 0) &&
      nearlyEqual(this.teacher.visual.scale.x, 1) &&
      nearlyEqual(this.teacher.visual.scale.y, 1)
    );
  }

  dispose(): void {
    this.activeTimeline?.kill();
    this.context?.revert();
    this.activeTimeline = undefined;
    this.context = undefined;
    this.root.removeChildren();
    this.built = false;
  }

  private createBackground(): Graphics {
    const background = new Graphics()
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill(COLORS.wall)
      .rect(0, 286, GAME_WIDTH, 74)
      .fill(COLORS.floor)
      .rect(0, 276, GAME_WIDTH, 10)
      .fill(COLORS.trim)
      .rect(0, 300, GAME_WIDTH, 3)
      .fill({ color: COLORS.tile, alpha: 0.6 });
    for (let x = 0; x < GAME_WIDTH; x += 64) {
      background.rect(x, 303, 2, 57).fill({ color: COLORS.tile, alpha: 0.65 });
    }
    return background;
  }

  private createLockers(): Container {
    const lockers = new Container({ label: 'hallwayLockers' });
    for (let i = 0; i < 7; i += 1) {
      const locker = new Graphics()
        .rect(28 + i * 53, 76, 47, 178)
        .fill(i % 2 === 0 ? COLORS.wallDark : 0x465778)
        .stroke({ color: COLORS.trim, width: 1, alpha: 0.55 })
        .rect(34 + i * 53, 96, 31, 3)
        .fill({ color: COLORS.trim, alpha: 0.45 })
        .rect(55 + i * 53, 210, 7, 3)
        .fill(COLORS.accent);
      lockers.addChild(locker);
    }
    return lockers;
  }

  private createDoorLabel(): Text {
    const label = new Text({
      text: 'CLASSROOM  1-A',
      style: {
        fill: COLORS.text,
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: '700',
      },
    });
    label.position.set(470, 186);
    return label;
  }

  private createDust(): void {
    for (let i = 0; i < 8; i += 1) {
      this.dust.addChild(new Graphics()
        .circle((i - 3.5) * 6, -2 - (i % 2) * 3, 2 + (i % 3))
        .fill({ color: COLORS.speed, alpha: 0.85 }));
    }
  }

  private createEndingCard(): void {
    const card = new Graphics()
      .roundRect(170, 28, 300, 48, 5)
      .fill({ color: 0x1c2a3d, alpha: 0.95 })
      .stroke({ color: COLORS.accent, width: 2 });
    const title = new Text({
      text: 'BACK TO CLASS  /  PERFECTLY NORMAL',
      style: {
        fill: COLORS.accent,
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
      },
    });
    title.anchor.set(0.5);
    title.position.set(320, 52);
    this.endingCard.addChild(card, title);
  }

  private resetContainer(container: Container, visible: boolean): void {
    container.position.set(0, 0);
    container.rotation = 0;
    container.scale.set(1, 1);
    container.pivot.set(0, 0);
    container.skew.set(0, 0);
    container.alpha = visible ? 1 : 0;
    container.visible = visible;
    container.tint = 0xffffff;
  }

  private resetTeacherForFall(): void {
    this.teacher.root.position.set(MOVIE_CONFIG.hallway.fallStartX, MOVIE_CONFIG.hallway.fallStartY);
    this.teacher.root.rotation = 0;
    this.teacher.root.scale.set(1, 1);
    this.teacher.root.pivot.set(0, 0);
    this.teacher.root.skew.set(0, 0);
    this.teacher.root.alpha = 1;
    this.teacher.root.visible = false;
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}
