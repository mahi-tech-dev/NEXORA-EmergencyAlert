import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, emergencyAlertsTable } from "@workspace/db";
import {
  CreateEmergencyBody,
  ListEmergenciesResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

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

  res.status(201).json({
    id: alert.id,
    userId: alert.userId,
    type: alert.type,
    latitude: alert.latitude,
    longitude: alert.longitude,
    address: alert.address,
    status: alert.status,
    createdAt: alert.createdAt,
  });
});

router.patch("/emergencies/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
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

  const [alert] = await db
    .update(emergencyAlertsTable)
    .set({ status: parsed.data.status })
    .where(and(eq(emergencyAlertsTable.id, id), eq(emergencyAlertsTable.userId, req.userId!)))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json({
    id: alert.id,
    userId: alert.userId,
    type: alert.type,
    latitude: alert.latitude,
    longitude: alert.longitude,
    address: alert.address,
    status: alert.status,
    createdAt: alert.createdAt,
  });
});

router.get("/emergencies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(emergencyAlertsTable)
    .where(eq(emergencyAlertsTable.userId, req.userId!))
    .orderBy(desc(emergencyAlertsTable.createdAt));

  res.json(
    ListEmergenciesResponse.parse({
      emergencies: alerts.map((a) => ({
        id: a.id,
        userId: a.userId,
        type: a.type,
        latitude: a.latitude,
        longitude: a.longitude,
        address: a.address,
        status: a.status,
        createdAt: a.createdAt,
      })),
    })
  );
});

export default router;
