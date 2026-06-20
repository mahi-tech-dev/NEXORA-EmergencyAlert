export interface WidgetContact {
  name: string;
  phone: string;
  priority: "Primary" | "Secondary" | "Doctor";
  relationship: string;
}

export interface WidgetData {
  userName: string;
  bloodGroup: string | null;
  allergies: string | null;
  primaryContact: WidgetContact | null;
  secondaryContact: WidgetContact | null;
  lastUpdated: number;
}

export const WIDGET_CACHE_KEY = "nexora_widget_data";

export function buildWidgetData(
  userName: string,
  profile: {
    bloodGroup?: string | null;
    allergies?: string | null;
  } | null,
  contacts: Array<{
    name: string;
    phone: string;
    priority: string;
    relationship: string;
  }>
): WidgetData {
  const primary = contacts.find((c) => c.priority === "Primary") ?? null;
  const secondary = contacts.find((c) => c.priority === "Secondary") ?? null;

  return {
    userName,
    bloodGroup: profile?.bloodGroup ?? null,
    allergies: profile?.allergies ?? null,
    primaryContact: primary
      ? {
          name: primary.name,
          phone: primary.phone,
          priority: "Primary",
          relationship: primary.relationship,
        }
      : null,
    secondaryContact: secondary
      ? {
          name: secondary.name,
          phone: secondary.phone,
          priority: "Secondary",
          relationship: secondary.relationship,
        }
      : null,
    lastUpdated: Date.now(),
  };
}

export function getMedicalIDTextSummary(data: WidgetData, extras?: {
  age?: string;
  medicalConditions?: string | null;
  medications?: string | null;
}): string {
  const lines: string[] = [
    "═══════════════════════════════",
    "    EMERGENCY MEDICAL ID",
    "    EmergencyAlert by NEXORA",
    "═══════════════════════════════",
    `Name:            ${data.userName}`,
    `Age:             ${extras?.age ?? "—"}`,
    `Blood Group:     ${data.bloodGroup ?? "Unknown"}`,
    "",
    "MEDICAL INFO:",
    `Allergies:       ${data.allergies ?? "None listed"}`,
    `Conditions:      ${extras?.medicalConditions ?? "None listed"}`,
    `Medications:     ${extras?.medications ?? "None listed"}`,
    "",
    "EMERGENCY CONTACTS:",
  ];

  if (data.primaryContact) {
    lines.push(`Primary:  ${data.primaryContact.name} — ${data.primaryContact.phone}`);
  }
  if (data.secondaryContact) {
    lines.push(`Secondary: ${data.secondaryContact.name} — ${data.secondaryContact.phone}`);
  }

  lines.push("", "IN EMERGENCY, CALL: 112", "═══════════════════════════════");
  return lines.join("\n");
}
