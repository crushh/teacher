export type GsapTimeline = ReturnType<typeof import('gsap').gsap.timeline>;

export interface Scene {
  readonly id: string;

  build(): void;

  createTimeline(): GsapTimeline;

  reset(): void;

  dispose(): void;
}
