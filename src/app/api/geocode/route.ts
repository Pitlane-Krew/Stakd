import { NextRequest, NextResponse } from "next/server";
import { maps } from "@/lib/maps";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }
    const coords = await maps.geocode(address);
    return NextResponse.json(coords);
  } catch (error) {
    console.error("Geocode failed:", error);
    return NextResponse.json(
      { error: "Could not geocode address" },
      { status: 500 }
    );
  }
}
