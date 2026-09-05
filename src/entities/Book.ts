import { Container, Graphics, Text } from 'pixi.js';

export class Book {
  readonly root = new Container({ label: 'Book.root' });

  private readonly initialX: number;
  private readonly initialY: number;

  constructor(initialX: number, initialY: number) {
    this.initialX = initialX;
    this.initialY = initialY;
    this.root.addChild(this.createPlaceholder());
    this.reset();
  }

  reset(): void {
    this.root.position.set(this.initialX, this.initialY);
    this.root.rotation = 0;
    this.root.scale.set(1, 1);
    this.root.pivot.set(0, 0);
    this.root.skew.set(0, 0);
    this.root.alpha = 1;
    this.root.visible = false;
    this.root.tint = 0xffffff;
  }

  private createPlaceholder(): Container {
    const visual = new Container({ label: 'Book.visual' });
    const book = new Graphics()
      .roundRect(-15, -20, 30, 40, 2)
      .fill(0xf06c75)
      .stroke({ color: 0x341d35, width: 2 });
    const pages = new Graphics()
      .rect(-10, -13, 20, 2)
      .fill(0xffe8ae)
      .rect(-10, -6, 20, 2)
      .fill(0xffe8ae)
      .rect(-10, 1, 14, 2)
      .fill(0xffe8ae);
    const label = new Text({
      text: 'BOOK',
      style: {
        fill: 0xfff1c4,
        fontFamily: 'monospace',
        fontSize: 6,
        fontWeight: '700',
      },
    });
    label.anchor.set(0.5);
    label.position.set(0, 10);
    visual.addChild(book, pages, label);

    return visual;
  }
}
