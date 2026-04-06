import { NextRequest, NextResponse } from "next/server";
import { maps } from "@/lib/maps";
import type { LatLng, Waypoint } from "@/lib/maps/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, waypoints } = body as {
      origin: LatLng;
      waypoints: Waypoint[];
    };

    if (!origin || !waypoints?.length) {
      return NextResponse.json({ error: "Missing origin or waypoints" }, { status: 400 });
    }

    if (waypoints.length > 12) {
      return NextResponse.json({ error: "Maximum 12 waypoints allowed" }, { status: 400 });
    }

    const result = await maps.optimizeRoute(origin, waypoints);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Route optimization failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Optimization failed" },
      { status: 500 }
    );
  }
}
