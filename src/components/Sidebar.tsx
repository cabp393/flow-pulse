interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

const iconPaths: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-10h8V3h-8v8Z',
  runs: 'M4 19h16M7 16V8m5 8V5m5 11v-6',
  compare: 'M4 6h7M4 12h7m-7 6h7M13 6h7m-7 6h7m-7 6h7',
  player: 'M8 5v14l11-7L8 5Z',
  assets: 'M3 7h18M6 7V5h12v2m-1 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4-.9-.5a7.6 7.6 0 0 0-.3-1l.6-.8-1.4-1.4-.8.6c-.3-.1-.7-.2-1-.3L16 7h-2l-.5-.9a7.6 7.6 0 0 0-1 .3l-.8-.6-1.4 1.4.6.8c-.1.3-.2.7-.3 1L8 12v2l.9.5c.1.3.2.7.3 1l-.6.8 1.4 1.4.8-.6c.3.1.7.2 1 .3l.5.9h2l.5-.9c.3-.1.7-.2 1-.3l.8.6 1.4-1.4-.6-.8c.1-.3.2-.7.3-1l.9-.5v-2Z',
};

function SidebarIcon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[id] ?? iconPaths.dashboard} />
    </svg>
  );
}

export function Sidebar({ items, activeItem, onNavigate }: { items: SidebarItem[]; activeItem: string; onNavigate: (id: string) => void }) {
  return (
    <aside className="app-sidebar">
      <div>
        <button className="sidebar-brand" onClick={() => onNavigate('dashboard')}>FlowPulse</button>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <SidebarIcon id={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <button
        className={`sidebar-link sidebar-settings ${activeItem === 'settings' ? 'active' : ''}`}
        onClick={() => onNavigate('settings')}
      >
        <SidebarIcon id="settings" />
        <span>Settings</span>
      </button>
    </aside>
  );
}
