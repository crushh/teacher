import { gsap } from 'gsap';
import type { Container } from 'pixi.js';

export function squash(visual: Container, amount = 0.2, duration = 0.16): gsap.core.Timeline {
  return gsap.timeline()
    .to(visual.scale, {
      x: 1 + amount,
      y: 1 - amount * 0.8,
      duration: duration / 2,
      ease: 'power2.out',
    })
    .to(visual.scale, {
      x: 1,
      y: 1,
      duration: duration / 2,
      ease: 'back.out(2)',
    });
}
