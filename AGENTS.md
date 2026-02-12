# AGENTS.md - flowpulse

## Convenciones
- Mantener proyecto 100% frontend.
- No introducir backend ni llamadas API.
- Persistencia exclusivamente en localStorage.
- TypeScript estricto y módulos pequeños.

## Comandos
- Instalar dependencias: `npm install`
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Tests: `npm run test`

## Estructura sugerida
- `src/models` para contratos de dominio
- `src/routing` para pathfinding/simulación
- `src/storage` para persistencia y migración
- `src/pages` + `src/ui` para UX

## Validación manual rápida
1. Crear layout válido (1 START, 1 END, PICKS con accessCell adyacente).
2. Cargar SKU map con locationIds válidos.
3. Importar XLSX pallets y generar heatmap.
4. Verificar persistencia al recargar.

## Recomendación Codex
- Antes de modificar rutas/lógica, correr tests unitarios de `src/routing`.
- Mantener funciones puras en `routing` y `utils` para fácil testeo.
