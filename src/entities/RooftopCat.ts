import { gsap } from 'gsap';
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

import { jumpTo } from '../animations/jump';
import { MOVIE_CONFIG } from '../game/config';
import type { GsapTimeline } from '../scenes/Scene';

/** A staged cartoon encounter, owned entirely by the city timeline. */
export class RooftopCat {
  readonly root = new Container({ label: 'RooftopCat.root' });
  private readonly body = new Container({ label: 'RooftopCat.body' });
  private readonly shadow = new Graphics({ label: 'RooftopCat.shadow' })
    .ellipse(0, 0, 23, 3).fill({ color: 0x101a30, alpha: 0.38 });
  private readonly surprise = new Graphics({ label: 'RooftopCat.surprise' })
    .rect(-2, -18, 4, 11).rect(-2, -3, 4, 4).fill(0xffe6a1);
  private readonly poses: Sprite[];
  private readonly halfHeight: number;

  constructor(textures: readonly [Texture, Texture, Texture]) {
    const scale = MOVIE_CONFIG.city.catEncounter.width / textures[0].width;
    this.halfHeight = textures[0].height * scale / 2;
    this.poses = textures.map((texture, index) => {
      const sprite = new Sprite(texture);
      sprite.label = `RooftopCat.pose${index}`;
      sprite.anchor.set(0.5);
      sprite.scale.set(scale);
      this.body.addChild(sprite);
      return sprite;
    });
    this.root.addChild(this.shadow, this.body, this.surprise);
    this.reset();
  }

  createTimeline(x: number, groundY: number): GsapTimeline {
    const config = MOVIE_CONFIG.city.catEncounter;
    const timeline = gsap.timeline({ id: 'catEncounter' });
    const startleAt = config.entryDuration;
    const launchAt = startleAt + config.anticipationDuration;
    const endAt = launchAt + config.flightDuration;
    const bodyY = groundY - this.halfHeight;

    timeline.set(this.root, { visible: true }, 0);
    timeline.set(this.body, {
      x: x + config.entryDistance, y: bodyY, rotation: 0, alpha: 0,
    }, 0);
    timeline.set(this.body.scale, { x: 1, y: 1 }, 0);
    timeline.set(this.shadow, { x: x + config.entryDistance, y: groundY, alpha: 1 }, 0);
    timeline.set(this.shadow.scale, { x: 1, y: 1 }, 0);
    timeline.set(this.surprise, { x, y: groundY - this.halfHeight * 2 - 5, alpha: 0 }, 0);
    timeline.set(this.poses, { visible: false }, 0);
    timeline.set(this.poses[0]!, { visible: true }, 0);
    timeline.to(this.body, { alpha: 1, duration: 0.12 }, 0);
    timeline.to([this.body, this.shadow], {
      x, duration: startleAt, ease: 'none',
    }, 0);
    timeline.to(this.body, {
      y: bodyY - 3, duration: startleAt / 8, repeat: 7, yoyo: true, ease: 'sine.inOut',
    }, 0);
    for (let frame = 1; frame * 0.12 < startleAt; frame += 1) {
      timeline.set(this.poses, { visible: false }, frame * 0.12);
      timeline.set(this.poses[frame % 2]!, { visible: true }, frame * 0.12);
    }

    // Notice the runner, freeze, then crouch with feet planted before
    // pushing off. The runner remains visibly separated throughout.
    timeline.set(this.poses, { visible: false }, startleAt);
    timeline.set(this.poses[0]!, { visible: true }, startleAt);
    timeline.set(this.surprise, { alpha: 1 }, startleAt);
    timeline.to(this.body.scale, { x: 1.12, y: 0.74, duration: 0.18, ease: 'power2.inOut' }, startleAt + 0.06);
    timeline.to(this.body, { y: bodyY + this.halfHeight * 0.26, duration: 0.18, ease: 'power2.inOut' }, startleAt + 0.06);
    timeline.to(this.surprise, { alpha: 0, duration: 0.12 }, launchAt);
    timeline.set(this.poses, { visible: false }, launchAt);
    timeline.set(this.poses[2]!, { visible: true }, launchAt);
    // Turn toward the escape direction and extend, rather than tumble.
    timeline.set(this.body.scale, { x: -0.88, y: 1.12 }, launchAt);
    timeline.to(this.body.scale, { x: -1, y: 1, duration: 0.16 }, launchAt);
    timeline.add(jumpTo({
      target: this.body,
      startX: x,
      startY: bodyY + this.halfHeight * 0.26,
      targetX: x + config.flightDistance,
      targetY: bodyY + 18,
      height: config.flightHeight,
      duration: config.flightDuration,
    }), launchAt);
    timeline.to(this.body, { rotation: -0.22, duration: 0.2, ease: 'power1.out' }, launchAt);
    timeline.to(this.body, { rotation: 0.12, duration: config.flightDuration - 0.2, ease: 'sine.inOut' }, launchAt + 0.2);
    timeline.to(this.shadow, { alpha: 0, duration: 0.18 }, launchAt);
    timeline.to(this.shadow.scale, { x: 0.3, y: 0.3, duration: 0.18 }, launchAt);
    timeline.set(this.root, { visible: false }, endAt);
    return timeline;
  }

  reset(): void {
    this.root.visible = false;
    this.body.position.set(0, 0);
    this.body.scale.set(1);
    this.body.rotation = 0;
    this.body.alpha = 1;
    this.shadow.alpha = 0;
    this.shadow.scale.set(1);
    this.surprise.alpha = 0;
    this.poses.forEach((pose, index) => { pose.visible = index === 0; });
  }
}
