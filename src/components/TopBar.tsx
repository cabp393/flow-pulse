interface TabLink {
  id: string;
  label: string;
}

export function TopBar({ tab, tabs, onNavigate }: { tab: string; tabs: TabLink[]; onNavigate: (tab: string) => void }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate('home')}>flowpulse</button>
      <nav className="topbar-links">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>{item.label}</button>
        ))}
      </nav>
    </header>
  );
}
