import type { ComponentType } from 'react';
import {
  Camera,
  Check,
  ChevronRight as LucideChevronRight,
  Circle,
  Hourglass as LucideHourglass,
  Settings,
  ThumbsDown as LucideThumbsDown,
  ThumbsUp as LucideThumbsUp,
  X,
} from 'lucide-react';

/** Tipo común para cualquier icono del set (lucide o compuesto). */
export type Icon = ComponentType<{ className?: string }>;

/* --- Reexportes directos de lucide-react ------------------------------- */
export const CheckMark = Check as Icon;
export const CloseMark = X as Icon;
export const ChevronRight = LucideChevronRight as Icon;
export const Hourglass = LucideHourglass as Icon;
export const ThumbUp = LucideThumbsUp as Icon;
export const ThumbDown = LucideThumbsDown as Icon;
export const Gear = Settings as Icon;
export const PhotoCamera = Camera as Icon;

/* --- Discos rellenos (composición de lucide) -------------------------- */
/* Conservan el aspecto del diseño Stitch: disco sólido con el glifo
   recortado en blanco. Se arman con `Circle` + `Check`/`X` de lucide. */

export function CheckDisc({ className = '' }: { className?: string }) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden="true">
      <Circle className="h-full w-full" fill="currentColor" strokeWidth={0} />
      <Check className="absolute inset-0 m-auto h-[52%] w-[52%] text-white" strokeWidth={3.5} />
    </span>
  );
}

export function CancelDisc({ className = '' }: { className?: string }) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden="true">
      <Circle className="h-full w-full" fill="currentColor" strokeWidth={0} />
      <X className="absolute inset-0 m-auto h-[52%] w-[52%] text-white" strokeWidth={3.5} />
    </span>
  );
}
