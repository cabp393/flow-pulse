# flowpulse

Aplicación React + TypeScript + Vite, 100% frontend y persistida en `localStorage`, para simular picking y comparar escenarios.

## Comandos
```bash
npm install
npm run dev
npm run build
npm run test
```

## Flujo
1. **Layouts** (`/layouts`): crear, duplicar, renombrar, eliminar y seleccionar layout activo (máximo 10).
2. **Layout Editor** (`/layout-editor`): editar sobre un **draft en memoria** del layout seleccionado.
   - Botones: `Guardar layout`, `Descartar cambios`, `Revertir a último guardado`.
   - El badge **Cambios sin guardar** aparece cuando el draft difiere del layout persistido.
   - El badge **Validación pendiente** aparece durante edición (sin detalle de errores).
   - Las validaciones completas corren **solo al guardar**.
3. **SKU Master** (`/sku`): importar CSV obligatorio `ubicacion,secuencia,sku`.
4. **Run Builder** (`/pallets`): seleccionar layout + SKU Master, cargar XLSX (`pallet_id,sku`) y generar run (máximo 20 runs persistidos).
5. **Results** (`/results`): revisar métricas y heatmap por run.
6. **Player Compare** (`/player-compare`): seleccionar Run A y Run B para playback sincronizado.

## Validaciones de layout (al presionar Guardar layout)
- Debe existir exactamente 1 `START` y 1 `END`.
- Cada `PICK` debe tener `locationId` no vacío y único.
- Cada `PICK` debe tener `accessCell`:
  - definido,
  - dentro del grid,
  - tipo `AISLE`,
  - adyacente (4-neighbors) al `PICK`.
- `movementRules` globales no deben habilitar salida del grid.
- Warning opcional: picks inaccesibles desde `START` en el grafo dirigido.

Si falla el guardado, se abre un modal con errores/warnings y acción **Ir a celda** para centrar/seleccionar celdas problemáticas.

## Persistencia
- Clave principal: `flowpulse.state`
- Preferencias player compare: `flowpulse.player.compare`
- Sin migraciones legacy: si el esquema no coincide, inicia estado limpio.

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
