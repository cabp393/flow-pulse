import { useMemo, useState } from 'react';
import type { Layout, PalletLine, RunResult, SkuMaster } from '../models/domain';
import { buildRun } from '../routing/runBuilder';
import { parsePalletXlsx } from '../utils/parsers';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  onGeneratedRun: (run: RunResult) => void;
  onSelectLayout: (layoutId: string) => void;
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
      <path d="M4.5 16.5c-1.5 1.26-2 4.5-2 4.5s3.24-.5 4.5-2c.71-.84.7-2.08-.02-2.8-.72-.72-1.96-.73-2.8-.02Z" />
      <path d="m12 15-3-3a36.8 36.8 0 0 1 6.55-9.58 2.12 2.12 0 0 1 3 3A36.8 36.8 0 0 1 9 12" />
      <path d="M9 12H5a2 2 0 0 0-2 2v4" />
      <path d="M12 15v4a2 2 0 0 0 2 2h4" />
      <circle cx="16.5" cy="7.5" r="1.5" />
    </svg>
  );
}

export function PalletImportPage({ layouts, activeLayoutId, masters, activeSkuMasterId, onGeneratedRun, onSelectLayout }: Props) {
  const [selectedMasterId, setSelectedMasterId] = useState<string>(activeSkuMasterId ?? '');
  const [lines, setLines] = useState<PalletLine[] | undefined>();
  const [info, setInfo] = useState('');

  const selectedMaster = useMemo(() => masters.find((master) => master.skuMasterId === selectedMasterId), [masters, selectedMasterId]);
  const selectedLayout = useMemo(() => layouts.find((layout) => layout.layoutId === activeLayoutId), [activeLayoutId, layouts]);

  return (
    <div>
      <h2>Run Builder</h2>
      <label>Layout<select value={activeLayoutId ?? ''} onChange={(e) => onSelectLayout(e.target.value)}><option value="">--</option>{layouts.map((layout) => <option key={layout.layoutId} value={layout.layoutId}>{layout.name}</option>)}</select></label>
      <label>SKU Master<select value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)}><option value="">--</option>{masters.map((master) => <option key={master.skuMasterId} value={master.skuMasterId}>{master.name}</option>)}</select></label>
      <input type="file" accept=".xlsx" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const parsed = await parsePalletXlsx(file);
          setLines(parsed);
          setInfo(`XLSX cargado en memoria: ${parsed.length} líneas`);
        } catch (err) {
          setInfo((err as Error).message);
          setLines(undefined);
        }
      }} />
      <button
        className="btn-with-icon"
        disabled={!selectedLayout || !selectedMaster || !lines?.length}
        onClick={() => {
          if (!selectedLayout) return setInfo('Debe seleccionar un layout válido.');
          if (!selectedMaster) return setInfo('Debe seleccionar SKU Master.');
          if (!lines?.length) return setInfo('Debe cargar XLSX válido.');
          const run = buildRun(selectedLayout, selectedMaster, lines);
          onGeneratedRun(run);
          setInfo(`Run generado: ${run.name}`);
        }}
      >
        <RocketIcon />
        <span>Generar Run</span>
      </button>
      {info && <p>{info}</p>}
    </div>
  );
}
