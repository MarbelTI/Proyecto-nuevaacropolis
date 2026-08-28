## Context

Ver proposal.md — Why. Estado actual confirmado en el código:

- `Transaction` (`lists-store.ts`) es un tipo plano de campos fijos —
  `banco: string` es el precedente directo para agregar `revisar: string`
  de la misma forma (mismo patrón en el tipo, en `TransactionSchema` de
  `transactions.functions.ts`, y en el mapeo hacia/desde Supabase).
- La tabla de Transacciones (`TransactionsTab.tsx`) ya tiene dos estados de
  fila con estilos por prioridad: `isSelected`/`isFocused` (verde + borde
  ámbar, agregado en esta misma conversación) y `esDup` (rosado, filas
  repetidas), resueltos con un único `className` condicional en cascada.
  Este cambio agrega un tercer estado a esa misma cascada.
- `parseExcelToTransactions` (`excel-import.ts`) ya mapea columnas del
  Excel por nombre con variantes (`r.Banco || r.banco`); se sigue el mismo
  patrón para `revisar`, aceptando tanto "Revisar" como "Verificar" (el
  Excel consolidado de enero-agosto ya entregado usa "Verificar").
- `exportTransactionsExcel` (`excel-export.ts`) HOY no escribe ninguna
  columna de este tipo — confirmado al revisar el archivo: solo Fecha, Mes,
  Tipo, Categoría, Descripción, Mensualidad, Moneda, Banco, Monto, Tasa
  cambio, Monto USD. Si Nancy exporta y lo reimporta (en su cuenta o en la
  de Manuela) hoy la marca no viajaría — Nancy señaló esto directamente, y
  por eso se agrega la escritura de esa columna al alcance de este cambio,
  no solo la lectura.
- La tabla `public.transactions` en Supabase tiene columnas fijas (no JSON
  flexible) — ver `20260716000001_transactions_and_bcv_rates.sql`. Agregar
  un campo requiere una migración real, igual que pasó con la tasa euro.

## Goals / Non-Goals

**Goals:**
- Una nota de revisión por transacción, visible y editable desde cualquier
  sesión una vez corrida la migración.
- Que el viaje completo por Excel (exportar → importar, en cualquier
  dirección y entre cuentas) conserve la nota.

**Non-Goals:**
- No se agrega ningún flujo de notificación ni de asignación de quién debe
  revisar cada nota — cualquiera con acceso puede escribirla o borrarla.
- No se crea una pantalla dedicada para Manuela; el filtro dentro de
  Transacciones es suficiente por ahora.
- La marca NO sincroniza con Supabase hasta que la migración se ejecute —
  hasta entonces, es una limitación conocida (ver Risks), no un bug.

## Decisions

- **Campo de texto (`revisar: string`), no un booleano + nota aparte**:
  igual que la columna "Verificar" del Excel consolidado que Nancy ya
  conoce y usa — una sola fuente de verdad para "está marcada" (no vacía) y
  "por qué" (el texto), sin que puedan quedar desincronizados un booleano
  `true` con una nota vacía, o viceversa.
- **Prioridad visual cuando varios estados coinciden**: foco/seleccionada
  (verde+ámbar) sigue ganando visualmente porque es la que la propia
  persona activó a propósito en ese momento (sabe por qué está ahí);
  "por revisar" es la segunda prioridad (persiste entre sesiones, importa
  más que notar un duplicado); "repetida" queda al final. Como el diseño ya
  pidió explícitamente que ningún estado quede invisible al chocar con
  otro, la fila combina el color de mayor prioridad con el ícono de
  bandera superpuesto cuando además está marcada para revisar, y con el
  `title` de la fila listando todos los estados que apliquen (ej. "Marcada
  para revisar: <nota> · Repetida: hay otro movimiento con los mismos
  datos").
- **Exportar Y leer "Revisar"/"Verificar", no solo uno de los dos nombres**:
  el Excel consolidado ya en manos de Nancy usa "Verificar"; el nuevo
  export de la propia app usará "Revisar" (más corto, coherente con el
  nombre del campo). Aceptar ambos al importar evita que Nancy tenga que
  recordar cuál es cuál según el origen del archivo.
- **Migración preparada, no ejecutada**: mismo patrón ya usado con
  `20260821000001_bcv_rate_euro.sql` — el archivo queda listo y documentado,
  pero correrlo contra el proyecto real es una acción aparte que Nancy
  autoriza cuando lo decida.

## Risks / Trade-offs

- [Mientras la migración no se corra, la marca vive solo en el
  `localStorage` de quien la puso — Manuela no la vería desde su propia
  sesión, que es justo el propósito de la función] → Mitigación: se
  documenta explícitamente en tasks.md como limitación temporal, no como
  "listo"; el código queda preparado para que, en cuanto se corra la
  migración, empiece a sincronizar sin más cambios.
- [Una fila puede acumular hasta tres marcas visuales a la vez (foco +
  revisar + repetida), con riesgo de saturar visualmente la fila] →
  Mitigación: un solo color de fondo (el de mayor prioridad) más un ícono
  pequeño de bandera cuando aplica revisar, en vez de apilar franjas o
  bordes de los tres a la vez.
- [Si alguien importa un Excel externo con una columna literal llamada
  "Revisar" para otra cosa (no relacionada a esta función), se
  interpretaría igual como nota de revisión] → Mitigación: aceptable, es
  el mismo tipo de convención por nombre de columna que ya usan
  `Banco`/`Moneda`/etc. en el mismo importador.

## Migration Plan

1. Cambios de código (tipo, UI, import/export, schema de sincronización) se
   despliegan normalmente — no requieren la migración para no romper nada,
   porque el campo nuevo tiene un valor por defecto (`""`) en el cliente.
2. La migración SQL queda creada en el repo pero **sin ejecutar**. Cuando
   Nancy avise, se corre contra el proyecto real (`supabase db push` o
   desde el SQL Editor) — recién ahí la marca empieza a sincronizarse entre
   cuentas.
3. Sin datos que perder en la migración: es una columna nueva con default
   `''`, no toca filas existentes.
