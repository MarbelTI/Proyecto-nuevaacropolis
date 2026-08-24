## Context

Ver proposal.md — Why. Estado actual relevante encontrado al revisar el
código (no asumido):

- `bancos: string[]` (`useEditableList("bancos")`, default `BANCOS_DEFAULT`
  en `lists-store.ts`) es una lista plana de nombres, editada en
  Configuración con el mismo componente genérico `SimpleListEditor` que usan
  Ingresos y Gastos (`TransactionsTab.tsx`).
- `Transaction.banco: string` guarda el nombre completo tal cual aparece en
  esa lista.
- La tabla de Transacciones YA tiene una columna Banco justo después de
  Moneda (`TransactionsTab.tsx`, celda `<td>` con `max-w-[110px] truncate`),
  mostrando `r.banco || "—"` con el nombre completo truncado.
- Resumen tiene una tarjeta "Saldos por banco/cuenta al cierre del mes"
  (`ResumenTab.tsx`, `bancosData`) con el nombre completo de cada banco como
  etiqueta — es justo el "resumen mensual" que Nancy dijo que no quiere tener
  que abrir para saber el banco.
- La tabla de OCR (`OcrTab.tsx`) no tiene columna de Banco hoy, y el campo
  `banco` de cada fila extraída llega vacío (`banco: ""`) — se completa más
  tarde, en Transacciones.
- La tabla de Préstamos (`PrestamosTab.tsx`) usa un tipo `Movimiento`
  reducido a propósito (fecha, descripción, tipo, categoría, usd) que ni
  siquiera incluye `banco` o `moneda` — es una vista simplificada por
  persona, no una tabla de movimientos con las mismas columnas.

## Goals / Non-Goals

**Goals:**
- Código corto y privado por banco, editable, con valores iniciales
  razonables para los bancos que ya vienen por defecto.
- Visible en los dos lugares donde el banco ya se muestra hoy junto a datos
  de un movimiento: la columna Banco de Transacciones, y la tarjeta de
  saldos por banco de Resumen.

**Non-Goals:**
- No se agrega una columna de Banco a OCR ni a Préstamos en este cambio: hoy
  no hay banco visible (OCR) o el dato ni siquiera está en el tipo que arma
  esa pantalla (Préstamos). Agregarlo ahí sería una ampliación de esas
  pantallas, no "mostrar el código donde el banco ya se ve".
- No se cambia `bancos: string[]` ni `Transaction.banco` — el nombre
  completo del banco se sigue guardando y usando igual que hoy en toda
  lógica existente (`bancoParaMoneda`, filtros, exportaciones).
- No se sincroniza el código de banco con Supabase — los bancos tampoco se
  sincronizan hoy.

## Decisions

- **Mapa aparte, no cambiar la forma de `bancos`**: el código se guarda como
  `Record<string, string>` (nombre de banco → código) en una clave nueva de
  `localStorage`, análoga a como se guardan `ingresos`/`gastos`/`bancos`.
  Alternativa descartada: cambiar `bancos` a `{nombre, codigo}[]` — se
  descartó porque `bancos` se usa como `string[]` en varios sitios
  (`bancoParaMoneda`, los `<Select>` de banco, filtros) y cambiar su forma
  arrastraría esos archivos sin necesidad; el mapa aparte no toca nada de
  eso.
- **Siembra inicial solo para `BANCOS_DEFAULT`**: al cargar el mapa por
  primera vez (sin nada guardado todavía), se completa con un código para
  cada nombre de `BANCOS_DEFAULT` (Efectivo USD→EF, Efectivo Bs→EF,
  Binance→BN, Bancolombia→BC, Bco Venezuela→BV, Bco Mercantil→BM, Bco
  Provincial→BP, Pago Móvil→PM). Un banco que Nancy haya agregado ella misma
  no tiene equivalente conocido, así que arranca sin código — igual que
  cualquier campo opcional vacío en este proyecto, se ve el nombre completo
  hasta que ella le ponga uno.
- **Editor de banco+código separado del `SimpleListEditor` genérico**: se
  agrega un componente nuevo solo para la pestaña "Bancos" de Configuración
  (nombre del banco + input de código al lado), en vez de agregarle un campo
  opcional al `SimpleListEditor` compartido — así Ingresos y Gastos, que no
  necesitan código, no cambian de forma ni de comportamiento.
- **Sin límite de caracteres forzado en el código**: se sugiere 2-3
  caracteres en la spec y el placeholder del input, pero no se valida un
  máximo — es un campo de texto libre y corto por convención, no por regla;
  forzar un límite es una molestia sin beneficio real para dos usuarias que
  ya saben lo que están escribiendo.

## Risks / Trade-offs

- [Nombres de banco duplicados o con mayúsculas distintas quedarían con
  códigos distintos, porque la clave del mapa es el nombre tal cual] →
  Mitigación: ya es así hoy para la lista `bancos` (comparación case-
  insensitive solo al añadir un nombre nuevo en `SimpleListEditor`); no se
  introduce un problema nuevo, se hereda el mismo comportamiento existente.
- [Si Nancy borra un banco de la lista, su código queda huérfano en el mapa
  sin usarse] → Mitigación: no genera ningún error visible (simplemente dead
  data en `localStorage`); se acepta el mismo trade-off que ya existe para
  cualquier lista editable de este proyecto, que tampoco limpia referencias
  huérfanas.
