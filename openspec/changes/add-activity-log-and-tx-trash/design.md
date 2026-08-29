## Context

Ver proposal.md - Why. Puntos verificados en el código real que condicionan el diseño:

- Las transacciones son **locales por dispositivo** (`useTransactions()` en `lists-store.ts`,
  respaldado en `localStorage`). `tx.remove`/`removeMany`/`replace` nunca tocan el servidor.
  Solo existe una sincronización manual y completa ("Subir a nube" / "Cargar desde nube",
  `SupabaseSync.tsx`) que hace `upsert` — nunca hay un `delete` hacia Supabase hoy.
- Decisión ya tomada con Nancy (ver conversación): la papelera debe ser **compartida en la
  nube**, no local por navegador, porque el incidente real fue una persona borrando algo en
  SU equipo y Nancy necesitando verlo y deshacerlo desde el suyo.
- El proyecto evita a propósito la `service_role key` en todo el código (`auth-guard.ts`,
  `transactions.functions.ts`) aunque la llave existe sin usar en `.env` local — cualquier
  operación nueva debe seguir el mismo patrón: anon key + el `access_token` de la sesión +
  RLS, nunca `service_role`.
- El panel `CuentasPendientes.tsx` ya establece el patrón a seguir para "solo super_admin":
  un server function que valida `session.role === "super_admin"`, un cliente Supabase con el
  `access_token` del usuario, y una tabla/Select reutilizando componentes de `ui/`.
- `useAuth()` (`AuthDialog.tsx`) llama a `authCallback` no solo al iniciar sesión, sino en
  cada carga de página y en cada evento de `onAuthStateChange` (incluye refrescos de token).
  Registrar actividad ahí tal cual generaría un log de "inicios de sesión" varias veces por
  hora sin que la persona haya vuelto a entrar.

## Goals / Non-Goals

**Goals:**
- Que una transacción eliminada sea recuperable por super_admin desde cualquier equipo.
- Que super_admin pueda ver, a nivel de resumen, quién hizo qué y cuándo en las acciones que
  ya llegan al servidor.
- Que super_admin pueda ver todas las cuentas y ayudarlas a recuperar su contraseña sin tocar
  la `service_role key`.

**Non-Goals:**
- Deshacer ediciones (solo eliminar/restaurar transacciones).
- Papelera o registro de actividad para alumnos, asistencias o tasas BCV en esta iteración.
- Detalle campo por campo de cada cambio (eso sería una auditoría completa, mucho más cara de
  mantener y de leer; el resumen por acción ya resuelve "a quién le pregunto / qué reviso").
- Un job/cron real para purgar la papelera.
- Que super_admin fije contraseñas directamente, o cualquier uso de `auth.admin.*` /
  `service_role key`.
- Ejecutar migraciones SQL desde la app.

## Decisions

**1. Papelera como tabla nueva `transactions_papelera`, no una columna `deleted_at` en
`transactions`.** La tabla `transactions` en Supabase hoy no se mantiene sincronizada de forma
rutinaria (nadie hace "Subir a nube" todos los días). Si el soft-delete viviera ahí, cualquier
"Cargar desde nube" tendría que filtrar filas borradas, y una fila borrada en un dispositivo
pero nunca subida no tendría ninguna copia en la nube que marcar. Una tabla aparte, escrita
directamente al momento de eliminar (independiente de si el resto del libro se sincronizó
alguna vez), es más simple y no interfiere con el `upsert` existente.

**2. Eliminar sigue siendo instantáneo y local; el envío a la papelera es "mejor esfuerzo".**
`tx.remove`/`removeMany` no cambian: la fila desaparece de inmediato de la pantalla, con o sin
internet (igual que hoy). Justo después, si hay conexión y sesión activa, se llama a una nueva
función de servidor que inserta la copia en `transactions_papelera`. Sin internet, se avisa con
un toast de que esa eliminación no quedó respaldada en la nube. Alternativa descartada: bloquear
el borrado hasta confirmar la escritura en la nube — se descarta porque el resto de la app
tolera trabajar sin internet (`useEstaEnLinea`) y frenar un borrado local por eso sería un paso
atrás en la experiencia sin ganar nada (la persona igual puede querer borrar la fila de su
pantalla ya mismo).

**3. Restaurar reinstala la fila en el equipo de quien restaura, no la reparte sola.** Al
restaurar, la fila sale de la papelera y se agrega a la lista local de super_admin (con su
`id` original). Si hace falta que llegue también a otros dispositivos, se usa el mecanismo que
ya existe ("Subir a nube" / "Cargar desde nube"). Alternativa descartada: hacer que restaurar
también actualice la tabla `transactions` en la nube automáticamente — se descarta porque
introduciría sincronización automática donde hoy todo es manual, un cambio de arquitectura
mayor que no pidió Nancy.

**4. Purga diferida, no un cron.** Al abrir la vista de papelera, la función que lista también
borra (`delete ... where eliminado_en < now() - interval '30 days'`) antes de devolver los
resultados. Coincide con lo que Nancy pidió explícitamente ("no hace falta un cron real") y
con que este proyecto no tiene infraestructura de jobs en background.

**5. Un solo evento de "inicio de sesión" por sesión real.** En vez de instrumentar
`authCallback` (que se llama en cada carga de página y refresco de token), se agrega una
llamada explícita desde `useAuth()` solo cuando el evento de Supabase es `SIGNED_IN` con un
`access_token` nuevo (login real) — no en la validación de sesión existente al recargar la
página. Esa llamada también actualiza `profiles.ultimo_acceso`.

**6. `activity_log` como tabla única de resumen**, no una tabla por módulo: `actor_id`,
`actor_email`, `actor_role`, `accion` (texto corto, ej. `"transacciones:subir"`,
`"sesion:iniciar"`, `"papelera:restaurar"`), `resumen` (texto libre corto, ej. `"5 filas"`),
`created_at`. Cada función de servidor que ya existe (sync de transacciones/alumnos/
asistencias/tasas BCV, aprobar/rechazar cuenta) gana una inserción a esta tabla después de la
operación principal, envuelta en su propio `try/catch` — si el log falla, la operación real
(que ya tuvo éxito) no se revierte ni se le informa un error a quien la hizo.

**7. Restablecer contraseña usa `supabase.auth.resetPasswordForEmail(correo)` desde el
cliente**, con la anon key, sin pasar por un server function nuevo — es la misma llamada
pública que ya usa la app para "olvidé mi contraseña" (ver `forgotPassword` en `AuthDialog.tsx`
si existe con ese nombre; si no, se implementa igual que un `login` fallido de contraseña).
Importante dejarlo explícito: esta llamada NO requiere ningún permiso especial — cualquiera que
conozca el correo puede dispararla, es pública por diseño de Supabase. Que el botón viva en el
panel de super_admin es una comodidad de flujo de trabajo, no un control de seguridad nuevo.

**8. RLS de las tablas nuevas sigue el patrón ya usado en `bcv_rates`/`profiles`**: políticas de
`select` que exigen `exists (select 1 from public.profiles p where p.id = auth.uid() and
p.aprobado and p.role = 'super_admin')`; políticas de `insert` abiertas a cualquier cuenta
aprobada (son tablas de registro, de bajo riesgo, y cada función de servidor ya valida el
permiso real sobre el recurso subyacente antes de llegar a insertar el log).

**9. El panel de usuarios amplía `CuentasPendientes.tsx`** (o lo reemplaza por un componente
hermano que reutiliza sus mismos patrones: server function + tabla + `Select` de rol) en vez de
escribir una pantalla nueva desde cero — mantiene consistencia visual y de permisos con lo que
ya existe.

## Risks / Trade-offs

- [Riesgo] Alguien elimina una fila sin internet → no queda copia en la papelera si nunca
  vuelve a estar en línea antes de cerrar la pestaña. → *Mitigación*: aviso inmediato con
  toast explicando que esa eliminación no se respaldó; queda documentado que la papelera cubre
  el caso con conexión, que es el caso común.
- [Riesgo] `resetPasswordForEmail` es una llamada pública, no protegida por rol. → *Mitigación*:
  se documenta con claridad que el control real es "quién tiene acceso al correo de esa
  persona", igual que en cualquier sistema con recuperación de contraseña por correo.
- [Riesgo] Restaurar solo actualiza el equipo de quien restaura. → *Mitigación*: mismo modelo
  manual que ya usa toda la app; se le indica a super_admin que si hace falta que llegue a
  todos, use "Subir a nube" después de restaurar.
- [Riesgo] Registrar de más (ruido) si se engancha el log al lugar equivocado del ciclo de
  sesión. → *Mitigación*: decisión explícita de enganchar solo el evento `SIGNED_IN` real, no
  la validación periódica de sesión.

## Migration Plan

Una migración nueva de Supabase (siguiendo el estilo de las existentes en
`supabase/migrations/`) que agrega: tabla `transactions_papelera`, tabla `activity_log`,
columna `profiles.ultimo_acceso`, y sus políticas RLS. **No se ejecuta contra el proyecto real
hasta que Nancy avise** — mismo criterio que las migraciones anteriores de este proyecto
(`bcv_rate_euro`, `transaction_revisar`). Rollback: eliminar las dos tablas nuevas y la columna;
no toca `transactions` ni `profiles` en nada existente.
