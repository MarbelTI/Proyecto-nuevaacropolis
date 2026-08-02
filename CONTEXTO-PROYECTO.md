# Proyecto Nueva Acrópolis SC — Contexto del Proyecto

## ¿Qué es?
App web para gestionar una escuela: control de asistencias (52 clases/año), finanzas (ingresos/egresos), solvencias de alumnos, diagnóstico global, OCR de cuadernos contables y dashboard ejecutivo. Desplegada en Vercel.

## Stack técnico
- **Framework**: TanStack Start (React + SSR + Server Functions)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Build**: Vite + Nitro
- **Base de datos**: Supabase (PostgreSQL con RLS)
- **Auth**: Supabase Auth con Google OAuth (roles por usuario en tabla `profiles`)
- **OCR**: Google Gemini API — extrae transacciones desde imágenes de cuadernos contables
- **Excel**: `xlsx` (SheetJS) para importar/exportar (formato NuevaAcropolis_v4)
- **Despliegue**: Vercel, auto-deploy desde GitHub main branch

## URL producción
https://nueva-acropolis-sc.vercel.app

## Repositorio GitHub
https://github.com/MarbelTI/Proyecto-nuevaacropolis
(Main branch, auto-deploy a Vercel)

## Estructura del proyecto
```
src/
├── routes/
│   ├── __root.tsx
│   └── index.tsx              ← Página principal (tabs de navegación)
├── components/
│   ├── asistencias-tab.tsx    ← Control de Asistencias + Análisis por aula
│   ├── diagnostico-global.tsx ← Diagnóstico Global por aula
│   └── finanzas/
│       ├── DashboardTab.tsx   ← Dashboard ejecutivo (KPIs, gráficos, reporte)
│       ├── TransactionsTab.tsx← Transacciones (ingresos/gastos, CRUD)
│       ├── ResumenTab.tsx     ← Resumen Mensual + exportación Excel (3 hojas)
│       ├── AnalisisTab.tsx    ← Análisis de ingresos/gastos por categoría
│       ├── TasasBcvTab.tsx    ← Tasas BCV
│       ├── OcrTab.tsx         ← OCR de cuadernos contables (imagen → transacciones)
│       ├── SolvenciasTab.tsx  ← Solvencias / cuotas de alumnos
│       ├── SupabaseSync.tsx   ← Sincronización con Supabase
│       └── AuthDialog.tsx     ← Login (Supabase Auth, Google)
├── lib/
│   ├── api/
│   │   ├── auth-guard.ts            ← getSessionUser/canManageFinanzas (server, valida JWT real)
│   │   ├── auth.functions.ts        ← authCallback, logout (valida JWT, rol desde profiles)
│   │   ├── transactions.functions.ts← sync transacciones/tasas BCV con Supabase (RLS)
│   │   └── bcv.functions.ts         ← tasa BCV
│   ├── ocr.functions.ts       ← Server function para OCR (valida sesión antes de usar IA)
│   ├── attendance-store.ts    ← Store de asistencias (localStorage)
│   ├── lists-store.ts         ← Store de transacciones financieras y alumnos
│   ├── fees-logic.ts          ← Lógica de cuotas, fechas, precios
│   ├── students-data.ts       ← Aulas, categorías y mapa de matriz (seed de alumnos VACÍA: los
│   │                            nombres reales viven en localStorage/Supabase, no en el repo)
│   ├── supabase.ts            ← Cliente Supabase
│   └── error-page.ts          ← Página de error SSR ("Esta página no se cargó")
├── components/ui/  ← shadcn/ui components
└── styles/         ← CSS global
```

## Variables de entorno
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `GOOGLE_API_KEY` — Gemini para OCR
- `OPENROUTER_API_KEY` — proveedor alternativo de IA
- `SISFIA_DEV_BYPASS_AUTH=1` — SOLO desarrollo local
- `DATABASE_URL` — CLI de Supabase / migraciones

## Funcionalidades implementadas

### Pestañas principales (orden)
**Dashboard** → **Transacciones** → **Resumen Mensual** → **Análisis** → **Tasas BCV** → **OCR** → **Solvencias** → **Asistencias** → **Diagnóstico Global**

### Dashboard ejecutivo
- Filtros: año, mes, tipo, moneda, persona (autocomplete)
- KPI cards con doble balance (USD + moneda local)
- Paneles por moneda (USD / Bs / COP con tasa BCV)
- Tendencia mensual, ingresos/gastos por categoría, donut por moneda
- Tabla de movimientos + `ReporteEjecutivo`

### Control de Asistencias
- Grid de 52 clases en 2 semestres con celdas A/R/J/I
- La I solo pega con 2+ I consecutivas antes
- Análisis por aula: 12 meses con totales por semestre y general
- Diagnóstico Global: tarjetas por aula con % de asistencia (oculto a celadores)

### Finanzas
- Transacciones con categorías configurables, moneda y tasa BCV
- Importar Excel (matriz categorías × meses) y exportación a `.xlsx` de 3 hojas
- OCR: subir imagen → Gemini extrae las transacciones
- Solvencias: cuotas debidas vs pagadas por alumno

### Roles y permisos
Roles definidos en la tabla `profiles` (Supabase) — NO en el navegador:
- `super_admin` — acceso total
- `finanzas` — solo finanzas
- `director` — solo lectura en todo
- `celador` — asistencia de su aula
- `celador_estudios` — asistencia + control de estudios

## Base de datos (Supabase)
Migraciones en `supabase/migrations/` (aplicar en orden):
1. `20260715223600_rls_active_no_policies.sql`
2. `20260716000001_transactions_and_bcv_rates.sql`
3. `20260717000001_auth_profiles_and_rls.sql` — enum `user_role`, tabla `profiles`, trigger `handle_new_user` (asigna rol comparando `md5(email)`), policies RLS por rol
4. `20260717000002_full_setup.sql` — setup completo (tablas + auth + RLS)

Tablas: `aulas`, `participantes`, `aula_participantes`, `asistencias`, `temas`, `students`, `transactions`, `bcv_rates`, `profiles`.

Nota: los emails de los usuarios se guardan en las migraciones como `md5(email)` para no exponer datos personales en el repositorio. Para mapear un usuario nuevo: `select md5(lower('usuario@ejemplo.com'));`

## Seguridad / privacidad (auditoría aplicada)
- Las server functions (`transactions`, `ocr`, `auth`) validan sesión real de Supabase y leen el rol desde `profiles` (imposible suplantar rol por email del navegador).
- `authCallback` solo acepta el JWT validado; no recibe email/rol del cliente.
- `students-data.ts` sin nombres reales (semilla vacía).
- `.output/`, `.vercel/` y `CODIGO_COMPLETO.txt` sin rastrear en git.

## Estado / deuda pendiente
- Causa de "Esta página no se cargó" (error de SSR) aún en investigación.
- Asistencias siguen en localStorage (migración a Supabase pendiente).
- Sincronización de Finanzas manual (control de conflictos pendiente).
