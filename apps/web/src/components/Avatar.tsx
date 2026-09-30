interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  grayscale?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Avatar({ name, src, className = '', grayscale = false }: AvatarProps) {
  const base = `relative rounded-full object-cover bg-surface-container-high flex items-center justify-center overflow-hidden ${className}`;
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${base} ${grayscale ? 'grayscale opacity-60' : ''}`}
      />
    );
  }
  return (
    <div className={`${base} ${grayscale ? 'opacity-60' : ''}`}>
      <span className="font-display font-semibold text-on-surface-variant">
        {initials(name)}
      </span>
    </div>
  );
}
