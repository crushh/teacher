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
