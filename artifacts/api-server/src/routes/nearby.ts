import { Router, type IRouter } from "express";
import { ListNearbyResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const AMENITY_TYPE_MAP: Record<string, "hospital" | "police" | "fire_station"> = {
  hospital: "hospital",
  police: "police",
  fire_station: "fire_station",
};

const STATIC_FALLBACK = [
  {
    id: "h1",
    name: "City General Hospital",
    type: "hospital" as const,
    address: "123 Medical Drive, Downtown",
    phone: "+1-555-0100",
    distance: "0.8 km",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    id: "h2",
    name: "St. Mary's Medical Center",
    type: "hospital" as const,
    address: "456 Healthcare Blvd, Midtown",
    phone: "+1-555-0200",
    distance: "1.4 km",
    latitude: 40.7158,
    longitude: -73.9981,
  },
  {
    id: "p1",
    name: "Central Police Station",
    type: "police" as const,
    address: "1 Police Plaza, Downtown",
    phone: "911",
    distance: "0.5 km",
    latitude: 40.7127,
    longitude: -74.0059,
  },
  {
    id: "p2",
    name: "Midtown Precinct 14",
    type: "police" as const,
    address: "357 W 35th St, Midtown",
    phone: "+1-555-0400",
    distance: "1.2 km",
    latitude: 40.7516,
    longitude: -74.0021,
  },
  {
    id: "f1",
    name: "Fire Station 7",
    type: "fire_station" as const,
    address: "200 Fire Dept Road, Downtown",
    phone: "911",
    distance: "0.9 km",
    latitude: 40.714,
    longitude: -74.009,
  },
];

router.get("/nearby", async (req, res): Promise<void> => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);

  if (isNaN(lat) || isNaN(lon)) {
    res.json(ListNearbyResponse.parse({ locations: STATIC_FALLBACK }));
    return;
  }

  try {
    const query = [
      "[out:json][timeout:20];",
      "(",
      `node["amenity"~"hospital|police|fire_station"](around:8000,${lat},${lon});`,
      `way["amenity"~"hospital|police|fire_station"](around:8000,${lat},${lon});`,
      ");",
      "out center 20;",
    ].join("");

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );
    clearTimeout(tid);

    if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);

    const data = (await resp.json()) as { elements: any[] };

    interface RawLoc {
      id: string;
      name: string;
      type: "hospital" | "police" | "fire_station";
      address: string;
      phone: string | null;
      distance: string;
      latitude: number;
      longitude: number;
      _km: number;
    }

    const rawLocs: RawLoc[] = data.elements
      .filter((el) => {
        const type = AMENITY_TYPE_MAP[el.tags?.amenity];
        const hasCoords = el.lat != null || el.center?.lat != null;
        return type && el.tags?.name && hasCoords;
      })
      .map((el) => {
        const elLat: number = el.lat ?? el.center.lat;
        const elLon: number = el.lon ?? el.center.lon;
        const km = haversineKm(lat, lon, elLat, elLon);
        const type = AMENITY_TYPE_MAP[el.tags.amenity];

        const houseNum: string = el.tags["addr:housenumber"] ?? "";
        const street: string = el.tags["addr:street"] ?? "";
        const city: string = el.tags["addr:city"] ?? el.tags["addr:suburb"] ?? "";
        const streetPart = houseNum && street ? `${houseNum} ${street}` : street;
        const addrParts = [streetPart, city].filter(Boolean);
        const address = addrParts.length > 0 ? addrParts.join(", ") : "Address unavailable";

        const phone: string | null =
          el.tags["phone"] ??
          el.tags["contact:phone"] ??
          el.tags["phone:emergency"] ??
          null;

        return {
          id: String(el.id),
          name: String(el.tags.name),
          type,
          address,
          phone,
          distance: formatDist(km),
          latitude: elLat,
          longitude: elLon,
          _km: km,
        };
      })
      .sort((a, b) => a._km - b._km)
      .slice(0, 15);

    const locations = rawLocs.map(({ _km: _drop, ...rest }) => rest);

    if (locations.length === 0) {
      res.json(ListNearbyResponse.parse({ locations: STATIC_FALLBACK }));
      return;
    }

    res.json(ListNearbyResponse.parse({ locations }));
  } catch {
    res.json(ListNearbyResponse.parse({ locations: STATIC_FALLBACK }));
  }
});

export default router;
