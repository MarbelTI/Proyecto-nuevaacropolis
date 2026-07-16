# Proyecto Nueva Acrópolis SC — Contexto Completo

## ¿Qué es?
App web para gestionar una escuela: control de asistencias (52 clases/año), finanzas (ingresos/egresos), solvencias de alumnos, diagnóstico global, OCR de cuadernos contables. Desplegada en Vercel.

## Stack técnico
- **Framework**: TanStack Start (React + SSR + Server Functions)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Build**: Vite + Nitro (Cloudflare preset para producción)
- **Base de datos**: Supabase (PostgreSQL con RLS, tablas: aulas, participantes, aula_participantes, asistencias, temas)
- **OCR**: Google Gemini API (`gemini-1.5-flash`) — directo, sin Lovable Gateway
- **Excel**: `xlsx` library (SheetJS)
- **Despliegue**: Vercel, auto-deploy desde GitHub main branch
- **Auth** (planeado): Supabase Auth con login Google

## URL producción
https://nueva-acropolis-sc.vercel.app

## Repositorio GitHub
https://github.com/MarbelTI/Proyecto-nuevaacropolis
(Main branch, auto-deploy a Vercel)

## Estructura del proyecto
```
src/
├── routes/
│   └── index.tsx          ← Página principal (monolito funcional con todo)
├── components/
│   ├── asistencias-tab.tsx ← Pestaña de Control de Asistencias
│   └── diagnostico-global.tsx ← Diagnóstico Global por aula
├── lib/
│   ├── attendance-store.ts  ← Store de asistencias (fechas, aulas, alumnos, records)
│   ├── students-data.ts     ← Catálogo de categorías de ingreso/gasto
│   ├── lists-store.ts       ← Store de transacciones financieras y alumnos
│   ├── fees-logic.ts        ← Lógica de cuotas, fechas, precios
│   ├── ocr.functions.ts     ← Server function para OCR con Gemini
│   ├── bcv.functions.ts     ← Server function para tasa BCV
│   └── ai-gateway.server.ts ← Proveedores de AI (Gemini)
├── components/ui/  ← shadcn/ui components
└── styles/         ← CSS global
```

## Variables de entorno
- `GOOGLE_API_KEY` — clave de Google Gemini para OCR

## Funcionalidades implementadas

### 1. Pestañas principales
Orden: **Control** → **Asistencias** → **Finanzas** → **OCR** → **Solvencias** → **Resumen Mensual** → **Análisis por aula** → **Diagnóstico Global**

### 2. Control de Asistencias (AsistenciasTab)
- Grid de 52 clases dividido en 2 semestres con botones toggle (Semestre 1 / Semestre 2)
- Header: fecha arriba de A (Asistió), número de tema arriba de R (Revisión)
- Cada celda: clic cambia entre: vacío → A (Asistió, verde) → R (Revisión, ámbar) → J (Justificada, azul) → I (Injustificada, rojo) → vacío
- La I solo pega si hay 2+ I consecutivas antes
- Temas se editan en settings (engranaje): input vacío = continúa tema anterior
- Abajo del grid: lista vertical solo con temas que tienen título
- Bordes `dashed #bbb`, headers negros bold, celdas vacías semi-transparentes
- Settings dialog: inputs sin placeholder, fecha en formato dd/mm
- Auto-hereda tema anterior

### 3. Análisis por aula (dentro de AsistenciasTab)
- Muestra SIEMPRE los 12 meses (ene-dic), sin botones de semestre
- Cada mes: pills con conteo de Asistencias y Revisiones, sin minHeight
- Dos columnas de total: **"Total Sem"** (total del semestre activo en Control) y **"Total General"** (año completo)
- Valor 0 se muestra en gris claro (`text-muted-foreground/20`)
- Colores rojo/ámbar/verde solo se aplican en las columnas de Total

### 4. Diagnóstico Global
- Tarjetas con fondo gradient por aula
- Muestra: Asistencias, Revisiones, % de Asistencia, Promedio de Notas
- NO muestra Injustificadas
- Oculto para usuarios con rol `celador` (solo ven hasta su aula)
- Filtro "hasta la fecha actual"

### 5. Finanzas
- Tabla de transacciones (ingresos y gastos)
- Categorías configurables
- Importar Excel (formato asistencia con fecha, tipo, categoría, monto, etc.)
- Cálculo de tasas BCV

### 6. OCR
- Subir imagen de cuaderno contable
- Escanea con Google Gemini y extrae transacciones automáticamente
- Modelo: `gemini-1.5-flash`
- Ya no usa Lovable AI Gateway

### 7. Solvencias
- Control de cuotas de alumnos
- Calcula cuotas debidas vs pagadas

### 8. Resumen Mensual
- Selector de mes/año
- Tarjetas de totales (ingresos, gastos, neto)
- Filtro por categorías individuales
- Botón **"Excel"**: exporta archivo `.xlsx` con formato estilo `NuevaAcropolis_v4.xlsx`:
  - Hoja 1: TRANSACCIONES — detalle de todas las transacciones
  - Hoja 2: ANÁLISIS FINANCIERO — matriz categorías × 12 meses con totales
  - Hoja 3: RESUMEN MENSUAL — indicadores + ingresos/egresos con N° de pagos y %

### 9. Roles y permisos
Definidos en `attendance-store.ts` (array `USERS` + función `getUserInfo`):
- **Admin (Margelys)**: acceso completo a todo
- **Celadores**: ven solo su aula en Control, NO ven Diagnóstico Global
- **Manuela**: solo `canAccessExisting` (finanzas, solvencias), NO asistencias

## Archivos clave y lo que contienen

### `src/routes/index.tsx` (~2200 líneas, monolito funcional)
- Toda la UI de finanzas, OCR, solvencias, resumen mensual
- Tabs de navegación principal
- Funciones: exportExcelResumen, lógica de importación OCR
- Función auxiliar: `fechaToIso()`, `serialDate()`, `todayIso()`

### `src/components/asistencias-tab.tsx`
- El grid de asistencias completo
- Settings de temas
- Análisis por aula (12 meses, dos totales)
- Referencia a Diagnóstico Global

### `src/components/diagnostico-global.tsx`
- Tarjetas gradient por aula
- Lógica de filtro hasta fecha actual

### `src/lib/attendance-store.ts`
- Tipos: `AulaMeta`, `AttendanceRecord`, `UserInfo`
- `generateFechas()` — genera 52 fechas saltando 1 de enero
- `USERS` array con roles y permisos
- `getUserInfo()`, `useCurrentUser()`
- `useAttendance()`, `useAulasMeta()`
- Lógica de persistencia (localStorage por ahora)

### `src/lib/lists-store.ts`
- Tipos: `Transaction`, `Student`
- `useTransactions()` — store Zustand-like
- Lógica de persistencia

### `src/lib/students-data.ts`
- `CATEGORIAS_INGRESO` — array de strings
- `CATEGORIAS_GASTO` — array de strings
- `MATRIZ_CATEGORY_MAP` — mapeo para importación de Excel matriz (categorías de columnas a internal names)

### `src/lib/fees-logic.ts`
- `cuotaMensualUSD`, `precioClase`, `TASA_PESOS_DEFAULT`
- `calcularCuotasDebidas()`, `calcularMontoUsd()`, `currentYm()`

### `src/lib/ocr.functions.ts` y `src/lib/ai-gateway.server.ts`
- Server function `analyzeJournalImage()` que llama a Gemini
- El gateway usa `createGoogleGeminiProvider()` con `gemini-1.5-flash`

## Base de datos (Supabase)
Tablas ya creadas (falta migrar datos de localStorage a Supabase):
- `aulas` (id, nombre, created_at)
- `participantes` (id, nombre, created_at)
- `aula_participantes` (id, aula_id, participante_id)
- `asistencias` (id, aula_id, participante_id, fecha, estado, created_at)
- `temas` (id, aula_id, fecha, titulo, created_at)
- RLS habilitado pero sin policies aún

## Próximos pasos previstos
1. Migrar datos de localStorage a Supabase (alumnos, asistencias, transacciones financieras)
2. Configurar Supabase Auth con login Google (cada usuario accede con su correo)
3. Aplicar RLS policies por rol de usuario
4. Probar OCR con Gemini en Vercel (variable GOOGLE_API_KEY ya configurada)
5. Lovable IDE si se desea, para edición visual del frontend

## Notas importantes
- El código usa `localStorage` para persistencia actual (no migrado a Supabase aún)
- El build usa preset `cloudflare-module` para Nitro
- Errores preexistentes no relacionados: TS error en `lists-store.ts` (`Condicion` inferido como string)
- La app usa mayúsculas sostenidas para títulos (minimalismo visual)
