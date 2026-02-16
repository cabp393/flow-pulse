interface TabLink {
  id: string;
  label: string;
}

export function TopBar({
  tab,
  tabs,
  onNavigate,
  storageStatus,
}: {
  tab: string;
  tabs: TabLink[];
  onNavigate: (tab: string) => void;
  storageStatus?: string;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate('home')}>flowpulse</button>
      <nav className="topbar-links">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>{item.label}</button>
        ))}
      </nav>
      {storageStatus && <span className="storage-pill">{storageStatus}</span>}
    </header>
  );
}
