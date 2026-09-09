import { Assets, Texture } from 'pixi.js';

import farCityUrl from './cleaned/city/far-city-layer-v1.png';
import midCityUrl from './cleaned/city/mid-city-layer-v1.png';
import moonUrl from './city/moon.png';
import nearCityUrl from './cleaned/city/near-city-layer-v1.png';
import roofALeftUrl from './city/roof_a_left.png';
import roofAMiddleUrl from './city/roof_a_middle.png';
import roofARightUrl from './city/roof_a_right.png';
import roofBLeftUrl from './city/roof_b_left.png';
import roofBMiddleUrl from './city/roof_b_middle.png';
import roofBRightUrl from './city/roof_b_right.png';
import roofCLeftUrl from './city/roof_c_left.png';
import roofCMiddleUrl from './city/roof_c_middle.png';
import roofCRightUrl from './city/roof_c_right.png';
import rooftopUtilityBox1Url from './city/small_rooftop_utility_box_1.png';
import rooftopUtilityBox2Url from './city/small_rooftop_utility_box_2.png';
import waterTank1Url from './city/water_tank_1.png';
import waterTank2Url from './city/water_tank_2.png';
import { configurePixelTexture } from '../game/pixel';

export interface CityAssets {
  readonly far: Texture;
  readonly mid: Texture;
  readonly near: Texture;
  readonly moon: Texture;
  readonly rooftopUtilityBox1: Texture;
  readonly rooftopUtilityBox2: Texture;
  readonly waterTank1: Texture;
  readonly waterTank2: Texture;
  readonly roofALeft: Texture;
  readonly roofAMiddle: Texture;
  readonly roofARight: Texture;
  readonly roofBLeft: Texture;
  readonly roofBMiddle: Texture;
  readonly roofBRight: Texture;
  readonly roofCLeft: Texture;
  readonly roofCMiddle: Texture;
  readonly roofCRight: Texture;
}

async function loadCityTexture(url: string): Promise<Texture> {
  return configurePixelTexture(await Assets.load<Texture>(url));
}

export async function loadCityAssets(): Promise<CityAssets> {
  const [
    far,
    mid,
    near,
    moon,
    rooftopUtilityBox1,
    rooftopUtilityBox2,
    waterTank1,
    waterTank2,
    roofALeft,
    roofAMiddle,
    roofARight,
    roofBLeft,
    roofBMiddle,
    roofBRight,
    roofCLeft,
    roofCMiddle,
    roofCRight,
  ] = await Promise.all([
    loadCityTexture(farCityUrl),
    loadCityTexture(midCityUrl),
    loadCityTexture(nearCityUrl),
    loadCityTexture(moonUrl),
    loadCityTexture(rooftopUtilityBox1Url),
    loadCityTexture(rooftopUtilityBox2Url),
    loadCityTexture(waterTank1Url),
    loadCityTexture(waterTank2Url),
    loadCityTexture(roofALeftUrl),
    loadCityTexture(roofAMiddleUrl),
    loadCityTexture(roofARightUrl),
    loadCityTexture(roofBLeftUrl),
    loadCityTexture(roofBMiddleUrl),
    loadCityTexture(roofBRightUrl),
    loadCityTexture(roofCLeftUrl),
    loadCityTexture(roofCMiddleUrl),
    loadCityTexture(roofCRightUrl),
  ]);

  return {
    far,
    mid,
    near,
    moon,
    rooftopUtilityBox1,
    rooftopUtilityBox2,
    waterTank1,
    waterTank2,
    roofALeft,
    roofAMiddle,
    roofARight,
    roofBLeft,
    roofBMiddle,
    roofBRight,
    roofCLeft,
    roofCMiddle,
    roofCRight,
  };
}
