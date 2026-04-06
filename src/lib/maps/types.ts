export interface LatLng {
  lat: number;
  lng: number;
}

export interface Waypoint {
  coords: LatLng;
  name: string;
  address?: string;
}

export interface OptimizedRoute {
  waypoints: Waypoint[];
  optimizedOrder: number[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  geometry: unknown; // Provider-specific polyline/geometry
}

export interface Directions {
  distanceMeters: number;
  durationSeconds: number;
  geometry: unknown;
  steps: { instruction: string; distanceMeters: number }[];
}

export interface MapProvider {
  name: string;
  optimizeRoute(origin: LatLng, waypoints: Waypoint[]): Promise<OptimizedRoute>;
  getDirections(origin: LatLng, destination: LatLng): Promise<Directions>;
  geocode(address: string): Promise<LatLng>;
  reverseGeocode(coords: LatLng): Promise<string>;
}
