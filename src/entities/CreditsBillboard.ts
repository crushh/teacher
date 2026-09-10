import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';

/** Original mid-city credits panel with two cats resting on its top rim. */
export function createCreditsBillboard(cats: readonly [Texture, Texture]): Container {
  const sign = new Container({ label: 'creditsBillboard' });
  const frame = new Graphics();
  frame.rect(72, 146, 12, 34).rect(356, 146, 12, 34).fill(0x142340);
  frame.moveTo(84, 177).lineTo(356, 150).moveTo(84, 150).lineTo(356, 177)
    .stroke({ color: 0x3c5680, width: 5 });
  frame.rect(4, 4, 440, 150).fill(0x101b33);
  frame.rect(0, 0, 440, 150).fill(0x182d50);
  frame.rect(4, 4, 432, 142).fill(0x53749d);
  frame.rect(8, 8, 424, 134).fill(0x243e68);
  frame.rect(14, 14, 412, 122).fill(0x344a86);
  frame.rect(16, 16, 408, 4).fill(0x4d63a0);
  frame.rect(16, 130, 408, 5).fill(0x283969);
  for (let i = 0; i < 62; i += 1) {
    frame.rect(18 + (i * 73) % 400, 20 + (i * 37) % 108, i % 3 === 0 ? 4 : 2, 2)
      .fill({ color: i % 2 ? 0x8096bd : 0x182c57, alpha: 0.17 });
  }
  for (const x of [7, 425]) {
    for (const y of [7, 135]) {
      frame.rect(x, y, 8, 8).fill(0x111e38);
      frame.rect(x + 1, y + 1, 5, 5).fill(0xa4b8cd);
      frame.rect(x + 1, y + 1, 3, 2).fill(0xe1e8e3);
    }
  }
  for (const x of [64, 210, 356]) {
    frame.rect(x + 13, -19, 6, 20).fill(0x142340);
    frame.rect(x, -12, 34, 13).fill(0x152641);
    frame.rect(x + 3, -10, 28, 5).fill(0x52719a);
    frame.rect(x + 4, -3, 26, 5).fill(0xffdd95);
    frame.rect(x + 8, 2, 18, 9).fill({ color: 0xffd68a, alpha: 0.13 });
  }
  frame.rect(218, 30, 2, 91).fill(0x6275a0);
  sign.addChild(frame);
  const text = (value: string, x: number, y: number, size: number, color: number) => {
    const label = new Text({ text: value, resolution: 2, style: {
      fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "PingFang SC", sans-serif',
      fontSize: size, fontWeight: '800', fill: color,
      dropShadow: { color: 0x162443, alpha: 1, blur: 0, distance: 2, angle: Math.PI / 2 },
    } });
    label.position.set(x, y);
    sign.addChild(label);
  };
  text('総監督', 65, 29, 24, 0xffdc94);
  text('曹宇', 65, 67, 38, 0xfff4cf);
  text('技術顧問', 260, 29, 24, 0xffdc94);
  text('水震洋', 260, 67, 38, 0xfff4cf);
  cats.forEach((texture, index) => {
    const cat = new Sprite(texture);
    cat.label = `creditsOrangeCat${index + 1}`;
    cat.anchor.set(0.5, 1);
    cat.scale.set((index === 0 ? 94 : 56) / texture.width);
    cat.position.set(index === 0 ? 151 : 302, 1);
    sign.addChild(cat);
  });
  return sign;
}
