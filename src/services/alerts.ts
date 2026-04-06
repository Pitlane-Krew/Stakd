import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------
// Restock Alert Types
// ---------------------------------------------------------------
export interface AlertPreference {
  id: string;
  user_id: string;
  category: string | null;
  keyword: string | null;
  radius_miles: number;
  enabled: boolean;
  created_at: string;
}

// ---------------------------------------------------------------
// Price Alert Types
// ---------------------------------------------------------------
export interface PriceAlert {
  id: string;
  user_id: string;
  item_id: string | null;
  item_title: string;
  category: string | null;
  target_price: number;
  direction: "above" | "below";
  current_price: number | null;
  triggered: boolean;
  triggered_at: string | null;
  active: boolean;
  created_at: string;
}

export interface CreatePriceAlertInput {
  item_id?: string;
  item_title: string;
  category?: string;
  target_price: number;
  direction: "above" | "below";
  current_price?: number;
}

// ===============================================================
// RESTOCK ALERT PREFERENCES
// ===============================================================

export async function getAlertPreferences(
  userId: string
): Promise<AlertPreference[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restock_alert_prefs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AlertPreference[];
}

export async function createAlertPreference(input: {
  user_id: string;
  category?: string;
  keyword?: string;
  radius_miles?: number;
}): Promise<AlertPreference> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restock_alert_prefs")
    .insert({
      user_id: input.user_id,
      category: input.category ?? null,
      keyword: input.keyword ?? null,
      radius_miles: input.radius_miles ?? 25,
      enabled: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AlertPreference;
}

export async function toggleAlertPreference(
  id: string,
  enabled: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("restock_alert_prefs")
    .update({ enabled })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteAlertPreference(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("restock_alert_prefs")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function findMatchingAlerts(restock: {
  category?: string | null;
  item_found: string;
  store_name: string;
}): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restock_alert_prefs")
    .select("user_id, category, keyword")
    .eq("enabled", true);

  if (error || !data) return [];

  const matchedUserIds = new Set<string>();

  for (const pref of data) {
    if (pref.category && restock.category && pref.category === restock.category) {
      matchedUserIds.add(pref.user_id);
      continue;
    }
    if (pref.keyword) {
      const kw = pref.keyword.toLowerCase();
      const haystack = `${restock.item_found} ${restock.store_name}`.toLowerCase();
      if (haystack.includes(kw)) {
        matchedUserIds.add(pref.user_id);
      }
    }
  }

  return Array.from(matchedUserIds);
}

// ===============================================================
// PRICE ALERTS
// ===============================================================

export async function getPriceAlerts(userId: string): Promise<PriceAlert[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch price alerts:", error);
    return [];
  }
  return (data ?? []) as PriceAlert[];
}

export async function createPriceAlert(
  userId: string,
  input: CreatePriceAlertInput
): Promise<PriceAlert | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: userId,
      item_id: input.item_id ?? null,
      item_title: input.item_title,
      category: input.category ?? null,
      target_price: input.target_price,
      direction: input.direction,
      current_price: input.current_price ?? null,
      triggered: false,
      active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create price alert:", error);
    return null;
  }
  return data as PriceAlert;
}

export async function deletePriceAlert(alertId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", alertId);
  return !error;
}

export async function togglePriceAlert(
  alertId: string,
  active: boolean
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("price_alerts")
    .update({ active })
    .eq("id", alertId);
  return !error;
}

/**
 * Check if any active price alerts should fire for a given item + new price.
 * Called server-side after valuation API updates a price.
 * Returns triggered alerts (also creates notifications for those users).
 */
export async function checkPriceAlerts(
  itemId: string,
  newPrice: number
): Promise<PriceAlert[]> {
  const supabase = createClient();

  const { data: alerts } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("item_id", itemId)
    .eq("active", true)
    .eq("triggered", false);

  if (!alerts?.length) return [];

  const triggered: PriceAlert[] = [];

  for (const alert of alerts) {
    const shouldTrigger =
      (alert.direction === "below" && newPrice <= alert.target_price) ||
      (alert.direction === "above" && newPrice >= alert.target_price);

    if (shouldTrigger) {
      // Mark as triggered
      await supabase
        .from("price_alerts")
        .update({
          triggered: true,
          triggered_at: new Date().toISOString(),
          current_price: newPrice,
        })
        .eq("id", alert.id);

      // Create notification for the user
      await supabase.from("notifications").insert({
        user_id: alert.user_id,
        type: "price_alert",
        title: `Price Alert: ${alert.item_title}`,
        body: `${alert.item_title} is now $${newPrice.toLocaleString()} (target: ${alert.direction} $${alert.target_price.toLocaleString()})`,
        entity_id: alert.item_id,
        entity_type: "item",
      });

      triggered.push({ ...alert, triggered: true, current_price: newPrice });
    } else {
      // Just update the current price tracking
      await supabase
        .from("price_alerts")
        .update({ current_price: newPrice })
        .eq("id", alert.id);
    }
  }

  return triggered;
}
