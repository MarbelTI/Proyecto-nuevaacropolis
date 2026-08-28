## Purpose

Permitir marcar una transacción para que otra persona la revise y corrija,
con una nota de qué hay que aclarar, y que esa marca sea visible y editable
por cualquiera con acceso al sistema — no solo por quien la puso.

## ADDED Requirements

### Requirement: Marcar una transacción para revisión
El sistema SHALL permitir escribir una nota de "revisar" en cualquier
transacción, tanto desde su formulario de edición como con un atajo directo
desde su fila en la tabla de Transacciones, sin tener que abrir el
formulario completo. Una nota vacía SHALL significar que la transacción no
está marcada.

#### Scenario: Marcar una transacción con una nota desde el formulario
- **WHEN** alguien escribe un texto en el campo de revisar de una
  transacción y guarda
- **THEN** el sistema guarda esa nota asociada a esa transacción

#### Scenario: Marcar una transacción al vuelo desde la tabla
- **WHEN** alguien usa el atajo de marcar de una fila sin marcar, en la
  tabla de Transacciones, y escribe una nota corta
- **THEN** el sistema guarda esa nota asociada a esa transacción sin haber
  abierto el formulario completo

#### Scenario: Desmarcar una transacción desde el formulario
- **WHEN** alguien borra el texto del campo de revisar de una transacción
  que ya tenía una nota, y guarda
- **THEN** el sistema queda sin nota para esa transacción, como si nunca se
  hubiera marcado

#### Scenario: Desmarcar una transacción al vuelo desde la tabla
- **WHEN** alguien usa el atajo de marcar de una fila que ya está marcada
- **THEN** el sistema queda sin nota para esa transacción, sin pedir
  confirmación adicional

### Requirement: Visualización en la tabla de Transacciones
El sistema SHALL marcar visualmente, en la tabla de Transacciones, cualquier
fila con una nota de revisión no vacía, distinguible de las otras marcas de
fila que ya existen (la de referencia/selección, y la de fila repetida), y
SHALL mostrar el texto de la nota al pasar el cursor sobre la fila.

#### Scenario: Fila marcada para revisar
- **WHEN** una transacción tiene una nota de revisión
- **THEN** su fila se distingue visualmente de las filas sin marcar, y al
  pasar el cursor se ve el texto de la nota

#### Scenario: Una fila coincide con otro estado a la vez
- **WHEN** una fila marcada para revisar es además la fila de
  referencia/seleccionada, o una fila repetida
- **THEN** ninguna de las marcas queda completamente oculta — se puede
  saber, mirando la fila, que está marcada para revisar además de lo otro

### Requirement: Filtrar solo las transacciones marcadas
El sistema SHALL permitir filtrar la tabla de Transacciones para mostrar
únicamente las filas con una nota de revisión.

#### Scenario: Activar el filtro
- **WHEN** alguien activa el filtro "Solo por revisar"
- **THEN** la tabla muestra únicamente las transacciones con una nota de
  revisión no vacía

### Requirement: La marca viaja con la transacción al exportar e importar
El sistema SHALL incluir la nota de revisión al exportar transacciones a
Excel, y SHALL leerla de vuelta al importar un Excel de transacciones
(reconociendo tanto una columna llamada "Revisar" como una llamada
"Verificar").

#### Scenario: Exportar e importar de vuelta
- **WHEN** se exportan transacciones a Excel y ese mismo archivo se importa
  después (en la misma cuenta o en otra)
- **THEN** las transacciones que tenían una nota de revisión la conservan

#### Scenario: Importar un Excel con la columna "Verificar"
- **WHEN** se importa un Excel de transacciones que trae una columna
  "Verificar" con texto en algunas filas
- **THEN** esas filas quedan marcadas para revisar con ese texto como nota
