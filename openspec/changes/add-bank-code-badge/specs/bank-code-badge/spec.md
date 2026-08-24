## Purpose

Permitir un código corto y editable por banco/cuenta, que se muestre junto a
la moneda en las tablas de movimientos donde el banco ya es visible, para
identificar el banco de un vistazo sin leer el nombre completo ni abrir un
resumen aparte.

## ADDED Requirements

### Requirement: Código editable por banco
El sistema SHALL permitir asociar a cada banco/cuenta de la lista existente
un código corto (texto libre, pensado para 2-3 caracteres) editable desde
Configuración, independiente del nombre completo del banco.

#### Scenario: Editar el código de un banco existente
- **WHEN** Nancy abre Configuración → Bancos y escribe un código junto a un
  banco de la lista
- **THEN** el sistema guarda ese código asociado a ese banco, sin modificar
  el nombre del banco ni la lista de bancos

#### Scenario: Banco sin código todavía
- **WHEN** un banco de la lista no tiene código asignado
- **THEN** el sistema no rompe ni oculta ese banco en ningún lado; donde se
  mostraría el código se sigue mostrando el nombre completo, igual que antes
  de este cambio

### Requirement: Códigos iniciales para los bancos por defecto
El sistema SHALL traer, para los bancos que vienen por defecto en la
instalación, un código inicial razonable — de forma que Nancy no tenga que
escribirlos todos desde cero la primera vez que usa esta función.

#### Scenario: Primera carga tras el cambio
- **WHEN** el sistema calcula los códigos por primera vez y no hay ninguno
  guardado todavía
- **THEN** cada banco de la lista por defecto queda con un código inicial
  asignado, y Nancy puede cambiarlo por el suyo desde Configuración en
  cualquier momento

### Requirement: Código visible junto a la moneda en Transacciones
El sistema SHALL mostrar, en la columna Banco de la tabla de Transacciones
(ya ubicada junto a la columna Moneda), el código del banco de ese
movimiento en vez del nombre completo, cuando ese banco tiene un código
asignado.

#### Scenario: Movimiento con banco que tiene código
- **WHEN** Nancy ve la tabla de Transacciones y un movimiento tiene un banco
  con código asignado
- **THEN** la celda de Banco de esa fila muestra el código en vez del nombre
  completo

#### Scenario: Movimiento con banco sin código
- **WHEN** un movimiento tiene un banco que todavía no tiene código
  asignado
- **THEN** la celda de Banco de esa fila sigue mostrando el nombre completo
  del banco, igual que antes de este cambio

### Requirement: Código visible en los saldos por banco de Resumen
El sistema SHALL anteponer el código del banco al nombre del banco en la
tarjeta "Saldos por banco/cuenta al cierre del mes" de la pestaña Resumen,
cuando ese banco tiene un código asignado.

#### Scenario: Saldo de un banco con código
- **WHEN** Nancy abre Resumen y ve el saldo de un banco que tiene código
  asignado
- **THEN** la tarjeta de ese banco muestra el código junto al nombre
