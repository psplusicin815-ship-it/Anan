/**
 * Apply a single row of ocean tiles (ty=ROW, tx=0..31) to Redis canvas 0.
 * Usage: node applyOceanRow.cjs <tileFolder> <ty>
 * Processes 32 tiles (one full x-row) then exits, keeping per-process RAM low.
 */
const { createClient, commandOptions } = require('../../node_modules/redis');
const sharp = require('../../node_modules/sharp');
const fs = require('fs');
const path = require('path');

sharp.cache(false);
sharp.concurrency(1);

const TILE_SIZE = 256;
const IMG_TILE_SIZE = 2048;
const CANVAS_SIZE = 65536;
const CANVAS_MIN_XY = -(CANVAS_SIZE / 2);
const CANVAS_ID = 0;

const TILEFOLDER = process.argv[2];
const TY = parseInt(process.argv[3], 10);

if (!TILEFOLDER || isNaN(TY)) {
  console.error('Usage: node applyOceanRow.cjs <tileFolder> <ty>');
  process.exit(1);
}

const redis = createClient({ url: 'redis://localhost:6379' });

async function getChunk(i, j) {
  const key = `ch:${CANVAS_ID}:${i}:${j}`;
  let chunk = await redis.get(commandOptions({ returnBuffers: true }), key);
  const expectedLength = TILE_SIZE * TILE_SIZE;
  if (chunk && chunk.length < expectedLength) {
    const pad = Buffer.alloc(expectedLength - chunk.length);
    chunk = Buffer.concat([chunk, pad]);
  }
  return chunk;
}

async function imagemask2Canvas(x, y, data, width, height) {
  const expectedLength = TILE_SIZE * TILE_SIZE;
  const imageData = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const minXY = CANVAS_MIN_XY;
  const ucx = Math.floor((x - minXY) / TILE_SIZE);
  const ucy = Math.floor((y - minXY) / TILE_SIZE);
  const lcx = Math.floor((x + width - 1 - minXY) / TILE_SIZE);
  const lcy = Math.floor((y + height - 1 - minXY) / TILE_SIZE);

  for (let cx = ucx; cx <= lcx; cx++) {
    for (let cy = ucy; cy <= lcy; cy++) {
      let chunk;
      try {
        chunk = await getChunk(cx, cy);
      } catch (err) {
        // ignore
      }
      chunk = (chunk && chunk.length)
        ? new Uint8Array(chunk)
        : new Uint8Array(expectedLength);

      const cOffX = cx * TILE_SIZE + minXY - x;
      const cOffY = cy * TILE_SIZE + minXY - y;
      let cOff = 0;
      let pxlCnt = 0;

      for (let py = 0; py < TILE_SIZE; py++) {
        for (let px = 0; px < TILE_SIZE; px++) {
          const clrX = cOffX + px;
          const clrY = cOffY + py;
          if (clrX >= 0 && clrY >= 0 && clrX < width && clrY < height) {
            const offset = clrX + clrY * width;
            if (imageData[offset] < 128) {
              chunk[cOff] = 1;
              pxlCnt++;
            }
          }
          cOff++;
        }
      }

      if (pxlCnt > 0) {
        const key = `ch:${CANVAS_ID}:${cx}:${cy}`;
        await redis.set(key, Buffer.from(chunk.buffer));
      }
      chunk = null;
    }
  }
}

async function applyRow() {
  await redis.connect();

  const tilesPerDim = CANVAS_SIZE / IMG_TILE_SIZE; // 32
  const ty = TY;
  const y = ty * IMG_TILE_SIZE + CANVAS_MIN_XY;
  let processed = 0;
  let skipped = 0;

  for (let tx = 0; tx < tilesPerDim; tx++) {
    const x = tx * IMG_TILE_SIZE + CANVAS_MIN_XY;
    const filename = path.join(TILEFOLDER, String(tx), `${ty}.png`);

    if (!fs.existsSync(filename)) {
      skipped++;
      continue;
    }

    try {
      const { data, info } = await sharp(filename)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      process.stdout.write(`ty=${ty} tx=${tx} (${info.width}x${info.height})\n`);
      await imagemask2Canvas(x, y, data, info.width, info.height);
      processed++;
    } catch (err) {
      process.stderr.write(`Error ty=${ty} tx=${tx}: ${err.message}\n`);
    }

    if (global.gc) global.gc();
  }

  console.log(`Row ${ty} done. processed=${processed} skipped=${skipped}`);
  await redis.quit();
  process.exit(0);
}

applyRow().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
