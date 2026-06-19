import { pgTable, serial, integer, text, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const medicalProfilesTable = pgTable("medical_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  profileImage: text("profile_image"),
  dob: date("dob"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  allergies: text("allergies"),
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("medical_profiles_user_id_idx").on(t.userId)]);

export type MedicalProfile = typeof medicalProfilesTable.$inferSelect;
export type InsertMedicalProfile = typeof medicalProfilesTable.$inferInsert;
