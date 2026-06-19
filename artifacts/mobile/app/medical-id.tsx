import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProfile, useListContacts } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} yrs`;
}

const PRIORITY_ORDER = ["Primary", "Secondary", "Doctor"];

export default function MedicalIDScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: profileData } = useGetProfile();
  const { data: contactsData } = useListContacts();

  const profile = profileData && "id" in profileData ? (profileData as any) : null;
  const contacts = (contactsData as any)?.contacts ?? [];

  const keyContacts = PRIORITY_ORDER.map((p) => contacts.find((c: any) => c.priority === p)).filter(Boolean);

  const PRIORITY_COLOR: Record<string, string> = {
    Primary: "#e8003a",
    Secondary: "#ff9100",
    Doctor: "#00bcd4",
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 16 : 12) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Medical ID</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.crossBadge}>
              <Text style={styles.crossText}>✚</Text>
            </View>
            <Text style={styles.heroLabel}>EMERGENCY MEDICAL ID</Text>
          </View>

          {/* Photo + Name */}
          <View style={styles.identityRow}>
            {profile?.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Feather name="user" size={36} color="rgba(255,255,255,0.5)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name ?? "Unknown"}</Text>
              <Text style={styles.ageText}>Age: {calcAge(profile?.dob)}</Text>
              {profile?.gender ? <Text style={styles.metaText}>{profile.gender}</Text> : null}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Blood Group highlight */}
          <View style={styles.bloodRow}>
            <View style={styles.bloodBadge}>
              <MaterialCommunityIcons name="water" size={22} color="#e8003a" />
              <Text style={styles.bloodLabel}>BLOOD GROUP</Text>
              <Text style={styles.bloodValue}>{profile?.bloodGroup ?? "Unknown"}</Text>
            </View>
          </View>
        </View>

        {/* Medical Info Cards */}
        {[
          { label: "Allergies", icon: "alert-octagon", value: profile?.allergies, color: "#ff6b35" },
          { label: "Medical Conditions", icon: "heart-pulse", value: profile?.medicalConditions, color: "#e8003a" },
          { label: "Current Medications", icon: "pill", value: profile?.medications, color: "#00bcd4" },
        ].map((item) => (
          <View key={item.label} style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={[styles.infoIconBox, { backgroundColor: `${item.color}22` }]}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.infoCardLabel}>{item.label}</Text>
            </View>
            <Text style={[styles.infoCardValue, !item.value && { color: "rgba(255,255,255,0.3)", fontStyle: "italic" }]}>
              {item.value || "None listed"}
            </Text>
          </View>
        ))}

        {/* Emergency Contacts */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={[styles.infoIconBox, { backgroundColor: "rgba(232,0,58,0.15)" }]}>
              <Feather name="phone" size={18} color="#e8003a" />
            </View>
            <Text style={styles.infoCardLabel}>Emergency Contacts</Text>
          </View>
          {keyContacts.length === 0 ? (
            <Text style={[styles.infoCardValue, { color: "rgba(255,255,255,0.3)", fontStyle: "italic" }]}>No contacts on file</Text>
          ) : (
            keyContacts.map((c: any) => (
              <View key={c.id} style={styles.contactRow}>
                <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[c.priority] ?? "#fff" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactMeta}>{c.priority} · {c.relationship}</Text>
                </View>
                <Text style={styles.contactPhone}>{c.phone}</Text>
              </View>
            ))
          )}
        </View>

        {/* Emergency Number */}
        <View style={styles.emergencyNumCard}>
          <Text style={styles.emergencyNumLabel}>IN EMERGENCY, CALL</Text>
          <Text style={styles.emergencyNum}>112</Text>
        </View>

        {/* Branding */}
        <View style={styles.branding}>
          <MaterialCommunityIcons name="shield-alert" size={20} color="rgba(232,0,58,0.6)" />
          <Text style={styles.brandName}>EmergencyAlert by NEXORA</Text>
          <Text style={styles.brandTagline}>Built for Every Second That Matters</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06060e" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },

  heroCard: { backgroundColor: "rgba(232,0,58,0.08)", borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(232,0,58,0.35)", padding: 20, marginBottom: 14 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  crossBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(232,0,58,0.25)", alignItems: "center", justifyContent: "center" },
  crossText: { fontSize: 16, color: "#e8003a", fontWeight: "900" },
  heroLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#e8003a", letterSpacing: 2.5 },

  identityRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 18 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "rgba(232,0,58,0.5)" },
  avatarPlaceholder: { backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  ageText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },

  divider: { height: 1, backgroundColor: "rgba(232,0,58,0.2)", marginBottom: 16 },

  bloodRow: { alignItems: "center" },
  bloodBadge: { alignItems: "center", backgroundColor: "rgba(232,0,58,0.1)", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(232,0,58,0.3)" },
  bloodLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginTop: 6, marginBottom: 4 },
  bloodValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },

  infoCard: { backgroundColor: "#10101e", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16, marginBottom: 10 },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoCardLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)", letterSpacing: 1 },
  infoCardValue: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff", lineHeight: 21 },

  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  contactMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginTop: 1 },
  contactPhone: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },

  emergencyNumCard: { backgroundColor: "#e8003a", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 },
  emergencyNumLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.75)", letterSpacing: 2.5, marginBottom: 6 },
  emergencyNum: { fontSize: 56, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 4 },

  branding: { alignItems: "center", paddingVertical: 8, gap: 4 },
  brandName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  brandTagline: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.25)", fontStyle: "italic" },
});
