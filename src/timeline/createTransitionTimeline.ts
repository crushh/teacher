import { gsap } from 'gsap';
import { Container, Graphics } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG } from '../game/config';
import type { GsapTimeline } from '../scenes/Scene';

export interface TransitionEffects {
  readonly root: Container;
  readonly flash: Graphics;
  reset(): void;
}

export function createTransitionEffects(parent: Container): TransitionEffects {
  const root = new Container({ label: 'sceneTransitionEffects' });
  const flash = new Graphics({ label: 'transitionFlash' })
    .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    .fill(0xffffff);

  root.addChild(flash);
  parent.addChild(root);

  const effects: TransitionEffects = {
    root,
    flash,
    reset: () => {
      resetContainer(root, false);
      resetContainer(flash, false);
    },
  };
  effects.reset();
  return effects;
}

export function createSceneTransitionTimeline(options: {
  from: Container;
  to: Container;
  effects: TransitionEffects;
  label: string;
  duration?: number;
  onSwap?: () => void;
}): GsapTimeline {
  const duration = options.duration ?? MOVIE_CONFIG.transition.duration;
  const timingScale = duration / MOVIE_CONFIG.transition.duration;
  const swapAt = 0.34 * timingScale;
  const timeline = gsap.timeline({
    id: `transition:${options.label}`,
    defaults: { overwrite: 'auto' },
  });

  timeline.set(options.effects.root, { visible: true, alpha: 1 }, 0);
  timeline.set(options.effects.flash, { visible: true, alpha: 0 }, 0);
  timeline.to(options.effects.flash, {
    alpha: 1,
    duration: MOVIE_CONFIG.transition.flashDuration * timingScale,
    ease: 'power2.out',
  }, 0.24 * timingScale);
  timeline.set(options.from, { visible: false, alpha: 0 }, swapAt);
  if (options.onSwap) {
    timeline.call(options.onSwap, [], swapAt);
  }
  timeline.set(options.to, { visible: true, alpha: 1 }, swapAt);
  timeline.to(options.effects.flash, {
    alpha: 0,
    duration: 0.16 * timingScale,
    ease: 'power1.in',
  }, swapAt);
  timeline.set(options.effects.root, { visible: false, alpha: 1 }, duration);

  return timeline;
}

function resetContainer(container: Container, visible: boolean): void {
  container.position.set(0, 0);
  container.rotation = 0;
  container.scale.set(1, 1);
  container.pivot.set(0, 0);
  container.skew.set(0, 0);
  container.alpha = visible ? 1 : 0;
  container.visible = visible;
  container.tint = 0xffffff;
}
