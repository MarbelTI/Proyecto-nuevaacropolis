## Context

Ver proposal.md — Why. Este documento es la auditoría pantalla por pantalla
que Nancy pidió ("el veredicto de todo el sistema"), hecha en dos pasadas:

- **Confirmado visualmente**: capturado con Playwright contra
  `https://nueva-acropolis-sc.vercel.app` a 375×812px (ancho típico de
  celular), sin sesión iniciada (no hay credenciales disponibles desde aquí).
- **Inferido por código**: revisado leyendo los componentes reales del repo
  (clases de Tailwind, estructura de los diálogos), sin verlo corriendo
  porque requiere sesión iniciada. Se marca así explícitamente para no
  presentarlo como un hecho comprobado.

### Veredicto por pantalla

| Pantalla | Evidencia | Severidad | Hallazgo |
|---|---|---|---|
| Encabezado (`routes/index.tsx`) | **Confirmado visualmente** | Alta | El widget "Tasas BCV" (fecha + 2 badges de tasa) vive en un `flex` sin `flex-wrap`, con cada badge en `min-w-[80px]` y el bloque de título en `min-w-[220px]`. A 375px el segundo badge (Bs/€) queda cortado fuera de pantalla. Lo ve cualquiera, incluso sin iniciar sesión. |
| Iniciar sesión (`AuthDialog.tsx`) | Confirmado visualmente | Ninguna | `max-w-sm`, se ve completo y usable en el celular. No requiere cambios. |
| Editar/crear transacción (`TransactionEditDialog.tsx`) | Inferido por código | Alta (es el camino crítico) | Con la calculadora integrada abierta, el diálogo pasa a `grid-cols-[1fr_260px]` sin breakpoint — 260px fijos no caben junto al formulario en ~375-390px. Sin la calculadora abierta, el formulario (`grid-cols-2`, `max-w-lg`) probablemente es usable, pero no se confirmó visualmente. |
| Calculadora (`CalculadoraDialog.tsx`) | Inferido por código | Media | El botón de tasa sugerida muestra texto largo (ej. "Tasa Euro del 28/08/2026") junto a un `Input` en un `flex gap-2` sin wrap — riesgo de corte en pantalla angosta. |
| Tabla de Transacciones — fila de acciones (`TransactionsTab.tsx`) | Inferido por código | Media | Botones de editar/duplicar/eliminar en `h-6 w-6` (24×24px), por debajo del tamaño táctil recomendado (~44px). |
| Tabla de Transacciones — barra de herramientas (`TransactionsTab.tsx`) | Inferido por código | Baja | Muchos controles en `flex flex-wrap`: se acomodan sin desbordarse, pero forman una torre larga de filas angostas antes de llegar a la tabla. Denso, no roto. |
| Tabla de Transacciones — cuerpo (`TransactionsTab.tsx`) | Inferido por código | Baja | Ya envuelta en `overflow-auto`; se puede usar con scroll horizontal propio, sin romper el resto de la página. |
| Diálogos de Configuración/Solvencias/Cuentas pendientes (`max-w-2xl`/`max-w-3xl`) | Inferido por código | Por confirmar | El `DialogContent` base tiene `w-full`, así que probablemente se adaptan solos al ancho del celular. No se revisó el contenido interno de cada uno para descartar un grid fijo como el de la calculadora. |
| Resumen (`ResumenTab.tsx`) | Inferido por código | Por confirmar | Tablas angostas (categoría + monto) sin envoltorio de scroll; por su bajo número de columnas probablemente no lo necesitan. |
| Asistencias (`asistencias-tab.tsx`) | Inferido por código | Baja (fuera del camino crítico) | Grilla ancha tipo hoja de cálculo (columnas de 30px por día, ya envuelta en `overflow-x-auto`). Es una vista inherentemente ancha; scroll horizontal es aceptable ahí. |
| OCR (`OcrTab.tsx`) | — | Excluida | Fuera de alcance: Nancy confirmó que esa pestaña solo se usa desde su computadora, nunca desde el celular. |
| Préstamos (`PrestamosTab.tsx`) | No auditada | Sin datos | No se llegó a revisar en esta pasada; no se toca en este cambio. |
| Tasas BCV (`TasasBcvTab.tsx`) | No auditada | Sin datos | No se llegó a revisar en esta pasada; no se toca en este cambio. |

## Goals / Non-Goals

**Goals:**
- Que el camino "iniciar sesión → Transacciones → crear/editar un movimiento
  → guardar" (con y sin la calculadora integrada) funcione completo y usable
  en un celular de ~360-430px de ancho, sin elementos desbordados ni botones
  demasiado pequeños para tocar.
- Dejar documentado, con severidad, qué falta revisar/arreglar en el resto
  del sistema, para decidir después en qué orden se aborda.

**Non-Goals:**
- OCR (`OcrTab.tsx`) queda excluido de este cambio: Nancy confirmó que esa
  pestaña solo se usa desde su computadora, nunca desde el celular.
- No se rediseña visualmente nada (colores, tipografía, identidad); es
  exclusivamente un ajuste de layout/responsive con las mismas clases y
  componentes que ya existen.
- No se toca ninguna lógica de cálculo, tasas, ni esquema de datos.

## Decisions

- **Mobile-first con los breakpoints de Tailwind que el proyecto ya usa**
  (`sm:`/`md:`/`lg:`), en vez de un sistema de diseño nuevo: el proyecto ya
  usa este patrón en la barra de pestañas (`TabsList` con `lg:sticky
  lg:w-44 lg:flex-col`). Se sigue la misma convención en vez de introducir
  media queries a mano o un breakpoint propio.
- **El encabezado se apila en vez de recortarse**: en pantalla angosta, el
  bloque de tasas BCV pasa a su propia fila completa (debajo del
  logo/título) en lugar de competir por espacio horizontal con ellos.
  Alternativa descartada: reducir el `min-w` de los badges — no alcanza,
  porque el problema real es que son 5+ elementos en una sola fila sin
  wrap, no solo el ancho de cada uno.
- **La calculadora integrada, en pantalla angosta, deja de ir al lado del
  formulario y pasa a apilarse debajo** (mismo panel, sin la columna fija de
  260px) en vez de abrirse como un diálogo aparte. Alternativa descartada:
  un diálogo separado solo en móvil — significaría mantener dos
  presentaciones distintas del mismo panel (`CalculadoraPanel` ya está
  hecho para reusarse tal cual); apilarlo es el cambio más chico que
  resuelve el problema sin duplicar código.
- **Botones de acción por fila**: se agranda el área táctil (con padding o
  cambiando el tamaño del ícono) sin agrandar visualmente la fila entera,
  para no romper la densidad de la tabla en escritorio.

## Risks / Trade-offs

- [Apilar el encabezado en móvil lo hace más alto, empujando el contenido
  hacia abajo] → Mitigación: aceptable — es preferible a que una tasa quede
  cortada o inexistente a la vista.
- [Ampliar el área táctil de los botones de fila sin agrandar la fila visual
  puede hacer que las áreas táctiles de botones vecinos se solapen un poco]
  → Mitigación: separar con `gap` suficiente entre botones al mismo tiempo
  que se agranda el área táctil, y probarlo en el celular real antes de dar
  por terminada esa tarea.
- [Las pantallas marcadas "Por confirmar" o "Inferido por código" podrían
  tener problemas peores (o no tener ninguno) una vez vistas en el celular
  con sesión iniciada] → Mitigación: no se marcan como resueltas en
  tasks.md hasta confirmarlas visualmente; Nancy puede confirmarlas
  directamente en su teléfono, o se retoma con acceso de prueba más
  adelante.

## Migration Plan

Sin datos que migrar — son cambios de clases CSS/Tailwind en componentes
existentes. Se despliegan con el flujo normal (commit → push → Vercel
redeploy). Si algo se ve peor que antes en escritorio tras el cambio, se
revierte el commit puntual sin afectar el resto.
