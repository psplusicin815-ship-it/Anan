import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, factionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const router = Router();

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { username, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) return res.status(400).json({ error: "Username taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ username, passwordHash }).returning();

  req.session.userId = user.id;
  return res.status(201).json({
    id: user.id,
    username: user.username,
    pixelCount: user.pixelCount,
    factionId: user.factionId ?? null,
    factionName: null,
    cooldownUntil: user.cooldownUntil?.toISOString() ?? null,
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  req.session.userId = user.id;

  let factionName: string | null = null;
  if (user.factionId) {
    const [faction] = await db.select().from(factionsTable).where(eq(factionsTable.id, user.factionId)).limit(1);
    factionName = faction?.name ?? null;
  }

  return res.json({
    id: user.id,
    username: user.username,
    pixelCount: user.pixelCount,
    factionId: user.factionId ?? null,
    factionName,
    cooldownUntil: user.cooldownUntil?.toISOString() ?? null,
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {});
  return res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  let factionName: string | null = null;
  if (user.factionId) {
    const [faction] = await db.select().from(factionsTable).where(eq(factionsTable.id, user.factionId)).limit(1);
    factionName = faction?.name ?? null;
  }

  return res.json({
    id: user.id,
    username: user.username,
    pixelCount: user.pixelCount,
    factionId: user.factionId ?? null,
    factionName,
    cooldownUntil: user.cooldownUntil?.toISOString() ?? null,
  });
});

export default router;
