import { db } from "@workspace/db";
import { pixelsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface CachedPixel {
  x: number;
  y: number;
  color: string;
  userId: number;
  username: string;
  placedAt: string;
}

let canvasCache: Map<string, CachedPixel> | null = null;

export async function getCanvas(): Promise<{
  width: number;
  height: number;
  pixels: CachedPixel[];
}> {
  if (!canvasCache) {
    await refreshCache();
  }
  return {
    width: 1000,
    height: 500,
    pixels: Array.from(canvasCache!.values()),
  };
}

export async function refreshCache() {
  const rows = await db
    .select({
      x: pixelsTable.x,
      y: pixelsTable.y,
      color: pixelsTable.color,
      userId: pixelsTable.userId,
      username: usersTable.username,
      placedAt: pixelsTable.placedAt,
    })
    .from(pixelsTable)
    .innerJoin(usersTable, eq(pixelsTable.userId, usersTable.id));

  canvasCache = new Map();
  for (const row of rows) {
    const key = `${row.x},${row.y}`;
    canvasCache.set(key, {
      x: row.x,
      y: row.y,
      color: row.color,
      userId: row.userId,
      username: row.username,
      placedAt: row.placedAt.toISOString(),
    });
  }
}

export function setPixelInCache(pixel: CachedPixel) {
  if (!canvasCache) canvasCache = new Map();
  canvasCache.set(`${pixel.x},${pixel.y}`, pixel);
}
