## Why

Nancy necesita registrar un pago desde el celular en el momento en que lo
recibe, sin esperar a estar frente a una computadora. Hoy la app se diseñó
pensando en escritorio primero: una prueba real a 375px de ancho (el tamaño
típico de un teléfono) muestra el encabezado desbordándose fuera de pantalla,
y una revisión del código encuentra el mismo patrón (anchos fijos en píxeles
sin adaptarse a pantalla chica) en el formulario de crear/editar una
transacción — el corazón mismo de "registrar un pago".

## What Changes

- Encabezado (`routes/index.tsx`): el widget de "Tasas BCV" deja de desbordarse
  en pantalla angosta — se acomoda o se corta con scroll propio, nunca fuera
  del recuadro.
- Formulario de crear/editar transacción (`TransactionEditDialog.tsx`) y su
  calculadora integrada (`CalculadoraDialog.tsx`): usables de punta a punta en
  un celular — sin columnas fijas que no quepan, sin texto cortado en el botón
  de tasa sugerida.
- Tabla de Transacciones (`TransactionsTab.tsx`): los botones de acción por
  fila (editar/duplicar/eliminar) pasan a un tamaño que se puede tocar con el
  dedo con confianza.
- Diálogos de Configuración, `SolvenciasTab.tsx` y `CuentasPendientes.tsx`
  (`max-w-2xl`/`max-w-3xl`): se corrige cualquier ancho fijo interno que no
  quepa en pantalla angosta.
- `ResumenTab.tsx`: sus tablas se confirman/corrigen para no desbordarse.
- `asistencias-tab.tsx`: sin rediseño (es una grilla ancha por naturaleza),
  solo se confirma que su scroll horizontal ya existente funciona bien en
  celular.
- **OCR (`OcrTab.tsx`) queda fuera de este cambio**: Nancy confirmó que esa
  pestaña solo se usa desde su computadora, nunca desde el celular.

## Capabilities

### New Capabilities
- `mobile-first-layout`: la app debe poder usarse de punta a punta desde un
  celular, con el camino de registrar un pago (iniciar sesión → Transacciones
  → crear/editar un movimiento → guardar) como el que SÍ debe funcionar
  completo en esta tanda.

### Modified Capabilities
(ninguna — no hay una spec previa para el layout de estas pantallas en este
repo; este cambio solo agrega el capability nuevo de arriba)

## Impact

- `src/routes/index.tsx`: encabezado.
- `src/components/finanzas/TransactionEditDialog.tsx`: layout del formulario
  y su combinación con la calculadora integrada.
- `src/components/finanzas/CalculadoraDialog.tsx`: el botón de tasa sugerida
  dentro del panel.
- `src/components/finanzas/TransactionsTab.tsx`: tamaño de los botones de
  acción por fila, y el diálogo de Configuración (`max-w-3xl`) que vive ahí.
- `src/components/finanzas/SolvenciasTab.tsx` y
  `src/components/finanzas/CuentasPendientes.tsx`: sus diálogos.
- `src/components/finanzas/ResumenTab.tsx`: sus tablas de categoría/monto.
- `src/components/asistencias-tab.tsx`: solo confirmación, sin cambio
  estructural esperado.
- Solo CSS/layout (clases de Tailwind) en los archivos de arriba — ninguna
  lógica de negocio, cálculo de tasas, ni esquema de datos cambia.
- **Fuera de alcance**: `src/components/finanzas/OcrTab.tsx` (uso exclusivo
  desde computadora, confirmado por Nancy). `PrestamosTab.tsx` y
  `TasasBcvTab.tsx` no llegaron a auditarse en design.md — no se tocan en
  este cambio; quedan pendientes de revisar en uno siguiente.
