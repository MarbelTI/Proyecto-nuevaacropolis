## Context

Hoy una sola tasa (dólar) vive en tres lugares con formas distintas:
- `localStorage` vía `useBcvRates()` en `lists-store.ts`: `BcvRates =
  Record<string, number>` (fecha ISO → tasa).
- Supabase, tabla `bcv_rates`: columnas `iso_date`, `rate`, `source`.
- La lectura del XLS del BCV (`bcv.functions.ts`, `readXlsRates` /
  `importarXls` en `TasasBcvTab.tsx`) solo mira la celda `G15`.

`rellenarTasasFaltantes` (`excel-import.ts`) y `bcvRateFor`/`bcvRateNearest`
(`lists-store.ts`) consumen `BcvRates` asumiendo que el valor es directamente
el número de la tasa. Ver proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Agregar la tasa euro (G11) al mismo flujo que ya trae la tasa dólar (G15),
  sin duplicar la lógica de descarga/lectura de XLS.
- No perder ninguna tasa dólar ya guardada (localStorage o Supabase) al
  cambiar la forma del dato.

**Non-Goals:**
- No se decide todavía cómo ni cuándo se usa la tasa euro para convertir
  transacciones (eso es el cambio futuro mencionado en proposal.md).
- No se agrega la tasa "Binance" ni ninguna fuente para ella — sigue sin
  existir, y sigue fuera de alcance.
- No se cambia el criterio de validez de una tasa (`rate > 1`), solo se
  aplica igual a la celda G11.

## Decisions

**Forma del dato: `Record<string, { dolar: number; euro?: number }>` en vez de
dos mapas paralelos (`BcvRatesDolar` / `BcvRatesEuro`).**
Una fecha con ambas tasas es un solo registro conceptual (dos columnas de la
misma fila del XLS del BCV), y guardarlas juntas evita que ambos mapas se
desincronicen (ej. borrar una fecha del mapa dólar sin borrarla del de euro).
`euro` es opcional porque una fecha puede tener tasa dólar sin tener aún tasa
euro (dato viejo, o una hoja del XLS con G11 inválido pero G15 válido).
Alternativa considerada: dos `Record<string, number>` separados — se
descarta por el riesgo de desincronización y porque duplica toda la lógica de
merge/clean que ya existe para uno solo.

**Migración de datos: lectura tolerante a la forma vieja, no una migración
en caliente.**
`load<BcvRates>()` en `lists-store.ts` sigue leyendo lo que haya en
`localStorage` bajo la misma clave (`lector_ocr_bcv_v1`); al cargar, si un
valor es `number` (forma vieja) se envuelve como `{ dolar: value }`. No se
reescribe el `localStorage` de otras usuarias hasta que vuelvan a guardar o
sincronizar. En Supabase, la tabla `bcv_rates` gana una columna nueva
`rate_euro numeric NULL` (migración aditiva, sin tocar filas existentes,
`rate` sigue siendo la tasa dólar tal como hoy). No se sube de versión la
clave de `localStorage` (`K_BCV`) porque no hace falta: el valor sigue siendo
compatible por fecha, solo cambia la forma de cada entrada, y la lectura
tolerante cubre ambas formas.
Alternativa considerada: subir a `lector_ocr_bcv_v2` y migrar una vez — se
descarga porque agrega código de migración de un solo uso para un problema
que la lectura tolerante ya resuelve de forma permanente y más simple.

**`bcvRateFor` / `bcvRateNearest` devuelven solo la tasa dólar, sin cambiar su
firma.**
Como el consumo de la tasa euro está fuera de alcance (ver Non-Goals), estas
funciones — usadas hoy para convertir transacciones — siguen devolviendo
`number | null` a partir de `entry.dolar`, igual que antes. Esto mantiene el
comportamiento actual de conversión de transacciones sin tocar sus llamadores.
Cuando se decida cómo usar la tasa euro, esas funciones (o unas nuevas
equivalentes) se extienden en un cambio aparte.

**Sincronización con Supabase: se agrega `rateEuro` opcional al mismo
`BcvRateSchema` y a `bcv_rates.rate_euro`, en vez de una tabla nueva.**
Es la misma fila por fecha, mismo flujo de upsert por `iso_date`; una tabla
separada solo para el euro forzaría un join en cada carga sin necesidad.

## Risks / Trade-offs

- [Falta la migración SQL en Supabase] → Sin la columna `rate_euro`, el
  upsert seguiría funcionando (columna extra en el payload se ignora o falla
  según configuración) pero la tasa euro no se guardaría. Se documenta el SQL
  exacto en tasks.md para que se corra antes de desplegar el código nuevo.
- [Una fecha con tasa dólar vieja en formato `number` conviviendo con datos
  nuevos en formato objeto] → Cubierto por la lectura tolerante descrita
  arriba; se agrega una prueba/caso manual explícito para este escenario.
- [Nancy no diferencia visualmente cuándo falta la tasa euro de una fecha] →
  La celda de esa columna queda vacía en la tabla, igual que hoy pasa si no
  hay tasa dólar para una fecha; comportamiento consistente, no requiere UI
  nueva.

## Migration Plan

1. Agregar columna `rate_euro numeric NULL` a la tabla `bcv_rates` en
   Supabase (SQL, ver tasks.md).
2. Actualizar `readXlsRates`/`fetchQuarterRows` (`bcv.functions.ts`) para leer
   también `G11` y devolver `{ isoDate, dolar, euro? }` por fila.
3. Actualizar `BcvRates`/`useBcvRates` (`lists-store.ts`) a la nueva forma,
   con lectura tolerante a valores `number` sueltos.
4. Actualizar `importarXls` en `TasasBcvTab.tsx` para leer G11 y mostrar la
   columna Tasa Bs/€.
5. Actualizar `syncBcvRatesToSupabase`/`loadBcvRatesFromSupabase`
   (`transactions.functions.ts`) y `SupabaseSync.tsx` para llevar `rateEuro`
   en ambos sentidos.
6. Verificar que `excel-import.ts` (`rellenarTasasFaltantes`,
   `bcvRateFor`/`bcvRateNearest`) sigue leyendo solo la tasa dólar sin
   cambios de comportamiento.

No hay rollback especial: si algo falla, basta con no desplegar el código
nuevo — la columna `rate_euro` adicional en Supabase no rompe el código viejo
(no la lee), y el `localStorage` sigue siendo válido para la versión anterior
del código porque esa versión solo espera `number`.
