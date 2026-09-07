import { Texture } from 'pixi.js';

/** Apply the one sampling rule shared by every pixel-art texture. */
export function configurePixelTexture(texture: Texture): Texture {
  texture.source.scaleMode = 'nearest';

  return texture;
}

/** Remove a light checkerboard that was baked into the supplied artwork. */
export function removeCheckerboard(texture: Texture): Texture {
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
