import { Container, Graphics, Sprite } from 'pixi.js';

import type { ClassroomPoseTextures } from '../assets/classroomAssets';
import { RUNTIME_CONFIG } from '../game/config';

export interface TeacherResetStatus {
  root: boolean;
  visual: boolean;
}

export type TeacherPose =
  | 'idle'
  | 'talk'
  | 'talk1'
  | 'talk2'
  | 'walkBook'
  | 'putBook'
  | 'blackboard'
  | 'lookClock'
  | 'react'
  | 'run'
  | 'run1'
  | 'run2'
  | 'jump'
  | 'fall'
  | 'roll'
  | 'rollEnd'
  | 'catch'
  | 'holdBook'
  | 'openDoor';

type Position = {
  x: number;
  y: number;
};

const COLORS = {
  outline: 0x0a111d,
  hair: 0x2a3852,
  cardigan: 0x3f79b5,
  shirt: 0xf4f0d2,
  trousers: 0xf7f4e5,
  skin: 0xf3b88e,
  shoe: 0x1d2738,
  shadow: 0x05080d,
} as const;

export class Teacher {
  readonly root = new Container({ label: 'Teacher.root' });
  readonly visual = new Container({ label: 'Teacher.visual' });

  private readonly placeholder: Graphics;
  private readonly poseSprite: Sprite | undefined;
  private readonly poseTextures: ClassroomPoseTextures | undefined;
  private readonly poseScales: Partial<Record<TeacherPose, number>>;
  private readonly initialRootPosition: Position;
  private readonly initialVisualPosition: Position = { x: 0, y: 0 };
  private pose: TeacherPose = 'idle';

  constructor(
    initialPosition: Position = {
      x: RUNTIME_CONFIG.teacher.startX,
      y: RUNTIME_CONFIG.teacher.startY,
    },
    poseTextures?: ClassroomPoseTextures,
    poseScales: Partial<Record<TeacherPose, number>> = {},
  ) {
    this.initialRootPosition = { ...initialPosition };
    this.poseTextures = poseTextures;
    this.poseScales = poseScales;
    this.placeholder = this.createPlaceholder();
    this.root.addChild(this.visual);
    if (poseTextures) {
      this.poseSprite = new Sprite(poseTextures.talk1);
      this.poseSprite.label = 'Teacher.poseSprite';
      this.poseSprite.anchor.set(0.5, 1);
      this.poseSprite.scale.set(this.getPoseScale('idle'));
      this.visual.addChild(this.poseSprite, this.placeholder);
      this.placeholder.visible = false;
    } else {
      this.poseSprite = undefined;
      this.visual.addChild(this.placeholder);
    }
    this.reset();
  }

  reset(): void {
    this.resetContainer(this.root, this.initialRootPosition);
    this.resetContainer(this.visual, this.initialVisualPosition);
    this.resetContainer(this.placeholder, { x: 0, y: 0 });
    this.pose = 'idle';
    if (this.poseSprite) {
      this.poseSprite.texture = this.poseTextures?.talk1 ?? this.poseSprite.texture;
      this.poseSprite.position.set(0, 0);
      this.poseSprite.rotation = 0;
      this.poseSprite.scale.set(this.getPoseScale('idle'));
      this.poseSprite.alpha = 1;
      this.poseSprite.visible = true;
      this.placeholder.visible = false;
    }
  }

  setPose(pose: TeacherPose): void {
    this.pose = pose;
    const texture = this.poseTextures?.[poseTextureKey(pose)];
    if (this.poseSprite && texture) {
      this.poseSprite.texture = texture;
      this.poseSprite.scale.set(this.getPoseScale(pose));
      this.poseSprite.visible = true;
      this.placeholder.visible = false;
      return;
    }

    this.placeholder.visible = true;
    this.placeholder.tint = poseTint(pose);
  }

  getPose(): TeacherPose {
    return this.pose;
  }

  getResetStatus(): TeacherResetStatus {
    return {
      root: this.isContainerAt(this.root, this.initialRootPosition),
      visual: this.isContainerAt(this.visual, this.initialVisualPosition),
    };
  }

  isReset(): boolean {
    const status = this.getResetStatus();

    const poseSpriteReset = this.poseSprite
      ? this.poseSprite.visible && nearlyEqual(this.poseSprite.x, 0) && nearlyEqual(this.poseSprite.y, 0)
      : this.isContainerAt(this.placeholder, { x: 0, y: 0 });

    return status.root && status.visual && poseSpriteReset;
  }

  private createPlaceholder(): Graphics {
    const placeholder = new Graphics({ label: 'Teacher.placeholder' });

    placeholder
      .ellipse(0, 2, 24, 6)
      .fill({ color: COLORS.shadow, alpha: 0.5 })
      .rect(-15, -28, 11, 27)
      .fill(COLORS.trousers)
      .rect(4, -28, 11, 27)
      .fill(COLORS.trousers)
      .rect(-18, -4, 15, 5)
      .fill(COLORS.shoe)
      .rect(3, -4, 15, 5)
      .fill(COLORS.shoe)
      .roundRect(-20, -62, 40, 37, 5)
      .fill(COLORS.outline)
      .roundRect(-17, -60, 34, 32, 4)
      .fill(COLORS.cardigan)
      .rect(-4, -59, 8, 30)
      .fill(COLORS.shirt)
      .rect(-25, -58, 7, 22)
      .fill(COLORS.outline)
      .rect(18, -58, 7, 22)
      .fill(COLORS.outline)
      .roundRect(-17, -83, 34, 28, 8)
      .fill(COLORS.outline)
      .roundRect(-14, -81, 28, 25, 7)
      .fill(COLORS.skin)
      .rect(-15, -84, 30, 8)
      .fill(COLORS.hair)
      .rect(-12, -88, 24, 6)
      .fill(COLORS.hair)
      .rect(-9, -72, 4, 3)
      .fill(COLORS.outline)
      .rect(5, -72, 4, 3)
      .fill(COLORS.outline)
      .rect(-4, -64, 8, 3)
      .fill(COLORS.outline);

    return placeholder;
  }

  private getPoseScale(pose: TeacherPose): number {
    return this.poseScales[pose] ?? 0.68;
  }

  private resetContainer(container: Container, position: Position): void {
    container.position.set(position.x, position.y);
    container.rotation = 0;
    container.scale.set(1, 1);
    container.pivot.set(0, 0);
    container.skew.set(0, 0);
    container.alpha = 1;
    container.visible = true;
    container.tint = 0xffffff;
  }

  private isContainerAt(container: Container, position: Position): boolean {
    return (
      nearlyEqual(container.x, position.x) &&
      nearlyEqual(container.y, position.y) &&
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
}

function poseTint(pose: TeacherPose): number {
  switch (pose) {
    case 'talk':
      return 0xffffff;
    case 'run':
      return 0x9bd7ff;
    case 'jump':
      return 0xffe09a;
    case 'fall':
      return 0xffa6b8;
    case 'roll':
      return 0xd6b4ff;
    case 'rollEnd':
      return 0xffffff;
    case 'catch':
      return 0x9ff0ce;
    case 'holdBook':
      return 0xf8f0a3;
    case 'openDoor':
      return 0xffd28a;
    case 'idle':
    default:
      return 0xffffff;
  }
}

function poseTextureKey(pose: TeacherPose): keyof ClassroomPoseTextures {
  switch (pose) {
    case 'walkBook':
    case 'holdBook':
      return 'walkBook';
    case 'putBook':
      return 'putBook';
    case 'talk':
    case 'talk1':
    case 'idle':
    case 'openDoor':
      return 'talk1';
    case 'talk2':
      return 'talk2';
    case 'blackboard':
      return 'blackboard';
    case 'lookClock':
      return 'lookClock';
    case 'react':
      return 'react';
    case 'run':
    case 'run1':
    case 'roll':
      return 'run1';
    case 'run2':
      return 'run2';
    case 'jump':
    case 'fall':
      return 'jump';
    case 'rollEnd':
      return 'rollEnd';
    case 'catch':
      return 'talk2';
    default:
      return 'talk1';
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}
