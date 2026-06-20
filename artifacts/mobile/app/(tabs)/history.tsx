import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getListEmergenciesQueryKey,
  useListEmergencies,
  useUpdateEmergencyStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  accident: { icon: "car-emergency", color: "#ff6b35", label: "Accident" },
  fire: { icon: "fire", color: "#ff4500", label: "Fire" },
  heart_attack: { icon: "heart-pulse", color: "#e8003a", label: "Heart Attack" },
  theft: { icon: "shield-alert", color: "#9c27b0", label: "Theft / Harassment" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAbsolute(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useListEmergencies();
  const emergencies = data?.emergencies ?? [];

  const { mutate: updateStatus } = useUpdateEmergencyStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmergenciesQueryKey() });
        setResolvingId(null);
      },
      onError: () => {
        setResolvingId(null);
      },
    },
  });

  const handleImSafe = async (id: number) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResolvingId(id);
    updateStatus({ id, data: { status: "resolved" } });
  };

  const handleViewOnMap = async (lat: number, lon: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getListEmergenciesQueryKey() });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    countBadge: {
      backgroundColor: colors.glassTint,
      alignSelf: "flex-start",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 8,
    },
    countText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === "web" ? 120 : 100,
      gap: 10,
    },
    card: {
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
    },
    cardTop: {
      flexDirection: "row",
      gap: 14,
      alignItems: "flex-start",
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cardContent: { flex: 1 },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 4,
    },
    typeLabel: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    timeRow: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
      marginBottom: 3,
    },
    timeText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    locRow: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
      marginBottom: 3,
    },
    locText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      flex: 1,
    },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    safeBtn: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      backgroundColor: "rgba(0,230,118,0.12)",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(0,230,118,0.3)",
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    safeBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "#00e676",
    },
    mapBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    mapBtnText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      paddingHorizontal: 32,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alert History</Text>
        <Text style={styles.subtitle}>All your emergency alerts</Text>
        {emergencies.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{emergencies.length} alert{emergencies.length !== 1 ? "s" : ""}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : emergencies.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="shield" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>No Alerts Yet</Text>
          <Text style={styles.emptyText}>
            Your emergency alerts will appear here once you trigger SOS
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {emergencies.map((alert) => {
            const cfg = TYPE_CONFIG[alert.type] ?? { icon: "alert", color: colors.primary, label: alert.type };
            const isActive = alert.status === "active";
            const isResolving = resolvingId === alert.id;
            const hasCoords = alert.latitude != null && alert.longitude != null;

            return (
              <View key={alert.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: `${cfg.color}22` }]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={24} color={cfg.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.typeLabel}>{cfg.label}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isActive
                              ? "rgba(232,0,58,0.15)"
                              : "rgba(0,230,118,0.1)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: isActive ? colors.primary : "#00e676" },
                          ]}
                        >
                          {isActive ? "● Active" : "✓ Resolved"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeRow}>
                      <Feather name="clock" size={11} color={colors.mutedForeground} />
                      <Text style={styles.timeText}>
                        Sent {formatDate(String(alert.createdAt))} · {formatAbsolute(String(alert.createdAt))}
                      </Text>
                    </View>

                    {!isActive && alert.resolvedAt && (
                      <View style={styles.timeRow}>
                        <Feather name="check-circle" size={11} color="#00e676" />
                        <Text style={[styles.timeText, { color: "#00e676" }]}>
                          Resolved {formatDate(String(alert.resolvedAt))} · {formatAbsolute(String(alert.resolvedAt))}
                        </Text>
                      </View>
                    )}

                    {hasCoords ? (
                      <View style={styles.locRow}>
                        <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                        <Text style={styles.locText} numberOfLines={1}>
                          {alert.address
                            ? alert.address
                            : `${alert.latitude!.toFixed(5)}, ${alert.longitude!.toFixed(5)}`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.locRow}>
                        <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                        <Text style={styles.locText}>Location unavailable</Text>
                      </View>
                    )}
                  </View>
                </View>

                {(isActive || hasCoords) && (
                  <View style={styles.cardActions}>
                    {isActive && (
                      <Pressable
                        style={[styles.safeBtn, isResolving && { opacity: 0.6 }]}
                        onPress={() => !isResolving && handleImSafe(alert.id)}
                        disabled={isResolving}
                      >
                        {isResolving ? (
                          <ActivityIndicator size="small" color="#00e676" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="shield-check" size={16} color="#00e676" />
                            <Text style={styles.safeBtnText}>I'm Safe</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                    {hasCoords && (
                      <Pressable
                        style={[styles.mapBtn, !isActive && { flex: 1 }]}
                        onPress={() => handleViewOnMap(alert.latitude!, alert.longitude!)}
                      >
                        <Feather name="map" size={14} color={colors.mutedForeground} />
                        <Text style={styles.mapBtnText}>View on Map</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
