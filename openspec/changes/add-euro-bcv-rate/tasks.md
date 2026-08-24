## 1. Base de datos (Supabase)

- [x] 1.1 Agregar columna `rate_euro numeric NULL` a la tabla `bcv_rates`
      (SQL: `ALTER TABLE bcv_rates ADD COLUMN rate_euro numeric NULL;`),
      corrida antes de desplegar el código de este cambio.
      Migración creada en `supabase/migrations/20260821000001_bcv_rate_euro.sql`
      (usa `decimal(19,4)` en vez de `numeric` sin precisión, y también fija
      esa precisión en la columna `rate` existente). **Pendiente: correrla
      contra el proyecto real de Supabase** (`supabase db push` o desde el
      SQL editor) — no se ejecutó automáticamente por ser un cambio de
      esquema en infraestructura compartida.

## 2. Lectura del XLS del BCV (`src/lib/bcv.functions.ts`)

- [x] 2.1 Actualizar `BcvRow` para llevar `dolar: number` y `euro?: number`
      en vez de un solo `rate: number`.
- [x] 2.2 En `readXlsRates`, leer también la celda `G11` de cada hoja con el
      mismo criterio de validez que ya se usa para `G15` (`typeof === number`
      o convertible, y `> 1`); si G11 es inválido, `euro` queda `undefined`
      sin invalidar la fila completa.
- [x] 2.3 Revisar `fetchBcvForDate` y su fallback a `dolarapi.com`: ese
      fallback solo trae tasa dólar (no tiene euro) — dejar `euro` como
      `undefined` en ese caso, sin romper el tipo de retorno. También se
      corrigió `fetchTodayBcv`, que leía `.rate` de un `BcvRow`.

## 3. Almacenamiento local (`src/lib/lists-store.ts`)

- [x] 3.1 Cambiar el tipo `BcvRates` de `Record<string, number>` a
      `Record<string, BcvRateEntry>` (`BcvRateEntry = { dolar?: number; euro?: number }`,
      ambos opcionales — no solo el euro — para permitir cargar manualmente
      una fecha con solo tasa euro).
- [x] 3.2 En `load(K_BCV, {})`, agregar `normalizeBcvRates()` que envuelve
      cualquier valor que sea `number` (forma vieja) como `{ dolar: value }`,
      para no perder tasas guardadas antes de este cambio.
- [x] 3.3 Actualizar `merge`, `set` y `clean` de `useBcvRates()` para operar
      sobre la nueva forma; `set` recibe ahora `{ dolar?, euro? }` para una
      fecha sin pisar el que no se está actualizando, y `merge` combina por
      fecha en vez de reemplazar el objeto completo.
- [x] 3.4 **Ajuste respecto al plan original**: en vez de hacer que
      `bcvRateFor`/`bcvRateNearest` lean `entry.dolar` del mapa de dos tasas,
      se agregó `ratesDolar` como vista derivada de `useBcvRates()`
      (`Record<string, number>`, memoizada) y esas dos funciones se dejaron
      operando igual que antes sobre `Record<string, number>`. Motivo: al
      implementar 3.1 se detectó que 8 archivos más (`routes/index.tsx` y los
      componentes de Transacciones/Resumen/Dashboard/Análisis/OCR/Calculadora)
      dependen de `bcvRateFor`/`bcvRateNearest`/indexado directo asumiendo un
      mapa plano — fuera del impacto listado en proposal.md/design.md. Con
      `ratesDolar`, esos 8 archivos siguen sin tocarse (siguen recibiendo un
      `Record<string, number>` como antes); solo `routes/index.tsx` cambió,
      pasando `bcv.ratesDolar` en vez de `bcv.rates` a esos componentes.

## 4. Importación manual de XLS y UI (`src/components/finanzas/TasasBcvTab.tsx`)

- [x] 4.1 En `importarXls`, leer también `G11` por hoja con el mismo criterio
      de validez, y guardar `{ dolar, euro }` (o solo el que sea válido) por
      fecha.
- [x] 4.2 Actualizar el formulario de carga manual para permitir cargar tasa
      dólar y/o tasa euro para una fecha (dos campos, cada uno opcional al
      guardar).
- [x] 4.3 Agregar la columna "Tasa Bs/€" a la tabla de tasas, junto a la
      columna "Tasa Bs/$" existente; celda vacía ("—") si esa fecha no tiene
      tasa euro.
- [x] 4.4 Actualizar el título de la pestaña a "Tasas BCV (bolívares por
      dólar y por euro)".

## 5. Sincronización con Supabase

- [x] 5.1 En `transactions.functions.ts`, se extendió `BcvRateSchema` con
      `rateEuro: z.number().optional()`, mapeado a la columna `rate_euro` en
      `syncBcvRatesToSupabase` (upsert) y `loadBcvRatesFromSupabase` (lectura,
      reconstruyendo `{ dolar?, euro? }` por fecha).
- [x] 5.2 Actualizado `SupabaseSync.tsx`: tipo del prop `bcvRates` ahora
      `BcvRates`, y el armado de `ratesArray` filtra las fechas que solo
      tienen tasa euro (sin dólar) porque la columna `rate` sigue siendo
      NOT NULL en Supabase — quedan fuera de la sincronización hasta que
      tengan también dólar (documentado en el código con un comentario).

## 6. Consumo existente sin cambios de comportamiento

- [x] 6.1 Confirmado: `rellenarTasasFaltantes` (`excel-import.ts`) sigue
      operando sobre `Record<string, number>` (no `BcvRates`), sin ninguna
      referencia a la tasa euro.
- [x] 6.2 Revisados todos los llamadores de `useBcvRates`/`BcvRates`/`bcv.rates`
      en el repo. Los 8 que solo necesitan la tasa dólar (`AnalisisTab`,
      `CalculadoraDialog`, `DashboardTab`, `OcrTab`, `ResumenTab`,
      `TransactionEditDialog`, `TransactionsTab`, y `excel-import.ts`) no
      requirieron cambios — siguen tipados contra `Record<string, number>`.
      Solo `routes/index.tsx` se ajustó (pasa `bcv.ratesDolar` en vez de
      `bcv.rates` a esos componentes, y arregla el efecto que carga la tasa
      del día para construir `{ dolar, euro? }`).

## 7. Verificación

- [x] 7.1 `npm run build` (`tsc --noEmit && vite build`) pasa sin errores.
- [ ] 7.2 Con datos existentes en `localStorage` (tasas dólar en formato
      `number`, de antes de este cambio), abrir la pestaña "Tasas BCV" y
      confirmar que esas tasas dólar se siguen viendo correctamente.
      **Pendiente de verificar en el navegador con datos reales.**
- [ ] 7.3 Descargar un trimestre del BCV y confirmar que aparecen ambas
      columnas (Bs/$ y Bs/€) para las fechas con datos válidos.
      **Pendiente de verificar en el navegador.**
- [ ] 7.4 Importar manualmente un XLS del BCV y confirmar que ambas tasas se
      guardan. **Pendiente de verificar en el navegador.**
- [ ] 7.5 Sincronizar con Supabase (subir y bajar) y confirmar que la tasa
      euro viaja en ambos sentidos sin perder la tasa dólar. **Pendiente —
      requiere que la migración de la tarea 1.1 esté corrida en Supabase.**
- [ ] 7.6 Confirmar que el Monto USD calculado para una transacción en
      bolívares no cambia respecto a antes de este cambio (sigue usando solo
      la tasa dólar). Por diseño esto no cambió (`rellenarTasasFaltantes` y
      los componentes de cálculo siguen sin tocar), pero falta confirmarlo
      visualmente con datos reales.

## 8. Encabezado con ambas tasas y sugerencia de tasa por tipo (ampliación pedida por Nancy en la misma sesión)

- [x] 8.1 Encabezado (`routes/index.tsx`): se agregó un segundo indicador con
      la tasa euro (`headerRateEuro`, vía `bcv.ratesEuro`) junto al de la tasa
      dólar que ya existía. Motivo: hay pagos que Nancy hace a la tasa del
      banco (dólar) y otros a la tasa que se aproxima con el euro — necesita
      ver ambas sin cambiar de pestaña.
- [x] 8.2 Se agregó `ratesEuro` (vista derivada `Record<string, number>`,
      simétrica a `ratesDolar`) a `useBcvRates()` en `lists-store.ts`.
- [x] 8.3 Nueva función `bcvRateSugerida(tipo, isoDate, ratesDolar, ratesEuro)`
      en `lists-store.ts`, con corte fijo `CORTE_TASA_BINANCE_ISO =
      "2026-06-24"`: Ingreso + fecha >= corte → tasa euro (con respaldo a
      dólar si no hay euro disponible para esa fecha); cualquier otro caso →
      tasa dólar. Sigue siendo una sugerencia editable, no un valor forzado.
- [x] 8.4 `TransactionEditDialog.tsx` (`normalizeTransactionMoney`): usa
      `bcvRateSugerida` en vez de `bcvRateFor` cuando la moneda es Bolívares
      y no hay tasa cargada. Se agregó `tipo` a la lista de campos que
      disparan el recálculo de la sugerencia (antes solo moneda/monto/tasa/
      fecha), para que cambiar Ingreso↔Gasto vuelva a sugerir la tasa
      correcta si el campo sigue vacío.
- [x] 8.5 `OcrTab.tsx` (`normalizeMoneyRow`): mismo cambio — usa
      `bcvRateSugerida` con el `tipo` de la fila extraída por el OCR.
- [x] 8.6 Prop `bcvRatesEuro` agregada y encadenada donde hacía falta:
      `TransactionsTab.tsx`, `ResumenTab.tsx`, `OcrTab.tsx`, y los tres
      lugares de `routes/index.tsx` que instancian estos componentes o
      `TransactionEditDialog` directamente (pestaña Transacciones, Resumen,
      Préstamos, OCR).
- [x] 8.7 **Deliberadamente sin cambios** (confirmado con Nancy antes de
      construir): `rellenarTasasFaltantes` (carga masiva desde Excel) sigue
      usando solo la tasa dólar por fecha, sin distinguir tipo — evita que el
      Excel histórico ya entregado quede con una lógica distinta a la que se
      usó para generarlo. `CalculadoraDialog`, `DashboardTab`, `AnalisisTab`
      tampoco se tocaron (fuera de alcance de esta ampliación).
- [x] 8.8 `npm run build` pasa sin errores tras estos cambios.
- [x] 8.9 UI de la pestaña "Tasas BCV" (`TasasBcvTab.tsx`): las tres columnas
      (Fecha, Bs/$, Bs/€) quedaron centradas y la tabla ya no ocupa todo el
      ancho de la pestaña (`max-w-md mx-auto`) — corrige el desalineado que
      reportó Nancy al probarlo (una columna pegada a la izquierda, otra al
      centro, otra a la derecha).

## 9. Lápiz para corregir una tasa ya guardada (pedido por Nancy tras probar la pestaña)

- [x] 9.1 Columna nueva con ícono de lápiz por fila en la tabla de tasas
      (`TasasBcvTab.tsx`); al hacer clic, llena el formulario de "cargar tasa"
      de arriba con la fecha y las tasas de esa fila (reutiliza el mismo
      `bcv.set`, que ya sobreescribe por fecha — no hizo falta un guardado
      nuevo) y hace scroll hasta el formulario.
      La tabla pasó de `max-w-md` a `max-w-lg` para dar espacio a la columna.
- [x] 9.2 Mientras se edita una fecha, el formulario muestra el aviso
      "Editando tasa del DD/MM/YYYY" con un enlace para cancelar (vuelve el
      formulario a fecha de hoy, vacío); el botón cambia de "Guardar tasa" a
      "Actualizar tasa" mientras tanto (cosmético, mismo guardado).
- [x] 9.3 `npm run build`/`tsc --noEmit` pasa sin errores.
