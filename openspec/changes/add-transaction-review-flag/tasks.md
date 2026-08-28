## 1. Base de datos (Supabase)

- [x] 1.1 Migración creada en
      `supabase/migrations/20260828000001_transaction_revisar.sql`
      (`revisar text not null default ''`). **No ejecutada** contra el
      proyecto real — pendiente de que Nancy avise.

## 2. Tipo y almacenamiento (`src/lib/lists-store.ts`)

- [x] 2.1 Agregado `revisar: string` a `Transaction`.
- [x] 2.2 Todos los lugares que construyen un `Transaction` nuevo
      (TransactionsTab "Nuevo registro", OcrTab al guardar, excel-import,
      la bajada desde Supabase en SupabaseSync) arrancan con `revisar: ""`
      — encontrados en su totalidad dejando que `tsc` señalara cada sitio
      con el tipo ya cambiado, en vez de buscarlos a mano.

## 3. Edición (`src/components/finanzas/TransactionEditDialog.tsx`)

- [x] 3.1 Campo "Revisar / Nota" agregado al formulario, junto a USD
      (ancho completo).

## 4. Tabla de Transacciones (`src/components/finanzas/TransactionsTab.tsx`)

- [x] 4.1 Tercer estado de fila `tieneRevisar` con franja azul
      (`bg-blue-50 dark:bg-blue-950/30`).
- [x] 4.2 Prioridad: foco/seleccionada (verde+ámbar) > por revisar (azul) >
      repetida (rosado). El `title` de la fila junta todos los que
      apliquen (ej. "Por revisar: <nota> · Repetida: ...").
- [x] 4.3 Botón/filtro "Por revisar (N)" en la barra de herramientas —
      solo aparece cuando hay al menos una transacción marcada.
- [x] 4.4 Botón de bandera por fila (primero de los cuatro, junto a
      duplicar/editar/eliminar): sin marcar pide la nota con un `prompt`
      simple (cancelar no marca nada; aceptar vacío marca con "Revisar"
      por defecto); ya marcada, un clic la desmarca directo.

## 5. Importar/exportar Excel

- [x] 5.1 `excel-import.ts`: lee `Revisar`/`revisar`/`Verificar`/`verificar`
      hacia el nuevo campo.
- [x] 5.2 `excel-export.ts`: `exportTransactionsExcel` agrega la columna
      "Revisar".

## 6. Sincronización con Supabase

- [x] 6.1a Descarga (`SupabaseSync.tsx`): agregado `revisar: r.revisar ??
      ""` al mapear filas que vienen de Supabase — seguro incluso hoy, sin
      la columna todavía, porque simplemente no viene en `r` y el `?? ""`
      lo resuelve.
- [ ] 6.1b Subida (`transactions.functions.ts`, `syncTransactionsToSupabase`):
      **deliberadamente NO conectada todavía.** Agregar `revisar` a
      `TransactionSchema` y al objeto `mapped` que se sube con `.upsert()`
      HOY causaría un error de Postgres en cada "Subir a nube" (columna
      inexistente), rompiendo la sincronización de TODAS las transacciones,
      no solo de esta marca — no la de solo esta función. Es un ajuste
      respecto al plan original de la tarea (que decía "en los dos
      mapeos"): queda pendiente como una tarea de una línea para cuando se
      corra la migración de 1.1.

## 7. Verificación

- [x] 7.1 `npx tsc --noEmit` y `npm run build` sin errores.
- [ ] 7.2 Confirmar en el navegador (con datos reales): marcar una
      transacción, verla resaltada con la nota en el tooltip, activar el
      filtro "Por revisar", exportar a Excel y reimportar el mismo archivo
      para confirmar que la marca sobrevive. **Pendiente** — no hay
      credenciales de prueba disponibles desde aquí.
- [x] 7.3 Documentado (aquí y al reportarle a Nancy): la sincronización
      entre cuentas vía Supabase no funciona todavía — ni la subida ni,
      hasta que se corra la migración, tampoco tendría nada que bajar.
