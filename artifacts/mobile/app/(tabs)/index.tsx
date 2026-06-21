import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useCreateEmergency,
  useUpdateEmergencyStatus,
  useListEmergencies,
  useListContacts,
  useGetProfile,
  getListEmergenciesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useReadinessStatus } from "@/hooks/useReadinessStatus";
import { startVoiceSOSSession, type VoiceSOSSession } from "@/lib/voiceSos";

type EmergencyType = "accident" | "fire" | "heart_attack" | "theft";

interface EmergencyInfo {
  type: EmergencyType;
  icon: string;
  color: string;
  instructions: string[];
}

const EMERGENCY_TYPES: EmergencyInfo[] = [
  {
    type: "accident",
    icon: "car-emergency",
    color: "#ff6b35",
    instructions: [
      "Call 911 immediately",
      "Do not move injured people unless in immediate danger",
      "Apply firm pressure to stop any bleeding",
      "Keep victims warm and as calm as possible",
      "Alert sent to your emergency contacts",
    ],
  },
  {
    type: "fire",
    icon: "fire",
    color: "#ff4500",
    instructions: [
      "Call 911 immediately",
      "Evacuate the building — do NOT use elevators",
      "Close all doors to slow fire spread",
      "Stay low under smoke when moving",
      "Meet at your designated emergency assembly point",
    ],
  },
  {
    type: "heart_attack",
    icon: "heart-pulse",
    color: "#e8003a",
    instructions: [
      "Call 911 immediately — every second counts",
      "Help the person sit or lie down comfortably",
      "Loosen any tight clothing around the neck and chest",
      "Give aspirin (325mg) if available and not allergic",
      "Be prepared to perform CPR if they lose consciousness",
    ],
  },
  {
    type: "theft",
    icon: "shield-alert",
    color: "#9c27b0",
    instructions: [
      "Move to a safe, crowded public area immediately",
      "Do NOT confront the suspect — your safety comes first",
      "Call 911 to report the incident",
      "Note suspect details: appearance, vehicle, direction",
      "Alert sent to your emergency contacts",
    ],
  },
];

const FAKE_CONTACTS = ["Sarah M.", "John D.", "Mom"];
const COUNTDOWN_START = 5;
const SAFE_CHECKIN_DELAY_MS = 15 * 60 * 1000;

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Readiness Status Card ─────────────────────────────────────
function ReadinessCard({ colors }: { colors: any }) {
  const { t } = useLanguage();
  const status = useReadinessStatus();

  const rows = [
    {
      icon: "crosshairs-gps",
      label: t.readinessGPS,
      value: status.gpsGranted === null ? "…" : status.gpsGranted ? t.readinessGPSOn : t.readinessGPSOff,
      ok: status.gpsGranted,
      warning: status.gpsGranted === false,
    },
    {
      icon: "wifi",
      label: t.readinessInternet,
      value: status.internetConnected === null ? "…" : status.internetConnected ? t.readinessOnline : t.readinessOffline,
      ok: status.internetConnected,
      warning: status.internetConnected === false,
    },
    {
      icon: status.batteryCharging ? "battery-charging" : "battery",
      label: t.readinessBattery,
      value: status.batteryLevel === null ? "…" : `${Math.round(status.batteryLevel * 100)}%`,
      ok: !status.batteryLow,
      warning: status.batteryLow,
    },
    {
      icon: "id-card",
      label: t.readinessOfflineMedID,
      value: status.offlineMedicalIdReady ? t.readinessOfflineMedIDReady : t.readinessOfflineMedIDNot,
      ok: status.offlineMedicalIdReady,
      warning: !status.offlineMedicalIdReady,
    },
  ];

  const warnings = rows.filter((r) => r.warning);

  return (
    <View style={[rdStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={rdStyles.cardHeader}>
        <MaterialCommunityIcons name="shield-check" size={16} color="#00e676" />
        <Text style={[rdStyles.cardTitle, { color: colors.mutedForeground }]}>{t.readinessTitle}</Text>
      </View>
      <View style={rdStyles.rows}>
        {rows.map((row) => {
          const dotColor = row.ok === null ? "#888" : row.ok ? "#00e676" : "#e8003a";
          const valColor = row.warning ? "#ff9100" : row.ok ? "#00e676" : colors.mutedForeground;
          return (
            <View key={row.label} style={rdStyles.row}>
              <MaterialCommunityIcons name={row.icon as any} size={14} color={colors.mutedForeground} />
              <Text style={[rdStyles.rowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
              <View style={{ flex: 1 }} />
              <View style={[rdStyles.dot, { backgroundColor: dotColor }]} />
              <Text style={[rdStyles.rowVal, { color: valColor }]}>{row.value}</Text>
            </View>
          );
        })}
      </View>
      {warnings.length > 0 && (
        <View style={rdStyles.warningRow}>
          <Feather name="alert-triangle" size={12} color="#ff9100" />
          <Text style={rdStyles.warningText}>
            {warnings.map((w) => {
              if (w.icon === "crosshairs-gps") return t.readinessGPSOff;
              if (w.icon === "battery" || w.icon === "battery-charging") return t.readinessBatteryLow;
              if (w.icon === "wifi") return t.readinessOffline;
              if (w.icon === "id-card") return t.readinessOfflineMedIDNot;
              return null;
            }).filter(Boolean).join(" · ")}
          </Text>
        </View>
      )}
    </View>
  );
}

const rdStyles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  rows: { gap: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  rowLabel: {
    fontSize: 13, fontFamily: "Inter_500Medium",
  },
  dot: {
    width: 7, height: 7, borderRadius: 3.5, marginRight: 4,
  },
  rowVal: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
  },
  warningRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "rgba(255,145,0,0.2)",
  },
  warningText: {
    fontSize: 11, fontFamily: "Inter_500Medium", color: "#ff9100",
    flex: 1,
  },
});

// ── Safety Dashboard ──────────────────────────────────────────
interface DashboardProps {
  lastAlertStr: string;
  activeCount: number;
  contactsCount: number;
  medicalIDReady: boolean;
  offlineReady: boolean;
  colors: any;
  t: any;
}
function SafetyDashboard({ lastAlertStr, activeCount, contactsCount, medicalIDReady, offlineReady, colors, t }: DashboardProps) {
  const cards = [
    { label: t.dashLastAlert, value: lastAlertStr, icon: "clock-alert-outline", color: "#ff9100", warn: false },
    { label: t.dashActive, value: String(activeCount), icon: "bell-ring", color: activeCount > 0 ? "#e8003a" : "#00e676", warn: activeCount > 0 },
    { label: t.dashContacts, value: String(contactsCount), icon: "account-group", color: contactsCount === 0 ? "#ff9100" : "#00bcd4", warn: contactsCount === 0 },
    { label: t.dashMedicalID, value: medicalIDReady ? "✓" : "✗", icon: "card-account-details", color: medicalIDReady ? "#00e676" : "#ff9100", warn: !medicalIDReady },
    { label: t.dashOffline, value: offlineReady ? t.dashReady : "✗", icon: "wifi-off", color: offlineReady ? "#00e676" : "#ff9100", warn: !offlineReady },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
      {cards.map((card) => (
        <View key={card.label} style={[dbStyles.card, { backgroundColor: colors.card, borderColor: card.warn ? `${card.color}55` : colors.border }]}>
          <View style={[dbStyles.iconBox, { backgroundColor: `${card.color}18` }]}>
            <MaterialCommunityIcons name={card.icon as any} size={18} color={card.color} />
          </View>
          <Text style={[dbStyles.value, { color: card.color }]}>{card.value}</Text>
          <Text style={[dbStyles.label, { color: colors.mutedForeground }]}>{card.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const dbStyles = StyleSheet.create({
  card: {
    width: 90, borderRadius: 14, borderWidth: 1,
    padding: 12, alignItems: "center", gap: 6,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  value: {
    fontSize: 18, fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    textAlign: "center", letterSpacing: 0.5,
  },
});

// ── Main Screen ───────────────────────────────────────────────
export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [alertSent, setAlertSent] = useState(false);
  const [sosCooldownMsg, setSosCooldownMsg] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Voice SOS state
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceResultMsg, setVoiceResultMsg] = useState("");
  const voiceSessionRef = useRef<VoiceSOSSession | null>(null);
  const voicePulse = useRef(new Animated.Value(1)).current;

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeCheckInRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAlertIdRef = useRef<number | null>(null);
  const lastAlertSentAtRef = useRef<number | null>(null);
  const cooldownMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  const { mutate: updateEmergencyStatus } = useUpdateEmergencyStatus({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEmergenciesQueryKey() }),
    },
  });

  const { mutate: createEmergency } = useCreateEmergency({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListEmergenciesQueryKey() });
        if (data?.id) {
          lastAlertIdRef.current = data.id;
          if (safeCheckInRef.current) clearTimeout(safeCheckInRef.current);
          safeCheckInRef.current = setTimeout(() => {
            Alert.alert(
              "Are you safe?",
              "It has been 15 minutes since your emergency alert. Please confirm your status.",
              [
                { text: "NEED HELP", style: "destructive", onPress: () => {} },
                {
                  text: "YES, I'M SAFE",
                  onPress: () => {
                    if (lastAlertIdRef.current !== null) {
                      updateEmergencyStatus({ id: lastAlertIdRef.current, data: { status: "resolved" } });
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          }, SAFE_CHECKIN_DELAY_MS);
        }
      },
    },
  });

  // Safety dashboard data
  const { data: emergenciesData } = useListEmergencies();
  const { data: contactsData } = useListContacts();
  const { data: profileData } = useGetProfile();

  const emergencies = (emergenciesData as any)?.emergencies ?? [];
  const activeCount = emergencies.filter((e: any) => e.status === "active").length;
  const lastAlert = emergencies.length > 0 ? emergencies[0]?.createdAt : null;
  const lastAlertStr = lastAlert ? formatRelative(lastAlert) : t.dashNever;
  const contactsCount = (contactsData as any)?.contacts?.length ?? 0;
  const medicalIDReady = !!(profileData && "bloodGroup" in (profileData as any) && (profileData as any).bloodGroup);
  const offlineReady = false; // resolved at render by readiness hook via AsyncStorage

  // SOS pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Voice SOS mic pulse animation
  useEffect(() => {
    if (!voiceListening) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(voicePulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(voicePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [voiceListening]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (safeCheckInRef.current) clearTimeout(safeCheckInRef.current);
      if (cooldownMsgTimerRef.current) clearTimeout(cooldownMsgTimerRef.current);
      voiceSessionRef.current?.stop();
    };
  }, []);

  const handleSOS = async () => {
    if (!selectedType) {
      Alert.alert("Select Emergency Type", "Please select the type of emergency before triggering SOS.");
      return;
    }
    const COOLDOWN_MS = 30 * 1000;
    if (lastAlertSentAtRef.current !== null && Date.now() - lastAlertSentAtRef.current < COOLDOWN_MS) {
      setSosCooldownMsg(true);
      if (cooldownMsgTimerRef.current) clearTimeout(cooldownMsgTimerRef.current);
      cooldownMsgTimerRef.current = setTimeout(() => setSosCooldownMsg(false), 4000);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSosActive(true);
    setCountdown(COUNTDOWN_START);
    setAlertSent(false);

    let count = COUNTDOWN_START;
    countdownRef.current = setInterval(async () => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownRef.current!);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        let latitude: number | null = null;
        let longitude: number | null = null;
        setGettingLocation(true);
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (Platform.OS !== "web") {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === "granted") {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                latitude = loc.coords.latitude;
                longitude = loc.coords.longitude;
                break;
              } else { break; }
            } else {
              await new Promise<void>((resolve) => {
                navigator.geolocation?.getCurrentPosition(
                  (pos) => { latitude = pos.coords.latitude; longitude = pos.coords.longitude; resolve(); },
                  () => resolve(),
                  { timeout: 5000 }
                );
              });
              if (latitude !== null) break;
            }
          } catch {
            if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
          }
        }
        setGettingLocation(false);
        createEmergency({
          data: {
            type: selectedType,
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
            address: latitude === null ? "Location unavailable" : undefined,
          },
        });
        lastAlertSentAtRef.current = Date.now();
        setAlertSent(true);
      }
    }, 1000);
  };

  const handleCancel = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSosActive(false);
    setAlertSent(false);
    setCountdown(COUNTDOWN_START);
  };

  const handleClose = () => {
    setSosActive(false);
    setAlertSent(false);
    setCountdown(COUNTDOWN_START);
  };

  // Voice SOS handlers
  const handleVoiceSOSOpen = () => {
    setVoiceTranscript("");
    setVoiceResultMsg("");
    setVoiceListening(false);
    setVoiceModalVisible(true);
  };

  const handleStartListening = () => {
    setVoiceTranscript("");
    setVoiceResultMsg("");
    setVoiceListening(true);

    const session = startVoiceSOSSession(
      (result) => {
        setVoiceListening(false);
        voiceSessionRef.current = null;
        if (result.type === "trigger_detected") {
          setVoiceResultMsg(t.sosVoiceDetected(result.phrase));
          // Close modal and trigger SOS after brief delay
          setTimeout(() => {
            setVoiceModalVisible(false);
            handleSOS();
          }, 1200);
        } else if (result.type === "no_trigger") {
          setVoiceResultMsg(t.sosVoiceNone);
        } else if (result.type === "unavailable") {
          setVoiceResultMsg(result.reason);
        } else if (result.type === "error") {
          setVoiceResultMsg(result.message);
        } else {
          setVoiceResultMsg("");
        }
      },
      (interim) => setVoiceTranscript(interim)
    );

    if (session) {
      voiceSessionRef.current = session;
    }
  };

  const handleStopListening = () => {
    voiceSessionRef.current?.stop();
    voiceSessionRef.current = null;
    setVoiceListening(false);
  };

  const selectedInfo = EMERGENCY_TYPES.find((e) => e.type === selectedType);
  const getTypeLabel = (type: EmergencyType) => {
    const map: Record<EmergencyType, string> = {
      accident: t.typeAccident,
      fire: t.typeFire,
      heart_attack: t.typeHeartAttack,
      theft: t.typeTheft,
    };
    return map[type];
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    greeting: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    userName: { fontSize: 22, fontWeight: "700" as const, color: colors.foreground, fontFamily: "Inter_700Bold" },
    logoutBtn: { padding: 8 },
    testBanner: {
      marginHorizontal: 20, marginBottom: 8,
      backgroundColor: "rgba(255,145,0,0.12)", borderRadius: 10,
      borderWidth: 1, borderColor: "rgba(255,145,0,0.35)",
      paddingHorizontal: 12, paddingVertical: 8,
      flexDirection: "row", alignItems: "center", gap: 8,
    },
    testBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: "#ff9100" },
    scrollContent: { paddingHorizontal: 20, paddingBottom: Platform.OS === "web" ? 120 : 100 },
    sosSection: { alignItems: "center", marginVertical: 24 },
    sosHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 16, letterSpacing: 1.5, textTransform: "uppercase" },
    sosOuter: { width: 200, height: 200, borderRadius: 100, alignItems: "center", justifyContent: "center" },
    sosPulseRing: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primary },
    sosButton: {
      width: 170, height: 170, borderRadius: 85, backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center", elevation: 12,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 20,
      borderWidth: 3, borderColor: "rgba(255,255,255,0.25)",
    },
    sosLabel: { fontSize: 42, fontWeight: "900" as const, color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: 4 },
    sosSubLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_500Medium", letterSpacing: 2, marginTop: -4 },
    typeHint: { marginTop: 14, fontSize: 13, color: selectedType ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" },
    sectionLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    typeCard: { width: "48%" as const, borderRadius: colors.radius, padding: 16, borderWidth: 1.5, alignItems: "flex-start", gap: 10 },
    typeCardSelected: { borderWidth: 2 },
    typeCardLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    // Voice SOS button
    voiceBtn: {
      marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 10, backgroundColor: "rgba(100,181,246,0.08)",
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
      borderWidth: 1, borderColor: "rgba(100,181,246,0.25)",
    },
    voiceBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#64b5f6" },
    // SOS Modal
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
    modal: {
      backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingBottom: insets.bottom + 24, paddingHorizontal: 24, paddingTop: 24,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
    countdownCircle: {
      width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16,
    },
    countdownNum: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#fff" },
    countdownLabel: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_600SemiBold", textAlign: "center", marginBottom: 6 },
    countdownSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 20 },
    cancelBtn: { backgroundColor: colors.secondary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    cancelBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    sentHeader: { alignItems: "center", marginBottom: 20 },
    sentIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,230,118,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
    sentTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    sentSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
    contactsRow: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
    contactChip: { backgroundColor: "rgba(0,230,118,0.1)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(0,230,118,0.25)" },
    contactChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#00e676" },
    instructionsTitle: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 },
    instructionRow: { flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start" },
    bullet: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.glassTint, alignItems: "center", justifyContent: "center", marginTop: 2 },
    bulletText: { fontSize: 10, fontFamily: "Inter_700Bold", color: colors.primary },
    instructionText: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    closeBtn: { backgroundColor: colors.secondary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
    closeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t.sosWelcome}</Text>
          <Text style={styles.userName}>{user?.name ?? t.sosGreeting}</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Test Mode Banner */}
      <View style={styles.testBanner}>
        <MaterialCommunityIcons name="alert-rhombus" size={16} color="#ff9100" />
        <Text style={styles.testBannerText}>{t.sosTestMode}</Text>
      </View>

      {/* SOS Cooldown */}
      {sosCooldownMsg && (
        <View style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: "rgba(232,0,58,0.10)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,0,58,0.35)", paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons name="alert-circle" size={18} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
            {t.sosCooldown}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Safety Dashboard ── */}
        <SafetyDashboard
          lastAlertStr={lastAlertStr}
          activeCount={activeCount}
          contactsCount={contactsCount}
          medicalIDReady={medicalIDReady}
          offlineReady={false}
          colors={colors}
          t={t}
        />

        {/* ── Readiness Status Card ── */}
        <ReadinessCard colors={colors} />

        {/* ── SOS Section ── */}
        <View style={styles.sosSection}>
          <Text style={styles.sosHint}>{t.sosHint}</Text>
          <View style={styles.sosOuter}>
            <Animated.View style={[styles.sosPulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
            <Pressable
              style={styles.sosButton}
              onPress={handleSOS}
              android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 85 }}
            >
              <Text style={styles.sosLabel}>{t.sosLabel}</Text>
              <Text style={styles.sosSubLabel}>{t.sosSubLabel}</Text>
            </Pressable>
          </View>
          <Text style={styles.typeHint}>
            {selectedType ? `${t.sosSelectedPrefix}${getTypeLabel(selectedType)}` : t.sosSelectType}
          </Text>
        </View>

        {/* ── Emergency Type Grid ── */}
        <Text style={styles.sectionLabel}>{t.sosSectionLabel}</Text>
        <View style={styles.grid}>
          {EMERGENCY_TYPES.map((item) => {
            const isSelected = selectedType === item.type;
            const label = getTypeLabel(item.type);
            return (
              <Pressable
                key={item.type}
                style={[
                  styles.typeCard,
                  { backgroundColor: isSelected ? `${item.color}22` : colors.card, borderColor: isSelected ? item.color : colors.border },
                  isSelected && styles.typeCardSelected,
                ]}
                onPress={() => { setSelectedType(item.type); Haptics.selectionAsync(); }}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${item.color}22` }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={[styles.typeCardLabel, { color: isSelected ? item.color : colors.foreground }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Voice SOS Button ── */}
        <Pressable style={styles.voiceBtn} onPress={handleVoiceSOSOpen}>
          <MaterialCommunityIcons name="microphone" size={20} color="#64b5f6" />
          <Text style={styles.voiceBtnText}>{t.sosVoiceBtn}</Text>
        </Pressable>

      </ScrollView>

      {/* ── SOS Modal ── */}
      <Modal visible={sosActive} transparent animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            {!alertSent ? (
              <>
                <View style={styles.countdownCircle}>
                  {gettingLocation ? (
                    <ActivityIndicator color={colors.primary} size="large" />
                  ) : (
                    <Text style={styles.countdownNum}>{countdown}</Text>
                  )}
                </View>
                <Text style={styles.countdownLabel}>
                  {gettingLocation ? t.sosGettingLocation : t.sosCountdownLabel}
                </Text>
                <Text style={styles.countdownSub}>
                  {gettingLocation ? t.sosCapturingGPS : t.sosCountdownSub(countdown)}
                </Text>
                {!gettingLocation && (
                  <Pressable style={styles.cancelBtn} onPress={handleCancel}>
                    <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <View style={styles.sentHeader}>
                  <View style={styles.sentIcon}>
                    <MaterialCommunityIcons name="check-circle" size={32} color="#00e676" />
                  </View>
                  <Text style={styles.sentTitle}>{t.sosSentTitle}</Text>
                  <Text style={styles.sentSub}>
                    {t.sosSentSub(selectedType ? getTypeLabel(selectedType) : "")}
                  </Text>
                </View>
                <View style={styles.contactsRow}>
                  {FAKE_CONTACTS.map((c) => (
                    <View key={c} style={styles.contactChip}>
                      <Text style={styles.contactChipText}>{c} notified</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.instructionsTitle}>{t.sosWhatToDo}</Text>
                {selectedInfo?.instructions.map((inst, i) => (
                  <View key={i} style={styles.instructionRow}>
                    <View style={styles.bullet}><Text style={styles.bulletText}>{i + 1}</Text></View>
                    <Text style={styles.instructionText}>{inst}</Text>
                  </View>
                ))}
                <Pressable style={styles.closeBtn} onPress={handleClose}>
                  <Text style={styles.closeBtnText}>{t.done}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Voice SOS Modal ── */}
      <Modal visible={voiceModalVisible} transparent animationType="fade" onRequestClose={() => { handleStopListening(); setVoiceModalVisible(false); }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: insets.bottom + 28, borderTopWidth: 1, borderColor: "rgba(100,181,246,0.3)", alignItems: "center" }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 24 }} />

            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 }}>
              {t.sosVoiceBtn}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 28, textAlign: "center" }}>
              {"Say: \"Help\", \"SOS\", \"Emergency\" or \"Save me\""}
            </Text>

            {/* Mic icon with pulse */}
            <Animated.View style={{ transform: [{ scale: voiceListening ? voicePulse : new Animated.Value(1) }], marginBottom: 20 }}>
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: voiceListening ? "rgba(100,181,246,0.15)" : "rgba(255,255,255,0.05)", borderWidth: 2, borderColor: voiceListening ? "#64b5f6" : colors.border, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons
                  name={voiceListening ? "microphone" : "microphone-outline"}
                  size={40}
                  color={voiceListening ? "#64b5f6" : colors.mutedForeground}
                />
              </View>
            </Animated.View>

            {/* Status text */}
            {voiceListening && (
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#64b5f6", marginBottom: 8 }}>
                {t.sosVoiceListening}
              </Text>
            )}
            {voiceTranscript ? (
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, marginBottom: 8, textAlign: "center", fontStyle: "italic" }}>
                "{voiceTranscript}"
              </Text>
            ) : null}
            {voiceResultMsg ? (
              <View style={{ backgroundColor: "rgba(100,181,246,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(100,181,246,0.2)", padding: 12, marginBottom: 12, width: "100%" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#64b5f6", textAlign: "center" }}>
                  {voiceResultMsg}
                </Text>
              </View>
            ) : null}

            {/* Buttons */}
            {!voiceListening ? (
              <>
                <Pressable
                  style={{ backgroundColor: "#64b5f6", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12, width: "100%", alignItems: "center" }}
                  onPress={handleStartListening}
                >
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" }}>
                    {voiceResultMsg ? "Try Again" : "Start Listening"}
                  </Text>
                </Pressable>
                <Pressable
                  style={{ backgroundColor: colors.secondary, borderRadius: 14, paddingVertical: 14, width: "100%", alignItems: "center" }}
                  onPress={() => { setVoiceModalVisible(false); setVoiceResultMsg(""); setVoiceTranscript(""); }}
                >
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{t.close}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={{ backgroundColor: "rgba(232,0,58,0.15)", borderRadius: 14, paddingVertical: 14, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "rgba(232,0,58,0.4)" }}
                onPress={handleStopListening}
              >
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }}>{t.sosVoiceStop}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
