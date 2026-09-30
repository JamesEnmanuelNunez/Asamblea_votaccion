import { CancelDisc, CheckDisc, ChevronRight, type Icon } from './icons';

export type VoteTone = 'aye' | 'nay';

interface VoteTileProps {
  tone: VoteTone;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
}

/*
 * Recrea el botón de voto del diseño Stitch "Assembly Precision":
 * relleno plano y sólido, borde claro, luz interior superior y un
 * resplandor de color en la base. Sin degradados.
 */
const TONES: Record<
  VoteTone,
  {
    base: string;
    hover: string;
    ring: string;
    selectedShadow: string;
    Icon: Icon;
  }
> = {
  aye: {
    base: 'bg-secondary-container text-[#004d33] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_34px_-18px_rgba(0,108,73,0.7)]',
    hover:
      'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_24px_44px_-18px_rgba(0,108,73,0.85)]',
    ring: 'focus-visible:ring-secondary/30',
    selectedShadow: 'shadow-[0_0_0_2px_#006c49,inset_0_1px_0_rgba(255,255,255,0.7)]',
    Icon: CheckDisc,
  },
  nay: {
    base: 'bg-error-container text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_34px_-18px_rgba(186,26,26,0.6)]',
    hover:
      'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_24px_44px_-18px_rgba(186,26,26,0.8)]',
    ring: 'focus-visible:ring-error/30',
    selectedShadow: 'shadow-[0_0_0_2px_#ba1a1a,inset_0_1px_0_rgba(255,255,255,0.7)]',
    Icon: CancelDisc,
  },
};

export default function VoteTile({
  tone,
  label,
  onClick,
  disabled = false,
  selected = false,
}: VoteTileProps) {
  const t = TONES[tone];
  const { Icon } = t;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'vote-tile group relative flex h-28 w-full items-center justify-between rounded-2xl border border-white/50 px-6 text-left',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed disabled:opacity-60',
        t.base,
        t.hover,
        t.ring,
        selected ? t.selectedShadow : '',
      ].join(' ')}
    >
      <span className="flex items-center gap-4">
        <Icon className="h-10 w-10 shrink-0" />
        <span className="font-display text-2xl font-bold tracking-tight">{label}</span>
      </span>
      <ChevronRight className="vote-tile__arrow h-7 w-7 opacity-50" />
    </button>
  );
}
