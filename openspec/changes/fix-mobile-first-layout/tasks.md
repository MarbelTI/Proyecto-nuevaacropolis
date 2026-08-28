## 1. Encabezado (`src/routes/index.tsx`)

- [x] 1.1 El bloque de "Tasas BCV" (label, fecha, badge Bs/$, badge Bs/€,
      insignia de origen) pasa a su propia fila completa en pantalla angosta,
      en vez de competir por espacio con el logo/título en la misma línea.
- [x] 1.2 Dentro de esa fila, permitir que sus elementos se envuelvan
      (`flex-wrap`) en vez de desbordarse cuando no quepan todos en una
      línea, incluso en la propia fila ya separada de la tarea 1.1.
- [x] 1.3 Revisar `min-w-[220px]` del bloque de título y `min-w-[80px]` de
      cada badge de tasa: mantenerlos solo donde no rompan en 360px de
      ancho.
      **Verificado visualmente** con Playwright a 375×812 contra el servidor
      local: las dos tasas y todos los botones quedan completos, sin
      recortes.

## 2. Formulario de transacción + calculadora integrada

- [x] 2.1 `TransactionEditDialog.tsx`: en pantalla angosta, cuando la
      calculadora está abierta, deja de usar la columna fija
      `grid-cols-[1fr_260px]` y apila la calculadora debajo del formulario
      (una sola columna, desde `sm:` para arriba vuelve a ir al lado).
- [ ] 2.2 Confirmar que el formulario base (`grid-cols-2`, sin la
      calculadora abierta) se ve y se usa completo en un celular real —
      **pendiente de verificar con sesión iniciada** (ver sección 6).
- [x] 2.3 `CalculadoraDialog.tsx`: el botón de tasa sugerida (texto largo
      tipo "Tasa Euro del DD/MM/AAAA" junto al input de tasa) ahora está en
      un contenedor `flex-wrap`, así que baja a su propia línea en vez de
      cortarse o desbordar.

## 3. Tabla de Transacciones — acciones por fila

- [x] 3.1 Los botones de editar/duplicar/eliminar de cada fila
      (`TransactionsTab.tsx`) pasan a 36×36px en pantallas por debajo de
      `sm:` (antes 24×24px) con más separación entre ellos, y quedan
      exactamente igual que antes (24×24px) en escritorio — no se llegó a
      los 44px recomendados sin agrandar la fila en escritorio también; fue
      el punto medio que no toca la densidad de la tabla en computadora.
      **Ajuste respecto al plan original**: el criterio de la tarea decía
      "sin agrandar visualmente el alto de la fila" sin distinguir
      dispositivo — en la práctica eso solo es posible dejando el tamaño
      igual en todos lados (y entonces seguiría siendo difícil de tocar en
      el celular) o agrandándolo solo por debajo de `sm:`, que es lo que se
      hizo.

## 4. Verificación del camino crítico

- [ ] 4.1 Probar en un celular real (o con Playwright a 360-390px de ancho,
      con sesión iniciada) el camino completo: iniciar sesión → abrir
      Transacciones → crear un movimiento nuevo → abrir la calculadora →
      cerrarla → guardar. **Pendiente** — no hay credenciales de prueba
      disponibles desde aquí (ver sección 6).
- [x] 4.2 `npx tsc --noEmit` y `npm run build` sin errores.

## 5. Resto del sistema, salvo OCR

**OCR (`OcrTab.tsx`) queda fuera de alcance de este cambio**: Nancy confirmó
que esa pestaña solo se usa desde su computadora, nunca desde el celular —
no se audita ni se corrige aquí.

- [x] 5.1 Diálogos `max-w-2xl`/`max-w-3xl` de Configuración (Settings de
      Transacciones) y `CuentasPendientes.tsx`: revisados, ya usaban
      `flex-wrap`/`grid sm:grid-cols-2` — no necesitaron cambios.
      `SolvenciasTab.tsx` (dos diálogos con tablas de 3 y 6 columnas): se
      envolvieron en scroll horizontal propio (no lo tenían), y dos filas
      `flex` sin wrap pasaron a `flex-wrap` para no desbordarse con nombres
      largos.
- [x] 5.2 `ResumenTab.tsx`: revisado — las tablas (categoría/monto/%) tienen
      pocas columnas y ya caben; los resúmenes de arbitraje usan
      `grid-cols-[1fr_auto_auto]`, que ya se ajusta solo. No hizo falta
      ningún cambio.
- [x] 5.3 `asistencias-tab.tsx`: confirmado por código — ya tiene su propio
      `overflow-x-auto` en los tres lugares donde hace falta. Sin cambio
      estructural, según lo previsto en design.md.
- [x] 5.4 `npx tsc --noEmit` y `npm run build` sin errores, después de estos
      cambios.

## 6. Verificación visual pendiente

- [x] 6.1 El encabezado (sección 1) se confirmó visualmente con Playwright a
      375×812 contra un servidor local — se ve completo, sin recortes.
- [ ] 6.2 Todo lo demás (formulario de transacción, calculadora integrada,
      botones de fila, diálogos de Solvencias) se ajustó con buen criterio
      de mobile-first y quedó con build limpio, pero **no se pudo ver
      corriendo con sesión iniciada** — no hay credenciales de prueba
      disponibles desde aquí. Falta que Nancy lo confirme en su celular (o
      dé acceso de prueba) antes de darlo por cerrado del todo.
