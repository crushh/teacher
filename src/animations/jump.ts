import { gsap } from 'gsap';
import type { Container } from 'pixi.js';

export interface JumpOptions {
  target: Container;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  height: number;
  duration: number;
}

export function jumpTo(options: JumpOptions): gsap.core.Timeline {
  const progress = { value: 0 };
  const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });

  timeline.set(options.target, {
    x: options.startX,
    y: options.startY,
  }, 0);
  timeline.to(progress, {
    value: 1,
    duration: options.duration,
    ease: 'none',
    onUpdate: () => {
      const t = progress.value;
      const yOffset = -4 * options.height * t * (1 - t);
      options.target.position.set(
        options.startX + (options.targetX - options.startX) * t,
        options.startY + (options.targetY - options.startY) * t + yOffset,
      );
    },
  });

  return timeline;
}
