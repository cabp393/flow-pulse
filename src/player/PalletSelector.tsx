interface PalletSelectorProps {
  palletOrder: string[];
  palletIndex: number;
  onChange: (nextPalletId: string) => void;
  disabled?: boolean;
}

export function PalletSelector({ palletOrder, palletIndex, onChange, disabled }: PalletSelectorProps) {
  const safeIndex = Math.max(0, Math.min(palletIndex, Math.max(0, palletOrder.length - 1)));
  const selected = palletOrder[safeIndex] ?? '';

  return (
    <label className="player-compact-field">
      Pallet
      <select
        value={selected}
        disabled={disabled || palletOrder.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {palletOrder.length === 0 && <option value="">--</option>}
        {palletOrder.map((palletId) => (
          <option key={palletId} value={palletId}>
            {palletId}
          </option>
        ))}
      </select>
    </label>
  );
}
