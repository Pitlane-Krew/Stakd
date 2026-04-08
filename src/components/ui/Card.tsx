import { cn } from "@/lib/utils";

type Elevation = "flat" | "raised" | "floating";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  elevation?: Elevation;
  glow?: boolean;
  gradient?: boolean;
}

const elevations: Record<Elevation, string> = {
  flat: "shadow-depth-1",
  raised: "shadow-depth-2",
  floating: "shadow-depth-3",
};

export default function Card({
  children,
  className,
  onClick,
  hover = false,
  elevation = "flat",
  glow = false,
  gradient = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]",
        elevations[elevation],
        hover && "cursor-pointer hover-lift card-interactive",
        glow && "rare-glow",
        gradient && "gradient-border",
        className
      )}
    >
      {children}
    </div>
  );
}
