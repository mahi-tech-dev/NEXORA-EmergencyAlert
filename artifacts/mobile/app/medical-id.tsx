import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProfile, useListContacts } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { buildWidgetData, getMedicalIDTextSummary, WIDGET_CACHE_KEY } from "@/lib/widgetData";

const CACHE_KEY = "nexora_medical_id_v1";
const SCREEN_WIDTH = Dimensions.get("window").width;

function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const parts = dob.split("-");
  if (parts.length !== 3) return "—";
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return "—";
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const monthDiff = now.getMonth() - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDay)) age--;
  if (age < 0 || age > 150) return "—";
  return `${age} yrs`;
}

async function callNumber(phone: string) {
  const url = `tel:${phone.replace(/\s/g, "")}`;
  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Cannot call", `Dialer not available for ${phone}`);
  }
}

const PRIORITY_ORDER = ["Primary", "Secondary", "Doctor"];
const PRIORITY_COLOR: Record<string, string> = {
  Primary: "#e8003a",
  Secondary: "#ff9100",
  Doctor: "#00bcd4",
};

export default function MedicalIDScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: profileData } = useGetProfile();
  const { data: contactsData } = useListContacts();
  const exportCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // Local cache state
  const [cachedProfile, setCachedProfile] = useState<any>(null);
  const [cachedContacts, setCachedContacts] = useState<any[]>([]);

  // Load cache on mount
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setCachedProfile(parsed.profile ?? null);
          setCachedContacts(parsed.contacts ?? []);
          setIsFromCache(true);
        } catch {}
      }
    });
  }, []);

  // Resolve live vs cached data
  const liveProfile = profileData && "id" in profileData ? (profileData as any) : null;
  const liveContacts = (contactsData as any)?.contacts ?? null;
  const profile = liveProfile ?? cachedProfile;
  const contacts = liveContacts ?? cachedContacts;

  // Save to cache whenever live data arrives
  useEffect(() => {
    if (liveProfile !== null && liveContacts !== null) {
      const payload = { profile: liveProfile, contacts: liveContacts, userName: user?.name ?? "", savedAt: Date.now() };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      // Also update widget cache
      const widgetData = buildWidgetData(user?.name ?? "", liveProfile, liveContacts);
      AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(widgetData));
      setIsFromCache(false);
    }
  }, [liveProfile, liveContacts]);

  const keyContacts = PRIORITY_ORDER
    .map((p) => contacts.find((c: any) => c.priority === p))
    .filter(Boolean);
  const primaryContact = keyContacts.find((c: any) => c.priority === "Primary") ?? null;
  const secondaryContact = keyContacts.find((c: any) => c.priority === "Secondary") ?? null;

  const age = calcAge(profile?.dob);

  const handleShare = async () => {
    setSharing(true);
    try {
      if (Platform.OS === "web") {
        const widgetData = buildWidgetData(user?.name ?? "Unknown", profile, contacts);
        const text = getMedicalIDTextSummary(widgetData, {
          age,
          medicalConditions: profile?.medicalConditions,
          medications: profile?.medications,
        });
        const nav = navigator as any;
        if (nav.share) {
          await nav.share({ title: "Emergency Medical ID", text });
        } else if (nav.clipboard) {
          await nav.clipboard.writeText(text);
          Alert.alert("Copied", "Medical ID copied to clipboard.");
        } else {
          Alert.alert("Share", text);
        }
      } else {
        const uri = await captureRef(exportCardRef, { format: "png", quality: 1, result: "tmpfile" });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share Medical ID",
          });
        } else {
          Alert.alert("Share not available", "Sharing is not available on this device.");
        }
      }
    } catch (e: any) {
      if (!String(e?.message).includes("cancel")) {
        Alert.alert("Error", "Could not share Medical ID.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 16 : 12) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Medical ID</Text>
        <Pressable style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
          {sharing ? (
            <ActivityIndicator size="small" color="#e8003a" />
          ) : (
            <Feather name="share-2" size={18} color="#e8003a" />
          )}
        </Pressable>
      </View>

      {/* Offline cache indicator */}
      {isFromCache && liveProfile === null && (
        <View style={styles.cacheBanner}>
          <Feather name="wifi-off" size={13} color="rgba(255,165,0,0.9)" />
          <Text style={styles.cacheBannerText}>Showing cached data · Connect to refresh</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Quick Call Actions ── */}
        <View style={styles.quickActions}>
          <Pressable style={[styles.callAction, styles.callAction112]} onPress={() => callNumber("112")}>
            <MaterialCommunityIcons name="phone-alert" size={20} color="#fff" />
            <Text style={styles.callActionText}>Call 112</Text>
          </Pressable>

          {primaryContact && (
            <Pressable style={[styles.callAction, styles.callActionPrimary]} onPress={() => callNumber((primaryContact as any).phone)}>
              <Feather name="phone" size={16} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.callActionLabel}>Primary</Text>
                <Text style={styles.callActionName} numberOfLines={1}>{(primaryContact as any).name}</Text>
              </View>
            </Pressable>
          )}

          {secondaryContact && (
            <Pressable style={[styles.callAction, styles.callActionSecondary]} onPress={() => callNumber((secondaryContact as any).phone)}>
              <Feather name="phone" size={16} color="#e8e8e8" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.callActionLabel, { color: "rgba(255,255,255,0.7)" }]}>Secondary</Text>
                <Text style={[styles.callActionName, { color: "#fff" }]} numberOfLines={1}>{(secondaryContact as any).name}</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* ── Hero Card (also captured for share) ── */}
        <View ref={exportCardRef} collapsable={false} style={styles.exportWrap}>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.crossBadge}>
                <Text style={styles.crossText}>✚</Text>
              </View>
              <Text style={styles.heroLabel}>EMERGENCY MEDICAL ID</Text>
            </View>

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
                <Text style={styles.ageText}>Age: {age}</Text>
                {profile?.gender ? <Text style={styles.metaText}>{profile.gender}</Text> : null}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bloodRow}>
              <View style={styles.bloodBadge}>
                <MaterialCommunityIcons name="water" size={22} color="#e8003a" />
                <Text style={styles.bloodLabel}>BLOOD GROUP</Text>
                <Text style={styles.bloodValue}>{profile?.bloodGroup ?? "Unknown"}</Text>
              </View>
            </View>
          </View>

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

          <View style={styles.emergencyNumCard}>
            <Text style={styles.emergencyNumLabel}>IN EMERGENCY, CALL</Text>
            <Text style={styles.emergencyNum}>112</Text>
          </View>

          <View style={styles.branding}>
            <MaterialCommunityIcons name="shield-alert" size={20} color="rgba(232,0,58,0.6)" />
            <Text style={styles.brandName}>EmergencyAlert by NEXORA</Text>
            <Text style={styles.brandTagline}>Built for Every Second That Matters</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06060e" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(232,0,58,0.12)",
    borderWidth: 1,
    borderColor: "rgba(232,0,58,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cacheBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,165,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cacheBannerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,165,0,0.85)",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  // Quick actions
  quickActions: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 16,
  },
  callAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
  },
  callAction112: {
    backgroundColor: "#e8003a",
    borderColor: "#c0002e",
  },
  callActionPrimary: {
    backgroundColor: "rgba(232,0,58,0.15)",
    borderColor: "rgba(232,0,58,0.4)",
  },
  callActionSecondary: {
    backgroundColor: "rgba(255,145,0,0.12)",
    borderColor: "rgba(255,145,0,0.35)",
  },
  callActionText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  callActionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  callActionName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  // Export wrapper (captured by ViewShot)
  exportWrap: {
    backgroundColor: "#06060e",
    borderRadius: 4,
  },

  // Hero card
  heroCard: {
    backgroundColor: "rgba(232,0,58,0.08)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(232,0,58,0.35)",
    padding: 20,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  crossBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(232,0,58,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  crossText: { fontSize: 16, color: "#e8003a", fontWeight: "900" },
  heroLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#e8003a",
    letterSpacing: 2.5,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(232,0,58,0.5)",
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  ageText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  divider: { height: 1, backgroundColor: "rgba(232,0,58,0.2)", marginBottom: 16 },
  bloodRow: { alignItems: "center" },
  bloodBadge: {
    alignItems: "center",
    backgroundColor: "rgba(232,0,58,0.1)",
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(232,0,58,0.3)",
  },
  bloodLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
    marginTop: 6,
    marginBottom: 4,
  },
  bloodValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },

  // Info cards
  infoCard: {
    backgroundColor: "#10101e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    marginBottom: 10,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
  },
  infoCardValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#fff",
    lineHeight: 21,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  contactMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },
  contactPhone: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },

  // Emergency number
  emergencyNumCard: {
    backgroundColor: "#e8003a",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  emergencyNumLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  emergencyNum: { fontSize: 56, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 4 },

  // Branding
  branding: { alignItems: "center", paddingVertical: 8, gap: 4 },
  brandName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
    fontStyle: "italic",
  },
});
