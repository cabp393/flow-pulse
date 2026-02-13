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

export function PalletImportPage({ layouts, activeLayoutId, masters, activeSkuMasterId, onGeneratedRun, onSelectLayout }: Props) {
  const [selectedMasterId, setSelectedMasterId] = useState<string>(activeSkuMasterId ?? '');
  const [lines, setLines] = useState<PalletLine[] | undefined>();
  const [info, setInfo] = useState('');

  const selectedMaster = useMemo(() => masters.find((master) => master.skuMasterId === selectedMasterId), [masters, selectedMasterId]);
  const selectedLayout = useMemo(() => layouts.find((layout) => layout.layoutId === activeLayoutId), [activeLayoutId, layouts]);

  return (
    <div className="page">
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
        Generar Run
      </button>
      {info && <p>{info}</p>}
    </div>
  );
}
