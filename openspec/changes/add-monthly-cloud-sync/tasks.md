## 1. Selector de mes

- [x] 1.1 `SupabaseSync.tsx`: agregar `fechaToIso` local (mismo patrón que `ResumenTab.tsx` /
      `SolvenciasTab.tsx`) y una lista `mesesConDatos` derivada de `transactions.list` (mismo
      criterio que `mesOptions` en `TransactionsTab.tsx`: `iso.slice(0, 7)` único, ordenado
      descendente).
- [x] 1.2 `mesLabel(ym)` local (o copiar el patrón de `TransactionsTab.tsx`) para mostrar
      "Agosto 2026" en vez de "2026-08".
- [x] 1.3 Estado `mesElegido` (string `YYYY-MM`), inicializado en el mes más reciente de
      `mesesConDatos` si existe.
- [x] 1.4 UI: un `<Select>` con `mesesConDatos` junto al botón nuevo de subida por mes. No se
      muestra si `mesesConDatos` está vacío.

## 2. Subida por mes

- [x] 2.1 `handleSyncMes`: filtra `transactions.list` por `fechaToIso(t.fecha)?.slice(0,7) ===
      mesElegido`, filtra `bcvRates.rates` por `isoDate.slice(0,7) === mesElegido` (y
      `r.dolar != null`, mismo filtro que ya usa `handleSync`), y llama a `syncTx`/`syncBcv` con
      esos arreglos filtrados — no a los arreglos completos.
- [x] 2.2 Si el mes elegido no tiene transacciones, `handleSyncMes` avisa con un toast y no
      llama a ninguna función de servidor.
- [x] 2.3 Mensaje de éxito explícito con el mes y las filas subidas (ej. "Agosto 2026:
      38 transacciones, 22 tasas subidas"), distinto del mensaje de `handleSync`.
- [x] 2.4 Mismo manejo de errores y de estado `syncing`/`enLinea` que ya usa `handleSync` (no
      inventar un patrón nuevo).
- [x] 2.5 Botón nuevo "Subir [mes] a la nube" junto al botón existente "Subir a nube", mismo
      estilo visual, deshabilitado en las mismas condiciones (`syncing || loading || !enLinea`)
      más si no hay mes elegido.

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit` y `npm run build` sin errores.
- [x] 3.2 Confirmado: `handleSync` y el botón "Subir a nube" no se tocaron — el cambio solo
      agregó código nuevo (`handleSyncMes`, el selector, el botón de mes).
- [ ] 3.3 **Pendiente, requiere la app desplegada**: con la sesión real de Nancy en Vercel,
      elegir agosto 2026, subir, y confirmar en Supabase (o con "Cargar desde nube" desde otra
      cuenta) que solo agosto quedó arriba y el resto de los meses no. No se puede verificar
      desde este entorno de desarrollo por falta de salida de red hacia Supabase.
