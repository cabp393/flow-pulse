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
2. **Layout Editor** (`/layout-editor`): editar celdas `WALL`/`AISLE`/`PICK`/`START`/`END` del layout seleccionado.
3. **SKU Master** (`/sku`): importar CSV obligatorio `ubicacion,secuencia,sku`.
4. **Run Builder** (`/pallets`): seleccionar layout + SKU Master, cargar XLSX (`pallet_id,sku`) y generar run (máximo 20 runs persistidos).
5. **Results** (`/results`): revisar métricas y heatmap por run.
6. **Player Compare** (`/player-compare`): seleccionar Run A y Run B para playback sincronizado.

## Validaciones
- Un run solo se genera si existe layout seleccionado, SKU Master seleccionado y XLSX cargado.
- En compare/player, Run A y Run B deben compartir `layoutId`.
- Se bloquea reproducción cuando faltan datos (run/layout inexistente o `palletOrder` vacío).

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
