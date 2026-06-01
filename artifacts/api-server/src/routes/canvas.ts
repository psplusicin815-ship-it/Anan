import { Router } from "express";
import { db, pixelsTable, usersTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { getCanvas } from "../lib/canvas-cache";

const router = Router();

router.get("/canvas", async (_req, res) => {
  const canvas = await getCanvas();
  return res.json(canvas);
});

router.get("/canvas/stats", async (_req, res) => {
  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(pixelsTable);

  const topColors = await db
    .select({
      color: pixelsTable.color,
      count: sql<number>`count(*)::int`,
    })
    .from(pixelsTable)
    .groupBy(pixelsTable.color)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const [activeRow] = await db
    .select({ count: sql<number>`count(distinct ${pixelsTable.userId})` })
    .from(pixelsTable)
    .where(sql`${pixelsTable.placedAt} > ${fiveMinutesAgo}`);

  return res.json({
    totalPixels: Number(totalRow.count),
    activeUsers: Number(activeRow.count),
    topColors: topColors.map((r) => ({ color: r.color, count: Number(r.count) })),
  });
});

export default router;
