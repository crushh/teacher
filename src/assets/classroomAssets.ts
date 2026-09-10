import { Assets, Rectangle, Texture } from 'pixi.js';

import classroomDoorCloseUrl from './classroom/classroom_door_close.png';
import classroomDoorOpenUrl from './classroom/classroom_door_open.png';
import teacherBlackboardUrl from './cleaned/teacher/teacher_blackboard.png';
import teacherDeskBooksUrl from './classroom/teacher_desk_books.png';
import teacherDeskEmptyUrl from './classroom/teacher_desk_empty.png';
import teacherJumpUrl from './cleaned/teacher/teacher_jump.png';
import teacherLookClockUrl from './cleaned/teacher/teacher_look_clock.png';
import teacherPutBookUrl from './cleaned/teacher/teacher_put_book_01.png';
import teacherReactUrl from './cleaned/teacher/teacher_react.png';
import teacherRun01Url from './cleaned/teacher/teacher_run_01.png';
import teacherRun02Url from './cleaned/teacher/teacher_run_02.png';
import teacherTalk01Url from './cleaned/teacher/teacher_talk_01.png';
import teacherTalk02Url from './cleaned/teacher/teacher_talk_02.png';
import teacherWalkBookUrl from './cleaned/teacher/teacher_walk_book_01.png';
import teacherWalkCycleUrl from './classroom/teacher_walk_book_cycle.png';

import { configurePixelTexture, removeCheckerboard } from '../game/pixel';

export interface ClassroomPoseTextures {
  readonly walkBook: Texture;
  readonly walkCycle?: readonly Texture[];
  readonly putBook: Texture;
  readonly talk1: Texture;
  readonly talk2: Texture;
  readonly blackboard: Texture;
  readonly lookClock: Texture;
  readonly react: Texture;
  readonly run1: Texture;
  readonly run2: Texture;
  readonly jump: Texture;
  readonly rollEnd?: Texture;
}

export interface ClassroomAssets {
  readonly environment: ClassroomEnvironmentTextures;
  readonly teacher: ClassroomPoseTextures;
}

export interface ClassroomEnvironmentTextures {
  readonly doorOpen: Texture;
  readonly doorClosed: Texture;
  readonly deskEmpty: Texture;
  readonly deskWithBooks: Texture;
}

async function loadTexture(url: string): Promise<Texture> {
  const texture = await Assets.load<Texture>(url);
  return configurePixelTexture(texture);
}

async function loadCutoutTexture(url: string): Promise<Texture> {
  return removeCheckerboard(await loadTexture(url));
}

export async function loadClassroomAssets(): Promise<ClassroomAssets> {
  const walkSheet = await loadCutoutTexture(teacherWalkCycleUrl);
  const cellWidth = Math.floor(walkSheet.width / 4);
  const cellHeight = Math.floor(walkSheet.height / 2);
  const walkCycle = Array.from({ length: 8 }, (_, index) => new Texture({
    source: walkSheet.source,
    frame: new Rectangle((index % 4) * cellWidth, Math.floor(index / 4) * cellHeight, cellWidth, cellHeight),
  }));
  const [doorOpen, doorClosed, deskBooksArtwork, deskEmptyArtwork, walkBook, putBook, talk1, talk2, blackboard, lookClock, react, run1, run2, jump] =
    await Promise.all([
      loadTexture(classroomDoorOpenUrl),
      loadTexture(classroomDoorCloseUrl),
      loadCutoutTexture(teacherDeskEmptyUrl),
      loadCutoutTexture(teacherDeskBooksUrl),
      loadTexture(teacherWalkBookUrl),
      loadTexture(teacherPutBookUrl),
      loadTexture(teacherTalk01Url),
      loadTexture(teacherTalk02Url),
      loadTexture(teacherBlackboardUrl),
      loadTexture(teacherLookClockUrl),
      loadTexture(teacherReactUrl),
      loadTexture(teacherRun01Url),
      loadTexture(teacherRun02Url),
      loadTexture(teacherJumpUrl),
    ]);

  return {
    environment: {
      doorOpen,
      doorClosed,
      // The supplied artwork is named opposite to its visible content:
      // teacher_desk_books.png is the empty desk, while teacher_desk_empty.png has books.
      deskEmpty: deskEmptyArtwork,
      deskWithBooks: deskBooksArtwork,
    },
    teacher: {
      walkBook,
      walkCycle,
      putBook,
      talk1,
      talk2,
      blackboard,
      lookClock,
      react,
      run1,
      run2,
      jump,
    },
  };
}
