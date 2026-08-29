## Purpose

Dar a super_admin visibilidad de quién entró al sistema y qué acciones de servidor hizo cada
persona (sincronizar un módulo, aprobar una cuenta, mover o restaurar de la papelera), a nivel
de resumen por acción, para poder identificar rápido a quién le preguntar o qué revertir cuando
algo no cuadra.

## ADDED Requirements

### Requirement: Registrar cada acción que llega al servidor
El sistema SHALL registrar, para cada una de las siguientes acciones, quién la hizo (usuario y
rol), cuándo, y un resumen de qué pasó: iniciar sesión, subir transacciones/alumnos/
asistencias/tasas BCV a la nube, aprobar o rechazar una cuenta, y mover o restaurar una fila de
la papelera de transacciones. El resumen SHALL incluir el módulo y, cuando aplique, la cantidad
de filas afectadas — no el detalle campo por campo de qué cambió en cada fila.

#### Scenario: Alguien sube transacciones a la nube
- **WHEN** una cuenta con permiso sincroniza transacciones a Supabase
- **THEN** el sistema anota quién lo hizo, cuándo, el módulo ("transacciones") y cuántas filas
  se subieron

#### Scenario: Alguien inicia sesión
- **WHEN** una persona inicia sesión correctamente
- **THEN** el sistema anota quién entró y cuándo, una sola vez por inicio de sesión (no en cada
  verificación automática de la sesión mientras sigue abierta)

### Requirement: Solo super_admin lee el registro de actividad
El sistema SHALL restringir la lectura del registro de actividad al rol super_admin.

#### Scenario: Super_admin consulta la actividad
- **WHEN** super_admin abre el registro de actividad
- **THEN** puede ver y filtrar las acciones registradas por persona y por rango de fechas

#### Scenario: Otro rol intenta leerlo
- **WHEN** una cuenta que no es super_admin intenta leer el registro de actividad
- **THEN** el sistema deniega el acceso

### Requirement: No se registran acciones que no llegan al servidor
El sistema SHALL NOT inventar ni aproximar un registro de actividad para acciones que hoy
ocurren solo en el navegador de la persona (por ejemplo, editar o marcar una fila localmente
sin sincronizar). El registro solo cubre lo que efectivamente pasa por una función de servidor.

#### Scenario: Edición local sin sincronizar
- **WHEN** alguien edita o marca una transacción en su navegador y no la sube a la nube
- **THEN** esa acción no aparece en el registro de actividad
