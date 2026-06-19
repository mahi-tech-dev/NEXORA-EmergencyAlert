import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListNearby } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type FilterType = "all" | "hospital" | "police" | "fire_station";

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  hospital: { icon: "hospital-box", color: "#00bcd4", label: "Hospital" },
  police: { icon: "shield-star", color: "#1565c0", label: "Police" },
  fire_station: { icon: "fire-truck", color: "#ff6d00", label: "Fire Station" },
};

export default function NearbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isLoading, refetch } = useListNearby();

  const locations = data?.locations ?? [];
  const filtered = filter === "all" ? locations : locations.filter((l) => l.type === filter);

  const callPhone = async (phone: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `tel:${phone}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 12,
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
    filterRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    filterChipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
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
      gap: 12,
      alignItems: "flex-start",
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cardInfo: { flex: 1 },
    cardName: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 2,
    },
    typeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginBottom: 6,
    },
    typeBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    addressRow: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
      marginBottom: 2,
    },
    addressText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      flex: 1,
    },
    distanceBadge: {
      backgroundColor: "rgba(232,0,58,0.12)",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    distanceText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    callBtn: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    callBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    dirBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 12,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Help</Text>
        <Text style={styles.subtitle}>Hospitals, police, and fire stations near you</Text>
      </View>

      <View style={styles.filterRow}>
        {(["all", "hospital", "police", "fire_station"] as FilterType[]).map((f) => {
          const isActive = filter === f;
          const label = f === "all" ? "All" : TYPE_CONFIG[f].label;
          const color = f === "all" ? colors.primary : TYPE_CONFIG[f].color;
          return (
            <Pressable
              key={f}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? `${color}22` : colors.card,
                  borderColor: isActive ? color : colors.border,
                },
              ]}
              onPress={() => {
                setFilter(f);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.filterChipText, { color: isActive ? color : colors.mutedForeground }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={undefined}
        >
          {filtered.length === 0 ? (
            <View style={[styles.center, { paddingTop: 60 }]}>
              <MaterialCommunityIcons name="map-search-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No locations found</Text>
            </View>
          ) : (
            filtered.map((loc) => {
              const cfg = TYPE_CONFIG[loc.type] ?? { icon: "map-marker", color: colors.primary, label: loc.type };
              return (
                <View key={loc.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: `${cfg.color}22` }]}>
                      <MaterialCommunityIcons name={cfg.icon as any} size={26} color={cfg.color} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{loc.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: `${cfg.color}18` }]}>
                        <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <View style={styles.addressRow}>
                        <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                        <Text style={styles.addressText}>{loc.address}</Text>
                      </View>
                    </View>
                    {loc.distance && (
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>{loc.distance}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.callBtn}
                      onPress={() => loc.phone && callPhone(loc.phone)}
                    >
                      <Feather name="phone" size={15} color="#fff" />
                      <Text style={styles.callBtnText}>{loc.phone ?? "Call"}</Text>
                    </Pressable>
                    <Pressable style={styles.dirBtn}>
                      <Feather name="navigation" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
