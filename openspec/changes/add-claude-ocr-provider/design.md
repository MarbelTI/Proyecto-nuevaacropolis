## Context

`proveedoresDisponibles()` en `src/lib/ocr.functions.ts` arma un array
`ProveedorIA[]` (`{ proveedor, modelId, provider }`) leyendo variables de
entorno, en orden de preferencia. `analyzeJournalImage` recorre ese array y
prueba cada uno con `generateText` (Vercel AI SDK, paquete `ai`) hasta que uno
responda; si todos fallan, junta los mensajes de `mensajeDeError()` de cada
intento. Gemini está integrado con `createOpenAICompatible` apuntando al
endpoint compatible-OpenAI que expone Google. Ver proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Que un día con la cuota de Gemini agotada, el lector siga funcionando
  cayendo a Claude sin que Nancy tenga que hacer nada distinto.
- Mantener el prompt (`systemPrompt`/`contenido`) idéntico entre proveedores.

**Non-Goals:**
- No se cambia el prompt, la lógica de corrección contra el padrón, ni la UI.
- No se agregan más proveedores en este cambio (solo Claude).
- No se implementa selección manual de proveedor por parte de la usuaria — la
  lista y su orden siguen siendo automáticos, como hoy con Gemini.

## Decisions

**Paquete: `@ai-sdk/anthropic` en vez de `createOpenAICompatible`.**
Anthropic no tiene un endpoint compatible-OpenAI de uso general estable (a
diferencia de Google), y el SDK oficial de Anthropic para el Vercel AI SDK
maneja de forma nativa el formato de contenido con imágenes que ya usa
`analyzeJournalImage` (`{ type: "image", image: "data:..." }`), sin adaptar
nada. Es una dependencia más, pero evita depender de un endpoint no
garantizado.

**Modelo por defecto: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), con
override por `ANTHROPIC_MODEL`.**
Mismo patrón que `GEMINI_MODEL`. Se elige Haiku como default porque el
contexto del proyecto es explícito en que no hay presupuesto real y el volumen
es bajo (pocas fotos por semana) — Haiku es el modelo más barato de la familia
Claude 5 y ya es capaz en tareas de OCR/transcripción estructurada. Si en la
práctica la letra manuscrita más difícil le da problemas, cambiar a Sonnet es
una variable de entorno, no un cambio de código.
Alternativa considerada: Sonnet 5 por defecto (más preciso en letra difícil,
más caro). Se descarta como default por el contexto de presupuesto, pero
queda disponible vía `ANTHROPIC_MODEL=claude-sonnet-5` sin tocar código.

**Orden en `proveedoresDisponibles()`: Gemini primero, Claude como respaldo.**
Gemini es gratis (con cuota); Claude es de pago sin techo diario. Poniendo
Gemini primero, el costo real solo se paga los días que Gemini falla o se
agota — que es exactamente el problema que este cambio resuelve. Alternativa
considerada: Claude primero por ser más confiable / no depender de cuota
diaria — se descarta porque convertiría cada foto en una llamada de pago
incluso los días en que Gemini habría funcionado bien, contradiciendo la
restricción de presupuesto del proyecto.

**`mensajeDeError()` se generaliza, no se duplica.**
Los `if` existentes ya parsean el mensaje crudo por patrones (401, 429,
"payment"/"credit") que también aparecen en los errores de Anthropic. Se
revisa cada rama para que siga siendo correcta con ambos proveedores (ej. el
caso `limit: 0` es específico de Google y no debe activarse con errores de
Anthropic) en vez de escribir una función paralela para Claude.

## Risks / Trade-offs

- [Nueva dependencia de pago sin límite duro] → El volumen esperado es bajo
  (pocas fotos/semana) y Claude solo se llama cuando Gemini falla, así que el
  costo mensual esperado es pequeño; igual queda documentado en el README que
  csta variable implica costo, para que Nancy no la cargue sin saberlo.
- [Haiku puede transcribir peor letra muy difícil que Sonnet] → Mitigado por
  el override `ANTHROPIC_MODEL`; si en la práctica falla, es un cambio de
  variable de entorno, no de código.
- [Clave de Anthropic mal configurada pasa desapercibida hasta que Gemini
  falle] → El error ya viaja en la lista `fallos` cuando AMBOS proveedores
  fallan, así que una clave de Anthropic inválida se ve en pantalla la primera
  vez que Gemini también falle ese día, no en silencio.

## Migration Plan

1. Agregar `@ai-sdk/anthropic` a `package.json`.
2. Agregar el proveedor Claude a `proveedoresDisponibles()`, detrás de Gemini.
3. Generalizar `mensajeDeError()` para los patrones de error de Anthropic.
4. Documentar `ANTHROPIC_MODEL` (opcional) y `ANTHROPIC_API_KEY` en `.env` de
   ejemplo y en el README, con el paso a paso para que Nancy consiga la clave
   en console.anthropic.com y cargue crédito.
5. Nancy carga `ANTHROPIC_API_KEY` en Vercel → Settings → Environment
   Variables (producción) y en su `.env` local si prueba en su máquina.
No hay migración de datos ni rollback especial: si `ANTHROPIC_API_KEY` no está
configurada, `proveedoresDisponibles()` simplemente no incluye a Claude en la
lista y el comportamiento es idéntico al actual.
