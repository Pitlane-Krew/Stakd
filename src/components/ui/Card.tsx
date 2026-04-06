import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className, onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] card-shadow",
        hover && "cursor-pointer hover:border-[var(--color-accent)] hover:card-shadow-lg card-interactive",
        className
      )}
    >
      {children}
    </div>
  );
}
