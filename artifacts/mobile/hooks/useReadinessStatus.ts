import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { useEffect, useState } from "react";

const MEDICAL_ID_CACHE_KEY = "nexora_medical_id_v1";

export interface ReadinessStatus {
  gpsGranted: boolean | null;
  internetConnected: boolean | null;
  batteryLevel: number | null;
  batteryCharging: boolean;
  batteryLow: boolean;
  offlineMedicalIdReady: boolean;
  loading: boolean;
}

export function useReadinessStatus(): ReadinessStatus {
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [internetConnected, setInternetConnected] = useState<boolean | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [offlineMedicalIdReady, setOfflineMedicalIdReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let batteryLevelSub: Battery.Subscription | null = null;
    let batteryStateSub: Battery.Subscription | null = null;

    async function init() {
      try {
        // GPS permission check
        const { status } = await Location.getForegroundPermissionsAsync();
        if (mounted) setGpsGranted(status === "granted");

        // Network state
        const net = await Network.getNetworkStateAsync();
        if (mounted) setInternetConnected(net.isInternetReachable ?? net.isConnected ?? false);

        // Battery
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        if (mounted) {
          setBatteryLevel(level);
          setBatteryCharging(
            state === Battery.BatteryState.CHARGING ||
              state === Battery.BatteryState.FULL
          );
        }

        // Offline medical ID
        const raw = await AsyncStorage.getItem(MEDICAL_ID_CACHE_KEY);
        if (mounted) setOfflineMedicalIdReady(raw !== null);
      } catch {
        // silently degrade — status stays null
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    // Subscribe to battery changes
    try {
      batteryLevelSub = Battery.addBatteryLevelListener(({ batteryLevel: lvl }) => {
        if (mounted) setBatteryLevel(lvl);
      });
      batteryStateSub = Battery.addBatteryStateListener(({ batteryState }) => {
        if (mounted)
          setBatteryCharging(
            batteryState === Battery.BatteryState.CHARGING ||
              batteryState === Battery.BatteryState.FULL
          );
      });
    } catch {
      // Battery listeners not available on web/simulator — OK
    }

    // Poll network every 10s
    const netPoll = setInterval(async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (mounted) setInternetConnected(net.isInternetReachable ?? net.isConnected ?? false);
      } catch {}
    }, 10000);

    return () => {
      mounted = false;
      batteryLevelSub?.remove();
      batteryStateSub?.remove();
      clearInterval(netPoll);
    };
  }, []);

  return {
    gpsGranted,
    internetConnected,
    batteryLevel,
    batteryCharging,
    batteryLow: batteryLevel !== null && batteryLevel < 0.2 && !batteryCharging,
    offlineMedicalIdReady,
    loading,
  };
}
