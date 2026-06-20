import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, emergencyAlertsTable } from "@workspace/db";
import {
  CreateEmergencyBody,
  ListEmergenciesResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function alertToJson(a: typeof emergencyAlertsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    type: a.type,
    latitude: a.latitude,
    longitude: a.longitude,
    address: a.address,
    status: a.status,
    resolvedAt: a.resolvedAt ?? null,
    createdAt: a.createdAt,
  };
}

router.post("/emergencies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateEmergencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, latitude, longitude, address } = parsed.data;

  const [alert] = await db
    .insert(emergencyAlertsTable)
    .values({
      userId: req.userId!,
      type,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      address: address ?? null,
      status: "active",
    })
    .returning();

  res.status(201).json(alertToJson(alert));
});

router.patch("/emergencies/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { UpdateEmergencyStatusBody } = await import("@workspace/api-zod");
  const parsed = UpdateEmergencyStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const resolvedAt = parsed.data.status === "resolved" ? new Date() : null;

  const [alert] = await db
    .update(emergencyAlertsTable)
    .set({ status: parsed.data.status, resolvedAt })
    .where(and(eq(emergencyAlertsTable.id, id), eq(emergencyAlertsTable.userId, req.userId!)))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(alertToJson(alert));
});

router.get("/emergencies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(emergencyAlertsTable)
    .where(eq(emergencyAlertsTable.userId, req.userId!))
    .orderBy(desc(emergencyAlertsTable.createdAt));

  res.json(
    ListEmergenciesResponse.parse({
      emergencies: alerts.map(alertToJson),
    })
  );
});

export default router;
