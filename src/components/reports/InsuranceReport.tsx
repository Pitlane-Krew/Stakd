"use client";

import { useState } from "react";
import {
  Shield,
  Download,
  Loader2,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface ReportData {
  generatedAt: string;
  owner: { name: string };
  collection: {
    name: string;
    category: string;
    itemCount: number;
    totalEstimatedValue: number;
    totalPurchasePrice: number;
    roi: number | null;
    gradedItemCount: number;
    conditionBreakdown: Record<string, number>;
  };
  topItems: Array<{
    id: string;
    title: string;
    condition: string;
    gradeValue: string | null;
    gradingCompany: string | null;
    estimatedValue: number | null;
    purchasePrice: number | null;
    imageUrl: string | null;
  }>;
  allItems: Array<{
    id: string;
    title: string;
    category: string;
    condition: string;
    estimatedValue: number | null;
    purchasePrice: number | null;
  }>;
}

interface Props {
  collectionId: string;
  collectionName: string;
}

export default function InsuranceReport({
  collectionId,
  collectionName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/insurance?collectionId=${collectionId}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setReport(data);
      }
    } catch {
      setError("Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!report) return;
    const headers = [
      "Title",
      "Category",
      "Condition",
      "Grade",
      "Estimated Value",
      "Purchase Price",
    ];
    const rows = report.allItems.map((item) => [
      `"${item.title.replace(/"/g, '""')}"`,
      item.category,
      item.condition,
      "",
      item.estimatedValue ?? "",
      item.purchasePrice ?? "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.replace(/\s+/g, "_")}_insurance_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  if (!report) {
    return (
      <Card className="p-6 text-center space-y-4">
        <Shield className="w-12 h-12 text-[var(--color-accent)] mx-auto" />
        <div>
          <h3 className="text-lg font-semibold">Insurance Report</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Generate an itemized valuation report for insurance documentation
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button onClick={generateReport} loading={loading}>
          <FileText className="w-4 h-4" />
          Generate Report
        </Button>
      </Card>
    );
  }

  const { collection: col } = report;

  return (
    <div className="space-y-6 print:text-black" id="insurance-report">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-[var(--color-accent)]" />
          Insurance Report
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={downloadCSV}>
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={printReport}>
            <FileText className="w-4 h-4" /> Print
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Collection Insurance Report</h1>
        <p className="text-sm text-gray-500">
          Generated {new Date(report.generatedAt).toLocaleDateString()} · Owner:{" "}
          {report.owner.name}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-xs text-[var(--color-text-muted)]">Total Value</p>
          <p className="text-lg font-bold">
            ${col.totalEstimatedValue.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <Package className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xs text-[var(--color-text-muted)]">Items</p>
          <p className="text-lg font-bold">{col.itemCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-xs text-[var(--color-text-muted)]">ROI</p>
          <p className="text-lg font-bold">
            {col.roi != null ? `${col.roi >= 0 ? "+" : ""}${col.roi.toFixed(1)}%` : "—"}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <Shield className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xs text-[var(--color-text-muted)]">Graded</p>
          <p className="text-lg font-bold">{col.gradedItemCount}</p>
        </Card>
      </div>

      {/* Top items */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide">
          Top Items by Value
        </h3>
        <div className="space-y-2">
          {report.topItems.map((item, i) => (
            <Card key={item.id} className="p-3 flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--color-text-muted)] w-6 text-center">
                {i + 1}
              </span>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {item.condition}
                  {item.gradingCompany && item.gradeValue && (
                    <> · {item.gradingCompany} {item.gradeValue}</>
                  )}
                </p>
              </div>
              <span className="text-sm font-semibold text-[var(--color-success)] flex-shrink-0">
                ${(item.estimatedValue ?? 0).toLocaleString()}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* Full itemized table */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-muted)] uppercase tracking-wide">
          Full Itemized List ({col.itemCount} items)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium">Condition</th>
                <th className="pb-2 font-medium text-right">Value</th>
                <th className="pb-2 font-medium text-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {report.allItems.map((item, i) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)]/50"
                >
                  <td className="py-2 text-[var(--color-text-muted)]">
                    {i + 1}
                  </td>
                  <td className="py-2 font-medium truncate max-w-[200px]">
                    {item.title}
                  </td>
                  <td className="py-2 capitalize text-[var(--color-text-muted)]">
                    {item.condition}
                  </td>
                  <td className="py-2 text-right text-[var(--color-success)]">
                    {item.estimatedValue
                      ? `$${item.estimatedValue.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="py-2 text-right text-[var(--color-text-muted)]">
                    {item.purchasePrice
                      ? `$${item.purchasePrice.toLocaleString()}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t-2 border-[var(--color-border)]">
                <td colSpan={3} className="py-2">
                  Total
                </td>
                <td className="py-2 text-right text-[var(--color-success)]">
                  ${col.totalEstimatedValue.toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  ${col.totalPurchasePrice.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-3">
        This report is generated for informational purposes only. Estimated
        values are based on recent market data and AI analysis. For official
        insurance documentation, consult a certified appraiser. Report generated
        by STAKD on {new Date(report.generatedAt).toLocaleDateString()}.
      </p>
    </div>
  );
}
