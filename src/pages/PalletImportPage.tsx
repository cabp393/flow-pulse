import { useMemo, useState } from 'react';
import type { Layout, PalletBatch, RunResult, SkuMaster } from '../models/domain';
import { parsePalletXlsx } from '../utils/parsers';
import { buildRun } from '../routing/runBuilder';

interface Props {
  layout: Layout;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  batches: PalletBatch[];
  onSaveBatches: (batches: PalletBatch[]) => void;
  onGeneratedRuns: (runs: RunResult[]) => void;
}

export function PalletImportPage({ layout, masters, activeSkuMasterId, batches, onSaveBatches, onGeneratedRuns }: Props) {
  const [batchName, setBatchName] = useState('Batch');
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>(activeSkuMasterId ? [activeSkuMasterId] : []);
  const [info, setInfo] = useState('');

  const selectedBatch = useMemo(() => batches.find((item) => item.palletBatchId === selectedBatchId), [batches, selectedBatchId]);

  return (
    <div className="page">
      <h2>Run Builder</h2>
      <label>Nombre batch <input value={batchName} onChange={(e) => setBatchName(e.target.value)} /></label>
      <input
        type="file"
        accept=".xlsx"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const lines = await parsePalletXlsx(file);
          const batch: PalletBatch = { palletBatchId: crypto.randomUUID(), name: batchName || file.name, lines, createdAt: new Date().toISOString() };
          onSaveBatches([batch, ...batches]);
          setSelectedBatchId(batch.palletBatchId);
          setInfo(`Batch cargado: ${lines.length} líneas`);
        }}
      />
      <label>
        Batch
        <select value={selectedBatchId ?? ''} onChange={(e) => setSelectedBatchId(e.target.value)}>
          <option value="">--</option>
          {batches.map((batch) => <option key={batch.palletBatchId} value={batch.palletBatchId}>{batch.name} ({batch.lines.length})</option>)}
        </select>
      </label>
      <fieldset>
        <legend>SKU Masters a correr</legend>
        {masters.map((master) => (
          <label key={master.skuMasterId}>
            <input
              type="checkbox"
              checked={selectedMasterIds.includes(master.skuMasterId)}
              onChange={(e) => setSelectedMasterIds((prev) => e.target.checked ? [...new Set([...prev, master.skuMasterId])] : prev.filter((id) => id !== master.skuMasterId))}
            />
            {master.name}
          </label>
        ))}
      </fieldset>
      <button
        disabled={!selectedBatch || !selectedMasterIds.length}
        onClick={() => {
          if (!selectedBatch) return;
          const generated = selectedMasterIds
            .map((id) => masters.find((master) => master.skuMasterId === id))
            .filter(Boolean)
            .map((master) => buildRun(layout, selectedBatch.palletBatchId, master!.skuMasterId, master!.mapping, selectedBatch.lines));
          onGeneratedRuns(generated);
          setInfo(`Generados ${generated.length} runs`);
        }}
      >
        Generar Run
      </button>
      {info && <p>{info}</p>}
    </div>
  );
}
