import type { MapProvider } from "./types";
import { mapboxProvider } from "./mapbox";

// Switch providers by changing NEXT_PUBLIC_MAP_PROVIDER env var
const providers: Record<string, MapProvider> = {
  mapbox: mapboxProvider,
  // google: googleProvider, // Future implementation
};

const providerName = process.env.NEXT_PUBLIC_MAP_PROVIDER || "mapbox";

export const maps: MapProvider = providers[providerName] ?? mapboxProvider;

export type { LatLng, Waypoint, OptimizedRoute, Directions, MapProvider } from "./types";
