import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, emergencyContactsTable } from "@workspace/db";
import { CreateContactBody, UpdateContactBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/contacts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const contacts = await db
    .select()
    .from(emergencyContactsTable)
    .where(eq(emergencyContactsTable.userId, req.userId!))
    .orderBy(emergencyContactsTable.createdAt);

  res.json({ contacts });
});

router.post("/contacts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select({ id: emergencyContactsTable.id })
    .from(emergencyContactsTable)
    .where(eq(emergencyContactsTable.userId, req.userId!));

  if (existing.length >= 5) {
    res.status(400).json({ error: "Maximum 5 emergency contacts allowed" });
    return;
  }

  const [contact] = await db
    .insert(emergencyContactsTable)
    .values({
      userId: req.userId!,
      name: parsed.data.name,
      relationship: parsed.data.relationship,
      phone: parsed.data.phone,
      priority: parsed.data.priority,
    })
    .returning();

  res.status(201).json(contact);
});

router.put("/contacts/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, string> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.relationship !== undefined) updates.relationship = parsed.data.relationship;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;

  const [contact] = await db
    .update(emergencyContactsTable)
    .set(updates)
    .where(and(eq(emergencyContactsTable.id, id), eq(emergencyContactsTable.userId, req.userId!)))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json(contact);
});

router.delete("/contacts/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db
    .delete(emergencyContactsTable)
    .where(and(eq(emergencyContactsTable.id, id), eq(emergencyContactsTable.userId, req.userId!)));

  res.status(204).send();
});

export default router;
