import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              "w-full px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm",
              "focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] focus:outline-none",
              "transition-all duration-150",
              "placeholder:text-[var(--color-text-muted)]",
              icon && "pl-10",
              error && "border-[var(--color-danger)] focus:ring-[var(--color-danger-subtle)]",
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
