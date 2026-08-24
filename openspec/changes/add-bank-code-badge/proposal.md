## Why

Nancy identifica el banco/medio de pago de un movimiento leyendo el nombre
completo del banco (ej. "Bco Venezuela"), que hoy aparece truncado en la
columna Banco de la tabla de Transacciones o resumido por nombre completo en
"Saldos por banco" de Resumen. Quiere en su lugar un código corto y privado
("que solo nosotros entendamos") junto a la moneda de cada movimiento, para
identificar el banco de un vistazo sin abrir el resumen mensual ni depender de
que el nombre completo quepa en la celda.

## What Changes

- Nuevo mapa persistido "código de banco" (nombre de banco → abreviatura de
  2-3 letras, ej. "Bco Venezuela" → "BV"), independiente de la lista de
  bancos existente (`bancos: string[]`) — no cambia esa lista ni el campo
  `Transaction.banco`, que sigue guardando el nombre completo.
- Se pre-cargan abreviaturas razonables para los bancos que ya vienen por
  defecto en el sistema (`BANCOS_DEFAULT`); un banco agregado por Nancy
  arranca sin código hasta que ella se lo ponga.
- Nueva UI en Configuración → Bancos para ver y editar el código de cada
  banco (separado del editor genérico que hoy comparten Ingresos/Gastos/
  Bancos, porque esos dos no necesitan código).
- En la tabla de Transacciones, la columna Banco (ya existe, junto a Moneda)
  muestra el código en vez del nombre completo truncado; si un banco no
  tiene código todavía, se sigue viendo el nombre completo como hoy.
- En Resumen, la tarjeta "Saldos por banco/cuenta al cierre del mes" muestra
  el código junto al nombre del banco.
- **Fuera de alcance de este cambio** (ver Impact): la tabla de OCR no tiene
  hoy columna de Banco ni el dato suele estar cargado en esa etapa, y la
  tabla de Préstamos usa una proyección de la transacción que no incluye
  banco ni moneda. Se documenta la razón en vez de forzar el código en
  tablas donde hoy no hay banco que mostrar; si Nancy de todas formas los
  quiere ahí, es un ajuste a este mismo cambio antes de aprobarlo.

## Capabilities

### New Capabilities
- `bank-code-badge`: código corto y editable por banco, mostrado junto a la
  moneda en las tablas de movimientos donde el banco ya es visible hoy.

### Modified Capabilities
(ninguna — no existe todavía una spec para las tablas de Transacciones o
Resumen en este repo; este cambio no modifica requisitos ya documentados,
solo agrega el nuevo capability de arriba)

## Impact

- `src/lib/lists-store.ts`: nuevo hook (ej. `useBancoAbrev()`) con su propia
  clave de `localStorage`, valor por defecto `{}` más la siembra inicial
  para `BANCOS_DEFAULT`.
- `src/components/finanzas/TransactionsTab.tsx`: nuevo editor de banco+código
  para la pestaña "Bancos" de Configuración (sustituye ahí el
  `SimpleListEditor` genérico, que sigue igual para Ingresos/Gastos); celda
  de Banco en la tabla usa el código cuando existe.
- `src/components/finanzas/ResumenTab.tsx`: la tarjeta de saldos por banco
  antepone el código al nombre.
- `src/routes/index.tsx`: crea el nuevo hook y lo pasa como prop a
  `TransactionsTab` y `ResumenTab`, igual que ya hace con `bancos`.
- Sin cambios en Supabase: los bancos y sus códigos no se sincronizan hoy
  (viven solo en `localStorage`, igual que `bancos`), y este cambio no
  agrega sincronización nueva.
- Sin cambios en `OcrTab.tsx` ni `PrestamosTab.tsx` (ver "Fuera de alcance").
