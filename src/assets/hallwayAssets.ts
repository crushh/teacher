import { Assets, Texture } from 'pixi.js';

import hallwayBgUrl from './hallway/hallway_bg.png';
import rollDustUrl from './hallway/roll_dust.png';
import rollImpactUrl from './hallway/roll_impact.png';
import rollSwirl01Url from './hallway/roll_swirl_01.png';
import rollSwirl02Url from './hallway/roll_swirl_02.png';
import teacherRollEndUrl from './hallway/teacher_roll_end.png';
import { configurePixelTexture, removeCheckerboard } from '../game/pixel';

export interface HallwayAssets {
  readonly hallwayBg: Texture;
  readonly rollSwirl01: Texture;
  readonly rollSwirl02: Texture;
  readonly rollImpact: Texture;
  readonly rollDust: Texture;
  readonly teacherRollEnd: Texture;
}

async function loadTexture(url: string): Promise<Texture> {
  return configurePixelTexture(await Assets.load<Texture>(url));
}

async function loadCutoutTexture(url: string): Promise<Texture> {
  return removeCheckerboard(await loadTexture(url));
}

export async function loadHallwayAssets(): Promise<HallwayAssets> {
  const [hallwayBg, rollSwirl01, rollSwirl02, rollImpact, rollDust, teacherRollEnd] = await Promise.all([
    loadTexture(hallwayBgUrl),
    loadTexture(rollSwirl01Url),
    loadTexture(rollSwirl02Url),
    loadTexture(rollImpactUrl),
    loadTexture(rollDustUrl),
    loadCutoutTexture(teacherRollEndUrl),
  ]);

  return { hallwayBg, rollSwirl01, rollSwirl02, rollImpact, rollDust, teacherRollEnd };
}
