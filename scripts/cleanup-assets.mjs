#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CLEANUP_CONFIG = Object.freeze({
  character: Object.freeze({
    alphaThreshold: 180,
    binaryAlpha: true,
    matteColorTolerance: 24,
    matteMinChannel: 170,
  }),
  scenery: Object.freeze({
    alphaThreshold: 40,
    binaryAlpha: false,
    matteColorTolerance: 24,
    matteMinChannel: 170,
  }),
});

const ASSETS = Object.freeze([
  { mode: 'character', source: 'src/assets/classroom/teacher_blackboard.png', output: 'src/assets/cleaned/teacher/teacher_blackboard.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_jump.png', output: 'src/assets/cleaned/teacher/teacher_jump.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_look_clock.png', output: 'src/assets/cleaned/teacher/teacher_look_clock.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_put_book_01.png', output: 'src/assets/cleaned/teacher/teacher_put_book_01.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_react.png', output: 'src/assets/cleaned/teacher/teacher_react.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_run_01.png', output: 'src/assets/cleaned/teacher/teacher_run_01.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_run_02.png', output: 'src/assets/cleaned/teacher/teacher_run_02.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_talk_01.png', output: 'src/assets/cleaned/teacher/teacher_talk_01.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_talk_02.png', output: 'src/assets/cleaned/teacher/teacher_talk_02.png' },
  { mode: 'character', source: 'src/assets/classroom/teacher_walk_book_01.png', output: 'src/assets/cleaned/teacher/teacher_walk_book_01.png' },
  {
    mode: 'character',
    source: 'src/assets/classroom/teacher_walk_book_cycle.png',
    output: 'src/assets/cleaned/teacher/teacher_walk_book_cycle.png',
    minComponentPixels: 24,
    frameColumns: 4,
    frameRows: 2,
    frameBounds: [
      [90, 5, 330, 435],
      [108, 5, 305, 435],
      [135, 5, 320, 435],
      [105, 5, 325, 435],
      [90, 5, 350, 435],
      [108, 5, 305, 435],
      [135, 5, 320, 435],
      [90, 5, 340, 435],
    ],
  },
  { mode: 'scenery', source: 'src/assets/city/far-city-layer-v1.png', output: 'src/assets/cleaned/city/far-city-layer-v1.png' },
  { mode: 'scenery', source: 'src/assets/city/mid-city-layer-v1.png', output: 'src/assets/cleaned/city/mid-city-layer-v1.png' },
  { mode: 'scenery', source: 'src/assets/city/near-city-layer-v1.png', output: 'src/assets/cleaned/city/near-city-layer-v1.png' },
]);

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

const selectedMode = parseMode(process.argv.slice(2));
const selectedAssets = ASSETS.filter((asset) => selectedMode === 'all' || asset.mode === selectedMode);

let processed = 0;
let skipped = ASSETS.length - selectedAssets.length;
let failed = 0;

for (const asset of selectedAssets) {
  try {
    const sourcePath = path.resolve(PROJECT_ROOT, asset.source);
    const outputPath = path.resolve(PROJECT_ROOT, asset.output);
    if (sourcePath === outputPath) {
      throw new Error('source and output paths must be different');
    }

    const source = decodePng(fs.readFileSync(sourcePath));
    const cleaned = cleanupImage(source, {
      ...CLEANUP_CONFIG[asset.mode],
      minComponentPixels: asset.minComponentPixels ?? 0,
      frameColumns: asset.frameColumns,
      frameRows: asset.frameRows,
      frameBounds: asset.frameBounds,
    });
    const encoded = encodePng(cleaned);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, encoded);

    const verification = decodePng(encoded);
    if (verification.width !== source.width || verification.height !== source.height) {
      throw new Error(`dimension mismatch: source ${source.width}x${source.height}, output ${verification.width}x${verification.height}`);
    }
    if (verification.colorType !== 6 || verification.bitDepth !== 8) {
      throw new Error('output is not an 8-bit true RGBA PNG');
    }

    processed += 1;
    console.log(`[asset-clean] ${asset.mode.padEnd(9)} ${asset.source} -> ${asset.output} (${source.width}x${source.height})`);
  } catch (error) {
    failed += 1;
    console.error(`[asset-clean] FAILED ${asset.source}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('');
console.log('processed:', processed);
console.log('skipped:', skipped);
console.log('failed:', failed);

if (failed > 0) process.exitCode = 1;

function parseMode(args) {
  const modeIndex = args.indexOf('--mode');
  if (modeIndex === -1) return 'all';

  const requested = args[modeIndex + 1];
  const aliases = {
    all: 'all',
    character: 'character',
    teacher: 'character',
    scenery: 'scenery',
    city: 'scenery',
  };
  const mode = aliases[requested];
  if (mode) return mode;

  throw new Error(`Unknown cleanup mode "${requested ?? ''}". Use all, character, or scenery.`);
}

function cleanupImage(image, config) {
  const pixels = Buffer.from(image.pixels);
  const background = findMatteBackground(pixels, image.width, image.height, config);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = y * image.width + x;
      const offset = index * 4;
      const originalAlpha = pixels[offset + 3];
      const touchesBackground = hasBackgroundNeighbor(background, image.width, image.height, x, y);

      if (background[index] || originalAlpha < config.alphaThreshold) {
        clearPixel(pixels, offset);
        continue;
      }

      if (touchesBackground && originalAlpha === 255 && isMatteColor(pixels, offset, config)) {
        clearPixel(pixels, offset);
        continue;
      }

      if (originalAlpha < 255 && isMatteColor(pixels, offset, config)) {
        decontaminatePixel(pixels, offset, originalAlpha);
      }

      pixels[offset + 3] = config.binaryAlpha ? 255 : originalAlpha;
    }
  }

  if (config.frameBounds) {
    clearOutsideFrameBounds(pixels, image.width, image.height, config.frameColumns, config.frameRows, config.frameBounds);
  }

  if (config.minComponentPixels > 0) {
    removeSmallComponents(pixels, image.width, image.height, config.minComponentPixels);
  }

  return {
    width: image.width,
    height: image.height,
    bitDepth: 8,
    colorType: 6,
    pixels,
  };
}

function clearOutsideFrameBounds(pixels, width, height, columns, rows, bounds) {
  const cellWidth = Math.floor(width / columns);
  const cellHeight = Math.floor(height / rows);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const column = Math.min(columns - 1, Math.floor(x / cellWidth));
      const row = Math.min(rows - 1, Math.floor(y / cellHeight));
      const [left, top, right, bottom] = bounds[row * columns + column];
      const localX = x - column * cellWidth;
      const localY = y - row * cellHeight;
      if (localX < left || localX > right || localY < top || localY > bottom) {
        clearPixel(pixels, (y * width + x) * 4);
      }
    }
  }
}

function removeSmallComponents(pixels, width, height, minComponentPixels) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || pixels[start * 4 + 3] === 0) continue;

    const component = [];
    queue.length = 0;
    queue.push(start);
    visited[start] = 1;

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      component.push(index);
      const x = index % width;
      const y = Math.floor(index / width);

      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (xOffset === 0 && yOffset === 0) continue;
          const neighborX = x + xOffset;
          const neighborY = y + yOffset;
          if (neighborX < 0 || neighborY < 0 || neighborX >= width || neighborY >= height) continue;
          const neighbor = neighborY * width + neighborX;
          if (visited[neighbor] || pixels[neighbor * 4 + 3] === 0) continue;
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }

    if (component.length < minComponentPixels) {
      for (const index of component) clearPixel(pixels, index * 4);
    }
  }
}

function findMatteBackground(pixels, width, height, config) {
  const background = new Uint8Array(width * height);
  const queued = new Uint8Array(width * height);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (queued[index]) return;
    const offset = index * 4;
    if (!isMatteColor(pixels, offset, config)) return;
    queued[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    background[index] = 1;

    for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
      for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
        if (xOffset !== 0 || yOffset !== 0) enqueue(x + xOffset, y + yOffset);
      }
    }
  }

  return background;
}

function hasBackgroundNeighbor(background, width, height, x, y) {
  for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      if (xOffset === 0 && yOffset === 0) continue;
      const neighborX = x + xOffset;
      const neighborY = y + yOffset;
      if (neighborX >= 0 && neighborY >= 0 && neighborX < width && neighborY < height) {
        if (background[neighborY * width + neighborX]) return true;
      }
    }
  }
  return false;
}

function isMatteColor(pixels, offset, config) {
  if (pixels[offset + 3] === 0) return false;
  const red = pixels[offset];
  const green = pixels[offset + 1];
  const blue = pixels[offset + 2];
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  return maximum - minimum <= config.matteColorTolerance && minimum >= config.matteMinChannel;
}

function decontaminatePixel(pixels, offset, alpha) {
  const opacity = alpha / 255;
  const matte = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
  for (let channel = 0; channel < 3; channel += 1) {
    const corrected = (pixels[offset + channel] - matte * (1 - opacity)) / opacity;
    pixels[offset + channel] = clampByte(Math.round(corrected));
  }
}

function clearPixel(pixels, offset) {
  pixels[offset] = 0;
  pixels[offset + 1] = 0;
  pixels[offset + 2] = 0;
  pixels[offset + 3] = 0;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, value));
}

function decodePng(buffer) {
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('invalid PNG signature');
  }

  let offset = PNG_SIGNATURE.length;
  let header;
  let palette;
  let transparency;
  const imageData = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);
    offset = dataEnd + 4;

    if (type === 'IHDR') header = parseHeader(data);
    if (type === 'PLTE') palette = data;
    if (type === 'tRNS') transparency = data;
    if (type === 'IDAT') imageData.push(data);
    if (type === 'IEND') break;
  }

  if (!header) throw new Error('PNG is missing IHDR');
  if (header.bitDepth !== 8 || header.interlace !== 0) {
    throw new Error(`unsupported PNG format: bitDepth=${header.bitDepth}, interlace=${header.interlace}`);
  }

  const channelsByType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsByType[header.colorType];
  if (!channels) throw new Error(`unsupported PNG color type ${header.colorType}`);
  if (header.colorType === 3 && !palette) throw new Error('indexed PNG is missing PLTE');

  const rowBytes = header.width * channels;
  const inflated = inflateSync(Buffer.concat(imageData));
  const filteredRows = Buffer.alloc(header.height * rowBytes);
  let inputOffset = 0;

  for (let y = 0; y < header.height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const current = filteredRows.subarray(y * rowBytes, (y + 1) * rowBytes);
    const previous = y === 0 ? undefined : filteredRows.subarray((y - 1) * rowBytes, y * rowBytes);
    const filtered = inflated.subarray(inputOffset, inputOffset + rowBytes);
    inputOffset += rowBytes;
    unfilterRow(current, filtered, previous, channels, filter);
  }

  const pixels = Buffer.alloc(header.width * header.height * 4);
  for (let y = 0; y < header.height; y += 1) {
    const row = filteredRows.subarray(y * rowBytes, (y + 1) * rowBytes);
    for (let x = 0; x < header.width; x += 1) {
      const sourceOffset = x * channels;
      const targetOffset = (y * header.width + x) * 4;
      writeRgbaPixel(pixels, targetOffset, row, sourceOffset, header.colorType, palette, transparency);
    }
  }

  return {
    width: header.width,
    height: header.height,
    bitDepth: header.bitDepth,
    colorType: header.colorType,
    pixels,
  };
}

function parseHeader(data) {
  return {
    width: data.readUInt32BE(0),
    height: data.readUInt32BE(4),
    bitDepth: data[8],
    colorType: data[9],
    compression: data[10],
    filter: data[11],
    interlace: data[12],
  };
}

function unfilterRow(output, input, previous, bytesPerPixel, filter) {
  for (let index = 0; index < output.length; index += 1) {
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
    const above = previous ? previous[index] : 0;
    const upperLeft = previous && index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    const value = input[index];

    if (filter === 0) output[index] = value;
    else if (filter === 1) output[index] = (value + left) & 0xff;
    else if (filter === 2) output[index] = (value + above) & 0xff;
    else if (filter === 3) output[index] = (value + Math.floor((left + above) / 2)) & 0xff;
    else if (filter === 4) output[index] = (value + paeth(left, above, upperLeft)) & 0xff;
    else throw new Error(`unsupported PNG filter ${filter}`);
  }
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function writeRgbaPixel(target, targetOffset, row, sourceOffset, colorType, palette, transparency) {
  if (colorType === 6) {
    target[targetOffset] = row[sourceOffset];
    target[targetOffset + 1] = row[sourceOffset + 1];
    target[targetOffset + 2] = row[sourceOffset + 2];
    target[targetOffset + 3] = row[sourceOffset + 3];
    return;
  }

  if (colorType === 4) {
    target[targetOffset] = row[sourceOffset];
    target[targetOffset + 1] = row[sourceOffset];
    target[targetOffset + 2] = row[sourceOffset];
    target[targetOffset + 3] = row[sourceOffset + 1];
    return;
  }

  if (colorType === 3) {
    const paletteOffset = row[sourceOffset] * 3;
    target[targetOffset] = palette[paletteOffset] ?? 0;
    target[targetOffset + 1] = palette[paletteOffset + 1] ?? 0;
    target[targetOffset + 2] = palette[paletteOffset + 2] ?? 0;
    target[targetOffset + 3] = transparency?.[row[sourceOffset]] ?? 255;
    return;
  }

  if (colorType === 2) {
    target[targetOffset] = row[sourceOffset];
    target[targetOffset + 1] = row[sourceOffset + 1];
    target[targetOffset + 2] = row[sourceOffset + 2];
    const transparent = transparency && transparency.length >= 6
      && row[sourceOffset] === transparency.readUInt16BE(0)
      && row[sourceOffset + 1] === transparency.readUInt16BE(2)
      && row[sourceOffset + 2] === transparency.readUInt16BE(4);
    target[targetOffset + 3] = transparent ? 0 : 255;
    return;
  }

  const gray = row[sourceOffset];
  target[targetOffset] = gray;
  target[targetOffset + 1] = gray;
  target[targetOffset + 2] = gray;
  target[targetOffset + 3] = transparency && transparency.length >= 2 && gray === transparency.readUInt16BE(0) ? 0 : 255;
}

function encodePng(image) {
  const rowBytes = image.width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const rawOffset = y * (rowBytes + 1);
    raw[rawOffset] = 0;
    image.pixels.copy(raw, rawOffset + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
