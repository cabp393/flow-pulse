import type { ReactNode } from 'react';

const iconMap: Record<string, ReactNode> = {
  pencil: <><path d="M12 20h9" /><path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  rename: <><path d="M4 20h4l10-10-4-4L4 16z" /><path d="m13 7 4 4" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
  chart: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V8" /></>,
  split: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14" /></>,
  play: <path d="m8 5 12 7-12 7z" />,
};

export function InlineIconButton({ icon, title, onClick, disabled }: { icon: keyof typeof iconMap; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="icon-btn" title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        {iconMap[icon]}
      </svg>
    </button>
  );
}
