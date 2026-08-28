## Why

Nancy encuentra movimientos que no sabe a qué corresponden y necesita que
Manuela (quien hace la revisión contable) los corrija — hoy no hay forma de
señalar "esta fila necesita revisión" dentro del sistema: solo queda
avisarle por fuera, o que Manuela adivine cuáles revisar escaneando toda la
tabla.

## What Changes

- Cada transacción gana un campo de texto `revisar` (vacío = sin marcar,
  cualquier texto = la nota de qué hay que revisar), editable desde el
  formulario de crear/editar una transacción.
- La tabla de Transacciones marca con una franja azul clara y un ícono de
  bandera las filas con `revisar` no vacío, mostrando la nota al pasar el
  mouse; un filtro "Solo por revisar" permite aislarlas.
- Exportar/importar Excel de Transacciones viaja con esta marca en ambos
  sentidos (columna "Revisar"), incluyendo el Excel consolidado de
  enero-agosto ya entregado (trae esa misma columna, ahí llamada
  "Verificar").
- Sincronización con Supabase: se prepara la migración para la columna
  nueva, pero **no se ejecuta todavía** contra el proyecto real (decisión
  explícita de Nancy) — hasta entonces, la marca vive solo en el navegador
  de quien la puso y no viaja entre cuentas.

## Capabilities

### New Capabilities
- `transaction-review-flag`: marcar una transacción para que otra persona
  (con su propia sesión) la revise y corrija, con una nota de qué falta
  aclarar.

### Modified Capabilities
(ninguna — no hay specs previas para Transacciones o para import/export de
Excel en este repo)

## Impact

- `src/lib/lists-store.ts`: nuevo campo `revisar: string` en `Transaction`.
- `src/components/finanzas/TransactionEditDialog.tsx`: campo de texto para
  editar la nota.
- `src/components/finanzas/TransactionsTab.tsx`: marca visual de la fila
  (franja azul + bandera + tooltip) y filtro "Solo por revisar".
- `src/lib/excel-import.ts`: `parseExcelToTransactions` lee la columna
  "Verificar"/"Revisar".
- `src/lib/excel-export.ts`: `exportTransactionsExcel` escribe la columna
  "Revisar".
- `src/lib/api/transactions.functions.ts`: `TransactionSchema` y el mapeo
  hacia/desde Supabase incluyen `revisar`.
- `supabase/migrations/`: nueva migración para la columna `revisar` en
  `public.transactions` — **archivo creado, no ejecutado** contra el
  proyecto real hasta que Nancy lo indique.
- Sin cambios en ningún cálculo de tasas, montos, o lógica de negocio — es
  exclusivamente metadata de flujo de trabajo.
