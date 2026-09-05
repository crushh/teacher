import { Assets, Texture } from 'pixi.js';

import classroomDoorCloseUrl from './classroom/classroom_door_close.png';
import classroomDoorOpenUrl from './classroom/classroom_door_open.png';
import teacherBlackboardUrl from './classroom/teacher_blackboard.png';
import teacherDeskBooksUrl from './classroom/teacher_desk_books.png';
import teacherDeskEmptyUrl from './classroom/teacher_desk_empty.png';
import teacherJumpUrl from './classroom/teacher_jump.png';
import teacherLookClockUrl from './classroom/teacher_look_clock.png';
import teacherPutBookUrl from './classroom/teacher_put_book_01.png';
import teacherReactUrl from './classroom/teacher_react.png';
import teacherRun01Url from './classroom/teacher_run_01.png';
import teacherRun02Url from './classroom/teacher_run_02.png';
import teacherTalk01Url from './classroom/teacher_talk_01.png';
import teacherTalk02Url from './classroom/teacher_talk_02.png';
import teacherWalkBookUrl from './classroom/teacher_walk_book_01.png';

import { configurePixelTexture } from '../game/pixel';

export interface ClassroomPoseTextures {
  readonly walkBook: Texture;
  readonly putBook: Texture;
  readonly talk1: Texture;
  readonly talk2: Texture;
  readonly blackboard: Texture;
  readonly lookClock: Texture;
  readonly react: Texture;
  readonly run1: Texture;
  readonly run2: Texture;
  readonly jump: Texture;
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
  const [doorOpen, doorClosed, deskBooksArtwork, deskEmptyArtwork, walkBook, putBook, talk1, talk2, blackboard, lookClock, react, run1, run2, jump] =
    await Promise.all([
      loadTexture(classroomDoorOpenUrl),
      loadTexture(classroomDoorCloseUrl),
      loadCutoutTexture(teacherDeskEmptyUrl),
      loadCutoutTexture(teacherDeskBooksUrl),
      loadCutoutTexture(teacherWalkBookUrl),
      loadCutoutTexture(teacherPutBookUrl),
      loadCutoutTexture(teacherTalk01Url),
      loadCutoutTexture(teacherTalk02Url),
      loadCutoutTexture(teacherBlackboardUrl),
      loadCutoutTexture(teacherLookClockUrl),
      loadCutoutTexture(teacherReactUrl),
      loadCutoutTexture(teacherRun01Url),
      loadCutoutTexture(teacherRun02Url),
      loadCutoutTexture(teacherJumpUrl),
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

function removeCheckerboard(texture: Texture): Texture {
  if (typeof document === 'undefined') return texture;

  const source = texture.source.resource as CanvasImageSource;
  const canvas = document.createElement('canvas');
  canvas.width = texture.width;
  canvas.height = texture.height;
  const context = canvas.getContext('2d');
  if (!context) return texture;

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = image;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  for (let x = 0; x < width; x += 1) {
    addIfCheckerboard(queue, visited, data, width, x, 0);
    addIfCheckerboard(queue, visited, data, width, x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    addIfCheckerboard(queue, visited, data, width, 0, y);
    addIfCheckerboard(queue, visited, data, width, width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor] as number;
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;

    addIfCheckerboard(queue, visited, data, width, x - 1, y);
    addIfCheckerboard(queue, visited, data, width, x + 1, y);
    addIfCheckerboard(queue, visited, data, width, x, y - 1);
    addIfCheckerboard(queue, visited, data, width, x, y + 1);
  }

  context.putImageData(image, 0, 0);
  return configurePixelTexture(Texture.from(canvas));
}

function addIfCheckerboard(
  queue: number[],
  visited: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): void {
  if (x < 0 || y < 0 || x >= width || y >= data.length / (width * 4)) return;

  const index = y * width + x;
  if (index >= visited.length || visited[index] || !isCheckerboardColor(data, index * 4)) return;

  visited[index] = 1;
  queue.push(index);
}

function isCheckerboardColor(data: Uint8ClampedArray, offset: number): boolean {
  const red = data[offset] as number;
  const green = data[offset + 1] as number;
  const blue = data[offset + 2] as number;
  return Math.max(red, green, blue) - Math.min(red, green, blue) <= 24 && red >= 170;
}
