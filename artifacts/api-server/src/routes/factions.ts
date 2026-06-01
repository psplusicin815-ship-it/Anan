import { Router } from "express";
import { db, factionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateFactionBody } from "@workspace/api-zod";

const router = Router();

router.get("/factions", async (_req, res) => {
  const rows = await db
    .select({
      id: factionsTable.id,
      name: factionsTable.name,
      color: factionsTable.color,
      description: factionsTable.description,
    })
    .from(factionsTable);

  const withStats = await Promise.all(
    rows.map(async (f) => {
      const [memberRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.factionId, f.id));

      const [pixelRow] = await db
        .select({ total: sql<number>`sum(${usersTable.pixelCount})::int` })
        .from(usersTable)
        .where(eq(usersTable.factionId, f.id));

      return {
        id: f.id,
        name: f.name,
        color: f.color,
        description: f.description ?? null,
        memberCount: Number(memberRow.count),
        pixelCount: Number(pixelRow.total ?? 0),
      };
    }),
  );

  return res.json(withStats);
});

router.post("/factions", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });

  const parsed = CreateFactionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { name, color, description } = parsed.data;

  const existing = await db.select().from(factionsTable).where(eq(factionsTable.name, name)).limit(1);
  if (existing.length) return res.status(400).json({ error: "Faction name taken" });

  const [faction] = await db.insert(factionsTable).values({ name, color, description }).returning();

  await db.update(usersTable).set({ factionId: faction.id }).where(eq(usersTable.id, req.session.userId));

  return res.status(201).json({
    id: faction.id,
    name: faction.name,
    color: faction.color,
    description: faction.description ?? null,
    memberCount: 1,
    pixelCount: 0,
  });
});

router.post("/factions/:id/join", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });

  const factionId = Number(req.params.id);
  if (isNaN(factionId)) return res.status(400).json({ error: "Invalid id" });

  const [faction] = await db.select().from(factionsTable).where(eq(factionsTable.id, factionId)).limit(1);
  if (!faction) return res.status(404).json({ error: "Faction not found" });

  await db.update(usersTable).set({ factionId }).where(eq(usersTable.id, req.session.userId));

  return res.json({ ok: true });
});

router.post("/factions/leave", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });

  await db.update(usersTable).set({ factionId: null }).where(eq(usersTable.id, req.session.userId));

  return res.json({ ok: true });
});

export default router;
