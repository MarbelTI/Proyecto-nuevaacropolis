## 1. Funciones de servidor fila por fila

- [x] 1.1 `transactions.functions.ts`: `crearTransaccionEnNube` — `createServerFn`, valida con
      `TransactionSchema` (reusar), exige `canManageFinanzas(session.role)` (mismo patrón que las
      funciones existentes), hace `insert` de una sola fila en `transactions` y devuelve la fila
      insertada completa (incluido `updated_at`).
- [x] 1.2 `transactions.functions.ts`: `actualizarTransaccionEnNube` — recibe la transacción
      completa más `expectedUpdatedAt: string`. Hace
      `UPDATE transactions SET ... WHERE id = $1 AND updated_at = $2 RETURNING *`. Si 0 filas
      afectadas, responde `{ ok: false, conflict: true }` (sin tratarlo como error de red). Si 1
      fila, responde `{ ok: true, transaction, updatedAt }` con los valores frescos.
- [x] 1.3 `transactions.functions.ts`: `eliminarTransaccionEnNube` — recibe `id`, exige
      `canManageFinanzas`, hace `DELETE FROM transactions WHERE id = $1`. No valida
      `updated_at` (ver design.md, Risks — se acepta que borrar gane).
- [x] 1.4 Las tres funciones llaman a `registrarActividad` igual que el resto de funciones de este
      archivo (mismo patrón ya usado en `syncTransactionsToSupabase`).

## 2. `useTransactions()` — carga inicial desde la nube

- [x] 2.1 `lists-store.ts`: agregar helper local `getAccessToken()` (mismo patrón que
      `SupabaseSync.tsx`, vía `supabase.auth.getSession()` del cliente ya exportado en
      `src/lib/supabase.ts`).
- [x] 2.2 Nueva clave de `localStorage` para el set de ids pendientes de subir (ej.
      `lector_ocr_transacciones_pendientes_v1`), con helpers para leer/agregar/quitar un id.
- [x] 2.3 En el `useEffect` de montaje de `useTransactions()`: si hay sesión, `navigator.onLine`,
      y el set de pendientes está vacío, llamar a `loadTransactionsFromSupabase` (ya existe) antes
      de caer al camino local existente. Si la respuesta trae datos (`data.length > 0`), usarlos
      como `list` inicial y guardarlos en `localStorage` (igual que hace `handleLoad` en
      `SupabaseSync.tsx`); si la respuesta está vacía, falla, no hay sesión, o hay pendientes,
      seguir con el camino 100% local que ya existe hoy (sin romperlo).
- [x] 2.4 Exponer en el valor de retorno de `useTransactions()` el conteo de pendientes (ej.
      `pendientesDeSubir: number`) para que la UI pueda mostrar el aviso de la tarea 4.2.

## 3. `useTransactions()` — escritura en vivo

- [x] 3.1 `append`: después de escribir en `localStorage` (como hoy), llamar a
      `crearTransaccionEnNube` por cada fila nueva en paralelo (`Promise.all`, no bloquea la UI).
      Si una llamada falla, agregar ese id al set de pendientes y mostrar un toast de aviso (no
      revertir el cambio local).
- [x] 3.2 `update`/`replace`: después de escribir en `localStorage`, llamar a
      `actualizarTransaccionEnNube` con el `updated_at` que se tenía localmente para esa fila
      (hace falta empezar a guardar `updated_at` en el `Transaction` local — ver tarea 3.4). Si la
      respuesta es `conflict: true`, mostrar un aviso específico ("alguien más modificó esta fila,
      recárgala antes de volver a intentar") y marcar el id como pendiente; si es otro error (red),
      tratarlo igual que en 3.1.
- [x] 3.3 `remove`/`removeMany`: después de quitar de `localStorage`, llamar a
      `eliminarTransaccionEnNube` por cada id. Mismo manejo de fallos que 3.1 (nota: si falla,
      queda pendiente "borrar" — al reintentar con "Subir a nube" esto NO se corrige solo, porque
      ese botón nunca borra remoto; ver design.md Non-Goals — dejar un comentario en el código
      explicando esta limitación conocida, no intentar arreglarla aquí).
- [x] 3.4 Extender el tipo `Transaction` (o un mapa paralelo) para rastrear el `updated_at` que
      llegó de Supabase por fila, necesario para el chequeo de la tarea 3.2. Si una fila nunca se
      sincronizó (todavía no tiene `updated_at` de servidor), `actualizarTransaccionEnNube` se
      comporta como creación (mismo camino que 3.1) en vez de intentar un `UPDATE` con fila
      inexistente.
- [x] 3.5 `duplicateAfter`: usa el mismo camino que `append` para la copia nueva (comparten
      `persist`, confirmar que la llamada de red se dispara igual sin duplicar lógica).
- [x] 3.6 `replaceAll` explícitamente NO dispara llamadas de red individuales (ver design.md,
      decisión 3) — confirmar con un comentario corto por qué, para que no se "arregle" por error
      después.

## 4. UI — avisos

- [x] 4.1 Mientras se está cargando desde la nube al abrir Transacciones, mostrar un indicador de
      carga breve (reusar el patrón de `loading`/`Loader2` ya usado en `SupabaseSync.tsx`).
- [x] 4.2 Si `pendientesDeSubir > 0`, mostrar un aviso visible y persistente en la pestaña
      Transacciones (texto: cuántos cambios no se compartieron todavía) con un atajo directo al
      botón "Subir a nube" existente en "Copia en la nube".
- [x] 4.3 Mensaje de error claro y en español cuando `actualizarTransaccionEnNube` devuelve
      `conflict: true` (toast, no `alert`/`confirm` bloqueante).

## 5. Verificación

- [x] 5.1 `npx tsc --noEmit` y `npm run build` sin errores.
- [x] 5.2 Confirmar que "Subir a nube" / "Cargar desde nube" / "Subir [mes] a la nube" siguen
      funcionando exactamente igual que antes (no se tocó `handleSync`/`handleLoad`/
      `handleSyncMes` en `SupabaseSync.tsx`, ni `syncTransactionsToSupabase`/
      `loadTransactionsFromSupabase`).
- [ ] 5.3 **Pendiente, requiere la app desplegada**: con dos sesiones reales (Nancy y Manuela, o
      dos pestañas con dos cuentas), confirmar que crear una transacción en una aparece al abrir
      Transacciones en la otra, y que editar la misma fila casi al mismo tiempo desde ambas
      produce el aviso de conflicto en una de las dos sin perder el cambio de la que ganó. No se
      puede verificar desde este entorno de desarrollo por falta de salida de red hacia Supabase.
