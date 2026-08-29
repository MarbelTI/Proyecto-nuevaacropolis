## 1. Base de datos (Supabase)

- [x] 1.1 Migración nueva en `supabase/migrations/`: tabla `transactions_papelera` (copia
      completa de la fila + `eliminado_por`, `eliminado_por_email`, `eliminado_en`, `accion`
      con check `in ('fila', 'sobrantes', 'rango')`), tabla `activity_log` (`actor_id`,
      `actor_email`, `actor_role`, `accion`, `resumen`, `created_at`), y columna
      `profiles.ultimo_acceso timestamptz`.
- [x] 1.2 RLS de `transactions_papelera` y `activity_log`: `select` restringido a super_admin
      (reutilizando el helper `public.is_super_admin()` ya existente); `insert` abierto a
      cualquier cuenta aprobada (`p.aprobado`), mismo patrón que la política de `bcv_rates`.
- [x] 1.3 **No ejecutar la migración contra el proyecto real** — dejarla preparada y esperar
      aviso explícito de Nancy, igual que las migraciones anteriores de este proyecto.

## 2. Papelera de transacciones (servidor)

- [x] 2.1 `transactions.functions.ts`: nueva función `moverTransaccionAPapelera` — valida sesión
      y `canManageFinanzas`, inserta la fila completa en `transactions_papelera` con quién y
      cuándo, y registra la acción en `activity_log`. No falla la respuesta si el insert del
      log falla (envolver en `try/catch` propio).
- [x] 2.2 Nueva función `listarPapelera` — valida `session.role === "super_admin"`, antes de
      leer purga (`delete ... where eliminado_en < now() - interval '30 days'`) y devuelve el
      resto.
- [x] 2.3 Nueva función `restaurarDePapelera` — valida `session.role === "super_admin"`, borra
      la fila de `transactions_papelera` y la devuelve completa a quien llamó (para que el
      cliente la reinserte en su lista local).

## 3. Papelera de transacciones (cliente)

- [x] 3.1 `TransactionsTab.tsx`: el botón de eliminar por fila, "Eliminar sobrantes" y
      "Eliminar lo filtrado" siguen quitando la fila localmente de inmediato (sin cambios en
      esa parte) y además, si hay conexión (`useEstaEnLinea`) y sesión activa, llaman a
      `moverTransaccionAPapelera` con la fila completa y la acción correspondiente.
- [x] 3.2 Sin conexión: mostrar un toast explicando que esa eliminación no quedó respaldada en
      la papelera de la nube por falta de internet.
- [x] 3.3 Vista de papelera (dentro del panel de usuarios, ver sección 5): tabla con fecha de
      eliminación, quién la eliminó, acción, y los datos de la fila; botón "Restaurar" por fila
      que llama a `restaurarDePapelera` y agrega el resultado a `tx.list` local (mismo `id`
      original) vía el hook `useTransactions()`.
- [x] 3.4 Confirmado: `replaceAll` (no `append`, que reasigna `id` nuevo a cada fila) es lo que
      usa el restore — persiste el array tal cual, solo reordena por fecha (`persist` en
      `lists-store.ts`), sin descartar la fila reinsertada aunque su `id` ya existiera antes.

## 4. Registro de actividad (servidor)

- [x] 4.1 Helper compartido en `src/lib/api/activity-log.ts` (`registrarActividad`) para
      insertar en `activity_log` desde cualquier función de servidor, con `try/catch` interno
      que nunca revienta la operación principal.
- [x] 4.2 Enganchar el helper después de una sincronización exitosa en: `syncTransactionsToSupabase`,
      `syncBcvRatesToSupabase` (`transactions.functions.ts`), el sync de alumnos
      (`students.functions.ts`), el sync de asistencias (`attendance.functions.ts`).
- [x] 4.3 Enganchar el helper en `resolverCuentaPendiente` (aprobar/rechazar cuenta) y en
      `moverTransaccionAPapelera`/`restaurarDePapelera`.
- [x] 4.4 Nueva función `registrarInicioSesion` — actualiza `profiles.ultimo_acceso` e inserta
      en `activity_log` la acción `"sesion:iniciar"`.
- [x] 4.5 `AuthDialog.tsx` / `useAuth()`: llamar a `registrarInicioSesion` únicamente cuando
      `onAuthStateChange` reporta `SIGNED_IN` con una sesión nueva — NO en la validación de
      sesión que corre en cada carga de página ni en refrescos de token.
- [x] 4.6 Nueva función `listarActividad` — valida `session.role === "super_admin"`, devuelve
      el registro filtrable por persona y rango de fechas (filtrar en el cliente o con
      parámetros simples, lo que sea más directo con lo que ya existe).

## 5. Panel de usuarios (cliente)

- [x] 5.1 `CuentasPendientes.tsx` reemplazado por `PanelUsuarios.tsx` (componente hermano, mismos
      patrones: server function + tabla + `Select` de rol) que lista TODAS las cuentas —correo,
      rol, estado, última conexión— además de las pendientes de aprobar.
- [x] 5.2 Botón "Enviar enlace para restablecer contraseña" por cuenta. Nota: en vez de importar
      `forgotPassword` de `AuthDialog.tsx` (es un closure de `useAuth()`, no una función de
      módulo exportable), `PanelUsuarios.tsx` llama `supabase.auth.resetPasswordForEmail`
      directo — misma llamada pública, mismo patrón que describe design.md.
- [x] 5.3 Dentro del mismo panel: pestañas "Actividad" (tabla de `listarActividad`, filtro por
      correo y por fecha) y "Papelera" (sección 3.3).
- [x] 5.4 `routes/index.tsx`: `PanelUsuarios` reemplaza a `CuentasPendientes` en el header, con
      el mismo condicional `auth.role === "super_admin"` que ya tenía.

## 6. Verificación

- [x] 6.1 `npx tsc --noEmit` y `npm run build` sin errores.
- [ ] 6.2 Confirmar en el navegador (con datos reales, cuando haya credenciales de prueba):
      eliminar una fila con internet y verla en la papelera; eliminar sin internet y ver el
      aviso; restaurar una fila y verla de vuelta en Transacciones; que un rol distinto de
      super_admin no vea ni la papelera ni el registro de actividad ni el panel de usuarios.
      **Pendiente** — no hay credenciales de prueba disponibles desde aquí.
- [x] 6.3 Verificado por revisión de código (no ejecutado contra Supabase real, la migración no
      ha corrido): `registrarActividad` envuelve su propio insert en `try/catch` y solo hace
      `console.error`, nunca relanza — un fallo del log no puede propagar un error a las
      funciones de sincronización que lo llaman.
