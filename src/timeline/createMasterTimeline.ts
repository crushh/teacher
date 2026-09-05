import { gsap } from 'gsap';

import type { GsapTimeline } from '../scenes/Scene';

export function createMasterTimeline(timelines: readonly GsapTimeline[]): gsap.core.Timeline {
  const masterTimeline = gsap.timeline({
    id: 'masterTimeline',
    paused: true,
    repeat: -1,
  });

  timelines.forEach((timeline) => {
    masterTimeline.add(timeline);
  });

  return masterTimeline;
}
