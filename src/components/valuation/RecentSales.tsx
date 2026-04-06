"use client";

import type { PriceHistory } from "@/types/database";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface Props {
  sales: PriceHistory[];
}

export default function RecentSales({ sales }: Props) {
  if (sales.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--color-bg-surface)] p-6">
        <h3 className="text-sm font-semibold mb-4">Recent Sales</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          No recent sales data
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--color-bg-surface)] p-6">
      <h3 className="text-sm font-semibold mb-4">Recent Sales</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
              <th className="text-left pb-2 font-medium">Date</th>
              <th className="text-left pb-2 font-medium">Source</th>
              <th className="text-left pb-2 font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 10).map((sale) => (
              <tr
                key={sale.id}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <td className="py-2.5 text-[var(--color-text-secondary)]">
                  {sale.sale_date
                    ? new Date(sale.sale_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : formatRelativeTime(sale.fetched_at)}
                </td>
                <td className="py-2.5">
                  {sale.listing_url ? (
                    <a
                      href={sale.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      {sale.source}
                    </a>
                  ) : (
                    sale.source
                  )}
                </td>
                <td className="py-2.5 font-semibold text-[var(--color-success)]">
                  {formatCurrency(sale.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
