# flowpulse

Aplicación React + TypeScript + Vite, 100% frontend y persistida en `localStorage`, para simular picking y comparar escenarios.

## Comandos
```bash
npm install
npm run dev
npm run build
npm run test
```

## Flujo nuevo: escenarios comparables
1. **Layout**: arma un layout válido con 1 `START`, 1 `END`, y `PICK` con `accessCell` adyacente.
2. **SKU Masters** (`/sku`): crea uno o varios masters (ej: `actual`, `reslotting-v2`) pegando/importando CSV.
3. **Run Builder** (`/pallets`):
   - importa un batch XLSX de pallets,
   - selecciona uno o varios SKU Masters,
   - click en **Generar Run** para crear runs por escenario.
4. **Results** (`/results`): revisa heatmap y resumen de cada run.
5. **Compare** (`/compare`): selecciona Run A y Run B para ver heatmaps lado a lado + deltas.
6. **Player Compare** (`/player-compare`): playback sincronizado por pallet index entre ambos runs.

## Reglas de comparación
Los runs solo son comparables si tienen:
- mismo `layoutVersionId`
- mismo `palletBatchId`
- mismo `routingParamsHash`

## Persistencia
- Clave principal: `flowpulse.state`
- Preferencias player compare: `flowpulse.player.compare`
- Se mantiene máximo de runs en memoria local (`MAX_RUNS`), con botón para limpiar runs antiguos.

## CSV de ejemplo SKU Master
```csv
sku,locationId
SKU-1001,A-01-01
SKU-1002,A-01-02
SKU-1003,B-04-01
```

## Batch de ejemplo (para generar XLSX)
```csv
pallet_id,sku
P-0001,SKU-1001
P-0001,SKU-1003
P-0002,SKU-1002
P-0002,SKU-1001
```

## Notas técnicas
- No hay backend ni llamadas API.
- El run persiste resumen + heatmap + orden de pallets + resultados compactos por pallet.
- Las rutas del player comparativo se generan **on-demand** con cache en memoria por tramo.
