## Purpose

Evitar que una transacción eliminada por error (o por alguien que no debía) se pierda para
siempre, dando a super_admin una papelera compartida en la nube desde la que puede ver y
restaurar lo que cualquier persona borró, sin importar en qué computadora lo hizo.

## ADDED Requirements

### Requirement: Eliminar una transacción la mueve a la papelera, no la borra
Al eliminar una transacción (fila individual, "eliminar sobrantes" de duplicados, o "eliminar
lo filtrado") con conexión a internet, el sistema SHALL guardar una copia completa de la fila
en la papelera en la nube (con quién la eliminó, cuándo, y por cuál de las tres acciones) además
de quitarla de la lista local de quien la eliminó.

#### Scenario: Eliminar una fila individual con internet
- **WHEN** una persona con permiso de eliminar transacciones borra una fila estando en línea
- **THEN** la fila desaparece de su tabla y queda guardada en la papelera en la nube con su
  contenido completo, quién la borró y la fecha/hora

#### Scenario: Eliminar sin conexión a internet
- **WHEN** una persona elimina una transacción sin internet disponible
- **THEN** la fila se quita de su lista local igual que hoy, y el sistema le avisa que esa
  eliminación no quedó guardada en la papelera por falta de conexión

### Requirement: Solo super_admin ve y restaura la papelera
El sistema SHALL restringir la vista y la restauración de la papelera al rol super_admin.
Cualquier otro rol, incluido quien eliminó la fila, no puede ver el contenido de la papelera.

#### Scenario: Super_admin abre la papelera
- **WHEN** super_admin entra al módulo de usuarios y abre la papelera de transacciones
- **THEN** ve todas las filas eliminadas que no se han purgado, con quién las eliminó, cuándo,
  y por cuál acción

#### Scenario: Otro rol intenta acceder
- **WHEN** una cuenta que no es super_admin intenta leer la papelera (por la interfaz o
  directamente contra la base)
- **THEN** el sistema deniega el acceso

### Requirement: Restaurar una fila de la papelera
El sistema SHALL permitir a super_admin restaurar una fila de la papelera, lo que la devuelve
a la lista de transacciones visible en su propio equipo y la quita de la papelera.

#### Scenario: Restaurar una fila
- **WHEN** super_admin restaura una fila de la papelera
- **THEN** la fila aparece de nuevo en su tabla de Transacciones con todos sus datos originales,
  y deja de estar en la papelera

### Requirement: Purga automática a los 30 días
El sistema SHALL purgar (eliminar de forma permanente) cualquier fila de la papelera con más
de 30 días desde que se eliminó, sin necesidad de que nadie lo haga a mano.

#### Scenario: Fila con más de 30 días en la papelera
- **WHEN** una fila de la papelera lleva más de 30 días desde su fecha de eliminación
- **THEN** el sistema la borra de forma permanente y deja de aparecer en la papelera
