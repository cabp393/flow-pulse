import { useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

type ConfirmKind = 'reset' | 'clear-runs' | undefined;

export function SettingsPage({ onResetStorage, onClearOldRuns }: { onResetStorage: () => void; onClearOldRuns: () => void }) {
  const [confirmState, setConfirmState] = useState<ConfirmKind>();
  const [status, setStatus] = useState('');

  const storageInfo = useMemo(() => {
    const bytes = new TextEncoder().encode(JSON.stringify(localStorage)).length;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [status]);

  return (
    <div className="page advanced-page">
      <h2>Settings</h2>
      <p>Zona peligrosa: acciones destructivas y estado local.</p>
      <p>Storage local estimado: {storageInfo}</p>
      <ul className="advanced-actions">
        <li>
          <div>
            <strong>Limpiar runs antiguos</strong>
            <small>Elimina runs persistidos y conserva layouts/SKU masters.</small>
          </div>
          <button className="danger" onClick={() => setConfirmState('clear-runs')}>Limpiar runs antiguos</button>
        </li>
        <li>
          <div>
            <strong>Reset completo localStorage</strong>
            <small>Acción destructiva: borra layouts, SKU masters y runs.</small>
          </div>
          <button className="danger" onClick={() => setConfirmState('reset')}>Reset completo</button>
        </li>
      </ul>
      {status && <p className="toast-success">{status}</p>}
      <ConfirmModal
        open={Boolean(confirmState)}
        title="Confirmar acción"
        description={confirmState === 'reset' ? 'Se borrarán todos los datos persistidos.' : 'Se eliminarán los runs antiguos guardados.'}
        onCancel={() => setConfirmState(undefined)}
        onConfirm={() => {
          if (confirmState === 'reset') {
            onResetStorage();
            setStatus('localStorage reiniciado.');
          }
          if (confirmState === 'clear-runs') {
            onClearOldRuns();
            setStatus('Runs antiguos eliminados.');
          }
          setConfirmState(undefined);
        }}
        danger
      />
    </div>
  );
}
