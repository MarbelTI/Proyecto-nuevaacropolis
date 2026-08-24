## 1. Dependencia

- [ ] 1.1 Agregar `@ai-sdk/anthropic` a `package.json` (versión compatible con
      `ai@^6.0.197`, ya en el proyecto) e instalar.

## 2. Proveedor Claude en ocr.functions.ts

- [ ] 2.1 Importar `createAnthropic` de `@ai-sdk/anthropic` en
      `src/lib/ocr.functions.ts`.
- [ ] 2.2 En `proveedoresDisponibles()`, agregar el proveedor Claude **detrás**
      de Gemini en el array `disponibles`: lee `ANTHROPIC_API_KEY`, y si está
      presente, hace `push` de `{ proveedor: "Anthropic", modelId, provider }`
      usando `ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001"` como
      modelId.
- [ ] 2.3 Actualizar el comentario que explica la lista de proveedores (hoy
      dice "la lista tiene un solo proveedor, y es a propósito") para reflejar
      que ahora hay dos y por qué van en ese orden (gratis primero, pago como
      respaldo) — no dejar el comentario viejo contradiciendo el código.
- [ ] 2.4 Actualizar el mensaje de error de "no hay clave configurada" para
      mencionar ambas opciones (Google AI Studio gratis, o Anthropic de pago)
      en vez de solo Google.

## 3. Mensajes de error

- [ ] 3.1 Revisar cada rama de `mensajeDeError()` (401/unauthorized, 429/rate
      limit/quota, 402/payment/credit) contra los mensajes reales que devuelve
      la API de Anthropic para esos casos, y ajustar los patrones regex si
      hace falta para que cubran ambos proveedores sin falsos positivos (ej.
      que el caso `limit: 0` siga siendo específico de Google).
- [ ] 3.2 Verificar que el mensaje final genérico (`Error del servicio de IA
      (${proveedor}): ${raw}`) sigue funcionando igual para "Anthropic" como
      valor de `proveedor`.

## 4. Documentación para Nancy

- [ ] 4.1 Agregar `ANTHROPIC_API_KEY` (y `ANTHROPIC_MODEL` opcional) al
      archivo `.env` de ejemplo del repo, con un comentario corto explicando
      que esta clave SÍ tiene costo (a diferencia de `GOOGLE_API_KEY`) y dónde
      conseguirla (console.anthropic.com).
- [ ] 4.2 Agregar el mismo par de variables a la lista de Environment
      Variables documentada para Vercel (README o donde ya esté documentado
      `GOOGLE_API_KEY` para producción).

## 5. Verificación

- [ ] 5.1 `npm run build` (o el script equivalente) pasa sin errores de tipos
      tras agregar la dependencia y el proveedor nuevo.
- [ ] 5.2 Con solo `GOOGLE_API_KEY` configurada, subir una foto de prueba al
      lector y confirmar que el comportamiento es idéntico al actual (Claude
      no aparece en la lista de proveedores).
- [ ] 5.3 Con `ANTHROPIC_API_KEY` configurada y `GOOGLE_API_KEY` deliberadamente
      inválida (para forzar el fallback), subir una foto de prueba y confirmar
      que el resultado llega vía Claude, con `proveedor: "Anthropic"` en la
      respuesta, y que las entradas devueltas respetan las mismas reglas
      (nombres, categorías, formato de préstamos) que con Gemini.
- [ ] 5.4 Con una `ANTHROPIC_API_KEY` inválida a propósito, confirmar que el
      mensaje de error que ve la usuaria es accionable y no un 401 crudo.
