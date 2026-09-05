import { gsap } from 'gsap';
import { Container, Graphics } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG } from '../game/config';
import type { GsapTimeline } from '../scenes/Scene';

export interface TransitionEffects {
  readonly root: Container;
  readonly flash: Graphics;
  readonly speedLines: Graphics;
  reset(): void;
}

export function createTransitionEffects(parent: Container): TransitionEffects {
  const root = new Container({ label: 'sceneTransitionEffects' });
  const speedLines = new Graphics({ label: 'transitionSpeedLines' })
    .moveTo(34, 88).lineTo(602, 50)
    .moveTo(20, 142).lineTo(620, 112)
    .moveTo(52, 205).lineTo(588, 190)
    .moveTo(94, 266).lineTo(560, 274)
    .stroke({ color: 0xffe4a6, width: 3, alpha: 0.75 });
  const flash = new Graphics({ label: 'transitionFlash' })
    .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    .fill(0xffffff);

  root.addChild(speedLines, flash);
  parent.addChild(root);

  const effects: TransitionEffects = {
    root,
    flash,
    speedLines,
    reset: () => {
      resetContainer(root, false);
      resetContainer(speedLines, false);
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
  const timeline = gsap.timeline({
    id: `transition:${options.label}`,
    defaults: { overwrite: 'auto' },
  });

  timeline.set(options.effects.root, { visible: true, alpha: 1 }, 0);
  timeline.set(options.effects.speedLines, { visible: true, alpha: 0 }, 0);
  timeline.set(options.effects.flash, { visible: true, alpha: 0 }, 0);
  timeline.to(options.effects.speedLines, {
    alpha: 1,
    duration: 0.1,
    ease: 'none',
  }, 0);
  timeline.to(options.effects.flash, {
    alpha: 1,
    duration: MOVIE_CONFIG.transition.flashDuration,
    ease: 'power2.out',
  }, 0.24);
  timeline.set(options.from, { visible: false, alpha: 0 }, 0.34);
  if (options.onSwap) {
    timeline.call(options.onSwap, [], 0.34);
  }
  timeline.set(options.to, { visible: true, alpha: 1 }, 0.34);
  timeline.to(options.effects.flash, {
    alpha: 0,
    duration: 0.16,
    ease: 'power1.in',
  }, 0.34);
  timeline.to(options.effects.speedLines, {
    alpha: 0,
    duration: Math.max(0.1, duration - 0.34),
    ease: 'power1.out',
  }, 0.34);
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
