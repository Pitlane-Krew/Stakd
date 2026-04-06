"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center"
    >
      {/* Bottom sheet on mobile, centered modal on desktop */}
      <div className="w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-t-3xl lg:rounded-2xl card-shadow-lg max-h-[85vh] flex flex-col animate-[slide-up_0.25s_ease-out]">
        {/* Mobile drag handle */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 lg:py-4 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-base lg:text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-xl hover:bg-[var(--color-bg-hover)] active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="p-5 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
