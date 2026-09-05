export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;
export const LOGICAL_ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

export const RENDERER_CONFIG = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  resolution: 1,
  autoDensity: false,
  antialias: false,
  backgroundColor: 0x0b1018,
  preference: 'webgl' as const,
};

export const RUNTIME_CONFIG = {
  teacher: {
    startX: 156,
    startY: 298,
    endX: 484,
  },
  probe: {
    duration: 4,
    bobHeight: 6,
    bobDuration: 0.25,
    bobRepeats: 7,
    visualRotation: 0.035,
    panStart: 0.8,
    panDistance: 12,
    shakeStart: 2.65,
    shakeStrength: 4,
    shakeStep: 0.06,
    shakeRepeats: 3,
  },
  speed: {
    min: 0.25,
    max: 2,
    default: 1,
  },
} as const;

export const MOVIE_CONFIG = {
  teacher: {
    startX: 390,
    startY: 292,
  },
  classroom: {
    duration: 8,
    entranceDuration: 1.2,
    offscreenLeft: -48,
    offscreenRight: GAME_WIDTH + 48,
    entranceY: 292,
    teacherTalkAt: 1.2,
    teacherPauseAt: 5.55,
    lookAtWindowAt: 5.85,
    runStartAt: 6.35,
    windowJumpAt: 7.35,
    windowExitAt: 8,
  },
  city: {
    initialLandingAt: 0.4,
    runSpeed: 60,
    roofPadding: 24,
    farSpeed: 60,
    midSpeed: 140,
    frontSpeed:200,
    landingSquash: 0.2,
    rooftops: [
      {
        id: 'A',
        height: 100,
        landingX: 48,
        roofY: 264,
        runDuration: 2,
        jumpToNext: { height: 58, duration: 1.05 },
      },
      {
        id: 'B',
        height: 118,
        landingX: 230,
        roofY: 246,
        runDuration: 1,
        jumpToNext: { height: 72, duration: 1.1 },
      },
      {
        id: 'C',
        height: 94,
        landingX: 360,
        roofY: 270,
        runDuration: 3,
      },
    ],
    finalJump: {
      targetX: 530,
      targetY: GAME_HEIGHT + 100,
      height: 42,
      duration: 1.25,
    },
  },
  hallway: {
    duration: 10,
    exitX: GAME_WIDTH + 48,
    exitDuration: 0.9,
    fallStartX: 185,
    fallStartY: -88,
    landingY: 278,
    rollStartAt: 1.25,
    rollDuration: 1.25,
    bookDropAt: 1.8,
    bookCatchAt: 3.1,
    doorOpenAt: 6.7,
    entryAt: 7.25,
  },
  transition: {
    duration: 0.7,
    flashDuration: 0.1,
  },
  speed: {
    min: 0.25,
    max: 2,
    default: 1,
  },
} as const;
