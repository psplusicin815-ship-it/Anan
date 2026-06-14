/**
 * Apply ocean/land tiles to Redis canvas 0 (Earth)
 * CJS version compatible with direct node execution
 */
const { createClient, commandOptions } = require('../../node_modules/redis');
const sharp = require('../../node_modules/sharp');
const fs = require('fs');
const path = require('path');

const TILE_SIZE = 256;
const IMG_TILE_SIZE = 2048;
const CANVAS_SIZE = 65536;
const CANVAS_MIN_XY = -(CANVAS_SIZE / 2); // -32768
const CANVAS_ID = 0;
const TILEFOLDER = process.argv[2] || '/tmp/ocean';

const redis = createClient({ url: 'redis://localhost:6379' });

function getChunkOfPixel(size, x, y) {
  const minXY = -(size / 2);
  const i = Math.floor((x - minXY) / TILE_SIZE);
  const j = Math.floor((y - minXY) / TILE_SIZE);
  return [i, j];
}

async function getChunk(canvasId, i, j, padding) {
  const key = `ch:${canvasId}:${i}:${j}`;
  let chunk = await redis.get(commandOptions({ returnBuffers: true }), key);
  if (padding > 0 && chunk && chunk.length < padding) {
    const pad = Buffer.alloc(padding - chunk.length);
    chunk = Buffer.concat([chunk, pad]);
  }
  return chunk;
}

async function imagemask2Canvas(canvasId, x, y, data, width, height) {
  const expectedLength = TILE_SIZE * TILE_SIZE;
  const imageData = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const [ucx, ucy] = getChunkOfPixel(CANVAS_SIZE, x, y);
  const [lcx, lcy] = getChunkOfPixel(CANVAS_SIZE, x + width - 1, y + height - 1);

  for (let cx = ucx; cx <= lcx; cx += 1) {
    for (let cy = ucy; cy <= lcy; cy += 1) {
      let chunk;
      try {
        chunk = await getChunk(canvasId, cx, cy, expectedLength);
      } catch (err) {
        console.error(`Could not load chunk ${cx},${cy}: ${err.message}`);
      }
      chunk = (chunk && chunk.length)
        ? new Uint8Array(chunk)
        : new Uint8Array(TILE_SIZE * TILE_SIZE);

      const cOffX = cx * TILE_SIZE + CANVAS_MIN_XY - x;
      const cOffY = cy * TILE_SIZE + CANVAS_MIN_XY - y;
      let cOff = 0;
      let pxlCnt = 0;

      for (let py = 0; py < TILE_SIZE; py += 1) {
        for (let px = 0; px < TILE_SIZE; px += 1) {
          const clrX = cOffX + px;
          const clrY = cOffY + py;
          if (clrX >= 0 && clrY >= 0 && clrX < width && clrY < height) {
            // Grayscale: 1 channel; black = land
            const offset = clrX + clrY * width;
            if (imageData[offset] < 128) {
              chunk[cOff] = 1; // color index 1 = white (land)
              pxlCnt += 1;
            }
          }
          cOff += 1;
        }
      }

      if (pxlCnt) {
        const key = `ch:${canvasId}:${cx}:${cy}`;
        await redis.set(key, Buffer.from(chunk.buffer));
        process.stdout.write(`chunk ${cx},${cy}: ${pxlCnt} land pixels\n`);
      }
      chunk = null;
    }
  }
}

async function applyMasks() {
  await redis.connect();
  console.log('Redis connected');
  console.log(`Reading tiles from: ${TILEFOLDER}`);

  const tilesPerDim = CANVAS_SIZE / IMG_TILE_SIZE; // 32
  let processed = 0;
  let skipped = 0;

  try {
    for (let ty = 0; ty < tilesPerDim; ty += 1) {
      for (let tx = 0; tx < tilesPerDim; tx += 1) {
        const x = tx * IMG_TILE_SIZE + CANVAS_MIN_XY;
        const y = ty * IMG_TILE_SIZE + CANVAS_MIN_XY;
        const filename = path.join(TILEFOLDER, String(tx), `${ty}.png`);

        if (!fs.existsSync(filename)) {
          skipped += 1;
          continue;
        }

        try {
          const { data, info } = await sharp(filename)
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

          console.log(`Processing tile ${tx}/${ty}.png (${info.width}x${info.height}) → canvas (${x},${y})`);
          await imagemask2Canvas(CANVAS_ID, x, y, data, info.width, info.height);
          processed += 1;
        } catch (err) {
          console.error(`Error processing tile ${tx}/${ty}: ${err.message}`);
        }
      }
      if (global?.gc) global.gc();
    }

    console.log(`\nDone! Processed: ${processed}, Skipped: ${skipped}`);
    await redis.quit();
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    await redis.quit();
    process.exit(1);
  }
}

applyMasks();
