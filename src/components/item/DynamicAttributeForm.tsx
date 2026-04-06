"use client";

import { getGroupedFields, type CategoryField } from "@/config/category-registry";

interface Props {
  categoryId: string;
  attributes: Record<string, unknown>;
  onChange: (attributes: Record<string, unknown>) => void;
}

/**
 * Renders category-specific fields dynamically based on the category registry.
 * No hardcoded category logic — everything is driven by the registry definition.
 */
export default function DynamicAttributeForm({ categoryId, attributes, onChange }: Props) {
  const grouped = getGroupedFields(categoryId);

  if (Object.keys(grouped).length === 0) return null;

  const updateField = (key: string, value: unknown) => {
    onChange({ ...attributes, [key]: value });
  };

  const groupLabels: Record<string, string> = {
    details: "Details",
    grading: "Grading",
    condition: "Condition",
    other: "Other",
  };

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([group, fields]) => (
        <div key={group} className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
            {groupLabels[group] || group}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={attributes[field.key]}
                onChange={(v) => updateField(field.key, v)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Individual field renderer ───

interface FieldRendererProps {
  field: CategoryField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const baseInputClass =
    "w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-text-muted)]";

  switch (field.type) {
    case "text":
      return (
        <div className={field.required ? "col-span-2 sm:col-span-1" : ""}>
          <label className="text-sm text-[var(--color-text-muted)] mb-1 block">
            {field.label}
            {field.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
          </label>
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClass}
          />
        </div>
      );

    case "number":
      return (
        <div>
          <label className="text-sm text-[var(--color-text-muted)] mb-1 block">{field.label}</label>
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        </div>
      );

    case "year":
      return (
        <div>
          <label className="text-sm text-[var(--color-text-muted)] mb-1 block">{field.label}</label>
          <input
            type="number"
            min={1900}
            max={2099}
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder || "2024"}
            className={baseInputClass}
          />
        </div>
      );

    case "select":
      return (
        <div>
          <label className="text-sm text-[var(--color-text-muted)] mb-1 block">
            {field.label}
            {field.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
          </label>
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            required={field.required}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2 col-span-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer py-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-[var(--color-border)] accent-[var(--color-accent)]"
            />
            {field.label}
          </label>
        </div>
      );

    default:
      return null;
  }
}
