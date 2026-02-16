interface ActionItem {
  id: string;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
}

export function AppTopbar({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  actions?: ActionItem[];
}) {
  return (
    <header className="app-topbar">
      <div>
        {breadcrumb && <p className="app-breadcrumb">{breadcrumb}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="app-subtitle">{subtitle}</p>}
      </div>
      {!!actions?.length && (
        <div className="app-topbar-actions">
          {actions.map((action) => (
            <button key={action.id} className={`topbar-action ${action.tone ?? 'default'}`} onClick={action.onClick}>{action.label}</button>
          ))}
        </div>
      )}
    </header>
  );
}
