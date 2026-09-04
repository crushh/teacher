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
