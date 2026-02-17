# flowpulse

Aplicación React + TypeScript + Vite, 100% frontend y persistida en `localStorage`, para simular picking y comparar escenarios.

## Comandos
```bash
npm install
npm run dev
npm run build
npm run test
```

## Navegación principal
- `Home` (`/`): importador XLSX + listas de layouts, SKU masters, batches y configs.
- `Layout` (`/layout-editor`): edición del layout activo.
- `SKU` (`/sku`): edición/manual import de SKU master.
- `Heatmap` (`/results`): cálculo on-demand desde config + batch + layout + SKU master.
- `Comparar` (`/compare`) y `Player` (`/player-compare`): comparación on-demand A/B.
- `Avanzado` (`/advanced`): importaciones y reset local.

## Nuevo flujo de persistencia
1. Importar XLSX (`pallet_id,sku`) y guardarlo como **Batch compacto** (CSR: `skuDict`, `skuIdxFlat`, `offsets`).
2. Al analizar, se crea una **RunConfig** con referencias `layoutId + skuMasterId + batchId`.
3. Results/Compare/Player regeneran la run **en memoria** cuando se abre la vista.
4. No se persisten `heatmapSteps`, `palletResults` ni `pickPlan`; se evita saturar cuota de `localStorage`.

## Persistencia
- Clave principal: `flowpulse.state`
- Preferencias player compare: `flowpulse.player.compare`
- Sin backend ni API: todo local en navegador.
