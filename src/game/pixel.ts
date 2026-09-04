import type { Texture } from 'pixi.js';

/** Apply the one sampling rule shared by every pixel-art texture. */
export function configurePixelTexture(texture: Texture): Texture {
  texture.source.scaleMode = 'nearest';

  return texture;
}
