## 1. Almacenamiento (`src/lib/lists-store.ts`)

- [ ] 1.1 Nueva constante de clave de `localStorage` (ej.
      `K_BNC_ABREV = "lector_ocr_bancos_abrev"`), siguiendo el patrón de las
      demás claves del archivo.
- [ ] 1.2 Mapa de siembra inicial `BANCOS_ABREV_DEFAULT: Record<string, string>`
      con los códigos para cada nombre de `BANCOS_DEFAULT` (ver design.md →
      Decisions).
- [ ] 1.3 Nuevo hook `useBancoAbrev(): [Record<string, string>, (next: Record<string, string>) => void]`:
      carga desde `localStorage` con `load(K_BNC_ABREV, {})`; si el resultado
      cargado está vacío, se completa con `BANCOS_ABREV_DEFAULT` (mismo
      criterio de "solo la primera vez" que ya usa `useEditableAulas` con las
      aulas nuevas). El setter guarda con `save()`, igual que
      `useEditableList`.

## 2. Editor en Configuración (`src/components/finanzas/TransactionsTab.tsx`)

- [ ] 2.1 Nuevo componente `BancosAbrevEditor({ bancos, abrev, setAbrev })`:
      una fila por banco de la lista `bancos` existente, con el nombre
      (solo lectura, se edita desde la pestaña de Ingresos/Gastos/Bancos ya
      existente — este editor es solo para el código) y un `Input` corto
      al lado para el código. Guarda en `setAbrev` al cambiar, sin botón de
      confirmar aparte (mismo patrón que `SimpleListEditor`).
- [ ] 2.2 En el diálogo de Configuración, la pestaña "Bancos" pasa a mostrar
      el `SimpleListEditor` de siempre (para agregar/quitar/renombrar
      bancos) seguido de `BancosAbrevEditor` para sus códigos — no se
      reemplaza el editor existente, se complementa.
- [ ] 2.3 `TransactionsTab` recibe `bancoAbrev` y `setBancoAbrev` como props
      nuevas (mismo patrón que `bancos`/`setBancos`).

## 3. Visualización en Transacciones (`src/components/finanzas/TransactionsTab.tsx`)

- [ ] 3.1 La celda de Banco de la tabla (la que hoy muestra
      `r.banco || "—"` truncado) muestra `bancoAbrev[r.banco] || r.banco || "—"`.
      El `title` de la celda sigue siendo el nombre completo, para que al
      pasar el mouse se vea a qué banco corresponde el código.

## 4. Visualización en Resumen (`src/components/finanzas/ResumenTab.tsx`)

- [ ] 4.1 `ResumenTab` recibe `bancoAbrev` como prop nueva.
- [ ] 4.2 La tarjeta de "Saldos por banco/cuenta al cierre del mes"
      antepone el código (si existe) al nombre del banco en cada tarjeta,
      ej. "BV · Bco Venezuela".

## 5. Cableado (`src/routes/index.tsx`)

- [ ] 5.1 `const [bancoAbrev, setBancoAbrev] = useBancoAbrev();` junto a
      donde ya se crea `bancos`.
- [ ] 5.2 Pasar `bancoAbrev`/`setBancoAbrev` a `TransactionsTab`, y
      `bancoAbrev` a `ResumenTab`.

## 6. Verificación

- [ ] 6.1 `npx tsc --noEmit` sin errores.
- [ ] 6.2 `npm run build` sin errores.
- [ ] 6.3 Confirmar en el navegador (con datos reales o de prueba): la
      pestaña Bancos de Configuración muestra el código junto a cada banco
      por defecto ya lleno; cambiar un código se refleja de inmediato en la
      columna Banco de Transacciones y en los saldos por banco de Resumen;
      un banco sin código sigue mostrando su nombre completo en ambos
      lugares.
