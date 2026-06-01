import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const factionsTable = pgTable("factions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#ff0000"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pixelCount: integer("pixel_count").notNull().default(0),
  factionId: integer("faction_id").references(() => factionsTable.id),
  cooldownUntil: timestamp("cooldown_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pixelsTable = pgTable("pixels", {
  id: serial("id").primaryKey(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  color: text("color").notNull(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  placedAt: timestamp("placed_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, pixelCount: true, createdAt: true });
export const insertFactionSchema = createInsertSchema(factionsTable).omit({ id: true, createdAt: true });
export const insertPixelSchema = createInsertSchema(pixelsTable).omit({ id: true, placedAt: true });

export type User = typeof usersTable.$inferSelect;
export type Faction = typeof factionsTable.$inferSelect;
export type Pixel = typeof pixelsTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFaction = z.infer<typeof insertFactionSchema>;
export type InsertPixel = z.infer<typeof insertPixelSchema>;
