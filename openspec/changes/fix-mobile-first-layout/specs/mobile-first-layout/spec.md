## Purpose

Garantizar que el camino de registrar un pago (iniciar sesión, abrir
Transacciones, crear o editar un movimiento, guardarlo) funcione completo y
sin elementos desbordados ni imposibles de tocar en un celular, para que
quien recibe un pago pueda anotarlo en el momento sin necesitar una
computadora.

## ADDED Requirements

### Requirement: Encabezado sin desbordamiento horizontal
El sistema SHALL mostrar el encabezado (logo, título, tasas BCV, sesión) sin
que ningún elemento quede cortado o fuera del área visible en anchos de
pantalla desde 360px.

#### Scenario: Encabezado en un celular
- **WHEN** se abre la aplicación desde un celular de ancho típico (360-430px)
- **THEN** el logo, el título, las dos tasas BCV (Bs/$ y Bs/€) y el acceso a
  sesión son visibles completos, apilados o envueltos en varias líneas si
  hace falta, sin que ninguno quede cortado por el borde de la pantalla

### Requirement: Registrar una transacción completa desde el celular
El sistema SHALL permitir crear o editar una transacción completa desde un
celular: todos los campos del formulario deben ser visibles y usables sin
desbordamiento horizontal, con o sin la calculadora integrada abierta.

#### Scenario: Crear un movimiento nuevo sin la calculadora
- **WHEN** se abre el formulario de nueva transacción desde un celular
- **THEN** todos los campos (fecha, tipo, categoría, descripción, moneda,
  monto, tasa, etc.) son visibles y editables sin scroll horizontal

#### Scenario: Abrir la calculadora integrada desde el celular
- **WHEN** se abre la calculadora desde el formulario de una transacción en
  un celular
- **THEN** la calculadora se muestra de forma usable (apilada debajo del
  formulario, o en su propia vista) en vez de una columna fija que no cabe
  junto al formulario

#### Scenario: Botón de tasa sugerida con texto largo
- **WHEN** el botón de tasa sugerida de la calculadora muestra un texto largo
  (ej. "Tasa Euro del 28/08/2026") en una pantalla angosta
- **THEN** el texto se envuelve o se acomoda sin cortar el botón ni empujar
  el campo de tasa fuera de pantalla

### Requirement: Acciones de fila con tamaño táctil suficiente
El sistema SHALL mostrar los botones de acción por fila de la tabla de
Transacciones (editar, duplicar, eliminar) con un tamaño que se pueda tocar
con el dedo de forma confiable en un celular.

#### Scenario: Tocar el botón de editar en el celular
- **WHEN** alguien usa el celular para tocar el botón de editar de una fila
  de la tabla de Transacciones
- **THEN** el botón tiene un área táctil de al menos ~44×44px, evitando
  tocar por error el botón vecino
