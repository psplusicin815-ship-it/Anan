import { Router } from "express";
import { db, pixelsTable, usersTable, factionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { PlacePixelBody } from "@workspace/api-zod";
import { broadcastPixel } from "../lib/ws";
import { setPixelInCache } from "../lib/canvas-cache";

const COOLDOWN_MS = 30_000;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 500;

const router = Router();

router.post("/pixels", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });

  const parsed = PlacePixelBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { x, y, color } = parsed.data;

  if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
    return res.status(400).json({ error: "Coordinates out of bounds" });
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res.status(400).json({ error: "Invalid color format" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user) return res.status(401).json({ error: "User not found" });

  if (user.cooldownUntil && user.cooldownUntil > new Date()) {
    return res.status(429).json({ error: "Cooldown active", cooldownUntil: user.cooldownUntil.toISOString() });
  }

  const cooldownUntil = new Date(Date.now() + COOLDOWN_MS);

  await db.insert(pixelsTable).values({ x, y, color, userId: user.id });

  await db
    .update(usersTable)
    .set({
      pixelCount: sql`${usersTable.pixelCount} + 1`,
      cooldownUntil,
    })
    .where(eq(usersTable.id, user.id));

  setPixelInCache({ x, y, color, userId: user.id, username: user.username, placedAt: new Date().toISOString() });
  broadcastPixel({ x, y, color, username: user.username, userId: user.id });

  return res.json({
    x,
    y,
    color,
    userId: user.id,
    username: user.username,
    placedAt: new Date().toISOString(),
  });
});

router.get("/pixels/recent", async (_req, res) => {
  const rows = await db
    .select({
      x: pixelsTable.x,
      y: pixelsTable.y,
      color: pixelsTable.color,
      username: usersTable.username,
      factionId: usersTable.factionId,
      placedAt: pixelsTable.placedAt,
    })
    .from(pixelsTable)
    .innerJoin(usersTable, eq(pixelsTable.userId, usersTable.id))
    .orderBy(desc(pixelsTable.placedAt))
    .limit(50);

  const factionIds = [...new Set(rows.map((r) => r.factionId).filter(Boolean))] as number[];
  const factions = factionIds.length
    ? await db.select().from(factionsTable).where(sql`${factionsTable.id} = ANY(${factionIds})`)
    : [];
  const factionMap = new Map(factions.map((f) => [f.id, f.name]));

  return res.json(
    rows.map((r) => ({
      x: r.x,
      y: r.y,
      color: r.color,
      username: r.username,
      factionName: r.factionId ? (factionMap.get(r.factionId) ?? null) : null,
      placedAt: r.placedAt.toISOString(),
    })),
  );
});

export default router;
