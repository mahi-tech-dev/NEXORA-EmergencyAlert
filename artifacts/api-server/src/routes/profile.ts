import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, medicalProfilesTable } from "@workspace/db";
import { UpsertProfileBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(medicalProfilesTable)
    .where(eq(medicalProfilesTable.userId, req.userId!))
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

router.put("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpsertProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { profileImage, dob, gender, bloodGroup, address, allergies, medicalConditions, medications } = parsed.data;
  const now = new Date();

  const [profile] = await db
    .insert(medicalProfilesTable)
    .values({
      userId: req.userId!,
      profileImage: profileImage ?? null,
      dob: dob ?? null,
      gender: gender ?? null,
      bloodGroup: bloodGroup ?? null,
      address: address ?? null,
      allergies: allergies ?? null,
      medicalConditions: medicalConditions ?? null,
      medications: medications ?? null,
    })
    .onConflictDoUpdate({
      target: medicalProfilesTable.userId,
      set: {
        profileImage: profileImage ?? null,
        dob: dob ?? null,
        gender: gender ?? null,
        bloodGroup: bloodGroup ?? null,
        address: address ?? null,
        allergies: allergies ?? null,
        medicalConditions: medicalConditions ?? null,
        medications: medications ?? null,
        updatedAt: now,
      },
    })
    .returning();

  res.json(profile);
});

export default router;
