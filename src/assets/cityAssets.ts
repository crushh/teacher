import { Assets, Rectangle, Texture } from 'pixi.js';

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
import ninja01Url from './city/ninja_01.png';
import ninja02Url from './city/ninja_02.png';
import ninja03Url from './city/ninja_03.png';
import ninja04Url from './city/ninja_04.png';
import rooftopUtilityBox1Url from './city/small_rooftop_utility_box_1.png';
import rooftopUtilityBox2Url from './city/small_rooftop_utility_box_2.png';
import waterTank1Url from './city/water_tank_1.png';
import waterTank2Url from './city/water_tank_2.png';
import catSpritesUrl from './city/cat-sprites.png';
import billboardCatsUrl from './city/billboard-cats.png';
import producerBillboardsUrl from './city/producer-billboards.png';
import citySign1Url from './city/ChatGPT Image Sep 11, 2026, 12_23_45 AM (1).png';
import citySign2Url from './city/ChatGPT Image Sep 11, 2026, 12_23_46 AM (2).png';
import citySign3Url from './city/ChatGPT Image Sep 11, 2026, 12_23_46 AM (3).png';
import citySign4Url from './city/ChatGPT Image Sep 11, 2026, 12_23_47 AM (4).png';
import citySign5Url from './city/ChatGPT Image Sep 11, 2026, 12_23_48 AM (5).png';
import citySign6Url from './city/ChatGPT Image Sep 11, 2026, 12_23_48 AM (6).png';
import citySign7Url from './city/ChatGPT Image Sep 11, 2026, 12_23_49 AM (7).png';
import citySign8Url from './city/ChatGPT Image Sep 11, 2026, 12_23_50 AM (8).png';
import citySign9Url from './city/ChatGPT Image Sep 11, 2026, 12_23_51 AM (9).png';
import citySign10Url from './city/ChatGPT Image Sep 11, 2026, 12_23_52 AM (10).png';
import { configurePixelTexture, removeCheckerboard } from '../game/pixel';


// Crop transparent export margins without modifying the supplied artwork.
const CITY_SIGN_SOURCES = [
  { url: citySign1Url, frame: [94, 242, 1081, 823] },
  { url: citySign2Url, frame: [32, 206, 1199, 879] },
  { url: citySign3Url, frame: [49, 227, 1156, 949] },
  { url: citySign4Url, frame: [9, 386, 1236, 545] },
  { url: citySign5Url, frame: [31, 183, 1217, 924] },
  { url: citySign6Url, frame: [30, 231, 1195, 852] },
  { url: citySign7Url, frame: [26, 230, 1199, 905] },
  { url: citySign8Url, frame: [18, 230, 1219, 842] },
  { url: citySign9Url, frame: [414, 119, 440, 1045] },
  { url: citySign10Url, frame: [52, 270, 1165, 764] },
] as const;

export interface CityAssets {
  readonly signs: readonly Texture[];
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
  readonly ninjaRun: readonly [Texture, Texture, Texture, Texture];
  readonly producerBillboards: readonly [Texture, Texture];
  readonly billboardCats: readonly [Texture, Texture];
  readonly cat: readonly [Texture, Texture, Texture];
}

async function loadCityTexture(url: string): Promise<Texture> {
  return configurePixelTexture(await Assets.load<Texture>(url));
}

async function loadCityCutoutTexture(url: string): Promise<Texture> {
  return removeCheckerboard(await loadCityTexture(url));
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
    ninja01,
    ninja02,
    ninja03,
    ninja04,
    catSheet,
    billboardCatSheet,
    producerBillboardSheet,
    signs,
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
    loadCityCutoutTexture(ninja01Url),
    loadCityCutoutTexture(ninja02Url),
    loadCityCutoutTexture(ninja03Url),
    loadCityCutoutTexture(ninja04Url),
    loadCityTexture(catSpritesUrl),
    loadCityTexture(billboardCatsUrl),
    loadCityTexture(producerBillboardsUrl),
    Promise.all(CITY_SIGN_SOURCES.map(async ({ url, frame }) => {
      const texture = await loadCityTexture(url);
      return new Texture({ source: texture.source, frame: new Rectangle(...frame) });
    })),
  ]);

  return {
    signs,
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
    ninjaRun: [ninja01, ninja02, ninja03, ninja04],
    // Visible sprite bounds from the generated 2172 x 724 sheet. Keep its
    // original alpha and share the source instead of allocating three images.
    producerBillboards: [
      new Texture({ source: producerBillboardSheet.source, frame: new Rectangle(300, 10, 940, 492) }),
      new Texture({ source: producerBillboardSheet.source, frame: new Rectangle(300, 518, 940, 492) }),
    ],
    billboardCats: [
      new Texture({ source: billboardCatSheet.source, frame: new Rectangle(275, 300, 815, 365) }),
      new Texture({ source: billboardCatSheet.source, frame: new Rectangle(1400, 65, 490, 605) }),
    ],
    cat: [
      new Texture({ source: catSheet.source, frame: new Rectangle(128, 139, 531, 471) }),
      new Texture({ source: catSheet.source, frame: new Rectangle(809, 138, 539, 472) }),
      new Texture({ source: catSheet.source, frame: new Rectangle(1527, 131, 566, 439) }),
    ],
  };
}
