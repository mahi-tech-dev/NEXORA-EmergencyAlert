import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
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
import { getListNearbyQueryKey, useListNearby } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

type FilterType = "all" | "hospital" | "police" | "fire_station";

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  hospital: { icon: "hospital-box", color: "#00bcd4", label: "Hospital" },
  police: { icon: "shield-star", color: "#1565c0", label: "Police" },
  fire_station: { icon: "fire-truck", color: "#ff6d00", label: "Fire Station" },
};

export default function NearbyScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocLoading(true);
      setLocError(false);
      try {
        if (Platform.OS !== "web") {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted" && !cancelled) {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (!cancelled) {
              setUserLat(pos.coords.latitude);
              setUserLon(pos.coords.longitude);
            }
          } else if (!cancelled) {
            setLocError(true);
          }
        } else {
          await new Promise<void>((resolve) => {
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                if (!cancelled) {
                  setUserLat(pos.coords.latitude);
                  setUserLon(pos.coords.longitude);
                }
                resolve();
              },
              () => {
                if (!cancelled) setLocError(true);
                resolve();
              },
              { timeout: 8000 }
            );
          });
        }
      } catch {
        if (!cancelled) setLocError(true);
      } finally {
        if (!cancelled) setLocLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const nearbyParams =
    userLat != null && userLon != null
      ? { latitude: userLat, longitude: userLon }
      : undefined;

  const { data, isLoading: apiLoading, isFetching } = useListNearby(nearbyParams);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getListNearbyQueryKey(nearbyParams) });
  };

  const locations = data?.locations ?? [];
  const filtered = filter === "all" ? locations : locations.filter((l) => l.type === filter);

  const isLoading = locLoading || apiLoading;

  const openMaps = async (lat: number, lon: number, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const label = encodeURIComponent(name);
    const url = Platform.OS === "ios"
      ? `maps:0,0?q=${label}@${lat},${lon}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`);
    }
  };

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
    locBanner: {
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    locBannerText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      flex: 1,
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
        <Text style={styles.title}>{t.nearbyTitle}</Text>
        <Text style={styles.subtitle}>Hospitals, police, and fire stations near you</Text>
      </View>

      {locError && (
        <View style={[styles.locBanner, { backgroundColor: "rgba(232,0,58,0.08)", borderColor: "rgba(232,0,58,0.25)" }]}>
          <Feather name="alert-circle" size={14} color={colors.primary} />
          <Text style={[styles.locBannerText, { color: colors.mutedForeground }]}>
            Location unavailable — showing default results
          </Text>
        </View>
      )}

      {userLat != null && !locError && (
        <View style={[styles.locBanner, { backgroundColor: "rgba(0,230,118,0.07)", borderColor: "rgba(0,230,118,0.2)" }]}>
          <Feather name="navigation" size={14} color="#00e676" />
          <Text style={[styles.locBannerText, { color: colors.mutedForeground }]}>
            Showing results near your location
          </Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {(["all", "hospital", "police", "fire_station"] as FilterType[]).map((f) => {
          const isActive = filter === f;
          const label = f === "all" ? t.nearbyAll : f === "hospital" ? t.nearbyHospitals : f === "police" ? t.nearbyPolice : t.nearbyFire;
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
          <Text style={[styles.emptyText, { marginTop: 12 }]}>
            {locLoading ? t.loading : t.nearbyLoading}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !apiLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={[styles.center, { paddingTop: 60 }]}>
              <MaterialCommunityIcons name="map-search-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>{t.nearbyNoResults}</Text>
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
                    {loc.phone ? (
                      <Pressable
                        style={styles.callBtn}
                        onPress={() => callPhone(loc.phone!)}
                      >
                        <Feather name="phone" size={15} color="#fff" />
                        <Text style={styles.callBtnText}>{loc.phone}</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.callBtn, { opacity: 0.4 }]}>
                        <Feather name="phone" size={15} color="#fff" />
                        <Text style={styles.callBtnText}>No number listed</Text>
                      </View>
                    )}
                    {loc.latitude != null && loc.longitude != null && (
                      <Pressable
                        style={styles.dirBtn}
                        onPress={() => openMaps(loc.latitude!, loc.longitude!, loc.name)}
                      >
                        <Feather name="navigation" size={18} color={colors.mutedForeground} />
                      </Pressable>
                    )}
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
