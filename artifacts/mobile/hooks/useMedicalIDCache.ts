import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const CACHE_KEY = "nexora_medical_id_v1";

export interface CachedMedicalID {
  profile: Record<string, any> | null;
  contacts: any[];
  userName: string;
  savedAt: number;
}

export function useMedicalIDCache() {
  const [cache, setCache] = useState<CachedMedicalID | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setCache(JSON.parse(raw) as CachedMedicalID);
          } catch {}
        }
      })
      .finally(() => setCacheLoaded(true));
  }, []);

  const saveCache = async (data: CachedMedicalID) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setCache(data);
    } catch {}
  };

  return { cache, cacheLoaded, saveCache };
}
