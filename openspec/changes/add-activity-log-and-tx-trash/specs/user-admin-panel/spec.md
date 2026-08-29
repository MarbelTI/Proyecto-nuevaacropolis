## Purpose

Darle a super_admin un solo lugar para administrar quién tiene acceso al sistema: ver a todas
las personas registradas (no solo las que esperan aprobación), ayudarlas a recuperar su
contraseña, y desde ahí mismo entrar al registro de actividad y a la papelera de transacciones.

## ADDED Requirements

### Requirement: Lista completa de cuentas
El sistema SHALL mostrar a super_admin la lista de todas las cuentas registradas (aprobadas y
pendientes), con su correo, rol, estado y la fecha de su última conexión.

#### Scenario: Super_admin abre el panel de usuarios
- **WHEN** super_admin entra al panel de usuarios
- **THEN** ve a todas las personas registradas, no solo a las que esperan aprobación

### Requirement: Enviar enlace para restablecer contraseña
El sistema SHALL permitir a super_admin pedir, para cualquier cuenta, que Supabase le envíe un
correo con un enlace para que esa persona defina su propia contraseña nueva. El sistema SHALL
NOT permitir que super_admin defina o vea la contraseña de otra persona directamente.

#### Scenario: Super_admin pide un enlace de restablecimiento
- **WHEN** super_admin elige "Enviar enlace para restablecer contraseña" para una cuenta
- **THEN** esa persona recibe un correo de Supabase con el enlace, y super_admin no ve ni
  define ninguna contraseña en el proceso

### Requirement: Acceso restringido a super_admin
El sistema SHALL mostrar el panel de usuarios, el registro de actividad y la papelera de
transacciones únicamente a cuentas con rol super_admin.

#### Scenario: Un rol distinto intenta entrar
- **WHEN** una cuenta que no es super_admin intenta acceder al panel de usuarios
- **THEN** el sistema no le muestra la pestaña ni le permite la acción
