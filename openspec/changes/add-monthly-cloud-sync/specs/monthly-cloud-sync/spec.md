## Purpose

Permitir subir a Supabase las transacciones y tasas BCV de un solo mes calendario, para que
quien administra la nube pueda ir publicando el libro contable progresivamente (mes por mes) en
vez de subirlo todo de golpe.

## ADDED Requirements

### Requirement: Elegir un mes y subir solo ese mes
El sistema SHALL permitir elegir un mes calendario (de entre los meses que tengan al menos una
transacción local) y, al confirmar, SHALL subir a Supabase únicamente las transacciones cuya
fecha caiga en ese mes y las tasas BCV cuya fecha caiga en ese mes. El resto de las transacciones
y tasas locales SHALL permanecer sin subir.

#### Scenario: Subir agosto 2026
- **WHEN** alguien con permiso para sincronizar elige "agosto 2026" y confirma la subida por mes
- **THEN** el sistema sube a Supabase las transacciones con fecha de agosto 2026 y las tasas BCV
  de agosto 2026, y ninguna transacción ni tasa de otro mes

#### Scenario: Mes sin transacciones
- **WHEN** el mes elegido no tiene ninguna transacción local
- **THEN** el sistema avisa que no hay nada que subir para ese mes y no hace ninguna llamada a
  Supabase

### Requirement: El botón de subir todo el libro sigue funcionando igual
El sistema SHALL conservar el botón existente que sube el libro contable completo, con el mismo
comportamiento que tenía antes de este cambio.

#### Scenario: Subir todo como antes
- **WHEN** alguien usa el botón "Subir a nube" (el que ya existía)
- **THEN** se suben todas las transacciones y todas las tasas BCV locales, igual que antes de
  agregar la subida por mes

### Requirement: Mismos permisos que la subida completa
El sistema SHALL exigir para la subida por mes el mismo permiso que ya exige la subida completa
(rol con capacidad de escribir finanzas). No SHALL introducir un permiso nuevo ni más laxo.

#### Scenario: Cuenta sin permiso de escritura
- **WHEN** una cuenta sin permiso para escribir finanzas intenta subir un mes
- **THEN** el sistema rechaza la operación, igual que rechazaría hoy un intento de usar "Subir a
  nube"
