import { NextRequest, NextResponse } from "next/server";
import {
  getPriceAlerts,
  createPriceAlert,
  togglePriceAlert,
  deletePriceAlert,
} from "@/services/alerts";

/** GET /api/alerts/price?userId=xxx */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const alerts = await getPriceAlerts(userId);
  return NextResponse.json({ alerts });
}

/** POST /api/alerts/price — create a new price alert */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, item_id, item_title, category, target_price, direction, current_price } = body;

    if (!userId || !item_title || !target_price || !direction) {
      return NextResponse.json(
        { error: "userId, item_title, target_price, and direction required" },
        { status: 400 }
      );
    }

    const alert = await createPriceAlert(userId, {
      item_id,
      item_title,
      category,
      target_price,
      direction,
      current_price,
    });

    return NextResponse.json({ alert });
  } catch (err) {
    console.error("Create price alert error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/alerts/price — toggle active */
export async function PATCH(request: NextRequest) {
  try {
    const { alertId, active } = await request.json();
    if (!alertId) {
      return NextResponse.json({ error: "alertId required" }, { status: 400 });
    }
    await togglePriceAlert(alertId, active);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/alerts/price — remove alert */
export async function DELETE(request: NextRequest) {
  try {
    const { alertId } = await request.json();
    if (!alertId) {
      return NextResponse.json({ error: "alertId required" }, { status: 400 });
    }
    await deletePriceAlert(alertId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
