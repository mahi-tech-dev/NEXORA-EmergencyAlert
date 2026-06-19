import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
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
