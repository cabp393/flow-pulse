import { useMemo } from 'react';
import type { RunResult } from '../models/domain';

const DASH = '—';

const buildPalletOrder = (runA?: RunResult, runB?: RunResult): string[] => {
  const inA = runA?.palletOrder ?? [];
  const inB = runB?.palletResults.map((item) => item.palletId) ?? [];
  const merged = [...inA];
  inB.forEach((palletId) => {
    if (!merged.includes(palletId)) merged.push(palletId);
  });
  return merged;
};

export function PalletCompareTable({ runA, runB }: { runA?: RunResult; runB?: RunResult }) {
  const rowOrder = useMemo(() => buildPalletOrder(runA, runB), [runA, runB]);
  const byPalletA = useMemo(() => new Map((runA?.palletResults ?? []).map((result) => [result.palletId, result])), [runA]);
  const byPalletB = useMemo(() => new Map((runB?.palletResults ?? []).map((result) => [result.palletId, result])), [runB]);

  return (
    <div className="pallet-compare-table-wrap">
      <table className="pallet-compare-table">
        <thead>
          <tr>
            <th>Pallet ID</th>
            <th>Cantidad de SKUs</th>
            <th>Run A: Total pasos</th>
            <th>Run A: SKU sin mapping</th>
            <th>Run B: Total pasos</th>
            <th>Run B: SKU sin mapping</th>
          </tr>
        </thead>
        <tbody>
          {rowOrder.map((palletId) => {
            const resultA = byPalletA.get(palletId);
            const resultB = byPalletB.get(palletId);
            const skuCount = resultA?.skuCount ?? resultB?.skuCount;
            return (
              <tr key={palletId}>
                <td>{palletId}</td>
                <td>{skuCount ?? DASH}</td>
                <td>{resultA?.steps ?? DASH}</td>
                <td>{resultA?.missingSkuCount ?? DASH}</td>
                <td>{resultB?.steps ?? DASH}</td>
                <td>{resultB?.missingSkuCount ?? DASH}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
