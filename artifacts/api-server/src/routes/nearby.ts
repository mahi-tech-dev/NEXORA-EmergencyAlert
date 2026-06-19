import { Router, type IRouter } from "express";
import { ListNearbyResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const NEARBY_LOCATIONS = [
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
    id: "h3",
    name: "Riverside Trauma Center",
    type: "hospital" as const,
    address: "789 River Road, Westside",
    phone: "+1-555-0300",
    distance: "2.1 km",
    latitude: 40.7084,
    longitude: -74.0134,
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
  {
    id: "f2",
    name: "North Fire Company 12",
    type: "fire_station" as const,
    address: "88 Rescue Avenue, Northside",
    phone: "+1-555-0500",
    distance: "1.7 km",
    latitude: 40.7195,
    longitude: -73.9947,
  },
];

router.get("/nearby", async (_req, res): Promise<void> => {
  res.json(ListNearbyResponse.parse({ locations: NEARBY_LOCATIONS }));
});

export default router;
