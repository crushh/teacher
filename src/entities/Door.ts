import { Container, Graphics } from 'pixi.js';

export class Door {
  readonly root = new Container({ label: 'Door.root' });

  private readonly panel: Graphics;
  private readonly knob: Graphics;
  private readonly initialX: number;
  private readonly initialY: number;

  constructor(x: number, y: number) {
    this.initialX = x;
    this.initialY = y;
    this.panel = new Graphics();
    this.knob = new Graphics();
    this.root.position.set(x, y);
    this.root.addChild(this.createFrame(), this.panel, this.knob);
    this.reset();
  }

  reset(): void {
    this.root.position.set(this.initialX, this.initialY);
    this.root.rotation = 0;
    this.root.scale.set(1, 1);
    this.root.pivot.set(0, 0);
    this.root.skew.set(0, 0);
    this.root.alpha = 1;
    this.root.visible = true;
    this.root.tint = 0xffffff;
    this.panel.position.set(0, 0);
    this.panel.rotation = 0;
    this.panel.pivot.set(0, 0);
    this.panel.visible = true;
    this.knob.position.set(0, 0);
    this.knob.rotation = 0;
    this.knob.visible = true;
    this.panel.clear()
      .rect(-39, -96, 78, 96)
      .fill(0x4d6b8b)
      .stroke({ color: 0x0b1420, width: 3 });
    this.knob.clear().circle(26, -46, 3).fill(0xffc857);
  }

  open(): void {
    this.panel.rotation = -0.8;
    this.panel.pivot.set(39, 0);
    this.knob.visible = false;
  }

  private createFrame(): Graphics {
    return new Graphics()
      .rect(-46, -103, 92, 103)
      .fill(0x1b2a3b)
      .stroke({ color: 0x0b1420, width: 3 });
  }
}
