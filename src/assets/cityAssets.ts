import { Assets, Texture } from 'pixi.js';

import farCityUrl from './cleaned/city/far-city-layer-v1.png';
import midCityUrl from './cleaned/city/mid-city-layer-v1.png';
import moonUrl from './city/moon.png';
import nearCityUrl from './cleaned/city/near-city-layer-v1.png';
import { configurePixelTexture } from '../game/pixel';

export interface CityAssets {
  readonly far: Texture;
  readonly mid: Texture;
  readonly near: Texture;
  readonly moon: Texture;
}

async function loadCityTexture(url: string): Promise<Texture> {
  return configurePixelTexture(await Assets.load<Texture>(url));
}

export async function loadCityAssets(): Promise<CityAssets> {
  const [far, mid, near, moon] = await Promise.all([
    loadCityTexture(farCityUrl),
    loadCityTexture(midCityUrl),
    loadCityTexture(nearCityUrl),
    loadCityTexture(moonUrl),
  ]);

  return { far, mid, near, moon };
}
