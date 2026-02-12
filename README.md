# flowpulse (MVP frontend)

Aplicación web 100% frontend para diseñar layout de bodega, mapear SKUs, importar pallets desde XLSX y generar heatmap de recorridos.

## Stack
- React + TypeScript + Vite
- Persistencia en `localStorage` con versionado de esquema
- Importación XLSX en navegador con `xlsx` (SheetJS)
- Sin backend, sin DB, sin auth

## Funcionalidades MVP
- Editor de layout en grilla `W x H`.
- Tipos de celda: `WALL`, `AISLE`, `PICK`, `START`, `END`.
- Reglas direccionales por celda `AISLE` (`allowUp/Down/Left/Right`).
- Propiedades PICK: `locationId`, `sequence`, `accessCell`.
- Maestro SKU (`sku -> locationId`) por CSV o pegado.
- Importación de pallets XLSX (`pallet_id`, `sku`), deduplicación por pallet.
- Simulación con A* sobre grafo dirigido, issues de rutas imposibles.
- Heatmap de pasos recorridos y detalle por pallet.
- Player / Playback de recorridos pallet por pallet con controles de reproducción.
- Export/Import JSON de estado completo.

## Ejecutar
```bash
npm install
npm run dev
```

## Build/Test
```bash
npm run build
npm run test
```


## Player / Playback
- Ir a pestaña **player** o usar **Ver en Player** desde **results** para abrir un pallet preseleccionado.
- Controles: `Play`, `Pause`, `Stop`, `Prev Pallet`, `Next Pallet`.
- Velocidad configurable por presets (`0.25x` a `~16x` según ms por paso), `auto continuar` y `seguir cámara`.
- Indicadores: pallet actual, paso actual/total, stops visitados y tiempo estimado.
- Persistencia (`localStorage`): último `runId`, `palletIndex`, velocidad, `autoContinue`, `followCamera`.

Atajos sugeridos:
- `Prev/Next Pallet` para saltar pallets con incidencias (sin path).
- Activar `auto continuar` para ejecutar todos los pallets de corrido.

## Persistencia y schema
- Clave localStorage: `flowpulse.state`
- Versión de esquema actual: `1`

## Demo rápida
1. Ir a pestaña **layout** y dibujar calles (`AISLE`), `START`, `END`, y `PICK`s.
2. Cargar `samples/sku-master.csv` en pestaña **sku**.
3. Crear XLSX con columnas `pallet_id,sku` usando `samples/pallets-template.csv` como base.
4. Importar XLSX en **pallets** y click en **Generar heatmap**.
5. Revisar **results** para heatmap y rutas por pallet.

## Estructura
- `src/models`: tipos de dominio
- `src/storage`: repositorio localStorage + migración
- `src/routing`: grafo dirigido + A* + simulación + cache por tramo
- `src/pages`: pantallas principales
- `src/ui`: componentes visuales
- `src/utils`: parsing, hash de layout y validaciones

