import { gsap } from 'gsap';
import { ColorMatrixFilter, Container, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';

import { cameraShake } from '../animations/cameraShake';
import { jumpTo } from '../animations/jump';
import { parallax } from '../animations/parallax';
import { squash } from '../animations/squash';
import type { CityAssets } from '../assets/cityAssets';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MOVIE_CONFIG,
  type CitySkyMode,
  type CitySkyState,
} from '../game/config';
import { Teacher } from '../entities/Teacher';
import type { AudioManager } from '../audio/AudioManager';
import type { Scene, GsapTimeline } from './Scene';

const COLORS = {
  window: 0xffc857,
  windowCool: 0x57c7ff,
  text: 0xf6f0d7,
  muted: 0x91a8b9,
  speed: 0xffe4a6,
  dust: 0xd5c1a2,
} as const;

type CityRooftopConfig = (typeof MOVIE_CONFIG.city.rooftops)[number];
type CityRooftopJump = {
  readonly height: number;
  readonly duration: number;
};

type ResolvedRooftop = Omit<CityRooftopConfig, 'roofY' | 'facadeScale' | 'jumpToNext'> & {
  roofY: number;
  readonly leftEdgeX: number;
  readonly rightEdgeX: number;
  width: number;
  readonly landingX: number;
  takeoffX: number;
  readonly runDistance: number;
  readonly runDuration: number;
  readonly facadeScale: number;
  readonly jumpToNext?: CityRooftopJump;
};

/*
 * Rooftop visual decorations are temporarily disabled.
 * Keep this definition commented so the decoration layout can be restored later.
 *
 * type RooftopDecorationAsset = 'rooftopUtilityBox1' | 'rooftopUtilityBox2' | 'waterTank1' | 'waterTank2';
 *
 * type RooftopDecorationSpec = {
 *   asset: RooftopDecorationAsset;
 *   xRatio: number;
 *   scale: number;
 * };
 */

type RooftopFacadeAsset =
  | 'roofALeft'
  | 'roofAMiddle'
  | 'roofARight'
  | 'roofBLeft'
  | 'roofBMiddle'
  | 'roofBRight'
  | 'roofCLeft'
  | 'roofCMiddle'
  | 'roofCRight';

type FacadeFrame = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type RooftopFacadePart = {
  readonly asset: RooftopFacadeAsset;
  readonly frame: FacadeFrame;
  /** Source-pixel height of the fixed roof cap before the repeatable wall starts. */
  readonly bodyStart: number;
};

type RooftopFacadeSpec = {
  readonly left: RooftopFacadePart;
  readonly middle: RooftopFacadePart;
  readonly right: RooftopFacadePart;
};

// Visible alpha bounds (alpha >= 16) from the supplied PNGs. The source images
// stay untouched; these frames remove their transparent export padding at runtime.
const ROOFTOP_FACADES: Record<string, RooftopFacadeSpec> = {
  A: {
    left: { asset: 'roofALeft', frame: { x: 136, y: 272, width: 982, height: 723 }, bodyStart: 118 },
    middle: { asset: 'roofAMiddle', frame: { x: 47, y: 278, width: 1354, height: 568 }, bodyStart: 104 },
    right: { asset: 'roofARight', frame: { x: 96, y: 250, width: 1062, height: 775 }, bodyStart: 135 },
  },
  B: {
    left: { asset: 'roofBLeft', frame: { x: 90, y: 320, width: 1074, height: 637 }, bodyStart: 120 },
    middle: { asset: 'roofBMiddle', frame: { x: 76, y: 272, width: 1296, height: 582 }, bodyStart: 108 },
    right: { asset: 'roofBRight', frame: { x: 129, y: 236, width: 997, height: 803 }, bodyStart: 144 },
  },
  C: {
    left: { asset: 'roofCLeft', frame: { x: 72, y: 225, width: 1305, height: 677 }, bodyStart: 115 },
    middle: { asset: 'roofCMiddle', frame: { x: 32, y: 252, width: 1385, height: 579 }, bodyStart: 115 },
    right: { asset: 'roofCRight', frame: { x: 58, y: 232, width: 1138, height: 818 }, bodyStart: 132 },
  },
};

/*
 * Rooftop visual decorations are disabled for the current city composition.
 *
 * const ROOFTOP_DECORATIONS: Record<string, readonly RooftopDecorationSpec[]> = {
 *   A: [
 *     { asset: 'waterTank1', xRatio: 0.28, scale: 0.2 },
 *     { asset: 'rooftopUtilityBox1', xRatio: 0.72, scale: 0.16 },
 *   ],
 *   B: [
 *     { asset: 'rooftopUtilityBox2', xRatio: 0.32, scale: 0.16 },
 *     { asset: 'waterTank2', xRatio: 0.76, scale: 0.18 },
 *   ],
 *   C: [
 *     { asset: 'waterTank2', xRatio: 0.26, scale: 0.18 },
 *     { asset: 'rooftopUtilityBox1', xRatio: 0.7, scale: 0.16 },
 *   ],
 * };
 */

type SkyVisualState = {
  topColor: number;
  middleColor: number;
  horizonColor: number;
  brightness: number;
  cloudColor: number;
  cloudAlpha: number;
  starAlpha: number;
  moonAlpha: number;
  windowLightAlpha: number;
  cityBrightness: number;
  citySaturation: number;
  cityTint: number;
  cityTintStrength: number;
};

const SKY_BAND_COUNT = 60;

export class CityScene implements Scene {
  readonly id = 'city';
  readonly root = new Container({ label: 'CityScene.root' });

  private readonly teacher: Teacher;
  private readonly audio: AudioManager | undefined;
  private readonly cityAssets: CityAssets;
  private readonly panRoot: Container;
  private readonly shakeRoot: Container;
  private readonly skyContainer = new Container({ label: 'skyContainer' });
  private readonly proceduralSky = new Container({ label: 'proceduralSky' });
  private readonly starLayer = new Container({ label: 'stars' });
  private readonly cloudContainer = new Container({ label: 'cloudContainer' });
  private readonly skyGradientBands: Graphics[] = [];
  private readonly cloudMotion = { x: 0 };
  private readonly farCityFilter = new ColorMatrixFilter();
  private readonly midCityFilter = new ColorMatrixFilter();
  private readonly frontCityFilter = new ColorMatrixFilter();
  private readonly farLayer = new Container({ label: 'farLayer' });
  private readonly midLayer = new Container({ label: 'midLayer' });
  private readonly frontLayer = new Container({ label: 'frontLayer' });
  private readonly farSegments: [Container, Container] = [
    new Container({ label: 'farLayer.segmentA' }),
    new Container({ label: 'farLayer.segmentB' }),
  ];
  private readonly midSegments: [Container, Container] = [
    new Container({ label: 'midLayer.segmentA' }),
    new Container({ label: 'midLayer.segmentB' }),
  ];
  private readonly frontSegments: [Container, Container] = [
    new Container({ label: 'frontLayer.segmentA' }),
    new Container({ label: 'frontLayer.segmentB' }),
  ];
  private readonly platforms = new Container({ label: 'platforms' });
  private readonly effects = new Container({ label: 'cityEffects' });
  private readonly speedLines = new Graphics({ label: 'citySpeedLines' });
  private readonly dustBursts: Container[] = [];
  private readonly windowLights: Graphics[] = [];
  private readonly facadeTextures: Texture[] = [];
  private activeTimeline: GsapTimeline | undefined;
  private moonSprite: Sprite | undefined;
  private context: gsap.Context | undefined;
  private built = false;
  private skyBuilt = false;
  private skyMode: CitySkyMode = 'auto';
  private skyState: CitySkyState = 'day';
  private skyTimelineProgress = 0;
  private readonly skyVisual: SkyVisualState = {
    ...MOVIE_CONFIG.city.sky.states.day,
  };

  private farSegmentWidth = 0;
  private midSegmentWidth = 0;
  private frontSegmentWidth = 0;

  constructor(
    teacher: Teacher,
    panRoot: Container,
    shakeRoot: Container,
    sceneHost: Container,
    cityAssets: CityAssets,
    audio?: AudioManager,
  ) {
    this.teacher = teacher;
    this.audio = audio;
    this.cityAssets = cityAssets;
    this.panRoot = panRoot;
    this.shakeRoot = shakeRoot;
    sceneHost.addChild(this.root);
  }

  build(): void {
    if (this.built) return;

    this.root.addChild(this.createSky());
    this.farSegmentWidth = this.createImageSegments(
      this.farLayer,
      this.farSegments,
      this.cityAssets.far,
      'far',
      MOVIE_CONFIG.city.parallax.far,
    );
    this.midSegmentWidth = this.createImageSegments(
      this.midLayer,
      this.midSegments,
      this.cityAssets.mid,
      'mid',
      MOVIE_CONFIG.city.parallax.mid,
    );
    this.frontSegmentWidth = this.createImageSegments(
      this.frontLayer,
      this.frontSegments,
      this.cityAssets.near,
      'front',
      MOVIE_CONFIG.city.parallax.front,
    );
    this.layoutParallaxLayers();
    this.attachCityAtmosphereFilters();
    this.applySkyVisuals();
    this.root.addChild(this.farLayer, this.midLayer, this.frontLayer);
    this.root.addChild(this.platforms);
    this.createPlatforms();
    this.applySkyVisuals();
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
      sceneTimeline.set(this.skyContainer, { x: 0 }, 0);
      sceneTimeline.set([this.farLayer, this.midLayer, this.frontLayer], { x: 0 }, 0);
      sceneTimeline.set(this.speedLines, { visible: true, alpha: 0 }, 0);
      const rooftops = this.resolveRooftops();
      const firstRoof = rooftops[0];
      if (!firstRoof) {
        throw new Error('CityScene requires at least one rooftop.');
      }

      sceneTimeline.set(this.teacher.root, {
        x: firstRoof.landingX,
        y: this.getTeacherY(firstRoof.roofY - 36),
        visible: true,
        alpha: 1,
      }, 0);
      sceneTimeline.set(this.teacher.visual.scale, {
        x: MOVIE_CONFIG.city.teacherScale,
        y: MOVIE_CONFIG.city.teacherScale,
      }, 0);
      sceneTimeline.call(() => this.teacher.setPose('fall'), [], 0);
      sceneTimeline.to(this.teacher.root, {
        y: this.getTeacherY(firstRoof.roofY),
        duration: MOVIE_CONFIG.city.initialLandingAt,
        ease: 'bounce.out',
      }, 0);
      sceneTimeline.call(() => this.teacher.setPose('idle'), [], MOVIE_CONFIG.city.initialLandingAt);
      this.addLandingFeedback(sceneTimeline, MOVIE_CONFIG.city.initialLandingAt, firstRoof.landingX, firstRoof.roofY, 0);

      let actionStart: number = MOVIE_CONFIG.city.initialLandingAt;
      rooftops.forEach((rooftop, index) => {
        const isFinalJump = index === rooftops.length - 1;
        const runLabel = `roof${rooftop.id}:run`;
        const jumpLabel = `roof${rooftop.id}:jump`;
        const roofRun = this.createRoofRun({
          fromX: rooftop.landingX,
          toX: rooftop.takeoffX,
          y: this.getTeacherY(rooftop.roofY),
          duration: rooftop.runDuration,
        });
        sceneTimeline.addLabel(runLabel, actionStart);
        sceneTimeline.add(roofRun, actionStart);
        sceneTimeline.call(() => this.audio?.playLoop('asphaltRun'), [], runLabel);

        const jumpStart = actionStart + rooftop.runDuration;
        sceneTimeline.addLabel(jumpLabel, jumpStart);
        sceneTimeline.call(() => this.audio?.stop('asphaltRun'), [], jumpLabel);
        if (isFinalJump) {
          const finalJump = MOVIE_CONFIG.city.finalJump;
          const jumpEnd = jumpStart + finalJump.duration;
          sceneTimeline.call(() => this.teacher.setPose('jump'), [], jumpStart);
          sceneTimeline.call(() => this.audio?.play('bigJump'), [], jumpLabel);
          sceneTimeline.add(jumpTo({
            target: this.teacher.root,
            startX: rooftop.takeoffX,
            startY: this.getTeacherY(rooftop.roofY),
            targetX: rooftop.rightEdgeX + finalJump.exitPadding,
            targetY: this.getTeacherY(finalJump.targetY),
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
        const jumpToNext = rooftop.jumpToNext;
        if (!nextRoof || !jumpToNext) {
          throw new Error(`CityScene rooftop ${rooftop.id} is missing its next jump.`);
        }

        const jumpEnd = jumpStart + jumpToNext.duration;
        sceneTimeline.call(() => this.teacher.setPose('jump'), [], jumpStart);
        sceneTimeline.call(() => this.audio?.play('smallJump'), [], jumpLabel);
        sceneTimeline.add(jumpTo({
          target: this.teacher.root,
          startX: rooftop.takeoffX,
          startY: this.getTeacherY(rooftop.roofY),
          targetX: nextRoof.landingX,
          targetY: this.getTeacherY(nextRoof.roofY),
          height: jumpToNext.height,
          duration: jumpToNext.duration,
        }), jumpStart);
        sceneTimeline.call(() => this.teacher.setPose('idle'), [], jumpEnd);
        this.addLandingFeedback(sceneTimeline, jumpEnd, nextRoof.landingX, nextRoof.roofY, index + 1);
        actionStart = jumpEnd;
      });

      const cityDuration = this.getCityDuration(rooftops);
      sceneTimeline.to(this.cloudMotion, {
        x: -MOVIE_CONFIG.city.sky.cloudSpeed * cityDuration,
        duration: cityDuration,
        ease: 'none',
        onUpdate: () => this.updateCloudPosition(),
      }, 0);
      sceneTimeline.add(parallax([
        {
          segments: this.farSegments,
          width: this.farSegmentWidth,
          speed: MOVIE_CONFIG.city.parallax.far.speed,
        },
        {
          segments: this.midSegments,
          width: this.midSegmentWidth,
          speed: MOVIE_CONFIG.city.parallax.mid.speed,
        },
        {
          segments: this.frontSegments,
          width: this.frontSegmentWidth,
          speed: MOVIE_CONFIG.city.parallax.front.speed,
        },
      ], cityDuration), 0);

      // Keep the teacher in the logical viewport while the expanded rooftops
      // carry the gameplay farther to the right. The camera moves by shifting
      // the shared world root left; Teacher.root.x itself remains gameplay data.
      const cameraFollow = { progress: 0 };
      const cameraFollowDuration = Math.max(
        0,
        cityDuration - MOVIE_CONFIG.city.cameraResetDuration,
      );
      sceneTimeline.to(cameraFollow, {
        progress: 1,
        duration: cameraFollowDuration,
        ease: 'none',
        onUpdate: () => this.updateCameraFollow(),
      }, 0);
      sceneTimeline.to(this.panRoot, {
        x: 0,
        duration: MOVIE_CONFIG.city.cameraResetDuration,
        ease: 'power1.out',
        onUpdate: () => this.updateSkyCameraCompensation(),
        onComplete: () => {
          this.skyContainer.x = 0;
        },
      }, cameraFollowDuration);
    });

    if (!timeline) {
      throw new Error('CityScene timeline was not created.');
    }

    return timeline;
  }

  reset(): void {
    this.resetContainer(this.root, false);
    this.resetContainer(this.skyContainer, true);
    this.resetSky();
    this.resetContainer(this.speedLines, false);
    this.resetImageSegments(this.farLayer, this.farSegments, this.farSegmentWidth);
    this.resetImageSegments(this.midLayer, this.midSegments, this.midSegmentWidth);
    this.resetImageSegments(this.frontLayer, this.frontSegments, this.frontSegmentWidth);
    this.resetContainer(this.platforms, true);
    this.dustBursts.forEach((dust) => this.resetContainer(dust, false));
  }

  dispose(): void {
    this.activeTimeline?.kill();
    this.context?.revert();
    this.activeTimeline = undefined;
    this.context = undefined;
    this.root.removeChildren();
    this.clearImageSegments(this.farLayer, this.farSegments);
    this.clearImageSegments(this.midLayer, this.midSegments);
    this.clearImageSegments(this.frontLayer, this.frontSegments);
    this.facadeTextures.forEach((texture) => texture.destroy(false));
    this.facadeTextures.length = 0;
    this.dustBursts.length = 0;
    this.windowLights.length = 0;
    this.built = false;
  }

  getSkyMode(): CitySkyMode {
    return this.skyMode;
  }

  getSkyState(): CitySkyState {
    return this.skyState;
  }

  updateSkyFromTimeline(progress: number): void {
    this.skyTimelineProgress = clamp01(progress);
    if (this.skyMode !== 'auto') return;

    const visual = this.getSkyVisualAtProgress(this.skyTimelineProgress);
    Object.assign(this.skyVisual, visual.visual);
    this.skyState = visual.state;
    this.applySkyVisuals();
  }

  setSkyMode(mode: CitySkyMode): void {
    this.skyMode = mode;

    if (mode === 'auto') {
      this.updateSkyFromTimeline(this.skyTimelineProgress);
      return;
    }

    this.setSkyState(mode);
  }

  setSkyState(state: CitySkyState): void {
    this.skyMode = state;
    Object.assign(this.skyVisual, MOVIE_CONFIG.city.sky.states[state]);
    this.skyState = state;
    this.applySkyVisuals();
  }

  private addLandingFeedback(timeline: GsapTimeline, at: number, x: number, y: number, dustIndex: number): void {
    const dust = this.dustBursts[dustIndex];
    if (!dust) return;

    timeline.set(dust, { x, y, visible: true, alpha: 1 }, at);
    timeline.add(squash(
      this.teacher.visual,
      MOVIE_CONFIG.city.landingSquash,
      0.18,
      MOVIE_CONFIG.city.teacherScale,
    ), at);
    timeline.add(cameraShake(this.shakeRoot, { strength: 4, duration: 0.15 }), at);
    timeline.to(dust, {
      y: y - 12,
      alpha: 0,
      duration: 0.32,
      ease: 'power1.out',
    }, at);
  }

  private resolveRooftops(): ResolvedRooftop[] {
    let leftEdgeX = MOVIE_CONFIG.city.rooftopStartX;

    return MOVIE_CONFIG.city.rooftops.map((rooftop) => {
      const facadeSpec = ROOFTOP_FACADES[rooftop.id];
      if (!facadeSpec) {
        throw new Error(`Missing facade PNG configuration for rooftop ${rooftop.id}.`);
      }

      const sourceWidth = this.getFacadeSourceWidth(rooftop.id, rooftop.middleCount);
      const width = Math.max(1, Math.round(sourceWidth * rooftop.facadeScale));
      const facadeScale = width / sourceWidth;
      const rightEdgeX = leftEdgeX + width;
      const landingX = Math.round(leftEdgeX + rooftop.landingPadding);
      const takeoffX = Math.round(rightEdgeX - rooftop.takeoffPadding);
      const runDistance = takeoffX - landingX;

      if (runDistance <= 0) {
        throw new Error(`Rooftop ${rooftop.id} has no usable running space.`);
      }

      const resolved: ResolvedRooftop = {
        ...rooftop,
        roofY: rooftop.roofY + MOVIE_CONFIG.city.platformYOffset,
        leftEdgeX,
        rightEdgeX,
        width,
        landingX,
        takeoffX,
        runDistance,
        runDuration: runDistance / MOVIE_CONFIG.city.teacherRunSpeed,
        facadeScale,
      };
      leftEdgeX = rightEdgeX + MOVIE_CONFIG.city.rooftopGap;
      return resolved;
    });
  }

  private getFacadeSourceWidth(roofId: string, middleCount: number): number {
    const facadeSpec = ROOFTOP_FACADES[roofId];
    if (!facadeSpec) {
      throw new Error(`Missing facade PNG configuration for rooftop ${roofId}.`);
    }

    return (
      facadeSpec.left.frame.width
      + facadeSpec.middle.frame.width * middleCount
      + facadeSpec.right.frame.width
    );
  }

  private getTeacherY(roofY: number): number {
    return roofY + MOVIE_CONFIG.city.teacherYOffset;
  }

  private updateCameraFollow(): void {
    const desiredPanX = MOVIE_CONFIG.city.cameraFollowX - this.teacher.root.x;
    this.panRoot.x = Math.min(0, Math.round(desiredPanX));
    this.updateSkyCameraCompensation();
  }

  private updateSkyCameraCompensation(): void {
    // CityScene is inside panRoot, but the sky and parallax layers are
    // viewport scenery. Keep them in screen space while the rooftop gameplay
    // world follows Teacher. Without this compensation, the camera pan is
    // added to the parallax offset and can move both repeated segments out of
    // the viewport before the next modulo wrap.
    const cameraCompensation = -this.panRoot.x;
    this.skyContainer.x = cameraCompensation;
    this.farLayer.x = cameraCompensation;
    this.midLayer.x = cameraCompensation;
    this.frontLayer.x = cameraCompensation;
  }

  private getCityDuration(rooftops: readonly ResolvedRooftop[]): number {
    let duration = MOVIE_CONFIG.city.initialLandingAt;

    rooftops.forEach((rooftop, index) => {
      duration += rooftop.runDuration;
      if (index === rooftops.length - 1) {
        duration += MOVIE_CONFIG.city.finalJump.duration;
        return;
      }

      const jumpToNext = rooftop.jumpToNext;
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
    this.addRunPoseSwitches(timeline, 0, options.duration);
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

  private addRunPoseSwitches(timeline: GsapTimeline, startAt: number, endAt: number): void {
    timeline.call(() => this.teacher.setRunCycleFrame(0), [], startAt);
    let frame = 1;
    const frameDuration = MOVIE_CONFIG.city.runFrameDuration;

    for (let at = startAt + frameDuration; at < endAt; at += frameDuration) {
      const cycleFrame = frame % 4;
      timeline.call(() => this.teacher.setRunCycleFrame(cycleFrame), [], at);
      frame += 1;
    }
  }

  private createSky(): Container {
    if (!this.skyBuilt) {
      const bandHeight = GAME_HEIGHT / SKY_BAND_COUNT;
      for (let index = 0; index < SKY_BAND_COUNT; index += 1) {
        const band = new Graphics({ label: `skyBand${index}` })
          .rect(0, index * bandHeight, GAME_WIDTH, bandHeight + 1)
          .fill(0xffffff);
        this.skyGradientBands.push(band);
        this.proceduralSky.addChild(band);
      }

      this.createStars();
      this.moonSprite = new Sprite(this.cityAssets.moon);
      this.moonSprite.label = 'moon';
      this.moonSprite.anchor.set(0.5);
      this.moonSprite.position.set(535, 58);
      this.moonSprite.scale.set(0.1);

      this.cloudContainer.addChild(
        this.createCloud(34, 48, 1),
        this.createCloud(278, 88, 0.78),
        this.createCloud(488, 40, 0.66),
      );

      this.skyContainer.addChild(
        this.proceduralSky,
        this.starLayer,
        this.moonSprite,
        this.cloudContainer,
      );
      this.skyBuilt = true;
    }

    return this.skyContainer;
  }

  private createStars(): void {
    const stars = [
      [34, 28, 1, 0.56], [78, 76, 1, 0.72], [121, 42, 2, 0.42], [165, 25, 1, 0.64],
      [214, 68, 1, 0.5], [252, 34, 1, 0.78], [304, 18, 2, 0.48], [344, 63, 1, 0.6],
      [386, 31, 1, 0.74], [425, 83, 1, 0.46], [468, 22, 1, 0.68], [512, 95, 2, 0.4],
      [558, 30, 1, 0.7], [606, 74, 1, 0.5], [38, 132, 1, 0.42], [104, 116, 1, 0.62],
      [186, 148, 1, 0.48], [274, 126, 1, 0.68], [362, 104, 1, 0.54], [448, 142, 1, 0.44],
      [536, 124, 1, 0.64], [620, 150, 1, 0.46],
    ] as const;

    stars.forEach(([x, y, size, alpha], index) => {
      const star = new Graphics({ label: `star${index}` })
        .rect(x, y, size, size)
        .fill(0xffffff);
      star.alpha = alpha;
      this.starLayer.addChild(star);
    });
  }

  private createCloud(x: number, y: number, scale: number): Graphics {
    const cloud = new Graphics({ label: 'pixelCloud' });
    cloud
      .rect(0, 10, 46, 8)
      .rect(8, 5, 23, 10)
      .rect(18, 1, 16, 12)
      .rect(29, 7, 26, 11)
      .fill(0xffffff);
    cloud.position.set(x, y);
    cloud.scale.set(scale);
    return cloud;
  }

  private attachCityAtmosphereFilters(): void {
    this.farLayer.filters = [this.farCityFilter];
    this.midLayer.filters = [this.midCityFilter];
    this.frontLayer.filters = [this.frontCityFilter];
  }

  private applySkyVisuals(): void {
    const { topColor, middleColor, horizonColor, brightness } = this.skyVisual;
    this.skyGradientBands.forEach((band, index) => {
      const position = index / Math.max(this.skyGradientBands.length - 1, 1);
      const color = position < 0.5
        ? interpolateColor(topColor, middleColor, position * 2)
        : interpolateColor(middleColor, horizonColor, (position - 0.5) * 2);
      band.tint = multiplyColor(color, brightness);
    });

    this.starLayer.alpha = this.skyVisual.starAlpha;
    this.cloudContainer.tint = this.skyVisual.cloudColor;
    this.cloudContainer.alpha = this.skyVisual.cloudAlpha;
    if (this.moonSprite) this.moonSprite.alpha = this.skyVisual.moonAlpha;
    this.windowLights.forEach((windowLight) => {
      windowLight.alpha = this.skyVisual.windowLightAlpha;
    });

    const cityTint = interpolateColor(0xffffff, this.skyVisual.cityTint, this.skyVisual.cityTintStrength);
    [this.farCityFilter, this.midCityFilter, this.frontCityFilter].forEach((filter) => {
      filter.reset();
      filter.tint(cityTint, false);
      filter.saturate(this.skyVisual.citySaturation, true);
      filter.brightness(this.skyVisual.cityBrightness, true);
    });
  }

  private updateCloudPosition(): void {
    this.cloudContainer.x = Math.round(this.cloudMotion.x);
  }

  private resetSky(): void {
    this.skyMode = 'auto';
    this.skyTimelineProgress = 0;
    Object.assign(this.skyVisual, MOVIE_CONFIG.city.sky.states.day);
    this.skyState = 'day';
    this.cloudMotion.x = 0;
    this.updateCloudPosition();
    this.applySkyVisuals();
  }

  private getSkyVisualAtProgress(progress: number): {
    state: CitySkyState;
    visual: SkyVisualState;
  } {
    const { timeline, states } = MOVIE_CONFIG.city.sky;

    if (progress < timeline.dayStableEnd) {
      return { state: 'day', visual: { ...states.day } };
    }

    if (progress < timeline.dayToSunsetEnd) {
      return {
        state: 'sunset',
        visual: interpolateSkyVisual(
          states.day,
          states.sunset,
          normalizeRange(progress, timeline.dayStableEnd, timeline.dayToSunsetEnd),
        ),
      };
    }

    if (progress < timeline.sunsetStableEnd) {
      return { state: 'sunset', visual: { ...states.sunset } };
    }

    if (progress < timeline.sunsetToNightEnd) {
      return {
        state: 'night',
        visual: interpolateSkyVisual(
          states.sunset,
          states.night,
          normalizeRange(progress, timeline.sunsetStableEnd, timeline.sunsetToNightEnd),
        ),
      };
    }

    return { state: 'night', visual: { ...states.night } };
  }

  private createImageSegments(
    layer: Container,
    segments: readonly [Container, Container],
    texture: CityAssets['far'],
    layerName: string,
    options: {
      readonly scale: number;
    },
  ): number {
    const sprites = segments.map((segment, segmentIndex) => {
      const sprite = new Sprite(texture);
      sprite.label = `${layerName}Sprite${segmentIndex === 0 ? 'A' : 'B'}`;
      sprite.position.set(0, 0);
      sprite.scale.set(options.scale);
      segment.addChild(sprite);
      layer.addChild(segment);
      return sprite;
    });
    const segmentWidth = Math.round(sprites[0].width);

    if (!Number.isInteger(sprites[0].width) || sprites[1].width !== sprites[0].width) {
      throw new Error(`${layerName} city texture must have an integer repeated width.`);
    }

    segments.forEach((segment, segmentIndex) => {
      segment.x = segmentIndex * segmentWidth;
    });
    return segmentWidth;
  }

  private layoutParallaxLayers(): void {
    const viewportHeight = GAME_HEIGHT;

    this.setSegmentY(
      this.farSegments,
      viewportHeight * MOVIE_CONFIG.city.layout.far.yRatio,
    );
    this.setSegmentY(
      this.midSegments,
      viewportHeight * MOVIE_CONFIG.city.layout.mid.yRatio,
    );
    this.setSegmentY(
      this.frontSegments,
      viewportHeight * MOVIE_CONFIG.city.layout.front.yRatio,
    );
  }

  private setSegmentY(segments: readonly [Container, Container], y: number): void {
    segments.forEach((segment) => {
      const sprite = segment.children[0];
      if (!(sprite instanceof Sprite)) {
        throw new Error('City parallax segment is missing its image sprite.');
      }

      sprite.y = Math.round(y);
    });
  }

  private resetImageSegments(
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

  private clearImageSegments(
    layer: Container,
    segments: readonly [Container, Container],
  ): void {
    segments.forEach((segment) => segment.removeChildren());
    layer.removeChildren();
  }

  private createPlatforms(): void {
    this.resolveRooftops().forEach(({ leftEdgeX, roofY: top, width, height, id, middleCount, facadeScale }) => {
      const building = new Container({ label: `building${id}` });
      building.position.set(leftEdgeX, 0);
      building.addChild(this.createRooftopFacade(id, 0, top, middleCount, facadeScale));
      for (let row = 0; row < Math.floor(height / 30); row += 1) {
        const windowLight = new Graphics()
          .rect(12, top + 16 + row * 30, 8, 10)
          .fill({ color: COLORS.windowCool, alpha: 0.45 })
          .rect(width - 22, top + 16 + row * 30, 8, 10)
          .fill({ color: COLORS.window, alpha: 0.45 });
        this.windowLights.push(windowLight);
        building.addChild(windowLight);
      }
      // Rooftop visual decorations are intentionally disabled.
      // this.createRooftopDecorations(building, id, x, top, width);
      const labelText = new Text({
        text: `ROOF ${id}`,
        style: {
          fill: COLORS.text,
          fontFamily: 'monospace',
          fontSize: 8,
          fontWeight: '700',
        },
      });
      labelText.position.set(8, top - 22);
      building.addChild(labelText);
      this.platforms.addChild(building);
    });
  }

  private createRooftopFacade(
    roofId: string,
    x: number,
    top: number,
    middleCount: number,
    facadeScale: number,
  ): Container {
    const facadeSpec = ROOFTOP_FACADES[roofId];
    if (!facadeSpec) {
      throw new Error(`Missing facade PNG configuration for rooftop ${roofId}.`);
    }

    const leftTopTexture = this.createFacadeTexture(facadeSpec.left, 'top');
    const middleTopTexture = this.createFacadeTexture(facadeSpec.middle, 'top');
    const rightTopTexture = this.createFacadeTexture(facadeSpec.right, 'top');
    const leftBodyTexture = this.createFacadeTexture(facadeSpec.left, 'body');
    const middleBodyTexture = this.createFacadeTexture(facadeSpec.middle, 'body');
    const rightBodyTexture = this.createFacadeTexture(facadeSpec.right, 'body');
    const facadeContainer = new Container({ label: `building${roofId}.facadeContainer` });

    const middleX = leftTopTexture.width;
    const middleWidth = middleTopTexture.width * middleCount;
    const rightX = middleX + middleWidth;
    const requiredSourceHeight = Math.ceil(Math.max(0, (GAME_HEIGHT - top) / facadeScale));

    // The top row is rendered once. Only the body below each cap is tiled.
    const leftTop = new Sprite(leftTopTexture);
    const middleTop = new TilingSprite({
      texture: middleTopTexture,
      width: middleWidth,
      height: middleTopTexture.height,
    });
    const rightTop = new Sprite(rightTopTexture);
    middleTop.position.x = middleX;
    rightTop.position.x = rightX;

    const leftBody = new TilingSprite({
      texture: leftBodyTexture,
      width: leftBodyTexture.width,
      height: Math.max(1, requiredSourceHeight - facadeSpec.left.bodyStart),
    });
    const middleBody = new TilingSprite({
      texture: middleBodyTexture,
      width: middleBodyTexture.width * middleCount,
      height: Math.max(1, requiredSourceHeight - facadeSpec.middle.bodyStart),
    });
    const rightBody = new TilingSprite({
      texture: rightBodyTexture,
      width: rightBodyTexture.width,
      height: Math.max(1, requiredSourceHeight - facadeSpec.right.bodyStart),
    });

    leftBody.position.y = facadeSpec.left.bodyStart;
    middleBody.position.set(middleX, facadeSpec.middle.bodyStart);
    rightBody.position.set(rightX, facadeSpec.right.bodyStart);

    facadeContainer.addChild(leftTop, middleTop, rightTop, leftBody, middleBody, rightBody);
    facadeContainer.position.set(Math.round(x), Math.round(top));
    facadeContainer.scale.set(facadeScale);

    return facadeContainer;
  }

  private createFacadeTexture(part: RooftopFacadePart, section: 'top' | 'body'): Texture {
    const sourceTexture = this.cityAssets[part.asset];
    const sectionY = section === 'top' ? part.frame.y : part.frame.y + part.bodyStart;
    const sectionHeight = section === 'top' ? part.bodyStart : part.frame.height - part.bodyStart;
    const frame = new Rectangle(
      part.frame.x,
      sectionY,
      part.frame.width,
      sectionHeight,
    );
    const texture = new Texture({
      source: sourceTexture.source,
      frame,
      label: `cityFacade.${part.asset}.${section}`,
    });
    texture.source.scaleMode = 'nearest';
    this.facadeTextures.push(texture);
    return texture;
  }

  /*
   * Rooftop visual decorations are temporarily disabled.
   * Keep the implementation commented so it can be restored without changing
   * platform geometry or gameplay staging.
   *
   * private createRooftopDecorations(
   *   building: Container,
   *   roofId: string,
   *   x: number,
   *   top: number,
   *   width: number,
   * ): void {
   *   ROOFTOP_DECORATIONS[roofId]?.forEach((spec, index) => {
   *     const decoration = new Sprite(this.cityAssets[spec.asset]);
   *     decoration.label = `rooftopDecoration${roofId}${index}`;
   *     decoration.anchor.set(0.5, 1);
   *     decoration.scale.set(spec.scale * MOVIE_CONFIG.city.rooftopDecorationScale);
   *     decoration.position.set(x + width * spec.xRatio, top);
   *     building.addChild(decoration);
   *   });
   * }
   */

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

function interpolateColor(from: number, to: number, amount: number): number {
  const mix = Math.max(0, Math.min(1, amount));
  const fromRed = (from >> 16) & 0xff;
  const fromGreen = (from >> 8) & 0xff;
  const fromBlue = from & 0xff;
  const toRed = (to >> 16) & 0xff;
  const toGreen = (to >> 8) & 0xff;
  const toBlue = to & 0xff;

  return (
    (Math.round(fromRed + (toRed - fromRed) * mix) << 16)
    | (Math.round(fromGreen + (toGreen - fromGreen) * mix) << 8)
    | Math.round(fromBlue + (toBlue - fromBlue) * mix)
  );
}

function interpolateSkyVisual(
  from: SkyVisualState,
  to: SkyVisualState,
  amount: number,
): SkyVisualState {
  const mix = clamp01(amount);

  return {
    topColor: interpolateColor(from.topColor, to.topColor, mix),
    middleColor: interpolateColor(from.middleColor, to.middleColor, mix),
    horizonColor: interpolateColor(from.horizonColor, to.horizonColor, mix),
    brightness: interpolateNumber(from.brightness, to.brightness, mix),
    cloudColor: interpolateColor(from.cloudColor, to.cloudColor, mix),
    cloudAlpha: interpolateNumber(from.cloudAlpha, to.cloudAlpha, mix),
    starAlpha: interpolateNumber(from.starAlpha, to.starAlpha, mix),
    moonAlpha: interpolateNumber(from.moonAlpha, to.moonAlpha, mix),
    windowLightAlpha: interpolateNumber(from.windowLightAlpha, to.windowLightAlpha, mix),
    cityBrightness: interpolateNumber(from.cityBrightness, to.cityBrightness, mix),
    citySaturation: interpolateNumber(from.citySaturation, to.citySaturation, mix),
    cityTint: interpolateColor(from.cityTint, to.cityTint, mix),
    cityTintStrength: interpolateNumber(from.cityTintStrength, to.cityTintStrength, mix),
  };
}

function interpolateNumber(from: number, to: number, amount: number): number {
  return from + (to - from) * clamp01(amount);
}

function normalizeRange(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp01((value - start) / (end - start));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function multiplyColor(color: number, amount: number): number {
  const red = Math.round(((color >> 16) & 0xff) * amount);
  const green = Math.round(((color >> 8) & 0xff) * amount);
  const blue = Math.round((color & 0xff) * amount);

  return (Math.min(255, red) << 16) | (Math.min(255, green) << 8) | Math.min(255, blue);
}
