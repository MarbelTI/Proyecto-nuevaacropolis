## Why

El lector OCR del libro diario manuscrito solo tiene un proveedor de IA
configurado (Gemini, capa gratuita vía `GOOGLE_API_KEY`). Cuando se agota la
cuota diaria gratuita de Gemini, el lector queda inutilizable hasta el día
siguiente — no hay ningún proveedor de respaldo al que caer. Nancy necesita
poder transcribir fotos del libro cualquier día, sin depender de que a Google
le quede cuota.

## What Changes

- Se agrega Claude (Anthropic) como proveedor de IA adicional en
  `proveedoresDisponibles()` (`src/lib/ocr.functions.ts`), activado con una
  nueva variable de entorno `ANTHROPIC_API_KEY`.
- El prompt del OCR (reglas de nombres, aula→categoría, formato de préstamos,
  una fila por moneda, mes vs mensualidad) **no cambia** — el nuevo proveedor
  reutiliza exactamente el mismo `systemPrompt`/`contenido` que ya usa Gemini.
- `mensajeDeError()` traduce también los errores propios de Anthropic (401,
  429, crédito insuficiente) a mensajes accionables en español, igual que ya
  hace con los de Google.
- El fallback existente (probar el siguiente proveedor de la lista si uno
  falla) cubre automáticamente el caso "Gemini se quedó sin cuota hoy": no
  hace falta lógica nueva de reintento, solo que Claude aparezca en la lista.
- Se documenta en `.env`/README cómo Nancy consigue y carga la clave de
  Anthropic (ella crea la cuenta y paga; Claude Code no la crea ni la maneja).

## Capabilities

### New Capabilities
- `ocr-journal-reader`: transcripción por IA de fotos del libro diario
  manuscrito a filas de transacción, con selección y fallback entre
  proveedores de IA configurados.

### Modified Capabilities
(ninguna — es la primera spec de este proyecto; el comportamiento existente de
Gemini se documenta como parte de `ocr-journal-reader` junto con el nuevo
proveedor, no como una modificación de una spec previa.)

## Impact

- **Código**: `src/lib/ocr.functions.ts` (`proveedoresDisponibles()`,
  `mensajeDeError()`); posible dependencia nueva (`@ai-sdk/anthropic` o
  equivalente) en `package.json`.
- **Config/infra**: nueva variable de entorno `ANTHROPIC_API_KEY` en `.env`
  (desarrollo) y Vercel → Settings → Environment Variables (producción). Costo
  nuevo: cada llamada a Claude consume crédito de pago (a diferencia de Gemini,
  que es gratis con cuota).
- **No afecta**: UI del lector, lógica de corrección contra el padrón
  (`corregirCategoriaConPadron`, `normalizarDescripcionPrestamo`), ni el
  contenido del prompt.
