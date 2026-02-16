import { useState } from 'react';

interface TabLink {
  id: string;
  label: string;
}

export function TopBar({
  tab,
  tabs,
  onNavigate,
  theme,
  onToggleTheme,
}: {
  tab: string;
  tabs: TabLink[];
  onNavigate: (tab: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (nextTab: string) => {
    onNavigate(nextTab);
    setMenuOpen(false);
  };

  return (
    <header className="topbar">
      <button className="brand" aria-label="Ir al inicio" onClick={() => handleNavigate('home')}>FlowPulse</button>
      <button
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        ☰
      </button>
      <nav className={`topbar-links ${menuOpen ? 'open' : ''}`} aria-label="Navegación principal">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => handleNavigate(item.id)}>{item.label}</button>
        ))}
      </nav>
      <div className="topbar-right">
        <button
          className="theme-toggle"
          type="button"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Modo oscuro activo' : 'Modo claro activo'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
