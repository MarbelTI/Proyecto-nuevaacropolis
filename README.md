# SISFIA — Nueva Acrópolis San Cristóbal

App web para la gestión de la escuela Nueva Acrópolis SC: control de asistencias (52 clases/año), finanzas (ingresos/egresos), solvencias de alumnos, diagnóstico global y OCR de cuadernos contables.

## Stack

- **Framework**: TanStack Start (React + SSR + Server Functions)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Build**: Vite + Nitro
- **Base de datos**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth (Google OAuth), roles por usuario
- **OCR**: Gemini API (IA) para extraer transacciones de imágenes
- **Excel**: `xlsx` (SheetJS) para importar/exportar
- **Despliegue**: Vercel (auto-deploy desde GitHub main)

## Desarrollo

```bash
npm install
npm run dev      # dev server
npx tsc --noEmit # typecheck
npx vite build   # build de producción
```

## Variables de entorno

- `SUPABASE_URL` — URL del proyecto Supabase
- `SUPABASE_ANON_KEY` — anon key (pública, para client + RLS)
- `SUPABASE_SERVICE_ROLE_KEY` — solo para server functions que requieren acceso elevado
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — expuestas al cliente
- `GOOGLE_API_KEY` — clave de Gemini para OCR
- `OPENROUTER_API_KEY` — alternativa de proveedor de IA
- `SISFIA_DEV_BYPASS_AUTH=1` — SOLO desarrollo local (permite entrar sin Supabase)
- `DATABASE_URL` — para migraciones/CLI de Supabase

## Seguridad / privacidad

- Los roles se leen de la tabla `profiles` (nunca del navegador).
- Las server functions validan sesión real de Supabase (`auth-guard.ts`).
- No se guardan datos personales (nombres/emails reales) en el repositorio:
  la semilla de alumnos está vacía y las migraciones usan hash `md5` de los emails.
- `CODIGO_COMPLETO.txt`, `.output/` y `.vercel/` están en `.gitignore` (sin rastrear).

## Estructura

```
src/
├── routes/
│   ├── __root.tsx
│   └── index.tsx              ← página principal (tabs de la app)
├── components/
│   ├── asistencias-tab.tsx    ← control de asistencias + análisis por aula
│   ├── diagnostico-global.tsx ← diagnóstico global por aula
│   └── finanzas/
│       ├── DashboardTab.tsx   ← dashboard ejecutivo (KPIs, gráficos)
│       ├── TransactionsTab.tsx← transacciones (CRUD)
│       ├── ResumenTab.tsx     ← resumen mensual + exportación Excel
│       ├── AnalisisTab.tsx    ← análisis de ingresos/gastos
│       ├── TasasBcvTab.tsx    ← tasas BCV
│       ├── OcrTab.tsx         ← OCR de cuadernos contables
│       ├── SolvenciasTab.tsx  ← solvencias/cuotas de alumnos
│       ├── SupabaseSync.tsx   ← sincronización con Supabase
│       └── AuthDialog.tsx     ← login (Supabase Auth)
├── lib/
│   ├── api/
│   │   ├── auth-guard.ts            ← sesión + roles (server)
│   │   ├── auth.functions.ts        ← authCallback, logout, etc.
│   │   ├── transactions.functions.ts← sync transacciones/tasas con Supabase
│   │   └── bcv.functions.ts         ← tasa BCV
│   ├── ocr.functions.ts       ← server function OCR (Gemini)
│   ├── attendance-store.ts    ← store de asistencias (localStorage)
│   ├── lists-store.ts         ← store de transacciones y alumnos
│   ├── fees-logic.ts          ← lógica de cuotas y precios
│   └── students-data.ts       ← aulas, categorías, seed vacía (sin nombres reales)
├── components/ui/  ← shadcn/ui
└── styles/         ← CSS global
```

## Base de datos (Supabase)

Migraciones en `supabase/migrations/`:

- `20260715223600_rls_active_no_policies.sql`
- `20260716000001_transactions_and_bcv_rates.sql`
- `20260717000001_auth_profiles_and_rls.sql` — enum de roles, tabla `profiles`, trigger `handle_new_user` (roles por hash de email), policies RLS
- `20260717000002_full_setup.sql` — setup completo (tablas + auth + RLS)

Tablas principales: `aulas`, `participantes`, `aula_participantes`, `asistencias`, `temas`, `students`, `transactions`, `bcv_rates`, `profiles`.
