import { useMemo, useState } from 'react';
import type { Layout, PalletLine, RunResult, SkuMaster } from '../models/domain';
import { parsePalletXlsx } from '../utils/parsers';
import { buildRun } from '../routing/runBuilder';

interface Props {
  layout: Layout;
  layoutVersionId: string;
  layoutName: string;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  onGeneratedRun: (run: RunResult) => void;
}

export function PalletImportPage({ layout, layoutVersionId, layoutName, masters, activeSkuMasterId, onGeneratedRun }: Props) {
  const [selectedMasterId, setSelectedMasterId] = useState<string>(activeSkuMasterId ?? '');
  const [lines, setLines] = useState<PalletLine[] | undefined>();
  const [info, setInfo] = useState('');

  const selectedMaster = useMemo(() => masters.find((master) => master.skuMasterId === selectedMasterId), [masters, selectedMasterId]);

  return (
    <div className="page">
      <h2>Run Builder</h2>
      <p>El XLSX se mantiene en memoria solo para generar este run.</p>
      <label>
        SKU Master
        <select value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)}>
          <option value="">--</option>
          {masters.map((master) => <option key={master.skuMasterId} value={master.skuMasterId}>{master.name}</option>)}
        </select>
      </label>
      <input
        type="file"
        accept=".xlsx"
        onChange={async (e) => {
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
        }}
      />
      <button
        disabled={!selectedMaster || !lines?.length}
        onClick={() => {
          if (!selectedMaster) {
            setInfo('Debe seleccionar SKU Master.');
            return;
          }
          if (!lines?.length) {
            setInfo('Debe cargar XLSX válido.');
            return;
          }
          const run = buildRun(layout, layoutVersionId, layoutName, selectedMaster, lines);
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
