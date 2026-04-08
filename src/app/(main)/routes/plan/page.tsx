"use client";

import { useState } from "react";
import { Route, Plus, Trash2, Navigation, GripVertical, Save, AlertCircle, Loader } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import MapView from "@/components/map/MapView";
import RouteExport from "@/components/routes/RouteExport";
import { MAX_ROUTE_STOPS } from "@/config/constants";

interface Stop {
  id: string;
  address: string;
  name: string;
  lat?: number;
  lng?: number;
  geocoding?: boolean;
  geocodeError?: boolean;
}

interface RouteStats {
  distance: string;
  duration: string;
}

export default function RoutePlannerPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newName, setNewName] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);

  const addStop = async () => {
    if (!newAddress.trim() || stops.length >= MAX_ROUTE_STOPS) return;
    const id = Date.now().toString();
    const stop: Stop = {
      id,
      address: newAddress.trim(),
      name: newName.trim() || newAddress.trim(),
      geocoding: true,
    };
    setStops(prev => [...prev, stop]);
    setNewAddress("");
    setNewName("");

    // Geocode the address
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress.trim() }),
      });
      if (res.ok) {
        const { lat, lng } = await res.json();
        setStops(prev => prev.map(s => s.id === id ? { ...s, lat, lng, geocoding: false } : s));
      } else {
        setStops(prev => prev.map(s => s.id === id ? { ...s, geocoding: false, geocodeError: true } : s));
      }
    } catch {
      setStops(prev => prev.map(s => s.id === id ? { ...s, geocoding: false, geocodeError: true } : s));
    }
  };

  const removeStop = (id: string) => {
    setStops(stops.filter((s) => s.id !== id));
    if (stops.length <= 2) setRouteStats(null);
  };

  const optimizeRoute = async () => {
    const geocodedStops = stops.filter(s => s.lat && s.lng);
    if (geocodedStops.length < 2) return;
    setOptimizing(true);
    try {
      const first = geocodedStops[0];
      const res = await fetch("/api/routes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: first.lat, lng: first.lng },
          waypoints: geocodedStops.map(s => ({
            name: s.name,
            address: s.address,
            coords: { lat: s.lat!, lng: s.lng! },
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.optimizedOrder) {
          const reordered = data.optimizedOrder.map(
            (idx: number) => geocodedStops[idx]
          );
          setStops(reordered);
        }
        if (data.totalDistanceMeters && data.totalDurationSeconds) {
          setRouteStats({
            distance: `${(data.totalDistanceMeters / 1609.34).toFixed(1)} mi`,
            duration: `~${Math.round(data.totalDurationSeconds / 60)} min`,
          });
        }
      }
    } catch (err) {
      console.error("Optimize failed:", err);
    } finally {
      setOptimizing(false);
    }
  };

  const mapMarkers = stops
    .filter((s) => s.lat && s.lng)
    .map((s, i) => ({
      id: s.id,
      lat: s.lat!,
      lng: s.lng!,
      label: `${i + 1}. ${s.name}`,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 lg:gap-0 h-[calc(100vh-64px)] lg:h-auto">
      {/* Left panel */}
      <div className="space-y-5 p-6 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Route className="w-5 h-5 text-[var(--color-accent)]" />
            Route Planner
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Optimize your multi-stop collection run
          </p>
        </div>

        {/* Stats bar */}
        {routeStats && (
          <Card className="p-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Stops</p>
                <p className="text-lg font-bold">{stops.length}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Distance
                </p>
                <p className="text-lg font-bold">{routeStats.distance}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Time</p>
                <p className="text-lg font-bold">{routeStats.duration}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Add stop */}
        <Card className="p-4 space-y-3">
          <Input
            id="name"
            label="Stop Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Target on Main St"
          />
          <Input
            id="address"
            label="Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="123 Main St, City, State"
          />
          <Button
            size="sm"
            onClick={addStop}
            disabled={
              !newAddress.trim() || stops.length >= MAX_ROUTE_STOPS
            }
          >
            <Plus className="w-4 h-4" /> Add Stop ({stops.length}/
            {MAX_ROUTE_STOPS})
          </Button>
        </Card>

        {/* Stops list */}
        {stops.length > 0 && (
          <div className="space-y-2">
            {stops.map((stop, i) => (
              <Card
                key={stop.id}
                className={`p-3 flex items-center justify-between ${
                  stop.geocodeError ? "border border-red-500/50 bg-red-500/5" : ""
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-4 h-4 text-[var(--color-text-muted)] cursor-grab" />
                  <span className="w-7 h-7 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{stop.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {stop.address}
                    </p>
                    {stop.geocoding && (
                      <p className="text-xs text-[var(--color-accent)] mt-1 flex items-center gap-1">
                        <Loader className="w-3 h-3 animate-spin" /> Geocoding...
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stop.geocodeError && (
                    <div title="Failed to geocode address">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                  {!stop.geocoding && stop.lat && stop.lng && (
                    <div className="w-2 h-2 rounded-full bg-green-500" title="Address geocoded" />
                  )}
                  <button
                    onClick={() => removeStop(stop.id)}
                    className="p-1 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={optimizeRoute}
                loading={optimizing}
                disabled={stops.filter(s => s.lat && s.lng).length < 2}
                className="flex-1"
              >
                <Navigation className="w-4 h-4" /> Optimize
              </Button>
              <Button variant="secondary" disabled={stops.length < 2}>
                <Save className="w-4 h-4" /> Save
              </Button>
            </div>

            {/* Export / Download / Print */}
            {routeStats && (
              <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                <p className="text-[11px] text-[var(--color-text-muted)] mb-2">
                  Download for offline use
                </p>
                <RouteExport stops={stops} routeStats={routeStats} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map area */}
      <div className="h-[400px] lg:h-[calc(100vh-64px)]">
        {stops.length > 0 && mapMarkers.length > 0 ? (
          <MapView
            markers={mapMarkers}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-elevated)] rounded-xl lg:rounded-none">
            <p className="text-sm text-[var(--color-text-muted)]">
              {stops.length > 0
                ? "Geocoding stops..."
                : "Add stops to see your route"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
