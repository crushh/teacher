import { gsap } from 'gsap';

import type { Scene } from '../scenes/Scene';

export function createMasterTimeline(scenes: readonly Scene[]): gsap.core.Timeline {
  const masterTimeline = gsap.timeline({
    id: 'masterTimeline',
    paused: true,
  });

  scenes.forEach((scene) => {
    masterTimeline.add(scene.createTimeline());
  });

  return masterTimeline;
}
