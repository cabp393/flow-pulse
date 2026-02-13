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
- `Home` (`/`): run builder + listas compactas de layouts, SKU masters y runs.
- `Layout` (`/layout-editor`): edición del layout activo sobre draft en memoria.
- `SKU` (`/sku`): edición manual de SKU master con CSV pegado/importado.
- `Heatmap` (`/results`): métricas + heatmap por run.
- `Comparar` (`/compare`) y `Player` (`/player-compare`).
- `Avanzado` (`/advanced`): utilidades de mantenimiento, import/export y acciones destructivas.

## Flujo
1. Crear o ajustar layout válido.
2. Cargar/editar SKU master.
3. Cargar XLSX de pallets (`pallet_id,sku`) y generar run.
4. Revisar resultados/heatmap o comparar runs.

## Menú Avanzado (`/advanced`)
Incluye acciones compactas con confirmación modal en acciones destructivas:
- **Exportar Layout (JSON)** con selector de layout.
- **Importar Layout (JSON)** validando estructura mínima.
- **Exportar SKU Master (CSV)** con selector.
- **Importar SKU Master (CSV)** con validación opcional contra layout.
- **Limpiar runs antiguos** (confirm modal).
- **Reset completo localStorage** (confirm modal).

## Formatos de import/export

### Layout export JSON
Archivo descargado como:
`flowpulse_layout_<layoutName>_<YYYY-MM-DD_HHmm>.json`

Contiene todo lo necesario para reconstrucción:
- `layoutId`, `name`, `createdAt`
- `width`, `height`
- `gridData`
- `movementRules`
- `startCell`, `endCell`
- metadata de picks (`locationId`, `accessCell`) dentro de cada celda PICK

### Layout import JSON (validaciones)
- Debe ser objeto JSON (o arreglo, se usa el primer layout).
- `width`/`height` positivos y consistentes con `gridData`.
- `startCell` y `endCell` obligatorios.
- `movementRules` requerido.
- Si `layoutId` colisiona, se crea uno nuevo.
- Si `name` colisiona, se renombra con sufijo ` (importado)` incremental.

### SKU Master export CSV
Archivo descargado como:
`flowpulse_skumaster_<name>_<YYYY-MM-DD_HHmm>.csv`

Columnas exactas en salida:
```csv
ubicacion,secuencia,sku
```

### SKU Master import CSV (validaciones)
- Acepta header en cualquier orden si contiene `ubicacion`, `secuencia`, `sku`.
- Si no hay header, asume orden fijo: `ubicacion,secuencia,sku`.
- `ubicacion`: string no vacío.
- `secuencia`: numérica.
- `sku`: no vacío.
- Duplicados `sku+ubicacion` se omiten con warning.
- Si se selecciona layout para validar, cada `ubicacion` debe existir como `locationId` PICK en dicho layout.

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

## Persistencia
- Clave principal: `flowpulse.state`
- Preferencias player compare: `flowpulse.player.compare`
- Sin backend ni API: todo local en navegador.
