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

const getStepsDelta = (stepsA?: number, stepsB?: number): number | undefined => {
  if (typeof stepsA !== 'number' || typeof stepsB !== 'number') return undefined;
  return stepsB - stepsA;
};

export function PalletCompareTable({
  runA,
  runB,
  onOpenPallet,
}: {
  runA?: RunResult;
  runB?: RunResult;
  onOpenPallet?: (palletId: string) => void;
}) {
  const rowOrder = useMemo(() => buildPalletOrder(runA, runB), [runA, runB]);
  const byPalletA = useMemo(() => new Map((runA?.palletResults ?? []).map((result) => [result.palletId, result])), [runA]);
  const byPalletB = useMemo(() => new Map((runB?.palletResults ?? []).map((result) => [result.palletId, result])), [runB]);
  const rows = useMemo(() => {
    return rowOrder
      .map((palletId, index) => {
        const resultA = byPalletA.get(palletId);
        const resultB = byPalletB.get(palletId);
        return {
          palletId,
          index,
          resultA,
          resultB,
          delta: getStepsDelta(resultA?.steps, resultB?.steps),
        };
      })
      .sort((left, right) => {
        if (left.delta === undefined && right.delta === undefined) return left.index - right.index;
        if (left.delta === undefined) return 1;
        if (right.delta === undefined) return -1;
        if (left.delta !== right.delta) return left.delta - right.delta;
        return left.index - right.index;
      });
  }, [byPalletA, byPalletB, rowOrder]);

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
            <th>Δ pasos (B-A)</th>
            <th>Ver</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ palletId, resultA, resultB, delta }) => {
            const skuCount = resultA?.skuCount ?? resultB?.skuCount;
            return (
              <tr key={palletId}>
                <td>{palletId}</td>
                <td>{skuCount ?? DASH}</td>
                <td>{resultA?.steps ?? DASH}</td>
                <td>{resultA?.missingSkuCount ?? DASH}</td>
                <td>{resultB?.steps ?? DASH}</td>
                <td>{resultB?.missingSkuCount ?? DASH}</td>
                <td>{delta ?? DASH}</td>
                <td>
                  {runA?.runId && runB?.runId ? (
                    <a
                      href={`/player-compare?runA=${encodeURIComponent(runA.runId)}&runB=${encodeURIComponent(runB.runId)}&pallet=${encodeURIComponent(palletId)}&auto=0`}
                      onClick={(event) => {
                        event.preventDefault();
                        onOpenPallet?.(palletId);
                      }}
                    >
                      ver
                    </a>
                  ) : DASH}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
