## Purpose

Transcribir fotos del libro diario manuscrito a filas de transacción usando un
modelo de IA multimodal, seleccionando entre los proveedores de IA
configurados y cayendo al siguiente si uno falla, para que quien lleva las
finanzas pueda cargar una foto cualquier día sin quedar bloqueada por la cuota
de un solo proveedor.

## ADDED Requirements

### Requirement: Selección de proveedor de IA con fallback
El sistema SHALL mantener una lista ordenada de proveedores de IA con clave
configurada y SHALL intentarlos en orden hasta que uno responda con éxito.

#### Scenario: Un solo proveedor con clave configurada
- **WHEN** solo `GOOGLE_API_KEY` está configurada
- **THEN** el sistema usa únicamente Gemini para la transcripción

#### Scenario: Dos proveedores configurados y el primero falla
- **WHEN** `GOOGLE_API_KEY` y `ANTHROPIC_API_KEY` están configuradas, y la
  llamada a Gemini falla (cuota agotada, error del servicio, etc.)
- **THEN** el sistema reintenta automáticamente con Claude sin requerir acción
  de quien está usando el lector

#### Scenario: Ningún proveedor configurado
- **WHEN** no hay ninguna clave de proveedor de IA configurada
- **THEN** el sistema informa con un mensaje accionable qué variable de
  entorno falta y cómo conseguir una clave

#### Scenario: Todos los proveedores configurados fallan
- **WHEN** todos los proveedores configurados devuelven error
- **THEN** el sistema informa los mensajes de error de todos los proveedores
  intentados, no solo el último

### Requirement: Errores de proveedor traducidos a mensajes accionables
El sistema SHALL traducir los errores crudos de cualquier proveedor de IA
configurado (clave inválida, límite de tasa o cuota agotada, crédito
insuficiente) a un mensaje en español que indique qué hacer, para cualquier
proveedor de la lista, no solo para el primero que se integró.

#### Scenario: Clave de Claude inválida o revocada
- **WHEN** Anthropic responde 401 o "invalid api key" a una llamada del lector
- **THEN** el sistema muestra un mensaje indicando que la clave de Anthropic no
  es válida y que hay que generar una nueva

#### Scenario: Cuenta de Claude sin crédito
- **WHEN** Anthropic responde con un error de pago o crédito insuficiente
- **THEN** el sistema muestra un mensaje indicando que la cuenta de Anthropic
  no tiene crédito suficiente

### Requirement: Mismas reglas de transcripción sin importar el proveedor
El sistema SHALL aplicar exactamente las mismas reglas de dominio (corrección
de nombres contra el padrón, regla aula→categoría, formato de descripción de
préstamos, una fila por moneda, distinción mes/mensualidad) sin importar qué
proveedor de la lista haya respondido.

#### Scenario: Misma foto, proveedor de respaldo
- **WHEN** Claude responde en lugar de Gemini porque Gemini falló
- **THEN** las entradas devueltas pasan por la misma validación y corrección
  contra el padrón que si hubiera respondido Gemini, y el nombre del proveedor
  que respondió viaja junto con el resultado
