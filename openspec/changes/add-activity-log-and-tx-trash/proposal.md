## Why

Nancy (super_admin) le dio acceso de prueba a Ricardo (rol director) y él llegó a eliminar
la primera transacción de enero antes de que se corrigiera su permiso de solo lectura. Nancy no
tenía forma de saber quién se había registrado a tiempo para revisarlo, y la fila se perdió sin
ninguna posibilidad de recuperación: hoy las transacciones viven solo en el `localStorage` del
navegador de cada quien, sin papelera ni historial, y nadie más que super_admin puede ver quién
entra al sistema ni qué hizo. Con más personas usando la app (director, celadores, control de
estudio), este mismo problema se va a repetir.

## What Changes

- Al eliminar una transacción (fila individual, "eliminar sobrantes" de duplicados, o "eliminar
  lo filtrado"), la fila ya no desaparece sin dejar rastro: se guarda automáticamente en una
  papelera en Supabase (además de quitarse de la lista local de quien la borró), visible y
  restaurable solo por super_admin desde cualquier equipo. Se purga sola pasados 30 días.
- Nueva tabla de registro de actividad en Supabase: cada acción que ya pasa por el servidor
  (iniciar sesión, subir transacciones/alumnos/asistencias/tasas BCV a la nube, aprobar o
  rechazar una cuenta, mover o restaurar una fila de la papelera) queda anotada con quién, cuándo,
  qué módulo y un resumen (ej. "5 filas") — no el detalle campo por campo de qué cambió.
- Módulo de usuarios ampliado (solo super_admin): lista de **todos** los perfiles con su rol,
  estado y última vez que entraron (hoy `CuentasPendientes` solo muestra las cuentas sin aprobar);
  botón para enviarle a alguien un enlace de restablecer contraseña por correo; y ahí mismo, el
  registro de actividad y la papelera de transacciones.
- **Fuera de alcance, decidido explícitamente con Nancy**: deshacer ediciones (solo eliminar/
  restaurar), papelera para otros módulos (alumnos, asistencias, tasas BCV), detalle campo por
  campo de cada cambio, que super_admin fije contraseñas a mano (requeriría la `service_role key`,
  que este proyecto evita a propósito en todo el código), y ejecutar migraciones SQL desde la app.

## Capabilities

### New Capabilities

- `transactions-trash`: papelera compartida (Supabase) para transacciones eliminadas, con
  restauración y purga automática a los 30 días.
- `activity-log`: registro de actividad del sistema (quién, cuándo, qué módulo, resumen) para
  las acciones que pasan por el servidor.
- `user-admin-panel`: panel de super_admin para ver todas las cuentas (no solo las pendientes),
  su última conexión, enviar enlace de restablecer contraseña, y alojar el registro de actividad
  y la papelera.

### Modified Capabilities

(ninguna — no existen specs previas archivadas en `openspec/specs/`; todo lo de arriba es nuevo)

## Impact

- **Base de datos (Supabase)**: dos tablas nuevas (`transactions_papelera`, `activity_log`) con
  su RLS (insert desde el servidor, lectura solo super_admin); una columna nueva en `profiles`
  para la última conexión. Migración preparada pero **no se ejecuta** hasta que Nancy avise
  (mismo criterio que las migraciones anteriores de este proyecto).
- **Servidor** (`src/lib/api/*.functions.ts`): nuevas funciones para mover/listar/restaurar de
  la papelera y para listar el registro de actividad; una inserción de log agregada a cada función
  de sincronización existente y a `authCallback`/login y `resolverCuentaPendiente`.
- **Cliente**: `TransactionsTab.tsx` (los tres puntos de eliminación pasan por la nueva función
  en vez de solo `tx.removeMany`/`tx.remove` locales); `CuentasPendientes.tsx` se amplía o se
  reemplaza por el panel de usuarios nuevo; `routes/index.tsx` para la nueva pestaña/sección.
- Nada de esto cambia el flujo de sincronización manual existente ("Subir a nube" / "Cargar desde
  nube") ni requiere la `service_role key`.
