# Mnemósine — Nueva Acrópolis San Cristóbal

Aplicación web de una sola página para la escuela Nueva Acrópolis SC. Reúne dos
mundos que antes iban por separado:

- **Escolásticas** — asistencia a las 52 clases del año, análisis por aula,
  diagnóstico global y ficha de cada participante.
- **Finanzas** — libro diario con lectura por OCR, transacciones, resumen
  mensual, análisis anual, préstamos, tasas BCV y solvencias.

Cada persona entra con su correo y solo ve la parte que le corresponde.

Nombre interno del proyecto: **SISFIA**.
Producción: <https://nueva-acropolis-sc.vercel.app>

## Arrancar en local

```bash
npm install
npm run dev      # http://localhost:8080
```

Antes hay que crear un archivo `.env` en la raíz con las variables de abajo.
No se sube al repositorio.

## Otros comandos

```bash
npm run build    # compilar para producción
npx tsc --noEmit # comprobar tipos
npm run lint     # revisar estilo del código
npm run format   # formatear con Prettier
```

El despliegue en Vercel es automático en cada push a `main`.

## Variables de entorno

| Variable                   | Para qué                                         |
| -------------------------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`        | Dirección del proyecto Supabase                   |
| `VITE_SUPABASE_ANON_KEY`   | Clave pública de Supabase                         |
| `GOOGLE_API_KEY`           | Gemini, para el OCR del libro diario              |
| `GEMINI_MODEL`             | Opcional: fijar otra versión del modelo           |
| `SUPABASE_SERVICE_ROLE_KEY`| Clave de servicio; **solo servidor**, nunca al navegador |
| `SISFIA_DEV_BYPASS_AUTH=1` | SOLO en local: entra sin pedir sesión             |

**Gemini es el único proveedor de IA.** Hubo un respaldo por OpenRouter y se
retiró el 13-ago-2026: es de pago, y este sistema se sostiene sin presupuesto,
así que solo se usan servicios con capa gratuita. El precio de esa decisión es
que un día en que Gemini esté saturado o se agote la cuota diaria, el lector no
tiene alternativa y hay que esperar.

Las que llevan `VITE_` viajan al navegador de cualquiera que abra la página:
**ahí nunca va una clave secreta**. La aplicación comprueba al arrancar que la
clave configurada no sea la `service_role` y avisa en pantalla si lo es.

## Dónde seguir leyendo

Este README solo sirve para poner el proyecto en marcha. Lo demás está en los
dos documentos que se mantienen al día:

| Pregunta                                          | Dónde se responde         |
| ------------------------------------------------- | ------------------------- |
| ¿Dónde está X y por qué está hecho así?           | `CONTEXTO-PROYECTO.md`    |
| Estructura de archivos, roles, base de datos      | `CONTEXTO-PROYECTO.md`    |
| ¿Qué funciona, qué falta, quién es quién?         | `ESTADO-DEL-PROYECTO.txt` |
| ¿Qué se hizo en la última tanda de trabajo?       | `ESTADO-DEL-PROYECTO.txt` |

## Reglas al tocar el código

1. **Nada de datos reales en el repositorio** — ni Excel, ni nombres, ni
   correos en texto plano. Los archivos reales van a `datos-privados/`, que está
   ignorada por git.
2. **No renombrar las claves de localStorage** (`sisfia_…`, `lector_ocr_…`):
   quien ya tenga datos cargados los perdería.
3. **El rol se lee siempre del servidor**, nunca de algo que mande el navegador.
4. **`src/routeTree.gen.ts` no se edita a mano**, se regenera solo.
5. **Todo el texto y los comentarios, en español.**
