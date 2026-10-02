## Why

Hoy SISFIA es "local-first": cada módulo vive en `localStorage` de cada computadora, y Supabase
es solo una copia de respaldo que alguien sube o baja manualmente desde "Copia en la nube". Con
dos personas (Nancy y Manuela) trabajando cada una en su propia computadora, cada una acumula
cambios locales que divergen — quien suba o baje después pisa silenciosamente el trabajo de la
otra, sin aviso. No es viable pedirles que se acuerden de sincronizar manualmente cada vez.

## What Changes

- Al abrir **Transacciones**, la app deja de arrancar desde `localStorage` y carga primero lo que
  haya en Supabase (si hay sesión y conexión). `localStorage` pasa a ser una caché de respaldo
  para cuando no hay internet, no la fuente de verdad.
- Cada alta, edición, duplicado y borrado de una transacción se guarda de inmediato contra
  Supabase (una llamada por fila), además de seguir escribiendo en `localStorage` como hoy. Ya no
  hace falta acordarse de apretar "Subir a nube" para que un cambio quede compartido.
- **BREAKING (de comportamiento, no de datos):** si dos personas editan la MISMA transacción casi
  al mismo tiempo, la segunda escritura ya no sobreescribe en silencio — el sistema la rechaza con
  un aviso ("alguien más modificó esto, recarga para ver el cambio") en vez de perder el cambio
  ajeno. Antes (con `localStorage`) esto no podía ni pasar, porque no había nada compartido que
  pisar.
- Si no hay conexión, la app sigue funcionando en modo local (igual que hoy) y avisa que los
  cambios no se compartieron todavía — no se construye una cola de reintentos automáticos.
- Los botones "Subir a nube" / "Cargar desde nube" (y "Subir [mes] a la nube") se conservan tal
  cual, para el resto de módulos (alumnos, tasas BCV, asistencias) y como respaldo manual general.

## Capabilities

### New Capabilities
- `transactions-live-sync`: las transacciones financieras se leen y escriben directo contra
  Supabase en cada acción (no solo al apretar un botón de sincronizar), con protección ante
  ediciones simultáneas sobre la misma fila.

### Modified Capabilities
(ninguna — no se cambian requisitos de capacidades ya existentes; `monthly-cloud-sync` y
`transactions-trash` no se tocan)

## Impact

- `src/lib/lists-store.ts`: `useTransactions()` pasa a cargar desde Supabase al montar (con
  `localStorage` como respaldo si falla u offline), y sus mutadores (`append`, `update`, `replace`,
  `remove`, `removeMany`, `duplicateAfter`, `replaceAll`) además de escribir local, llaman al
  servidor fila por fila.
- `src/lib/api/transactions.functions.ts`: nuevas funciones de servidor fila-por-fila
  (crear/actualizar/borrar una transacción) con chequeo de `updated_at` para el bloqueo
  optimista. Las funciones de sincronización masiva existentes (`syncTransactionsToSupabase`,
  `loadTransactionsFromSupabase`) NO se eliminan — las sigue usando "Copia en la nube".
- `src/routes/index.tsx`: pasa a esperar la carga inicial desde la nube (con un estado de carga
  visible) en vez de arrancar siempre con lo que haya en `localStorage`.
- Alumnos, tasas BCV y asistencias no cambian de comportamiento en este cambio — siguen
  local-first con sincronización manual, como hoy.
