import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
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

function buildQRPayload(opts: {
  name: string;
  age: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  medications: string;
  contacts: Array<{ name: string; phone: string; priority: string }>;
}): string {
  const lines = [
    "EMERGENCY MEDICAL ID — EmergencyAlert by NEXORA",
    `Name: ${opts.name}`,
    `Age: ${opts.age}`,
    `Blood Group: ${opts.bloodGroup}`,
    `Allergies: ${opts.allergies || "None"}`,
    `Conditions: ${opts.conditions || "None"}`,
    `Medications: ${opts.medications || "None"}`,
    ...opts.contacts.map((c) => `${c.priority} Contact: ${c.name} ${c.phone}`),
    "Emergency: 112",
  ];
  return lines.join("\n");
}

function buildPdfHtml(opts: {
  name: string;
  age: string;
  bloodGroup: string;
  allergies: string | null;
  conditions: string | null;
  medications: string | null;
  gender: string | null;
  profileImage: string | null;
  contacts: Array<{ name: string; phone: string; priority: string; relationship: string }>;
  qrDataUrl: string;
}): string {
  const photoHtml = opts.profileImage
    ? `<img src="${opts.profileImage}" class="avatar" />`
    : `<div class="avatar-placeholder">👤</div>`;

  const contactRows = opts.contacts.length
    ? opts.contacts
        .map(
          (c) => `<tr>
            <td><span class="badge badge-${c.priority.toLowerCase()}">${c.priority}</span></td>
            <td>${c.name}</td>
            <td>${c.relationship}</td>
            <td>${c.phone}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No contacts on file</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Emergency Medical ID</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; background: #fff; color: #111; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 28px; }

  /* Header */
  .header { background: #e8003a; color: #fff; border-radius: 16px; padding: 24px; display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
  .header-icon { font-size: 28px; }
  .header-title { font-size: 11px; letter-spacing: 3px; opacity: 0.8; margin-bottom: 4px; text-transform: uppercase; }
  .header-brand { font-size: 20px; font-weight: 800; }
  .header-tagline { font-size: 11px; opacity: 0.7; font-style: italic; margin-top: 2px; }

  /* Identity */
  .identity { display: flex; align-items: center; gap: 24px; background: #fafafa; border: 1px solid #eee; border-radius: 14px; padding: 20px; margin-bottom: 20px; }
  .avatar { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid #e8003a; }
  .avatar-placeholder { width: 90px; height: 90px; border-radius: 50%; background: #f0f0f0; border: 3px solid #e8003a; display: flex; align-items: center; justify-content: center; font-size: 36px; }
  .id-name { font-size: 24px; font-weight: 800; color: #111; margin-bottom: 4px; }
  .id-meta { font-size: 13px; color: #666; margin-bottom: 2px; }
  .blood-chip { display: inline-block; background: #e8003a; color: #fff; font-size: 18px; font-weight: 800; border-radius: 10px; padding: 6px 18px; margin-top: 8px; }

  /* Sections */
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #e8003a; font-weight: 700; margin-bottom: 10px; border-bottom: 2px solid #fde; padding-bottom: 6px; }
  .field { margin-bottom: 10px; }
  .field-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .field-value { font-size: 14px; color: #111; line-height: 1.5; }
  .field-value.empty { color: #bbb; font-style: italic; }

  /* Contacts table */
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
  td { font-size: 13px; padding: 8px 8px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
  .empty { color: #bbb; font-style: italic; text-align: center; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
  .badge-primary { background: #ffe5ec; color: #e8003a; }
  .badge-secondary { background: #fff3e0; color: #e65100; }
  .badge-doctor { background: #e0f7fa; color: #00838f; }

  /* Emergency number */
  .emg-box { background: #e8003a; color: #fff; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px; }
  .emg-label { font-size: 11px; letter-spacing: 3px; opacity: 0.8; margin-bottom: 4px; }
  .emg-num { font-size: 72px; font-weight: 900; letter-spacing: 6px; line-height: 1; }

  /* Footer with QR */
  .footer { display: flex; align-items: center; gap: 24px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 8px; }
  .qr-wrap { flex-shrink: 0; }
  .footer-brand { font-size: 14px; font-weight: 700; color: #e8003a; }
  .footer-tagline { font-size: 11px; color: #999; font-style: italic; margin-top: 2px; }
  .footer-note { font-size: 11px; color: #bbb; margin-top: 8px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <span class="header-icon">✚</span>
    <div>
      <div class="header-title">Emergency Medical ID</div>
      <div class="header-brand">EmergencyAlert by NEXORA</div>
      <div class="header-tagline">Built for Every Second That Matters</div>
    </div>
  </div>

  <div class="identity">
    ${photoHtml}
    <div>
      <div class="id-name">${opts.name}</div>
      <div class="id-meta">Age: ${opts.age}${opts.gender ? " · " + opts.gender : ""}</div>
      <div class="blood-chip">🩸 ${opts.bloodGroup}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Medical Information</div>
    <div class="field">
      <div class="field-label">Allergies</div>
      <div class="field-value ${opts.allergies ? "" : "empty"}">${opts.allergies || "None listed"}</div>
    </div>
    <div class="field">
      <div class="field-label">Medical Conditions</div>
      <div class="field-value ${opts.conditions ? "" : "empty"}">${opts.conditions || "None listed"}</div>
    </div>
    <div class="field">
      <div class="field-label">Current Medications</div>
      <div class="field-value ${opts.medications ? "" : "empty"}">${opts.medications || "None listed"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Emergency Contacts</div>
    <table>
      <tr>
        <th>Priority</th><th>Name</th><th>Relationship</th><th>Phone</th>
      </tr>
      ${contactRows}
    </table>
  </div>

  <div class="emg-box">
    <div class="emg-label">IN EMERGENCY, CALL</div>
    <div class="emg-num">112</div>
  </div>

  <div class="footer">
    <div class="qr-wrap">
      <img src="${opts.qrDataUrl}" width="120" height="120" />
    </div>
    <div>
      <div class="footer-brand">EmergencyAlert by NEXORA</div>
      <div class="footer-tagline">Built for Every Second That Matters</div>
      <div class="footer-note">Scan QR for full emergency profile</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

export default function MedicalIDScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: profileData } = useGetProfile();
  const { data: contactsData } = useListContacts();
  const exportCardRef = useRef<View>(null);
  const iceWallpaperRef = useRef<View>(null);
  const qrSvgRef = useRef<any>(null);

  const [sharing, setSharing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingWallpaper, setGeneratingWallpaper] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const [cachedProfile, setCachedProfile] = useState<any>(null);
  const [cachedContacts, setCachedContacts] = useState<any[]>([]);

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

  const liveProfile = profileData && "id" in profileData ? (profileData as any) : null;
  const liveContacts = (contactsData as any)?.contacts ?? null;
  const profile = liveProfile ?? cachedProfile;
  const contacts = liveContacts ?? cachedContacts;

  useEffect(() => {
    if (liveProfile !== null && liveContacts !== null) {
      const payload = {
        profile: liveProfile,
        contacts: liveContacts,
        userName: user?.name ?? "",
        savedAt: Date.now(),
      };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
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

  const qrPayload = buildQRPayload({
    name: user?.name ?? "Unknown",
    age,
    bloodGroup: profile?.bloodGroup ?? "Unknown",
    allergies: profile?.allergies ?? "",
    conditions: profile?.medicalConditions ?? "",
    medications: profile?.medications ?? "",
    contacts: keyContacts.map((c: any) => ({ name: c.name, phone: c.phone, priority: c.priority })),
  });

  // ── Share Medical ID image ──
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
        } else {
          await nav.clipboard?.writeText(text);
          Alert.alert("Copied", "Medical ID copied to clipboard.");
        }
      } else {
        const uri = await captureRef(exportCardRef, { format: "png", quality: 1, result: "tmpfile" });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Medical ID" });
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

  // ── Generate & share PDF ──
  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      // Generate QR as data URL using the QR API (works offline for basic data)
      const qrEncoded = encodeURIComponent(qrPayload);
      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrEncoded}&bgcolor=ffffff&color=000000`;

      const html = buildPdfHtml({
        name: user?.name ?? "Unknown",
        age,
        bloodGroup: profile?.bloodGroup ?? "Unknown",
        allergies: profile?.allergies ?? null,
        conditions: profile?.medicalConditions ?? null,
        medications: profile?.medications ?? null,
        gender: profile?.gender ?? null,
        profileImage: profile?.profileImage ?? null,
        contacts: keyContacts.map((c: any) => ({
          name: c.name,
          phone: c.phone,
          priority: c.priority,
          relationship: c.relationship,
        })),
        qrDataUrl,
      });

      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Save / Share Medical ID PDF",
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert("Saved", `PDF saved to: ${uri}`);
        }
      }
    } catch (e: any) {
      if (!String(e?.message).includes("cancel")) {
        Alert.alert("Error", "Could not generate PDF.");
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ── Generate ICE Wallpaper ──
  const handleGenerateWallpaper = async () => {
    setGeneratingWallpaper(true);
    try {
      if (Platform.OS === "web") {
        Alert.alert(
          "ICE Wallpaper",
          "Wallpaper generation is available on iOS and Android. On web, please use the PDF export instead.",
          [{ text: "OK" }]
        );
        setGeneratingWallpaper(false);
        return;
      }
      const uri = await captureRef(iceWallpaperRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Save ICE Wallpaper",
        });
      }
    } catch (e: any) {
      if (!String(e?.message).includes("cancel")) {
        Alert.alert("Error", "Could not generate wallpaper.");
      }
    } finally {
      setGeneratingWallpaper(false);
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
                <Text style={styles.callActionLabel}>Primary Contact</Text>
                <Text style={styles.callActionName} numberOfLines={1}>{(primaryContact as any).name}</Text>
              </View>
            </Pressable>
          )}
          {secondaryContact && (
            <Pressable style={[styles.callAction, styles.callActionSecondary]} onPress={() => callNumber((secondaryContact as any).phone)}>
              <Feather name="phone" size={16} color="#e8e8e8" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.callActionLabel, { color: "rgba(255,255,255,0.7)" }]}>Secondary Contact</Text>
                <Text style={[styles.callActionName, { color: "#fff" }]} numberOfLines={1}>{(secondaryContact as any).name}</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* ── Actions Row: QR / PDF / Wallpaper ── */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionCard} onPress={() => setShowQR(true)}>
            <View style={[styles.actionIcon, { backgroundColor: "rgba(100,181,246,0.12)" }]}>
              <MaterialCommunityIcons name="qrcode" size={22} color="#64b5f6" />
            </View>
            <Text style={styles.actionLabel}>QR Code</Text>
            <Text style={styles.actionSub}>Emergency{"\n"}profile</Text>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={handleDownloadPdf} disabled={generatingPdf}>
            <View style={[styles.actionIcon, { backgroundColor: "rgba(232,0,58,0.12)" }]}>
              {generatingPdf ? (
                <ActivityIndicator size="small" color="#e8003a" />
              ) : (
                <MaterialCommunityIcons name="file-pdf-box" size={22} color="#e8003a" />
              )}
            </View>
            <Text style={styles.actionLabel}>PDF Card</Text>
            <Text style={styles.actionSub}>Print &{"\n"}share</Text>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={handleGenerateWallpaper} disabled={generatingWallpaper}>
            <View style={[styles.actionIcon, { backgroundColor: "rgba(0,230,118,0.10)" }]}>
              {generatingWallpaper ? (
                <ActivityIndicator size="small" color="#00e676" />
              ) : (
                <MaterialCommunityIcons name="cellphone-screenshot" size={22} color="#00e676" />
              )}
            </View>
            <Text style={styles.actionLabel}>ICE Wallpaper</Text>
            <Text style={styles.actionSub}>Lock screen{"\n"}card</Text>
          </Pressable>
        </View>

        {/* ── Hero Card (captured for image share) ── */}
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

      {/* ─────────────────────────────────────────
          QR Code Modal
      ───────────────────────────────────────── */}
      <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
        <Pressable style={styles.qrOverlay} onPress={() => setShowQR(false)}>
          <Pressable style={styles.qrModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.qrModalHandle} />
            <View style={styles.qrHeader}>
              <View style={styles.qrIconBadge}>
                <MaterialCommunityIcons name="qrcode" size={22} color="#64b5f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.qrTitle}>Emergency QR Code</Text>
                <Text style={styles.qrSub}>Scan to access emergency profile</Text>
              </View>
              <Pressable onPress={() => setShowQR(false)} style={styles.qrCloseBtn}>
                <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>

            <View style={styles.qrCodeWrap}>
              <QRCode
                value={qrPayload}
                size={220}
                color="#ffffff"
                backgroundColor="#0d0d1a"
                ref={qrSvgRef}
              />
            </View>

            <Text style={styles.qrProfileName}>{user?.name ?? "Unknown"}</Text>
            <View style={styles.qrBloodRow}>
              <MaterialCommunityIcons name="water" size={14} color="#e8003a" />
              <Text style={styles.qrBloodText}>{profile?.bloodGroup ?? "—"}</Text>
              <Text style={styles.qrBullet}>·</Text>
              <Text style={styles.qrBloodText}>Age {age}</Text>
              <Text style={styles.qrBullet}>·</Text>
              <Text style={styles.qrBloodText}>Emergency: 112</Text>
            </View>

            <Text style={styles.qrHint}>
              Show this code to medical personnel.{"\n"}Scan with any QR reader.
            </Text>

            <View style={styles.qrFooter}>
              <MaterialCommunityIcons name="shield-alert" size={14} color="rgba(232,0,58,0.5)" />
              <Text style={styles.qrFooterText}>EmergencyAlert by NEXORA</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─────────────────────────────────────────
          ICE Wallpaper — off-screen capture view
      ───────────────────────────────────────── */}
      <View style={{ position: "absolute", top: -9999, left: 0 }} pointerEvents="none">
        <View
          ref={iceWallpaperRef}
          collapsable={false}
          style={styles.iceWallpaper}
        >
          {/* Top stripe */}
          <View style={styles.iceTopStripe} />

          {/* ICE Header */}
          <View style={styles.iceHeaderSection}>
            <MaterialCommunityIcons name="shield-alert" size={36} color="#e8003a" />
            <Text style={styles.iceTitle}>IN CASE OF EMERGENCY</Text>
            <View style={styles.iceTitleUnderline} />
          </View>

          {/* Identity block */}
          <View style={styles.iceBlock}>
            <Text style={styles.iceFieldLabel}>NAME</Text>
            <Text style={styles.iceFieldValue}>{user?.name ?? "—"}</Text>
          </View>

          <View style={styles.iceDivider} />

          <View style={styles.iceRow}>
            <View style={[styles.iceBlock, { flex: 1 }]}>
              <Text style={styles.iceFieldLabel}>BLOOD GROUP</Text>
              <Text style={[styles.iceFieldValue, styles.iceBloodValue]}>{profile?.bloodGroup ?? "—"}</Text>
            </View>
            <View style={[styles.iceBlock, { flex: 1 }]}>
              <Text style={styles.iceFieldLabel}>AGE</Text>
              <Text style={styles.iceFieldValue}>{age}</Text>
            </View>
          </View>

          <View style={styles.iceDivider} />

          {profile?.allergies && (
            <>
              <View style={styles.iceBlock}>
                <Text style={styles.iceFieldLabel}>⚠ ALLERGIES</Text>
                <Text style={[styles.iceFieldValue, { color: "#ff6b35" }]}>{profile.allergies}</Text>
              </View>
              <View style={styles.iceDivider} />
            </>
          )}

          {primaryContact && (
            <>
              <View style={styles.iceBlock}>
                <Text style={styles.iceFieldLabel}>PRIMARY CONTACT</Text>
                <Text style={styles.iceFieldValue}>{(primaryContact as any).name}</Text>
                <Text style={styles.iceFieldPhone}>{(primaryContact as any).phone}</Text>
              </View>
              <View style={styles.iceDivider} />
            </>
          )}

          {secondaryContact && (
            <>
              <View style={styles.iceBlock}>
                <Text style={styles.iceFieldLabel}>SECONDARY CONTACT</Text>
                <Text style={styles.iceFieldValue}>{(secondaryContact as any).name}</Text>
                <Text style={styles.iceFieldPhone}>{(secondaryContact as any).phone}</Text>
              </View>
              <View style={styles.iceDivider} />
            </>
          )}

          {/* Emergency number */}
          <View style={styles.iceEmergencyBox}>
            <Text style={styles.iceEmergencyLabel}>EMERGENCY NUMBER</Text>
            <Text style={styles.iceEmergencyNum}>112</Text>
          </View>

          {/* Spacer to fill height */}
          <View style={{ flex: 1 }} />

          {/* Footer branding */}
          <View style={styles.iceFooter}>
            <MaterialCommunityIcons name="shield-alert" size={16} color="rgba(232,0,58,0.5)" />
            <Text style={styles.iceFooterText}>EmergencyAlert by NEXORA</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const W = SCREEN_WIDTH;

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
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
  shareBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(232,0,58,0.12)",
    borderWidth: 1, borderColor: "rgba(232,0,58,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  cacheBanner: {
    marginHorizontal: 20, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "rgba(255,165,0,0.08)",
    borderWidth: 1, borderColor: "rgba(255,165,0,0.25)",
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  cacheBannerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,165,0,0.85)" },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  // Quick call
  quickActions: { flexDirection: "column", gap: 10, marginBottom: 14 },
  callAction: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1,
  },
  callAction112: { backgroundColor: "#e8003a", borderColor: "#c0002e" },
  callActionPrimary: { backgroundColor: "rgba(232,0,58,0.15)", borderColor: "rgba(232,0,58,0.4)" },
  callActionSecondary: { backgroundColor: "rgba(255,145,0,0.12)", borderColor: "rgba(255,145,0,0.35)" },
  callActionText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  callActionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.55)", letterSpacing: 1, marginBottom: 2 },
  callActionName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Actions row
  actionsRow: {
    flexDirection: "row", gap: 10, marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#10101e",
    borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    alignItems: "center", gap: 8,
  },
  actionIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: "#fff", textAlign: "center",
  },
  actionSub: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 14,
  },

  // Export wrap
  exportWrap: { backgroundColor: "#06060e", borderRadius: 4 },

  // Hero card
  heroCard: {
    backgroundColor: "rgba(232,0,58,0.08)",
    borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(232,0,58,0.35)",
    padding: 20, marginBottom: 14,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  crossBadge: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "rgba(232,0,58,0.25)",
    alignItems: "center", justifyContent: "center",
  },
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
  bloodBadge: {
    alignItems: "center",
    backgroundColor: "rgba(232,0,58,0.1)", borderRadius: 16,
    paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(232,0,58,0.3)",
  },
  bloodLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginTop: 6, marginBottom: 4 },
  bloodValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },
  infoCard: {
    backgroundColor: "#10101e", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    padding: 16, marginBottom: 10,
  },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoCardLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)", letterSpacing: 1 },
  infoCardValue: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff", lineHeight: 21 },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)",
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  contactMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginTop: 1 },
  contactPhone: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  emergencyNumCard: {
    backgroundColor: "#e8003a", borderRadius: 16, padding: 20,
    alignItems: "center", marginBottom: 16,
  },
  emergencyNumLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.75)", letterSpacing: 2.5, marginBottom: 6 },
  emergencyNum: { fontSize: 56, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 4 },
  branding: { alignItems: "center", paddingVertical: 8, gap: 4 },
  brandName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  brandTagline: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.25)", fontStyle: "italic" },

  // ── QR Modal ──
  qrOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  qrModal: {
    backgroundColor: "#0d0d1a",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(232,0,58,0.3)",
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16,
    alignItems: "center",
  },
  qrModalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 20,
  },
  qrHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 12, width: "100%", marginBottom: 28,
  },
  qrIconBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(100,181,246,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  qrTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  qrSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 2 },
  qrCloseBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  qrCodeWrap: {
    padding: 20, borderRadius: 20,
    backgroundColor: "#0d0d1a",
    borderWidth: 1.5, borderColor: "rgba(232,0,58,0.3)",
    marginBottom: 20,
  },
  qrProfileName: {
    fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff",
    marginBottom: 8,
  },
  qrBloodRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16,
  },
  qrBloodText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
  qrBullet: { fontSize: 13, color: "rgba(255,255,255,0.25)" },
  qrHint: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)", textAlign: "center",
    lineHeight: 18, marginBottom: 20,
  },
  qrFooter: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  qrFooterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.3)" },

  // ── ICE Wallpaper ──
  iceWallpaper: {
    width: W,
    height: W * 2.16, // approx phone screen ratio
    backgroundColor: "#06060e",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    borderWidth: 0,
  },
  iceTopStripe: {
    height: 6, backgroundColor: "#e8003a",
    borderRadius: 3, marginBottom: 40,
  },
  iceHeaderSection: {
    alignItems: "center", marginBottom: 36,
  },
  iceTitle: {
    fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff",
    letterSpacing: 3, marginTop: 12, textAlign: "center",
  },
  iceTitleUnderline: {
    height: 2, width: 80, backgroundColor: "#e8003a",
    borderRadius: 1, marginTop: 10,
  },
  iceBlock: { paddingVertical: 12 },
  iceRow: { flexDirection: "row" },
  iceDivider: { height: 1, backgroundColor: "rgba(232,0,58,0.2)" },
  iceFieldLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: "#e8003a", letterSpacing: 2, marginBottom: 6,
  },
  iceFieldValue: {
    fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff",
  },
  iceBloodValue: {
    fontSize: 36, color: "#fff",
  },
  iceFieldPhone: {
    fontSize: 18, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)", marginTop: 2,
  },
  iceEmergencyBox: {
    backgroundColor: "#e8003a", borderRadius: 16,
    padding: 20, alignItems: "center", marginTop: 20,
  },
  iceEmergencyLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.75)", letterSpacing: 2.5, marginBottom: 6,
  },
  iceEmergencyNum: {
    fontSize: 64, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 6,
  },
  iceFooter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
  },
  iceFooterText: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.3)",
  },
});
