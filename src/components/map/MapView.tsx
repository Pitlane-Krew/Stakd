"use client";

import { useEffect, useRef, useState } from "react";

interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  color?: string;
}

interface Props {
  markers?: MapMarker[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  className?: string;
  onMarkerClick?: (id: string) => void;
  interactive?: boolean;
}

/**
 * Mapbox GL wrapper component.
 * Requires NEXT_PUBLIC_MAPBOX_TOKEN env var.
 * Falls back to a placeholder if the token isn't set or mapbox-gl fails to load.
 */
export default function MapView({
  markers = [],
  center = [-118.2437, 34.0522], // LA default
  zoom = 11,
  className = "",
  onMarkerClick,
  interactive = true,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError("Mapbox token not configured");
      return;
    }

    let map: unknown;

    async function initMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");

        (mapboxgl as unknown as { accessToken: string }).accessToken = token!;

        if (!mapContainer.current) return;

        map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center,
          zoom,
          interactive,
        });

        const mapInstance = map as {
          on: (event: string, cb: () => void) => void;
          addControl: (control: unknown) => void;
          remove: () => void;
        };

        mapInstance.on("load", () => {
          setLoaded(true);

          // Add markers
          markers.forEach((marker) => {
            const el = document.createElement("div");
            el.className = "stakd-map-marker";
            el.style.cssText = `
              width: 20px; height: 20px; border-radius: 50%;
              background: ${marker.color || "#4B9CD3"};
              border: 2px solid white;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            `;

            if (marker.label) {
              el.title = marker.label;
            }

            if (onMarkerClick) {
              el.addEventListener("click", () => onMarkerClick(marker.id));
            }

            new mapboxgl.Marker({ element: el })
              .setLngLat([marker.lng, marker.lat])
              .addTo(map as InstanceType<typeof mapboxgl.Map>);
          });
        });

        if (interactive) {
          mapInstance.addControl(new mapboxgl.NavigationControl());
        }

        mapRef.current = map;
      } catch (err) {
        console.error("Failed to load Mapbox:", err);
        setError("Failed to load map");
      }
    }

    initMap();

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
      }
    };
  }, []);

  // Update markers when they change (without reiniting map)
  // Full marker sync would go here for production

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--color-bg-elevated)] rounded-xl text-[var(--color-text-muted)] text-sm ${className}`}
      >
        <div className="text-center space-y-2">
          <p>🗺️ {error}</p>
          <p className="text-xs">
            Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-elevated)]">
          <div className="animate-pulse text-[var(--color-text-muted)] text-sm">
            Loading map...
          </div>
        </div>
      )}
    </div>
  );
}
