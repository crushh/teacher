import { gsap } from 'gsap';
import type { Container } from 'pixi.js';

export interface CameraShakeOptions {
  strength?: number;
  duration?: number;
}

export function cameraShake(
  shakeRoot: Container,
  options: CameraShakeOptions = {},
): gsap.core.Timeline {
  const originX = shakeRoot.x;
  const originY = shakeRoot.y;
  const strength = options.strength ?? 4;
  const duration = options.duration ?? 0.15;
  const timeline = gsap.timeline();

  timeline.to(shakeRoot, {
    x: originX + strength,
    y: originY - strength * 0.4,
    duration: duration / 4,
    ease: 'none',
    repeat: 3,
    yoyo: true,
  });
  timeline.to(shakeRoot, {
    x: originX,
    y: originY,
    duration: duration / 4,
    ease: 'none',
  });

  return timeline;
}
