import { Container, Graphics } from 'pixi.js';

import { RUNTIME_CONFIG } from '../game/config';

export interface TeacherResetStatus {
  root: boolean;
  visual: boolean;
}

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
  private readonly initialRootPosition: Position = {
    x: RUNTIME_CONFIG.teacher.startX,
    y: RUNTIME_CONFIG.teacher.startY,
  };
  private readonly initialVisualPosition: Position = { x: 0, y: 0 };

  constructor() {
    this.placeholder = this.createPlaceholder();
    this.root.addChild(this.visual);
    this.visual.addChild(this.placeholder);
    this.reset();
  }

  reset(): void {
    this.resetContainer(this.root, this.initialRootPosition);
    this.resetContainer(this.visual, this.initialVisualPosition);
    this.resetContainer(this.placeholder, { x: 0, y: 0 });
  }

  getResetStatus(): TeacherResetStatus {
    return {
      root: this.isContainerAt(this.root, this.initialRootPosition),
      visual: this.isContainerAt(this.visual, this.initialVisualPosition),
    };
  }

  isReset(): boolean {
    const status = this.getResetStatus();

    return status.root && status.visual && this.isContainerAt(this.placeholder, { x: 0, y: 0 });
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

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}
