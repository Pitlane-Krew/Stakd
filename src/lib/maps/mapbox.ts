import type { MapProvider, LatLng, Waypoint, OptimizedRoute, Directions } from "./types";

const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BASE = "https://api.mapbox.com";

export const mapboxProvider: MapProvider = {
  name: "mapbox",

  async optimizeRoute(origin: LatLng, waypoints: Waypoint[]): Promise<OptimizedRoute> {
    const coords = [
      `${origin.lng},${origin.lat}`,
      ...waypoints.map((w) => `${w.coords.lng},${w.coords.lat}`),
      `${origin.lng},${origin.lat}`, // return to origin
    ].join(";");

    const res = await fetch(
      `${BASE}/optimized-trips/v1/mapbox/driving/${coords}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&roundtrip=false&source=first&destination=last`
    );

    if (!res.ok) throw new Error(`Mapbox optimization failed: ${res.statusText}`);
    const data = await res.json();

    if (!data.trips?.length) throw new Error("No optimized route found");

    const trip = data.trips[0];
    return {
      waypoints: data.waypoints.map((wp: { name: string; location: number[] }, i: number) => ({
        coords: { lat: wp.location[1], lng: wp.location[0] },
        name: waypoints[i]?.name ?? wp.name,
      })),
      optimizedOrder: data.waypoints.map((wp: { waypoint_index: number }) => wp.waypoint_index),
      totalDistanceMeters: Math.round(trip.distance),
      totalDurationSeconds: Math.round(trip.duration),
      geometry: trip.geometry,
    };
  },

  async getDirections(origin: LatLng, destination: LatLng): Promise<Directions> {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const res = await fetch(
      `${BASE}/directions/v5/mapbox/driving/${coords}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true`
    );

    if (!res.ok) throw new Error(`Mapbox directions failed: ${res.statusText}`);
    const data = await res.json();
    const route = data.routes[0];

    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      geometry: route.geometry,
      steps: route.legs[0].steps.map((s: { maneuver: { instruction: string }; distance: number }) => ({
        instruction: s.maneuver.instruction,
        distanceMeters: Math.round(s.distance),
      })),
    };
  },

  async geocode(address: string): Promise<LatLng> {
    const res = await fetch(
      `${BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );
    const data = await res.json();
    if (!data.features?.length) throw new Error("No results found");
    const [lng, lat] = data.features[0].center;
    return { lat, lng };
  },

  async reverseGeocode(coords: LatLng): Promise<string> {
    const res = await fetch(
      `${BASE}/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );
    const data = await res.json();
    return data.features?.[0]?.place_name ?? "Unknown location";
  },
};
