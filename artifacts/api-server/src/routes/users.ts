import { Router } from "express";
import { db, usersTable, pixelsTable, factionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/users/leaderboard", async (_req, res) => {
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      pixelCount: usersTable.pixelCount,
      factionId: usersTable.factionId,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.pixelCount))
    .limit(50);

  const factionIds = [...new Set(rows.map((r) => r.factionId).filter(Boolean))] as number[];
  const factions = factionIds.length
    ? await db.select().from(factionsTable).where(sql`${factionsTable.id} = ANY(${factionIds})`)
    : [];
  const factionMap = new Map(factions.map((f) => [f.id, f.name]));

  return res.json(
    rows.map((r, i) => ({
      rank: i + 1,
      userId: r.id,
      username: r.username,
      pixelCount: r.pixelCount,
      factionName: r.factionId ? (factionMap.get(r.factionId) ?? null) : null,
    })),
  );
});

router.get("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  let factionName: string | null = null;
  if (user.factionId) {
    const [faction] = await db.select().from(factionsTable).where(eq(factionsTable.id, user.factionId)).limit(1);
    factionName = faction?.name ?? null;
  }

  const recentPixels = await db
    .select({
      x: pixelsTable.x,
      y: pixelsTable.y,
      color: pixelsTable.color,
      placedAt: pixelsTable.placedAt,
    })
    .from(pixelsTable)
    .where(eq(pixelsTable.userId, id))
    .orderBy(desc(pixelsTable.placedAt))
    .limit(20);

  return res.json({
    id: user.id,
    username: user.username,
    pixelCount: user.pixelCount,
    factionName,
    joinedAt: user.createdAt.toISOString(),
    recentPixels: recentPixels.map((p) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      username: user.username,
      factionName,
      placedAt: p.placedAt.toISOString(),
    })),
  });
});

export default router;
