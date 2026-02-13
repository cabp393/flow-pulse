import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { PalletImportPage } from './PalletImportPage';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  skuMasters: SkuMaster[];
  activeSkuMasterId?: string;
  runs: RunResult[];
  onCreateRun: (run: RunResult) => void;
  onSelectLayout: (layoutId: string) => void;
  onGoToLayouts: () => void;
  onGoToSkuMasters: () => void;
  onGoToResults: () => void;
  onGoToEditor: () => void;
  onClearOldRuns: () => void;
  onResetStorage: () => void;
}

const formatStorageSize = (payload: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

interface SavedSectionProps {
  title: string;
  countLabel: string;
  size: string;
  items: string[];
  emptyText: string;
  actions: Array<{ label: string; onClick: () => void }>;
}

function SavedSection({ title, countLabel, size, items, emptyText, actions }: SavedSectionProps) {
  return (
    <section className="page home-section">
      <div className="home-section-header">
        <h3>{title}</h3>
        <span>{countLabel} ({size})</span>
      </div>
      {items.length ? (
        <ul className="home-saved-list">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
      <div className="toolbar">
        {actions.map((action) => (
          <button key={action.label} onClick={action.onClick}>{action.label}</button>
        ))}
      </div>
    </section>
  );
}

export function HomePage({
  layouts,
  activeLayoutId,
  skuMasters,
  activeSkuMasterId,
  runs,
  onCreateRun,
  onSelectLayout,
  onGoToLayouts,
  onGoToSkuMasters,
  onGoToResults,
  onGoToEditor,
  onClearOldRuns,
  onResetStorage,
}: Props) {
  return (
    <div className="home-grid">
      <section className="home-section">
        <PalletImportPage
          layouts={layouts}
          activeLayoutId={activeLayoutId}
          masters={skuMasters}
          activeSkuMasterId={activeSkuMasterId}
          onGeneratedRun={onCreateRun}
          onSelectLayout={onSelectLayout}
        />
      </section>

      <SavedSection
        title="Layouts guardados"
        countLabel={`${layouts.length} layouts`}
        size={formatStorageSize(layouts)}
        items={layouts.slice(0, 5).map((layout) => layout.name)}
        emptyText="Todavía no hay layouts guardados."
        actions={[
          { label: 'Gestionar layouts', onClick: onGoToLayouts },
          { label: 'Editar layout activo', onClick: onGoToEditor },
        ]}
      />

      <SavedSection
        title="SKU Masters guardados"
        countLabel={`${skuMasters.length} masters`}
        size={formatStorageSize(skuMasters)}
        items={skuMasters.slice(0, 5).map((master) => master.name)}
        emptyText="Todavía no hay SKU masters guardados."
        actions={[
          { label: 'Gestionar SKU masters', onClick: onGoToSkuMasters },
        ]}
      />

      <SavedSection
        title="Runs guardados"
        countLabel={`${runs.length} runs`}
        size={formatStorageSize(runs)}
        items={runs.slice(0, 5).map((run) => run.name)}
        emptyText="Todavía no hay runs guardados."
        actions={[
          { label: 'Ver resultados', onClick: onGoToResults },
          { label: 'Limpiar runs antiguos', onClick: onClearOldRuns },
          { label: 'Reset localStorage', onClick: onResetStorage },
        ]}
      />
    </div>
  );
}
