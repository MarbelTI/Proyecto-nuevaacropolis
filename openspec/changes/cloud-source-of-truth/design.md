## Context

Ver proposal.md - Why. Puntos verificados en el código real que condicionan el diseño:

- `useTransactions()` (`src/lib/lists-store.ts`) es hoy un hook puramente local: lee/escribe
  `localStorage` (clave `lector_ocr_transacciones_v1`), ordena por fecha en `persist()`, y genera
  ids con `nuevoId()` (`crypto.randomUUID()` real — ya compatible con la columna `uuid` de
  Supabase, sin cambios ahí). Se instancia UNA sola vez, en `routes/index.tsx:122`, y el objeto
  resultante se pasa como prop a todos los tabs — no hay una segunda instancia en ningún otro
  archivo. Esto significa que se puede extender el hook en el lugar sin crear una fuente de
  estado paralela.
- La tabla `public.transactions` ya tiene `updated_at timestamptz` mantenido por un trigger
  (`update_updated_at()`, migración `20260716000001`) que lo actualiza en cada `UPDATE` — la base
  para el bloqueo optimista YA EXISTE, no hace falta una migración nueva para eso.
- `syncTransactionsToSupabase` (bulk upsert) y `loadTransactionsFromSupabase` (bulk read, paginado)
  ya existen y quedan intactas para "Subir a nube" / "Cargar desde nube". Pero el flujo masivo de
  subida NUNCA borra en Supabase lo que se borró localmente (solo hace `upsert`, nunca `delete`) —
  es una limitación ya existente, no introducida por este cambio, y separada del problema que este
  cambio soluciona (no se corrige aquí: ver Non-Goals).
- No existe hoy ninguna función de servidor que borre una fila de `transactions` en Supabase
  (`moverTransaccionAPapelera` solo inserta una COPIA en `transactions_papelera`; el borrado real
  de `transactions` nunca pasa por el servidor hoy). Hace falta una función nueva para esto.
- `getAccessToken()` (patrón ya usado en `SupabaseSync.tsx`, vía `supabase.auth.getSession()`) es
  reusable tal cual dentro de `lists-store.ts` sin pasar props nuevas desde `routes/index.tsx`.
- `auth-guard.ts` ya expone `canManageFinanzas`/`canReadFinanzas`; las funciones de servidor nuevas
  reusan exactamente esa misma comprobación, no se inventa un permiso nuevo.

## Goals / Non-Goals

**Goals:**
- Que abrir Transacciones muestre lo que de verdad hay en Supabase, no una copia local vieja.
- Que crear/editar/eliminar una transacción quede en Supabase sin depender de un botón manual.
- Que dos ediciones simultáneas sobre la MISMA fila no se pisen en silencio.
- Que perder la conexión a mitad de sesión no bloquee el trabajo ni pierda cambios locales.

**Non-Goals:**
- Realtime/websockets para ver el cambio de otra persona sin recargar (paso 2, pospuesto —
  ver proposal.md).
- Cola de reintentos automáticos para reenviar cambios offline en segundo plano. El respaldo ante
  "me quedé sin internet" sigue siendo el botón manual "Subir a nube" que ya existe.
- Corregir que el flujo masivo ("Subir a nube") no borra en Supabase lo que se borró localmente.
  Es un problema preexistente, de otro flujo; no se toca en este cambio.
- Aplicar el mismo tratamiento a alumnos, tasas BCV o asistencias — quedan local-first con
  sincronización manual, igual que hoy.
- Resolver el choque entre "alguien edita una fila" y "alguien más la elimina" al mismo tiempo
  (ver Risks) — caso raro, se acepta la simplificación de que borrar gana.

## Decisions

**1. Tres funciones de servidor nuevas en `transactions.functions.ts`, fila por fila — no
reutilizar `syncTransactionsToSupabase` (bulk) para esto.**
`crearTransaccionEnNube`, `actualizarTransaccionEnNube` (con el chequeo de `updated_at`) y
`eliminarTransaccionEnNube`. Alternativa considerada: llamar a `syncTransactionsToSupabase` con
un arreglo de una sola fila (técnicamente funciona para crear/editar, ya que es un `upsert`
genérico). Se descarta porque esa función no sabe hacer el chequeo de bloqueo optimista (no
compara `updated_at`) ni borrar — meterle esa lógica la convertiría en dos funciones distintas
disfrazadas de una, y "Subir a nube" (que sí debe poder pisar sin preguntar, es una subida masiva
deliberada) dejaría de comportarse igual. Mantener ambas separadas es más simple de leer que una
función con modos.

**2. El bloqueo optimista se implementa como `UPDATE ... WHERE id = $1 AND updated_at = $2`,
sin columna de versión nueva.** `updated_at` ya existe y ya se actualiza solo por trigger en cada
UPDATE — es exactamente la marca de tiempo que hace falta para "¿cambió esto desde que lo leí?".
Alternativa considerada: agregar una columna `version integer` incremental (patrón clásico de
locking optimista). Se descarta: `updated_at` ya cumple el mismo papel y agregar `version` sería
una columna y una migración nuevas para resolver algo que el esquema actual ya resuelve.
Si el `UPDATE` afecta 0 filas, el servidor responde `{ ok: false, conflict: true }`; si afecta 1,
devuelve la fila actualizada completa (con su `updated_at` nuevo) para que el cliente actualice su
copia local sin tener que recargar todo.

**3. `useTransactions()` se extiende en el mismo archivo (`lists-store.ts`), no se crea un hook
paralelo.** Al tener un solo punto de instanciación (`routes/index.tsx:122`), no hay riesgo de dos
fuentes de estado divergiendo. El hook pasa a:
   - Al montar: si hay sesión + `navigator.onLine` y **no** hay cambios locales pendientes de
     subir (ver decisión 4), llamar a `loadTransactionsFromSupabase` (ya existe, reutilizada tal
     cual) y usar ese resultado como `list` inicial, reemplazando lo que hubiera en
     `localStorage`. Si falla, no hay sesión, o hay pendientes, usar `localStorage` como hoy.
   - En `append`/`update`/`replace`/`remove`/`removeMany`/`duplicateAfter`: seguir escribiendo en
     `localStorage` de inmediato (igual que hoy, nunca se espera a la red para que la UI responda),
     y además disparar la llamada de red correspondiente en paralelo. Si la llamada de red falla o
     no hay conexión, la fila/acción se marca como pendiente (decisión 4) y se avisa con un toast;
     la UI local ya reflejó el cambio, no se revierte.
   - `replaceAll` (usado por "Cargar desde nube" y por restaurar desde la papelera) no dispara
     escritura de red por sí mismo — ya es resultado de una operación de red o de una decisión
     explícita de reemplazo masivo, no una edición fila por fila.

**4. Pendientes offline: un `Set<string>` de ids con cambios sin confirmar en Supabase,
guardado en `localStorage` — no una cola con reintentos.** Cuando una escritura de red falla
(offline o error), el id de esa transacción se agrega a ese set. Mientras el set no esté vacío:
   - no se auto-carga desde la nube al abrir (evita descartar un cambio local que nunca llegó a
     subirse),
   - se muestra un aviso persistente ("tienes N cambios sin compartir — usa 'Subir a nube' cuando
     tengas internet"), reusando el botón manual que ya existe para resolverlo.
   Esto cumple el Non-Goal de "no cola de reintentos" sin arriesgarse a perder trabajo offline
   en silencio: es deliberadamente la opción más simple que no sacrifica seguridad de datos.

**5. El conflicto se resuelve mostrando el aviso y dejando la fila como está en pantalla — no se
auto-mezclan los dos cambios.** Alternativa considerada: traer la versión del servidor y abrir un
diálogo de "elige cuál te quedas, campo por campo". Se descarta por complejidad desproporcionada
para un sistema de dos usuarias: alcanza con decirle a quien perdió la carrera que recargue esa
fila y reintente su cambio a mano.

## Risks / Trade-offs

- [Riesgo] Entre que alguien carga una transacción para editarla y la guarda, otra persona la
  **elimina** (no la edita) — el `UPDATE ... WHERE updated_at = $2` no detecta eliminaciones,
  solo ediciones, así que el `UPDATE` simplemente afecta 0 filas (igual que un conflicto de
  edición) y el mensaje de error sería el mismo ("alguien más modificó esto") aunque en realidad
  la fila ya no existe. → *Mitigación*: aceptado tal cual — el mensaje sigue siendo honesto en
  espíritu ("esto ya no es lo que tenías cargado"), y distinguir "editado" de "eliminado" exigiría
  una consulta extra por cada conflicto para un caso que, con dos usuarias, es raro.
- [Riesgo] Cada acción (crear/editar/eliminar) ahora depende de una llamada de red para quedar
  compartida; en una conexión lenta la persona ve su cambio aplicado localmente pero puede tardar
  en confirmarse. → *Mitigación*: la UI nunca espera a la red para reflejar el cambio (decisión 3);
  el aviso de "pendiente" solo aparece si la llamada de verdad falla, no mientras está en curso.
- [Riesgo] Si `actualizarTransaccionEnNube` no existe todavía y alguien edita algo que SÍ se migró
  (ya tiene fila en Supabase) justo durante el despliegue de este cambio, podría haber una ventana
  rara. → *Mitigación*: no aplica distinto a cualquier despliegue de este proyecto — Vercel
  reemplaza la versión servida de una sola vez, no hay versión mixta en producción.
- [Riesgo] Primera vez que alguien sin NINGUNA transacción subida a Supabase todavía abre la app
  con este cambio: `loadTransactionsFromSupabase` devuelve una lista vacía y se le reemplazaría
  su `localStorage` (que sí tiene datos) por "nada". → *Mitigación*: igual que hoy hace
  `handleLoad` en `SupabaseSync.tsx` (`if (txResult.data.length > 0)` antes de reemplazar) — la
  carga automática al montar NO reemplaza `localStorage` si Supabase devuelve una lista vacía.

## Migration Plan

No hay cambio de esquema (ver Context: `updated_at` ya existe). Pasos:

1. Agregar las tres funciones de servidor nuevas (`crearTransaccionEnNube`,
   `actualizarTransaccionEnNube`, `eliminarTransaccionEnNube`) en `transactions.functions.ts`.
2. Extender `useTransactions()` en `lists-store.ts` según la decisión 3-4.
3. Build/deploy normal a Vercel — no hay pasos manuales de base de datos.

**Rollback**: si algo sale mal, revertir el commit y redeploy — no hay migración de datos que
deshacer, porque no se cambió el esquema ni se movieron datos entre tablas.

**Verificación real**: igual que `add-monthly-cloud-sync`, este entorno de desarrollo no tiene
salida de red hacia Supabase — la prueba de "dos personas editando a la vez" solo se puede hacer
desde la app ya desplegada, con dos sesiones reales (Nancy + Manuela, o Nancy en dos pestañas con
dos cuentas).
