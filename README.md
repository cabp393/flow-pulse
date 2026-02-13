# flowpulse

Aplicación React + TypeScript + Vite, 100% frontend y persistida en `localStorage`, para simular picking y comparar escenarios.

## Comandos
```bash
npm install
npm run dev
npm run build
npm run test
```

## Flujo actual
1. **Layout**: define celdas `WALL`/`AISLE`/`PICK`, `locationId` en `PICK`, `accessCell`, `START`, `END` y reglas dirigidas de movimiento.
2. **SKU Master** (`/sku`): importar CSV obligatorio `ubicacion,secuencia,sku`.
3. **Run Builder** (`/pallets`): seleccionar layout + SKU Master, cargar XLSX (`pallet_id,sku`) y generar run.
4. **Results** (`/results`): revisar métricas y heatmap.
5. **Player Compare** (`/player-compare`): seleccionar Run A y Run B para playback sincronizado.

## Reglas clave
- El layout **no** almacena secuencia.
- La secuencia vive solo en SKU Master.
- Un SKU puede tener múltiples ubicaciones.
- Regla MVP para multi-ubicación: se usa la ubicación de menor `sequence`.
- Duplicado exacto `sku+ubicacion` en SKU Master: se ignora repetido y se muestra warning.
- Si `secuencia` no es numérica: error de importación.
- El XLSX de pallets se usa en memoria para crear el run y **no** se persiste.

## Compatibilidad de runs
En player compare, Run A y Run B deben compartir `layoutVersionId`; si no, Play se bloquea.
Además, si `layoutHash` del run difiere del layout actual, se muestra advertencia.

## Persistencia
- Clave principal: `flowpulse.state`
- Preferencias player compare: `flowpulse.player.compare`
- Runs persistidos con límite configurable (default: 10).

## CSV SKU Master (obligatorio)
```csv
ubicacion,secuencia,sku
A01-01-01,10,SKU123
A01-01-02,20,SKU123
B02-03-01,30,SKU456
```

## Batch de ejemplo (para generar XLSX)
```csv
pallet_id,sku
P-0001,SKU123
P-0001,SKU456
P-0002,SKU123
```
