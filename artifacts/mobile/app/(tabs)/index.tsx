import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
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
  getListEmergenciesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type EmergencyType = "accident" | "fire" | "heart_attack" | "theft";

interface EmergencyInfo {
  type: EmergencyType;
  label: string;
  icon: string;
  color: string;
  instructions: string[];
}

const EMERGENCY_TYPES: EmergencyInfo[] = [
  {
    type: "accident",
    label: "Accident",
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
    label: "Fire",
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
    label: "Heart Attack",
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
    label: "Theft / Harassment",
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
const SAFE_CHECKIN_DELAY_MS = 15 * 60 * 1000; // 15 minutes

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [alertSent, setAlertSent] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safeCheckInRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAlertIdRef = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  const { mutate: updateEmergencyStatus } = useUpdateEmergencyStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmergenciesQueryKey() });
      },
    },
  });

  const { mutate: createEmergency } = useCreateEmergency({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListEmergenciesQueryKey() });
        if (data?.id) {
          lastAlertIdRef.current = data.id;
          // Safe check-in after 15 minutes
          if (safeCheckInRef.current) clearTimeout(safeCheckInRef.current);
          safeCheckInRef.current = setTimeout(() => {
            Alert.alert(
              "Are you safe?",
              "It has been 15 minutes since your emergency alert. Please confirm your status.",
              [
                {
                  text: "NEED HELP",
                  style: "destructive",
                  onPress: () => {
                    // keep active — do nothing
                  },
                },
                {
                  text: "YES, I'M SAFE",
                  onPress: () => {
                    if (lastAlertIdRef.current !== null) {
                      updateEmergencyStatus({
                        id: lastAlertIdRef.current,
                        data: { status: "resolved" },
                      });
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (safeCheckInRef.current) clearTimeout(safeCheckInRef.current);
    };
  }, []);

  const handleSOS = async () => {
    if (!selectedType) {
      Alert.alert("Select Emergency Type", "Please select the type of emergency before triggering SOS.");
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

        try {
          if (Platform.OS !== "web") {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              latitude = loc.coords.latitude;
              longitude = loc.coords.longitude;
            }
          } else {
            await new Promise<void>((resolve) => {
              navigator.geolocation?.getCurrentPosition(
                (pos) => {
                  latitude = pos.coords.latitude;
                  longitude = pos.coords.longitude;
                  resolve();
                },
                () => resolve(),
                { timeout: 5000 }
              );
            });
          }
        } catch {}

        createEmergency({
          data: {
            type: selectedType,
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
          },
        });

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

  const selectedInfo = EMERGENCY_TYPES.find((e) => e.type === selectedType);

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
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: "rgba(255,145,0,0.12)",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(255,145,0,0.35)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    testBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: "#ff9100" },
    scrollContent: { paddingHorizontal: 20, paddingBottom: Platform.OS === "web" ? 120 : 100 },
    sosSection: { alignItems: "center", marginVertical: 28 },
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
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name ?? "Responder"}</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Test Mode Banner */}
      <View style={styles.testBanner}>
        <MaterialCommunityIcons name="alert-rhombus" size={16} color="#ff9100" />
        <Text style={styles.testBannerText}>⚠ TEST MODE — No real emergency services are contacted.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sosSection}>
          <Text style={styles.sosHint}>Emergency SOS</Text>
          <View style={styles.sosOuter}>
            <Animated.View style={[styles.sosPulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
            <Pressable
              style={styles.sosButton}
              onPress={handleSOS}
              android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 85 }}
            >
              <Text style={styles.sosLabel}>SOS</Text>
              <Text style={styles.sosSubLabel}>PRESS & HOLD</Text>
            </Pressable>
          </View>
          <Text style={styles.typeHint}>
            {selectedType ? `Emergency: ${selectedInfo?.label}` : "Select an emergency type below"}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Emergency Type</Text>
        <View style={styles.grid}>
          {EMERGENCY_TYPES.map((item) => {
            const isSelected = selectedType === item.type;
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
                <Text style={[styles.typeCardLabel, { color: isSelected ? item.color : colors.foreground }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={sosActive} transparent animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            {!alertSent ? (
              <>
                <View style={styles.countdownCircle}>
                  <Text style={styles.countdownNum}>{countdown}</Text>
                </View>
                <Text style={styles.countdownLabel}>Sending Emergency Alert</Text>
                <Text style={styles.countdownSub}>
                  Alerting emergency services and your contacts in {countdown} second{countdown !== 1 ? "s" : ""}
                </Text>
                <Pressable style={styles.cancelBtn} onPress={handleCancel}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.sentHeader}>
                  <View style={styles.sentIcon}>
                    <MaterialCommunityIcons name="check-circle" size={32} color="#00e676" />
                  </View>
                  <Text style={styles.sentTitle}>Alert Sent</Text>
                  <Text style={styles.sentSub}>
                    {selectedInfo?.label} emergency reported. Help is on the way.
                  </Text>
                </View>

                <View style={styles.contactsRow}>
                  {FAKE_CONTACTS.map((c) => (
                    <View key={c} style={styles.contactChip}>
                      <Text style={styles.contactChipText}>{c} notified</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.instructionsTitle}>What to do now</Text>
                {selectedInfo?.instructions.map((inst, i) => (
                  <View key={i} style={styles.instructionRow}>
                    <View style={styles.bullet}>
                      <Text style={styles.bulletText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{inst}</Text>
                  </View>
                ))}

                <Pressable style={styles.closeBtn} onPress={handleClose}>
                  <Text style={styles.closeBtnText}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
