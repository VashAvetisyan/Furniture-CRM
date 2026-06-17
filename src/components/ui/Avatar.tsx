type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-sm',
};

interface AvatarProps {
  color: string;
  initials: string;
  size?: AvatarSize;
  showOnlineIndicator?: boolean;
}

export default function Avatar({ color, initials, size = 'md', showOnlineIndicator = false }: AvatarProps) {
  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-white`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {showOnlineIndicator && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-white" />
      )}
    </div>
  );
}
