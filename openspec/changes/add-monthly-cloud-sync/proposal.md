## Why

Nancy quiere que la data financiera empiece a estar disponible en línea para todo el que tenga
acceso, pero no de golpe: quiere subir agosto 2026 primero y dejar el resto del libro local
hasta decidir subirlo después, mes por mes. Hoy el único botón que existe ("Subir a nube") sube
siempre el libro contable completo de una vez, así que no hay forma de hacer esto sin tocar
código. Es, además, la primera vez que se sube data financiera real (no solo roles/auth) al
proyecto de Supabase en producción.

## What Changes

- `SupabaseSync.tsx` gana un selector de mes y un botón "Subir [mes] a la nube" que sube SOLO
  las transacciones y las tasas BCV de ese mes calendario — no el libro completo.
- El botón "Subir a nube" existente (todo el libro) se mantiene tal cual, sin cambios de
  comportamiento; la subida por mes es una opción adicional, no un reemplazo.
- No se añade ninguna función de servidor nueva: `syncTransactionsToSupabase` y
  `syncBcvRatesToSupabase` ya aceptan cualquier arreglo que se les mande: el filtrado por mes
  ocurre en el cliente, antes de llamarlas.
- Alumnos quedan fuera de este cambio (no tienen una fecha mensual con la que filtrarlos).

## Capabilities

### New Capabilities

- `monthly-cloud-sync`: subir a Supabase las transacciones y tasas BCV de un solo mes calendario,
  elegido por quien sincroniza, sin tocar el resto del libro local.

### Modified Capabilities

(ninguna — no hay specs archivadas todavía bajo `openspec/specs/` para esta área)

## Impact

- **Código**: solo `src/components/finanzas/SupabaseSync.tsx`. Las props que ya recibe
  (`transactions.list`, `bcvRates.rates`) alcanzan; `routes/index.tsx` no necesita cambios.
- **Servidor / Supabase**: ninguno. Mismas funciones, mismas políticas RLS, mismos permisos
  (`canManageFinanzas`): esto cambia QUÉ se manda, no QUIÉN puede mandarlo.
- **Primera sincronización real**: agosto 2026 quedará en el Supabase de producción por primera
  vez con data financiera real. La ejecución real (clic en el botón) solo se puede confirmar
  desde la app desplegada en Vercel con la sesión de Nancy — este entorno de desarrollo no tiene
  salida de red hacia Supabase ahora mismo (verificado: falla hasta la resolución DNS).
