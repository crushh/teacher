import { gsap } from 'gsap';
import { Container, Graphics, Sprite, Text } from 'pixi.js';

import { cameraShake } from '../animations/cameraShake';
import { squash } from '../animations/squash';
import { Book } from '../entities/Book';
import type { HallwayAssets } from '../assets/hallwayAssets';
import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG } from '../game/config';
import { Teacher } from '../entities/Teacher';
import type { AudioManager } from '../audio/AudioManager';
import type { Scene, GsapTimeline } from './Scene';

const COLORS = {
  text: 0xf6f0d7,
  accent: 0xffc857,
} as const;

export class HallwayScene implements Scene {
  readonly id = 'hallway';
  readonly root = new Container({ label: 'HallwayScene.root' });
  readonly book = new Book(318, 224);

  private readonly teacher: Teacher;
  private readonly audio: AudioManager | undefined;
  private readonly shakeRoot: Container;
  private readonly hallwayAssets: HallwayAssets;
  private readonly hallwayBg: Sprite;
  private readonly impact = new Container({ label: 'hallwayLandingImpact' });
  private readonly impactVisual: Sprite;
  private readonly rollRoot = new Container({ label: 'hallwayRollEffect.root' });
  private readonly rollVisual: Sprite;
  private readonly dust = new Container({ label: 'hallwayResidualDust' });
  private readonly dustVisual: Sprite;
  private readonly endingCard = new Container({ label: 'endingCard' });
  private activeTimeline: GsapTimeline | undefined;
  private context: gsap.Context | undefined;
  private built = false;

  constructor(
    teacher: Teacher,
    shakeRoot: Container,
    sceneHost: Container,
    hallwayAssets: HallwayAssets,
    audio?: AudioManager,
  ) {
    this.teacher = teacher;
    this.shakeRoot = shakeRoot;
    this.hallwayAssets = hallwayAssets;
    this.audio = audio;
    this.hallwayBg = new Sprite(hallwayAssets.hallwayBgDoorClose);
    this.hallwayBg.label = 'hallwayBackground';
    this.hallwayBg.position.set(0, 0);
    this.hallwayBg.width = GAME_WIDTH;
    this.hallwayBg.height = GAME_HEIGHT;
    this.rollVisual = new Sprite(hallwayAssets.rollSwirl01);
    this.rollVisual.anchor.set(0.5);
    this.impactVisual = new Sprite(hallwayAssets.rollImpact);
    this.impactVisual.anchor.set(0.5);
    this.dustVisual = new Sprite(hallwayAssets.rollDust);
    this.dustVisual.anchor.set(0.5);
    this.impact.addChild(this.impactVisual);
    this.rollRoot.addChild(this.rollVisual);
    this.dust.addChild(this.dustVisual);
    sceneHost.addChild(this.root);
  }

  build(): void {
    if (this.built) return;

    this.root.addChild(this.hallwayBg);
    this.root.addChild(this.book.root);
    this.root.addChild(this.impact, this.rollRoot, this.dust);
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

      const hallway = MOVIE_CONFIG.hallway;
      const landingAt = hallway.fallDuration;
      const rollEndAt = hallway.rollStartAt + hallway.rollDuration;
      const rollEndAppearAt = rollEndAt + hallway.residualDustDuration;
      const bookDropAt = rollEndAppearAt + hallway.rollEndPauseDuration;
      const walkOutAt = hallway.bookCatchAt + hallway.bookCatchSettleDuration;
      const walkEndAt = walkOutAt + hallway.walkOutDuration;

      timeline.addLabel('hallway:start', 0);
      timeline.addLabel('fall:start', 0);
      timeline.addLabel('hallway:landing', landingAt);
      timeline.addLabel('roll:start', hallway.rollStartAt);
      timeline.addLabel('roll:end', rollEndAt);
      timeline.addLabel('rollEnd:show', rollEndAppearAt);
      timeline.addLabel('book:drop', bookDropAt);
      timeline.addLabel('book:catch', hallway.bookCatchAt);
      timeline.addLabel('walk:out', walkOutAt);
      timeline.addLabel('walk:end', walkEndAt);
      timeline.addLabel('hallway:end', hallway.endingCardAt + hallway.endingCardDuration);

      timeline.set(this.root, { visible: true, alpha: 1 }, 'hallway:start');
      timeline.set(this.endingCard, { visible: true, alpha: 0 }, 'hallway:start');
      timeline.set(this.book.root, { x: 318, y: 224, rotation: 0, visible: false, alpha: 1 }, 'hallway:start');
      timeline.set(this.teacher.root, {
        x: hallway.fallStartX,
        y: hallway.fallStartY,
        visible: false,
        alpha: 1,
      }, 'hallway:start');
      timeline.set(this.teacher.visual, { x: 0, y: 0, rotation: 0 }, 'hallway:start');
      timeline.set(this.teacher.visual.scale, { x: 1, y: 1 }, 'hallway:start');
      timeline.set(this.impact, {
        x: hallway.fallStartX,
        y: hallway.groundY,
        visible: false,
        alpha: 1,
      }, 'hallway:start');
      timeline.set(this.impactVisual, { x: 0, y: hallway.impactVisualY, rotation: 0 }, 'hallway:start');
      timeline.set(this.impactVisual.scale, { x: hallway.impactScale, y: hallway.impactScale }, 'hallway:start');
      timeline.set(this.rollRoot, {
        x: hallway.rollStartX,
        y: hallway.groundY,
        visible: false,
        alpha: 1,
      }, 'hallway:start');
      timeline.set(this.rollVisual, { x: 0, y: hallway.rollVisualY, rotation: 0 }, 'hallway:start');
      timeline.set(this.rollVisual.scale, { x: hallway.rollScale, y: hallway.rollScale }, 'hallway:start');
      timeline.call(() => this.audio?.stop('roll'), [], 'roll:end');
      timeline.set(this.dust, {
        x: hallway.rollEndX,
        y: hallway.groundY,
        visible: false,
        alpha: 1,
      }, 'hallway:start');
      timeline.set(this.dustVisual, { x: 0, y: hallway.dustVisualY, rotation: 0 }, 'hallway:start');
      timeline.set(this.dustVisual.scale, { x: hallway.dustScale, y: hallway.dustScale }, 'hallway:start');
      timeline.set(this.dust.scale, { x: 1, y: 1 }, 'hallway:start');
      timeline.call(() => this.teacher.setPose('fall', hallway.teacherScale), [], 'fall:start');
      timeline.set(this.teacher.root, { visible: true }, 'fall:start');
      timeline.to(this.teacher.root, {
        y: hallway.landingY,
        duration: hallway.fallDuration,
        ease: 'power2.in',
      }, 'fall:start');
      timeline.set(this.impact, { visible: true, alpha: 1 }, 'hallway:landing');
      timeline.call(() => this.audio?.play('landing'), [], 'hallway:landing');
      timeline.add(squash(this.teacher.visual, 0.12, hallway.landingImpactDuration), 'hallway:landing');
      timeline.add(cameraShake(this.shakeRoot, {
        strength: hallway.landingShakeStrength,
        duration: hallway.landingImpactDuration,
      }), 'hallway:landing');
      timeline.to(this.impact, {
        alpha: 0,
        duration: hallway.landingImpactDuration,
        ease: 'none',
      }, 'hallway:landing');
      timeline.call(() => this.startRollEffect(), [], 'roll:start');
      timeline.call(() => this.audio?.play('roll'), [], 'roll:start');
      timeline.to(this.rollRoot, {
        x: hallway.rollEndX,
        duration: hallway.rollDuration,
        ease: 'power2.out',
      }, 'roll:start');

      for (let frameIndex = 1; ; frameIndex += 1) {
        const frameAt = hallway.rollStartAt + frameIndex * hallway.rollFrameDuration;
        if (frameAt >= rollEndAt) break;

        const frameTexture = frameIndex % 2 === 1
          ? this.hallwayAssets.rollSwirl02
          : this.hallwayAssets.rollSwirl01;
        const pulse = frameIndex % 2 === 1;
        const frameTweenDuration = Math.min(
          hallway.rollFrameDuration * 0.5,
          rollEndAt - frameAt,
        );
        timeline.call(() => {
          this.rollVisual.texture = frameTexture;
        }, [], frameAt);
        timeline.to(this.rollVisual, {
          y: hallway.rollVisualY + (pulse ? -1 : 0),
          rotation: pulse ? 0.035 : -0.035,
          duration: frameTweenDuration,
          ease: 'sine.inOut',
        }, frameAt);
        timeline.to(this.rollVisual.scale, {
          x: hallway.rollScale * (pulse ? 1.02 : 1),
          y: hallway.rollScale * (pulse ? 0.98 : 1),
          duration: frameTweenDuration,
          ease: 'sine.inOut',
        }, frameAt);
        timeline.to(this.rollRoot, {
          y: hallway.groundY - (pulse ? 2 : 0),
          duration: frameTweenDuration,
          ease: 'sine.inOut',
        }, frameAt);
      }
      timeline.set(this.dust, {
        x: hallway.rollEndX,
        y: hallway.groundY,
        visible: true,
        alpha: 1,
      }, 'roll:end');
      timeline.set(this.dustVisual, { x: 0, y: hallway.dustVisualY, rotation: 0 }, 'roll:end');
      timeline.set(this.dustVisual.scale, { x: hallway.dustScale, y: hallway.dustScale }, 'roll:end');
      timeline.set(this.dust.scale, {
        x: hallway.dustStartScale,
        y: hallway.dustStartScale,
      }, 'roll:end');
      timeline.to(this.dust, {
        alpha: 0,
        duration: hallway.residualDustDuration,
        ease: 'power1.out',
      }, 'roll:end');
      timeline.to(this.dust.scale, {
        x: hallway.dustEndScale,
        y: hallway.dustEndScale,
        duration: hallway.residualDustDuration,
        ease: 'power1.out',
      }, 'roll:end');
      timeline.set(this.dust, { visible: false, alpha: 1 }, 'rollEnd:show');
      timeline.call(() => this.finishRoll(), [], 'rollEnd:show');
      timeline.call(() => this.audio?.play('falling'), [], 'rollEnd:show');

      timeline.set(this.book.root, {
        x: 318,
        y: -34,
        rotation: -0.16,
        visible: true,
        alpha: 1,
      }, 'book:drop');
      timeline.to(this.book.root, {
        x: 312,
        y: 220,
        rotation: 0.9,
        duration: hallway.bookCatchAt - bookDropAt,
        ease: 'power2.in',
      }, 'book:drop');
      timeline.call(() => this.teacher.setPose('walkBook', hallway.teacherScale), [], 'book:catch');
      timeline.call(() => this.audio?.play('catch'), [], 'book:catch');
      timeline.to(this.book.root, {
        x: 320,
        y: 224,
        rotation: 0,
        duration: hallway.bookCatchSettleDuration,
        ease: 'back.out(2)',
      }, 'book:catch');

      timeline.to(this.teacher.root, {
        x: hallway.exitX,
        duration: hallway.walkOutDuration,
        ease: 'power2.in',
      }, walkOutAt);
      timeline.to(this.book.root, {
        x: hallway.exitX + 8,
        duration: hallway.walkOutDuration,
        ease: 'power2.in',
      }, walkOutAt);
      timeline.call(() => this.audio?.playLoop('hallwayRun'), [], 'walk:out');
      timeline.call(() => this.audio?.stop('hallwayRun'), [], 'walk:end');
      timeline.set(this.hallwayBg, { texture: this.hallwayAssets.hallwayBgDoorOpen }, 'walk:out');
      timeline.to(this.endingCard, {
        alpha: 1,
        duration: hallway.endingCardDuration,
        ease: 'power1.out',
      }, hallway.endingCardAt);
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
    this.resetVfx();
    this.resetContainer(this.endingCard, false);
    this.teacher.reset();
    this.resetTeacherForFall();
    this.book.reset();
    this.hallwayBg.texture = this.hallwayAssets.hallwayBgDoorClose;
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

  private startRollEffect(): void {
    const hallway = MOVIE_CONFIG.hallway;

    this.teacher.root.visible = false;
    this.impact.visible = false;
    this.impact.alpha = 1;
    this.rollRoot.position.set(hallway.rollStartX, hallway.groundY);
    this.rollRoot.alpha = 1;
    this.rollRoot.visible = true;
    this.rollVisual.texture = this.hallwayAssets.rollSwirl01;
    this.rollVisual.position.set(0, hallway.rollVisualY);
    this.rollVisual.rotation = 0;
    this.rollVisual.scale.set(hallway.rollScale, hallway.rollScale);
  }

  private finishRoll(): void {
    const hallway = MOVIE_CONFIG.hallway;

    this.teacher.root.position.set(hallway.rollEndX, hallway.rollEndY);
    this.teacher.root.rotation = 0;
    this.teacher.root.scale.set(1, 1);
    this.teacher.root.alpha = 1;
    this.teacher.visual.position.set(0, 0);
    this.teacher.visual.rotation = 0;
    this.teacher.visual.scale.set(1, 1);
    this.teacher.setPose('rollEnd');
    this.teacher.root.visible = true;
    this.rollRoot.position.set(hallway.rollEndX, hallway.groundY);
    this.rollRoot.visible = false;
    this.rollRoot.alpha = 1;
  }

  private resetVfx(): void {
    const hallway = MOVIE_CONFIG.hallway;

    this.resetContainer(this.impact, false);
    this.impact.alpha = 1;
    this.impactVisual.position.set(0, hallway.impactVisualY);
    this.impactVisual.rotation = 0;
    this.impactVisual.scale.set(hallway.impactScale, hallway.impactScale);

    this.resetContainer(this.rollRoot, false);
    this.rollRoot.alpha = 1;
    this.rollRoot.position.set(hallway.rollStartX, hallway.groundY);
    this.rollVisual.texture = this.hallwayAssets.rollSwirl01;
    this.rollVisual.position.set(0, hallway.rollVisualY);
    this.rollVisual.rotation = 0;
    this.rollVisual.scale.set(hallway.rollScale, hallway.rollScale);

    this.resetContainer(this.dust, false);
    this.dust.alpha = 1;
    this.dust.position.set(hallway.rollEndX, hallway.groundY);
    this.dustVisual.position.set(0, hallway.dustVisualY);
    this.dustVisual.rotation = 0;
    this.dustVisual.scale.set(hallway.dustScale, hallway.dustScale);
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
    this.teacher.setPose('fall');
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}
