## Why

Para transcribir a dólares las transacciones en bolívares recibidas desde el 24
de junio de 2026, Nancy usa la tasa "Binance" — pero no existe una fuente
oficial ni un histórico fijo de esa tasa (a diferencia del dólar BCV, que ya
se descarga automáticamente). Nancy confirmó que la tasa del Euro del BCV es
una aproximación razonable a la tasa Binance (suele ser parecida, a veces
incluso más alta), y el BCV ya publica esa tasa en el mismo archivo trimestral
que hoy solo se lee para el dólar. Agregarla evita depender de una fuente que
no existe.

## What Changes

- El sistema lee también la celda **G11** (tasa Euro) de cada hoja del XLS
  trimestral del BCV, además de la G15 (tasa dólar) que ya lee hoy — tanto en
  la descarga automática (`fetchQuarterRows`/`readXlsRates` en
  `bcv.functions.ts`) como en la importación manual de XLS
  (`TasasBcvTab.tsx` → `importarXls`).
- El almacenamiento de tasas por fecha pasa de guardar un solo número (tasa
  dólar) a guardar dos (`dolar` y `euro`) por fecha, en `lists-store.ts`
  (`useBcvRates`/`BcvRates`), incluyendo su sincronización con Supabase
  (`SupabaseSync.tsx`) y su lectura al importar un Excel de transacciones
  (`excel-import.ts`).
- La pestaña "Tasas BCV" (`TasasBcvTab.tsx`) muestra dos columnas — **Tasa
  Bs/$** y **Tasa Bs/€** — en la tabla y en el formulario de carga manual.
- **BREAKING (formato de datos)**: el registro de tasas por fecha cambia de
  `Record<string, number>` a `Record<string, { dolar: number; euro?: number }>`
  (o equivalente). Se migra el dato existente en Supabase/localStorage sin
  perder las tasas del dólar ya guardadas — ver design.md.

## Capabilities

### New Capabilities
- `tasas-bcv`: descarga, almacenamiento, sincronización y visualización de las
  tasas de cambio del BCV (dólar y euro) por fecha, usadas para convertir
  transacciones en bolívares a dólares.

### Modified Capabilities
(ninguna — es la primera spec de esta capacidad; no hay specs previas
sincronizadas en `openspec/specs/` para este proyecto)

## Impact

- **Código**: `src/lib/bcv.functions.ts` (lectura de XLS y server functions),
  `src/lib/lists-store.ts` (forma del store `useBcvRates`/`BcvRates`),
  `src/components/finanzas/TasasBcvTab.tsx` (UI: tabla y carga manual/XLS),
  `src/components/finanzas/SupabaseSync.tsx` (sincronización), 
  `src/lib/excel-import.ts` (lectura de tasas al importar transacciones).
- **Datos existentes**: las tasas de dólar ya guardadas por fecha (localStorage
  y Supabase) deben preservarse al migrar la forma del dato.
- **No afecta todavía**: la lógica de conversión de transacciones a Monto USD
  sigue usando solo la tasa dólar — este cambio únicamente agrega la tasa
  Euro como dato disponible, de solo lectura. Usarla como aproximación de la
  tasa "Binance" en el cálculo de transacciones es un cambio futuro, fuera de
  alcance aquí.
