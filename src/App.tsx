import { useEffect, useMemo, useState } from 'react';
import { createLayout } from './models/defaults';
import type { AppState, Layout, PlayerPreferences } from './models/domain';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { PalletImportPage } from './pages/PalletImportPage';
import { ResultsPage } from './pages/ResultsPage';
import { SkuMasterPage } from './pages/SkuMasterPage';
import { PlayerPage } from './player/PlayerPage';
import {
  clearState,
  defaultPlayerPreferences,
  loadPlayerPreferences,
  loadState,
  savePlayerPreferences,
  saveState,
} from './storage/localRepo';

const tabs = ['home', 'layout', 'sku', 'pallets', 'results', 'player'] as const;
type Tab = (typeof tabs)[number];

const pathToTab = (pathname: string): Tab => {
  const clean = pathname.replace(/^\//, '');
  if (!clean || clean === 'home') return 'home';
  if (tabs.includes(clean as Tab)) return clean as Tab;
  return 'home';
};

const toPath = (tab: Tab): string => (tab === 'home' ? '/' : `/${tab}`);

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>(() => pathToTab(window.location.pathname));
  const [playerPrefs, setPlayerPrefs] = useState<PlayerPreferences>(() => loadPlayerPreferences());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    savePlayerPreferences(playerPrefs);
  }, [playerPrefs]);

  useEffect(() => {
    const onPop = () => setTab(pathToTab(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setLayout = (layout: Layout) => setState((s) => ({ ...s, layout }));

  const query = useMemo(() => new URLSearchParams(window.location.search), [tab]);
  const preselectedPalletId = query.get('palletId') ?? undefined;

  const navigateTab = (next: Tab) => {
    setTab(next);
    window.history.pushState({}, '', toPath(next));
  };

  return (
    <div className="app">
      <header>
        <h1>flowpulse</h1>
        <nav>
          {tabs.map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => navigateTab(t)}>
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
            <span>Usa las pestañas Layout y SKU para importar/exportar cada maestro por separado.</span>
            <button
              onClick={() => {
                clearState();
                setState(loadState());
                setPlayerPrefs(defaultPlayerPreferences());
              }}
            >
              Reset localStorage
            </button>
          </div>
        </div>
      )}

      {tab === 'layout' && <LayoutEditorPage layout={state.layout} setLayout={setLayout} />}
      {tab === 'sku' && (
        <SkuMasterPage
          layout={state.layout}
          skuMap={state.skuMap}
          setSkuMap={(skuMap) => setState((s) => ({ ...s, skuMap }))}
        />
      )}
      {tab === 'pallets' && (
        <PalletImportPage
          layout={state.layout}
          skuMap={state.skuMap}
          onRun={(lastRun) => setState((s) => ({ ...s, lastRun }))}
        />
      )}
      {tab === 'results' && (
        <ResultsPage
          layout={state.layout}
          run={state.lastRun}
          onOpenPlayer={(payload) => {
            setPlayerPrefs((prev) => ({
              ...prev,
              runId: payload.runId,
              palletIndex: payload.palletIndex,
            }));
            navigateTab('player');
            window.history.replaceState({}, '', `/player?runId=${payload.runId}&palletId=${encodeURIComponent(payload.palletId)}`);
          }}
        />
      )}
      {tab === 'player' && (
        <PlayerPage
          layout={state.layout}
          run={state.lastRun}
          savedPreferences={playerPrefs}
          onPreferencesChange={setPlayerPrefs}
          preselectedPalletId={preselectedPalletId}
        />
      )}
    </div>
  );
}
