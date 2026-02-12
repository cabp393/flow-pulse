import { useEffect, useState } from 'react';
import { createLayout } from './models/defaults';
import type { AppState, Layout } from './models/domain';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { PalletImportPage } from './pages/PalletImportPage';
import { ResultsPage } from './pages/ResultsPage';
import { SkuMasterPage } from './pages/SkuMasterPage';
import { clearState, loadState, saveState } from './storage/localRepo';

const tabs = ['home', 'layout', 'sku', 'pallets', 'results'] as const;
type Tab = (typeof tabs)[number];

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>('home');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setLayout = (layout: Layout) => setState((s) => ({ ...s, layout }));

  return (
    <div className="app">
      <header>
        <h1>flowpulse</h1>
        <nav>
          {tabs.map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'home' && (
        <div className="page">
          <h2>Proyecto</h2>
          <p>Proyecto único flowpulse (frontend + localStorage).</p>
          <div className="toolbar">
            <button onClick={() => setLayout(createLayout())}>Nuevo layout</button>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'flowpulse-export.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Exportar JSON
            </button>
            <label className="file-btn">
              Cargar JSON
              <input
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const json = JSON.parse(await f.text()) as AppState;
                  setState(json);
                }}
              />
            </label>
            <button
              onClick={() => {
                clearState();
                setState(loadState());
              }}
            >
              Reset localStorage
            </button>
          </div>
        </div>
      )}

      {tab === 'layout' && <LayoutEditorPage layout={state.layout} setLayout={setLayout} />}
      {tab === 'sku' && <SkuMasterPage layout={state.layout} skuMap={state.skuMap} setSkuMap={(skuMap) => setState((s) => ({ ...s, skuMap }))} />}
      {tab === 'pallets' && (
        <PalletImportPage layout={state.layout} skuMap={state.skuMap} onRun={(lastRun) => setState((s) => ({ ...s, lastRun }))} />
      )}
      {tab === 'results' && <ResultsPage layout={state.layout} run={state.lastRun} />}
    </div>
  );
}
