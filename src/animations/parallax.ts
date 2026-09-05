import { gsap } from 'gsap';
import type { Container } from 'pixi.js';

export interface ParallaxLayer {
  /** Two identical segments placed end-to-end. */
  segments: readonly [Container, Container];
  /** Width of one repeated segment in world pixels. */
  width: number;
  /** Scroll speed in pixels per second. */
  speed: number;
}

export function parallax(
  layers: readonly ParallaxLayer[],
  duration: number,
): gsap.core.Timeline {
  const timeline = gsap.timeline();
  const clock = { elapsed: 0 };

  layers.forEach(({ segments, width }) => {
    segments[0].x = 0;
    segments[1].x = width;
  });

  timeline.to(clock, {
    elapsed: duration,
    duration,
    ease: 'none',
    onUpdate: () => {
      layers.forEach((layer) => {
        const offset = -positiveModulo(clock.elapsed * layer.speed, layer.width);

        // Once a segment has moved completely offscreen, it wraps to the
        // other side of the pair. Since both segments are identical, the
        // visible background remains continuous at the wrap point.
        layer.segments[0].x = offset;
        layer.segments[1].x = offset + layer.width;
      });
    },
  }, 0);

  return timeline;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
