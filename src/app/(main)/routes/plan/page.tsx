"use client";

import { useState } from "react";
import { Route, Plus, Trash2, Navigation, GripVertical, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import MapView from "@/components/map/MapView";
import { MAX_ROUTE_STOPS } from "@/config/constants";

interface Stop {
  id: string;
  address: string;
  name: string;
  lat?: number;
  lng?: number;
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

  const addStop = () => {
    if (!newAddress.trim() || stops.length >= MAX_ROUTE_STOPS) return;
    setStops([
      ...stops,
      {
        id: Date.now().toString(),
        address: newAddress.trim(),
        name: newName.trim() || newAddress.trim(),
      },
    ]);
    setNewAddress("");
    setNewName("");
  };

  const removeStop = (id: string) => {
    setStops(stops.filter((s) => s.id !== id));
    if (stops.length <= 2) setRouteStats(null);
  };

  const optimizeRoute = async () => {
    if (stops.length < 2) return;
    setOptimizing(true);
    try {
      // First geocode all addresses to get coordinates
      const geocodeRes = await fetch("/api/routes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: 0, lng: 0 }, // Will be overridden by first stop
          waypoints: stops.map((s) => ({
            name: s.name,
            address: s.address,
            coords: { lat: s.lat ?? 0, lng: s.lng ?? 0 },
          })),
        }),
      });

      if (geocodeRes.ok) {
        const data = await geocodeRes.json();
        if (data.optimizedOrder) {
          const reordered = data.optimizedOrder.map(
            (idx: number) => stops[idx]
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
                className="p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-[var(--color-text-muted)] cursor-grab" />
                  <span className="w-7 h-7 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{stop.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {stop.address}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeStop(stop.id)}
                  className="p-1 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={optimizeRoute}
                loading={optimizing}
                disabled={stops.length < 2}
                className="flex-1"
              >
                <Navigation className="w-4 h-4" /> Optimize
              </Button>
              <Button variant="secondary" disabled={stops.length < 2}>
                <Save className="w-4 h-4" /> Save
              </Button>
            </div>
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
