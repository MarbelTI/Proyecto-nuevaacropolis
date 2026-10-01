## Context

Ver proposal.md - Why. Puntos verificados en el código real que condicionan el diseño:

- `syncTransactionsToSupabase` y `syncBcvRatesToSupabase` (`src/lib/api/transactions.functions.ts`)
  reciben `transactions`/`rates` como arreglos arbitrarios y hacen `upsert` — no asumen que sea
  "todo el historial". El filtrado por mes no requiere tocar el servidor.
- `SupabaseSync.tsx` ya recibe `transactions.list` (con `fecha` en formato `dd/mm/yyyy`) y
  `bcvRates.rates` (`Record<isoDate "YYYY-MM-DD", { dolar?, euro? }>`) como props completas desde
  `routes/index.tsx` — no hace falta pasar nada nuevo desde ahí.
- El patrón de `ratesArray` en `handleSync` ya filtra `r.dolar != null` antes de subir (la
  columna `rate` es NOT NULL en Supabase); la subida por mes debe respetar ese mismo filtro,
  además del de mes.
- Otros componentes de este proyecto (`ResumenTab.tsx`, `SolvenciasTab.tsx`) ya tienen cada uno
  su propia función local `fechaToIso(fecha: string)` para convertir `dd/mm/yyyy` a ISO — no
  existe una utilidad compartida; se sigue el mismo patrón de duplicarla localmente en
  `SupabaseSync.tsx` en vez de crear un módulo nuevo para una sola función de 5 líneas.

## Goals / Non-Goals

**Goals:**
- Subir a Supabase las transacciones y tasas BCV de un mes elegido, sin tocar el resto.
- Dejar el botón de "subir todo" exactamente como está.

**Non-Goals:**
- Subir alumnos por mes (no tienen fecha mensual).
- Automatizar la subida (sigue siendo manual, un clic por mes).
- Cualquier cambio de permisos o de las funciones de servidor existentes.
- Ejecutar o confirmar la subida real de agosto desde este entorno (sin salida de red a
  Supabase aquí — ver Migration Plan).

## Decisions

**1. Filtrar en el cliente, no agregar parámetros al servidor.** `syncTx`/`syncBcv` ya aceptan
cualquier arreglo. Construir el arreglo filtrado por mes en `SupabaseSync.tsx` antes de llamarlas
es más simple que enseñarle al servidor un concepto nuevo de "mes", y no toca
`transactions.functions.ts` en absoluto — menos superficie, mismo resultado.

**2. El mes se calcula sobre `fecha` (fecha real del movimiento), no sobre `mensualidad`.**
`mensualidad` es a qué mes de cuota corresponde un pago (puede ser distinto del mes en que se
registró, ver memoria del proyecto: "mes contable vs mensualidad"). "Subir agosto" se entiende
como "lo que pasó en agosto", igual que el filtro de mes que ya existe en `TransactionsTab.tsx` y
`ResumenTab.tsx` — mismo criterio en toda la app.

**3. Selector de mes poblado solo con meses que de verdad tienen transacciones locales.**
Se deriva de `transactions.list` (igual que `mesOptions` en `TransactionsTab.tsx`), no de un
rango de fechas arbitrario — así no se puede "elegir" un mes vacío por error.

**4. Reutilizar `handleSync` lo menos posible: función nueva `handleSyncMes`, no una rama
condicional dentro de `handleSync`.** Son dos flujos distintos (todo vs. un mes) con mensajes de
éxito distintos; meterlos en una sola función con un parámetro opcional los haría más difíciles
de leer que tenerlos separados. Ambos siguen llamando a los mismos `syncTx`/`syncBcv`.

## Risks / Trade-offs

- [Riesgo] Confundir "subir un mes" con "subir todo" y mandar de más por error. → *Mitigación*:
  el selector de mes solo lista meses con datos, el botón dice explícitamente qué mes va a subir
  (ej. "Subir agosto 2026 a la nube"), y antes de subir se muestra cuántas filas son.
- [Riesgo] Esta es la primera subida real de data financiera a producción — un error ahí no es
  trivial de deshacer (otras cuentas podrían llegar a cargarlo con "Cargar desde nube" antes de
  notar un problema). → *Mitigación*: se prueba primero con agosto, que Nancy ya revisó; el resto
  de meses queda local hasta que ella confirme mes por mes.

## Migration Plan

No hay migración de base de datos — no se toca el esquema. El único paso de despliegue es el
build/deploy normal a Vercel. La verificación de que "agosto" quedó en la nube correctamente
solo se puede hacer desde la app ya desplegada (este entorno de desarrollo no tiene salida de red
hacia Supabase ahora mismo, verificado). Rollback: si algo sale mal, no hay nada que revertir en
la base — la subida es un `upsert` por `id`; volver a intentar o corregir y re-subir el mismo mes
es seguro.
