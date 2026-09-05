import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

import { cameraShake } from '../animations/cameraShake';
import { jumpTo } from '../animations/jump';
import { parallax } from '../animations/parallax';
import { squash } from '../animations/squash';
import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG } from '../game/config';
import { Teacher } from '../entities/Teacher';
import type { Scene, GsapTimeline } from './Scene';

const BACKGROUND_LAYERS = {
  far: { count: 13, baseY: 230, height: 44, width: 52 },
  mid: { count: 11, baseY: 270, height: 66, width: 64 },
  front: { count: 9, baseY: 320, height: 94, width: 78 },
} as const;

const BUILDING_GAP = 8;

function getSegmentWidth(options: { readonly count: number; readonly width: number }): number {
  return options.count * (options.width + BUILDING_GAP);
}

const COLORS = {
  sky: 0x182a52,
  horizon: 0x305074,
  far: 0x263955,
  mid: 0x1b2c46,
  front: 0x132136,
  roof: 0x394f6d,
  roofTop: 0x6885a1,
  window: 0xffc857,
  windowCool: 0x57c7ff,
  text: 0xf6f0d7,
  muted: 0x91a8b9,
  speed: 0xffe4a6,
  dust: 0xd5c1a2,
} as const;

type CityRooftopConfig = (typeof MOVIE_CONFIG.city.rooftops)[number];
type ResolvedRooftop = CityRooftopConfig & {
  x: number;
  width: number;
  takeoffX: number;
};

export class CityScene implements Scene {
  readonly id = 'city';
  readonly root = new Container({ label: 'CityScene.root' });

  private readonly teacher: Teacher;
  private readonly panRoot: Container;
  private readonly shakeRoot: Container;
  private readonly farLayer = new Container({ label: 'buildingsFar' });
  private readonly midLayer = new Container({ label: 'buildingsMid' });
  private readonly frontLayer = new Container({ label: 'buildingsFront' });
  private readonly farSegments: [Container, Container] = [
    new Container({ label: 'buildingsFar.segmentA' }),
    new Container({ label: 'buildingsFar.segmentB' }),
  ];
  private readonly midSegments: [Container, Container] = [
    new Container({ label: 'buildingsMid.segmentA' }),
    new Container({ label: 'buildingsMid.segmentB' }),
  ];
  private readonly frontSegments: [Container, Container] = [
    new Container({ label: 'buildingsFront.segmentA' }),
    new Container({ label: 'buildingsFront.segmentB' }),
  ];
  private readonly platforms = new Container({ label: 'platforms' });
  private readonly effects = new Container({ label: 'cityEffects' });
  private readonly speedLines = new Graphics({ label: 'citySpeedLines' });
  private readonly dustBursts: Container[] = [];
  private activeTimeline: GsapTimeline | undefined;
  private context: gsap.Context | undefined;
  private built = false;

  private readonly farSegmentWidth = getSegmentWidth(BACKGROUND_LAYERS.far);
  private readonly midSegmentWidth = getSegmentWidth(BACKGROUND_LAYERS.mid);
  private readonly frontSegmentWidth = getSegmentWidth(BACKGROUND_LAYERS.front);

  constructor(teacher: Teacher, panRoot: Container, shakeRoot: Container, sceneHost: Container) {
    this.teacher = teacher;
    this.panRoot = panRoot;
    this.shakeRoot = shakeRoot;
    sceneHost.addChild(this.root);
  }

  build(): void {
    if (this.built) return;

    this.root.addChild(this.createSky());
    this.createBuildingSegments(this.farLayer, this.farSegments, COLORS.far, BACKGROUND_LAYERS.far);
    this.createBuildingSegments(this.midLayer, this.midSegments, COLORS.mid, BACKGROUND_LAYERS.mid);
    this.createBuildingSegments(this.frontLayer, this.frontSegments, COLORS.front, BACKGROUND_LAYERS.front);
    this.root.addChild(this.farLayer, this.midLayer, this.frontLayer);
    this.root.addChild(this.platforms);
    this.createPlatforms();
    this.createEffects();
    this.root.addChild(this.effects);
    this.root.addChild(this.createLabel());
    this.built = true;
    this.reset();
  }

  createTimeline(): GsapTimeline {
    if (!this.built) this.build();

    this.context?.revert();

    let timeline: GsapTimeline | undefined;
    this.context = gsap.context(() => {
      const sceneTimeline = gsap.timeline({
        id: `scene:${this.id}`,
        defaults: { overwrite: 'auto' },
      });
      timeline = sceneTimeline;
      this.activeTimeline = sceneTimeline;

      sceneTimeline.set(this.root, { visible: true, alpha: 1 }, 0);
      sceneTimeline.set(this.panRoot, { x: 0, y: 0 }, 0);
      sceneTimeline.set(this.speedLines, { visible: true, alpha: 0 }, 0);
      const rooftops = this.resolveRooftops();
      const firstRoof = rooftops[0];
      if (!firstRoof) {
        throw new Error('CityScene requires at least one rooftop.');
      }

      sceneTimeline.set(this.teacher.root, {
        x: firstRoof.landingX,
        y: firstRoof.roofY - 36,
        visible: true,
        alpha: 1,
      }, 0);
      sceneTimeline.call(() => this.teacher.setPose('fall'), [], 0);
      sceneTimeline.to(this.teacher.root, { y: firstRoof.roofY, duration: MOVIE_CONFIG.city.initialLandingAt, ease: 'bounce.out' }, 0);
      sceneTimeline.call(() => this.teacher.setPose('idle'), [], MOVIE_CONFIG.city.initialLandingAt);
      this.addLandingFeedback(sceneTimeline, MOVIE_CONFIG.city.initialLandingAt, firstRoof.landingX, firstRoof.roofY, 0);

      let actionStart: number = MOVIE_CONFIG.city.initialLandingAt;
      rooftops.forEach((rooftop, index) => {
        const isFinalJump = index === rooftops.length - 1;
        const roofRun = this.createRoofRun({
          fromX: rooftop.landingX,
          toX: rooftop.takeoffX,
          y: rooftop.roofY,
          duration: rooftop.runDuration,
        });
        sceneTimeline.add(roofRun, actionStart);

        const jumpStart = actionStart + rooftop.runDuration;
        if (isFinalJump) {
          const finalJump = MOVIE_CONFIG.city.finalJump;
          const jumpEnd = jumpStart + finalJump.duration;
          sceneTimeline.call(() => this.teacher.setPose('jump'), [], jumpStart);
          sceneTimeline.add(jumpTo({
            target: this.teacher.root,
            startX: rooftop.takeoffX,
            startY: rooftop.roofY,
            targetX: finalJump.targetX,
            targetY: finalJump.targetY,
            height: finalJump.height,
            duration: finalJump.duration,
          }), jumpStart);
          sceneTimeline.call(() => this.teacher.setPose('fall'), [], jumpEnd);
          sceneTimeline.set(this.teacher.root, { visible: false }, jumpEnd);
          sceneTimeline.to(this.speedLines, { alpha: 0.9, duration: 0.08, ease: 'none' }, jumpStart);
          sceneTimeline.to(this.speedLines, { alpha: 0, duration: 0.42, ease: 'power1.out' }, jumpStart + 0.45);
          return;
        }

        const nextRoof = rooftops[index + 1];
        const jumpToNext = 'jumpToNext' in rooftop ? rooftop.jumpToNext : undefined;
        if (!nextRoof || !jumpToNext) {
          throw new Error(`CityScene rooftop ${rooftop.id} is missing its next jump.`);
        }

        const jumpEnd = jumpStart + jumpToNext.duration;
        sceneTimeline.call(() => this.teacher.setPose('jump'), [], jumpStart);
        sceneTimeline.add(jumpTo({
          target: this.teacher.root,
          startX: rooftop.takeoffX,
          startY: rooftop.roofY,
          targetX: nextRoof.landingX,
          targetY: nextRoof.roofY,
          height: jumpToNext.height,
          duration: jumpToNext.duration,
        }), jumpStart);
        sceneTimeline.call(() => this.teacher.setPose('idle'), [], jumpEnd);
        this.addLandingFeedback(sceneTimeline, jumpEnd, nextRoof.landingX, nextRoof.roofY, index + 1);
        actionStart = jumpEnd;
      });

      const cityDuration = this.getCityDuration(rooftops);
      sceneTimeline.add(parallax([
        {
          segments: this.farSegments,
          width: this.farSegmentWidth,
          speed: MOVIE_CONFIG.city.farSpeed,
        },
        {
          segments: this.midSegments,
          width: this.midSegmentWidth,
          speed: MOVIE_CONFIG.city.midSpeed,
        },
        {
          segments: this.frontSegments,
          width: this.frontSegmentWidth,
          speed: MOVIE_CONFIG.city.frontSpeed,
        },
      ], cityDuration), 0);
      const finalJumpStart = cityDuration - MOVIE_CONFIG.city.finalJump.duration;
      sceneTimeline.to(this.panRoot, {
        x: -18,
        duration: 0.7,
        ease: 'power1.inOut',
      }, finalJumpStart);
      sceneTimeline.to(this.panRoot, {
        x: 0,
        duration: 0.35,
        ease: 'power1.out',
      }, cityDuration - 0.45);
    });

    if (!timeline) {
      throw new Error('CityScene timeline was not created.');
    }

    return timeline;
  }

  reset(): void {
    this.resetContainer(this.root, false);
    this.resetContainer(this.speedLines, false);
    this.resetBuildingSegments(this.farLayer, this.farSegments, this.farSegmentWidth);
    this.resetBuildingSegments(this.midLayer, this.midSegments, this.midSegmentWidth);
    this.resetBuildingSegments(this.frontLayer, this.frontSegments, this.frontSegmentWidth);
    this.resetContainer(this.platforms, true);
    this.dustBursts.forEach((dust) => this.resetContainer(dust, false));
  }

  dispose(): void {
    this.activeTimeline?.kill();
    this.context?.revert();
    this.activeTimeline = undefined;
    this.context = undefined;
    this.root.removeChildren();
    this.clearBuildingSegments(this.farLayer, this.farSegments);
    this.clearBuildingSegments(this.midLayer, this.midSegments);
    this.clearBuildingSegments(this.frontLayer, this.frontSegments);
    this.dustBursts.length = 0;
    this.built = false;
  }

  private addLandingFeedback(timeline: GsapTimeline, at: number, x: number, y: number, dustIndex: number): void {
    const dust = this.dustBursts[dustIndex];
    if (!dust) return;

    timeline.set(dust, { x, y, visible: true, alpha: 1 }, at);
    timeline.add(squash(this.teacher.visual, MOVIE_CONFIG.city.landingSquash, 0.18), at);
    timeline.add(cameraShake(this.shakeRoot, { strength: 4, duration: 0.15 }), at);
    timeline.to(dust, {
      y: y - 12,
      alpha: 0,
      duration: 0.32,
      ease: 'power1.out',
    }, at);
  }

  private resolveRooftops(): ResolvedRooftop[] {
    const padding = MOVIE_CONFIG.city.roofPadding;

    return MOVIE_CONFIG.city.rooftops.map((rooftop) => {
      const runDistance = MOVIE_CONFIG.city.runSpeed * rooftop.runDuration;

      return {
        ...rooftop,
        x: rooftop.landingX - padding,
        width: runDistance + padding * 2,
        takeoffX: rooftop.landingX + runDistance,
      };
    });
  }

  private getCityDuration(rooftops: readonly ResolvedRooftop[]): number {
    let duration = MOVIE_CONFIG.city.initialLandingAt;

    rooftops.forEach((rooftop, index) => {
      duration += rooftop.runDuration;
      if (index === rooftops.length - 1) {
        duration += MOVIE_CONFIG.city.finalJump.duration;
        return;
      }

      const jumpToNext = 'jumpToNext' in rooftop ? rooftop.jumpToNext : undefined;
      if (!jumpToNext) {
        throw new Error(`CityScene rooftop ${rooftop.id} is missing its next jump.`);
      }
      duration += jumpToNext.duration;
    });

    return duration;
  }

  private createRoofRun(options: {
    fromX: number;
    toX: number;
    y: number;
    duration: number;
  }): GsapTimeline {
    const timeline = gsap.timeline({
      id: `roofRun:${options.fromX}-${options.toX}`,
      defaults: { overwrite: 'auto' },
    });

    timeline.set(this.teacher.root, {
      x: options.fromX,
      y: options.y,
    }, 0);
    timeline.call(() => this.teacher.setPose('run'), [], 0);
    timeline.to(this.teacher.root, {
      x: options.toX,
      duration: options.duration,
      ease: 'none',
    }, 0);
    timeline.to(this.teacher.visual, {
      y: -3,
      duration: options.duration / 8,
      ease: 'sine.inOut',
      repeat: 3,
      yoyo: true,
    }, 0);
    timeline.set(this.teacher.visual, { y: 0, rotation: 0 }, options.duration);

    return timeline;
  }

  private createSky(): Graphics {
    const sky = new Graphics()
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill(COLORS.sky)
      .rect(0, 190, GAME_WIDTH, 170)
      .fill(COLORS.horizon)
      .circle(535, 64, 27)
      .fill({ color: COLORS.window, alpha: 0.85 });
    for (let i = 0; i < 14; i += 1) {
      sky.rect(22 + i * 47, 38 + (i % 3) * 18, 2, 2).fill({ color: COLORS.text, alpha: 0.7 });
    }
    return sky;
  }

  private createBuildingSegments(
    layer: Container,
    segments: readonly [Container, Container],
    color: number,
    options: {
      readonly count: number;
      readonly baseY: number;
      readonly height: number;
      readonly width: number;
    },
  ): void {
    const segmentWidth = getSegmentWidth(options);

    segments.forEach((segment, segmentIndex) => {
      this.createBuildings(segment, color, options);
      segment.x = segmentIndex * segmentWidth;
      layer.addChild(segment);
    });
  }

  private createBuildings(
    layer: Container,
    color: number,
    options: {
      readonly count: number;
      readonly baseY: number;
      readonly height: number;
      readonly width: number;
    },
  ): void {
    for (let i = 0; i < options.count; i += 1) {
      const buildingHeight = options.height + (i % 4) * 18;
      const building = new Graphics()
        .rect(i * (options.width + BUILDING_GAP), options.baseY - buildingHeight, options.width, buildingHeight)
        .fill(color);
      for (let row = 0; row < Math.floor(buildingHeight / 22); row += 1) {
        for (let column = 0; column < 3; column += 1) {
          building.rect(i * (options.width + BUILDING_GAP) + 10 + column * 16, options.baseY - buildingHeight + 12 + row * 22, 5, 7)
            .fill({ color: row % 2 === 0 ? COLORS.windowCool : COLORS.window, alpha: 0.48 });
        }
      }
      layer.addChild(building);
    }
  }

  private resetBuildingSegments(
    layer: Container,
    segments: readonly [Container, Container],
    segmentWidth: number,
  ): void {
    this.resetContainer(layer, true);
    segments.forEach((segment, segmentIndex) => {
      this.resetContainer(segment, true);
      segment.x = segmentIndex * segmentWidth;
    });
  }

  private clearBuildingSegments(
    layer: Container,
    segments: readonly [Container, Container],
  ): void {
    segments.forEach((segment) => segment.removeChildren());
    layer.removeChildren();
  }

  private createPlatforms(): void {
    this.resolveRooftops().forEach(({ x, roofY: top, width, height, id }) => {
      const building = new Container({ label: `building${id}` });
      building.addChild(new Graphics()
        .rect(x, top, width, height)
        .fill(COLORS.roof)
        .rect(x - 5, top - 7, width + 10, 7)
        .fill(COLORS.roofTop));
      for (let row = 0; row < Math.floor(height / 30); row += 1) {
        building.addChild(new Graphics()
          .rect(x + 12, top + 16 + row * 30, 8, 10)
          .fill({ color: COLORS.windowCool, alpha: 0.45 })
          .rect(x + width - 22, top + 16 + row * 30, 8, 10)
          .fill({ color: COLORS.window, alpha: 0.45 }));
      }
      const labelText = new Text({
        text: `ROOF ${id}`,
        style: {
          fill: COLORS.text,
          fontFamily: 'monospace',
          fontSize: 8,
          fontWeight: '700',
        },
      });
      labelText.position.set(x + 8, top - 22);
      building.addChild(labelText);
      this.platforms.addChild(building);
    });
  }

  private createEffects(): void {
    this.speedLines
      .moveTo(430, 88).lineTo(590, 52)
      .moveTo(410, 112).lineTo(600, 72)
      .moveTo(438, 140).lineTo(625, 112)
      .moveTo(370, 170).lineTo(515, 150)
      .stroke({ color: COLORS.speed, width: 3, alpha: 0.8 });
    this.effects.addChild(this.speedLines);

    for (let i = 0; i < MOVIE_CONFIG.city.rooftops.length; i += 1) {
      const dust = new Container({ label: `landingDust${i}` });
      for (let particle = 0; particle < 6; particle += 1) {
        dust.addChild(new Graphics()
          .circle((particle - 2.5) * 5, -2 - (particle % 2) * 3, 2 + (particle % 2))
          .fill({ color: COLORS.dust, alpha: 0.9 }));
      }
      this.dustBursts.push(dust);
      this.effects.addChild(dust);
    }
  }

  private createLabel(): Text {
    const label = new Text({
      text: 'CITY ROOFTOPS  //  A > B > C > DOWN',
      style: {
        fill: COLORS.text,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
      },
    });
    label.position.set(22, 20);
    return label;
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
}
