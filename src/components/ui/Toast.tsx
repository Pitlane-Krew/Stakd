"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
}

const ToastContainer = ({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

function Toast({ message, variant = "info", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const variants: Record<ToastVariant, { bg: string; icon: React.ElementType; iconColor: string }> = {
    success: {
      bg: "bg-[var(--color-success-subtle)]",
      icon: CheckCircle,
      iconColor: "text-[var(--color-success)]",
    },
    error: {
      bg: "bg-[var(--color-danger-subtle)]",
      icon: AlertCircle,
      iconColor: "text-[var(--color-danger)]",
    },
    info: {
      bg: "bg-[var(--color-info-subtle)]",
      icon: Info,
      iconColor: "text-[var(--color-info)]",
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border)]",
        "shadow-lg pointer-events-auto",
        config.bg
      )}
      style={{ animation: "slideIn 0.3s ease-out" }}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
      <div className="flex-1">
        <p className="text-sm text-[var(--color-text)]">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Global toast state manager
let toastState: ToastMessage[] = [];
let listeners: ((toasts: ToastMessage[]) => void)[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener(toastState));
}

export function showToast(message: string, variant: ToastVariant = "info", duration = 5000) {
  const id = `${Date.now()}-${Math.random()}`;
  const toast: ToastMessage = { id, message, variant, duration };

  toastState = [...toastState, toast];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id: string) {
  toastState = toastState.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastMessage[]) => setToasts(newToasts);
    listeners.push(listener);
    setToasts(toastState);

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return {
    success: (message: string, duration?: number) => showToast(message, "success", duration),
    error: (message: string, duration?: number) => showToast(message, "error", duration),
    info: (message: string, duration?: number) => showToast(message, "info", duration),
    remove: removeToast,
    render: () => <ToastContainer toasts={toasts} onRemove={removeToast} />,
  };
}
