# Auditoría del 9 de agosto de 2026

Revisión completa del proyecto (seguridad, servidor, frontend, base de datos y
lógica de negocio). ~90 hallazgos. Este archivo es la lista de trabajo: se va
marcando `[x]` a medida que se arregla, y sirve para retomar sin depender de
ninguna conversación.

**Cómo retomar en una sesión nueva:** leer este archivo entero, mirar qué queda
sin marcar y empezar por el bloque de más arriba. Cada punto lleva la ruta y la
línea exactas. Nada más hace falta.

Los marcados **[verificado]** los comprobé leyendo el código, no son sospechas.

---

## BLOQUE 1 — Críticos: están corrompiendo datos ahora mismo

Antes de tocar nada: **copia de seguridad de la base en Supabase**, por si ya
hay duplicados que limpiar.

> **BLOQUE 1 COMPLETO (10-ago-2026).** 1.1 a 1.8 hechos, `npx tsc --noEmit`
> limpio. El 1.2 está probado en pantalla y da el número correcto.
>
> **PENDIENTE PARA QUE EL 1.8 FUNCIONE:** ejecutar en el SQL Editor de Supabase
> la migración `20260810000001_sync_asistencias_transaccional.sql`. El código ya
> llama a esa función; **hasta que exista en la base, subir asistencias falla**.
> No es peligroso —el fallo es limpio, no borra nada—, pero deja esa pantalla
> inservible mientras tanto.
>
> **Sobre el 1.2 — criterio definitivo, fijado el 10-ago-2026.**
>
> **La deuda se cuenta desde el mes siguiente a la última MENSUALIDAD pagada.**
> Nunca desde la fecha del movimiento: si en marzo alguien paga la cuota de
> enero, lo que salda es enero.
>
> Hubo una versión intermedia que contaba como debido todo mes no declarado
> desde el arranque del aula. Cargando solo la hoja de enero, a una persona le
> salían **19 meses debidos** — cobraba meses de los que no hay ningún dato.
> Descartada.
>
> `calcularCuotasDebidas` arranca en el más tardío de estos tres:
> 1. el arranque del aula, o el ingreso de la persona si es posterior;
> 2. **el mes siguiente a `ultimaMensualidad`** (la línea de flotación);
> 3. el mes siguiente al último pago que no declaró mensualidad — ahí la fecha
>    es lo único que hay, así que se usa como antes.
>
> **Efecto lateral conocido y aceptado:** si alguien pagó enero y julio pero
> nada en medio, la línea de flotación es julio y los meses saltados no se
> reclaman. Es el mismo criterio que se usaba a mano. Si algún día hace falta
> detectar esos huecos, el sitio es `resumirPagos`: habría que guardar el
> conjunto de meses pagados, no solo el máximo.

- [x] **1.1 «Cargar desde nube» duplica todo el libro contable** [verificado]
      `src/components/finanzas/SupabaseSync.tsx:149-150` + `src/lib/lists-store.ts:369-377`
      Dos bugs encadenados:
      (a) `clear()` y `append()` capturan el mismo `list` del render, así que el
      append deshace el clear y queda local + nube;
      (b) `append` reasigna `id: crypto.randomUUID()` y tira el id que vino de la
      nube, así que el siguiente «Subir a nube» inserta filas nuevas en vez de
      actualizar.
      **Arreglo:** sustituir `clear()` + `append(mapped)` por
      `transactions.replaceAll(mapped)` (ya existe, `lists-store.ts:385`).

- [x] **1.2 La solvencia se calcula con la fecha del pago, no con la mensualidad** [verificado]
      *(hecho: `calcularCuotasDebidas` recibe ahora un `PagosDelAlumno` con los
      meses cubiertos en vez de la fecha del último pago. Nuevas funciones
      `mensualidadAYm` y `resumirPagos` en `fees-logic.ts`. Actualizados los
      cuatro sitios. Lee el AVISO de arriba antes de darlo por bueno.)*
      `src/components/finanzas/SolvenciasTab.tsx:1260`
      `t.mensualidad` se recoge en la línea 868 y se muestra en la columna «Pagó»
      (línea 1323), pero el cálculo de deuda usa `fechaToIso(pay.fecha)`.
      Quien paga en agosto la mensualidad de enero aparece **solvente**; quien
      paga el año por adelantado sigue saliendo moroso.
      Mismo defecto en `src/components/ficha-participante.tsx:191`,
      `SolvenciasTab.tsx:428` y `TransactionsTab.tsx:487`.
      **Arreglo:** no basta con cambiar de columna. Hay que construir el conjunto
      de meses **cubiertos** por `mensualidad` (normalizados a `YYYY-MM` con
      `formatMes`) y calcular la deuda como los meses exigibles que falten en ese
      conjunto — los pagos llegan desordenados, así que «el último pago» es un
      criterio equivocado en sí mismo. Cuando `mensualidad` venga vacía, usar la
      fecha como respaldo y marcarlo en pantalla.

- [x] **1.3 Abrir la pestaña «Tasas BCV» borra todas las tasas de 2025** [verificado]
      `src/components/finanzas/TasasBcvTab.tsx:101`
      `bcv.clean(iso => iso.startsWith("2025"))` corre en cada montaje, y Radix
      desmonta la pestaña al salir de ella. Era una limpieza de migración que
      quedó permanente.
      **Arreglo:** quitarla, o dejarla tras una bandera de un solo uso en
      localStorage.

- [x] **1.4 La edición masiva solo aplica el cambio al último movimiento**
      `src/components/finanzas/TransactionsTab.tsx:868`
      El bucle llama `tx.replace()` por fila y cada llamada parte del array
      original. Dice «40 transacciones actualizadas» y cambia una.
      **Arreglo:** construir el array completo en memoria y un solo
      `tx.replaceAll(nuevas)`. De paso, pasar los setters de `useTransactions` a
      forma funcional (`setList(prev => …)`) para que el patrón no vuelva a fallar.

- [x] **1.5 No se pueden escribir decimales en Monto, Tasa ni USD**
      `src/components/finanzas/TransactionEditDialog.tsx:356-404`
      Inputs controlados con `Number(e.target.value)`: al teclear `90.` el punto
      desaparece y el siguiente dígito se pega como entero → **90.50 se guarda
      como 9050**. Error de 100× en la tasa.
      **Arreglo:** guardar el borrador como texto e interpretarlo al salir, con
      `aNumero` de `CalculadoraDialog.tsx:44` (acepta coma). Añadir
      `inputMode="decimal"`.

- [x] **1.6 Arjuna II se clasifica como Arjuna I** [verificado]
      `src/lib/lists-store.ts:165`
      `"Arjuna II".includes("Arjuna I")` es `true`: la primera condición captura
      las tres aulas Arjuna y la segunda línea es código muerto. Además es
      incoherente con `aulaStartYm` (`src/lib/fees-logic.ts:29`), que compara por
      igualdad exacta.
      **Arreglo:** una sola tabla aula → `{startYm, fechaIngreso}` con comparación
      exacta y normalización (minúsculas, sin tildes).

- [x] **1.7 Más de 1000 transacciones: se pierden en silencio y mal ordenadas**
      `src/lib/api/transactions.functions.ts:141-144`
      Sin `.range()`, PostgREST corta en 1000 filas y devuelve `ok: true`. Y como
      `fecha` es texto `dd/mm/yyyy`, `.order("fecha")` ordena por día del mes.
      Igual en `loadBcvRatesFromSupabase` (línea 172): a los ~3 años devolvería
      las 1000 tasas más antiguas.
      **Arreglo:** paginar con `.range()` en bucle hasta agotar; ordenar por
      `created_at`. Modelo a copiar: `attendance.functions.ts:218-222`, que ya lo
      hace bien y documenta por qué.

- [x] **1.8 El sync de asistencias borra y reinserta sin transacción**
      *(hecho, pero **falta ejecutar la migración en Supabase**: el código ya
      llama a `sync_asistencias` y hasta que la función no exista en la base,
      subir asistencias falla. La migración es
      `supabase/migrations/20260810000001_sync_asistencias_transaccional.sql`;
      hay que pegarla entera en el SQL Editor. Es SECURITY INVOKER a propósito:
      el RLS sigue limitando al celador a su aula. De paso resuelve el aborto
      por filas duplicadas y el filtro por aula que le faltaba a las entregas.)*
      `src/lib/api/attendance.functions.ts:142-194`
      `DELETE` de tres tablas y reinserción en lotes de 500 por HTTP separado. Si
      falla la red o el timeout de Vercel a mitad, la nube queda vacía o a medias
      sin rollback. `enLotes` (línea 57) corta en el primer error dejando escrito
      lo anterior.
      **Arreglo:** una función Postgres (`rpc`) que corra todo en una transacción;
      o upsert primero y borrar los sobrantes al final. Deduplicar por
      `(aula, alumno, fecha)` antes de enviar.

---

## BLOQUE 2 — Seguridad

> **Estado al 9-ago-2026:** hechos 2.2, 2.3, 2.5, 2.6 y 2.9 (`npx tsc --noEmit`
> limpio, sin probar en el navegador). Quedan **2.1** (reescribir el historial de
> git: es destructivo y necesita que lo decida una persona), **2.4**, **2.7** y
> **2.8**.
>
> Tres cosas que hay que comprobar de estos arreglos:
> 1. **2.2** — al validar el certificado del BCV, si su servidor tiene el
>    certificado mal, la descarga del XLS empezará a fallar y se caerá al
>    respaldo de dolarapi. Hay que abrir «Tasas BCV» y confirmar que siguen
>    entrando tasas con la etiqueta «BCV oficial».
> 2. **2.5** — el atajo de desarrollo ahora solo existe con `npm run dev`. Si
>    alguien lo usaba con un build de producción en local, deja de funcionar: es
>    exactamente lo que se buscaba.
> 3. **2.6** — la CSP se dejó en `Content-Security-Policy-Report-Only` a
>    propósito. Hay que abrir la consola del navegador en producción, ver qué
>    bloquearía, ajustarla y solo entonces pasarla a `Content-Security-Policy`
>    a secas. Si se activa a ciegas, se rompe el hidratado de TanStack.

- [ ] **2.1 Datos personales reales en el historial de git** (alto)
      `PLANTILLA SISTEMATIZADA ECONOMIA.xlsx`, commit inicial. ~45 cédulas, 9
      teléfonos, nombres completos. El `.gitignore` lo bloquea hoy pero no borra
      el pasado.
      **Arreglo:** `git filter-repo --invert-paths --path "PLANTILLA SISTEMATIZADA ECONOMIA.xlsx"`,
      force-push a todas las ramas y tags, y ticket a GitHub para el GC (el
      force-push solo no borra el blob de la web). Aprovechar la misma pasada para
      los 160 archivos de `.output/` que estuvieron commiteados.

- [~] **2.2 Validación TLS desactivada contra bcv.org.ve** (alto)
      `src/lib/bcv.functions.ts` — `new https.Agent({ rejectUnauthorized: false })`.
      Permite inyectar la tasa de cambio de toda la contabilidad, o servir un XLS
      malicioso que se parsea con una versión vulnerable de `xlsx`.

      **Se intentó activar la validación y hubo que revertirlo (10-ago-2026).**
      Comprobado con Node contra el servidor real: bcv.org.ve devuelve
      `UNABLE_TO_VERIFY_LEAF_SIGNATURE` — su cadena de certificados está
      incompleta, no manda el intermedio. Con la validación puesta fallaban las
      doce URL candidatas y la carga de tasas pasaba de 20 segundos a más de un
      minuto sin traer nada.

      **Riesgo que se acepta hoy:** quien esté en la ruta de red entre el
      servidor y bcv.org.ve puede falsear la tasa. Exige estar en la salida de
      red de Vercel; no es algo al alcance de cualquiera.

      **Arreglo pendiente, el bueno:** guardar el certificado intermedio del BCV
      en el repositorio y pasarlo como `ca` al agente. Valida de verdad sin
      desactivar nada. Hay que renovarlo cuando caduque, y por eso no se hizo
      sobre la marcha.

      Compensación añadida mientras tanto: se comprueba el código de respuesta
      HTTP y se limita el tamaño de la descarga, así que al menos la página de
      error del BCV ya no acaba dentro del lector de hojas de cálculo.

- [x] **2.10 La carga de tasas BCV tardaba minutos y no había tope**
      `bcvUrlCandidates` genera 12 URL y se probaban **en fila india** con 15 s
      de espera cada una: hasta 3 minutos, justo el día que el BCV está caído,
      que es cuando más prisa hay. Y `fetchXlsBuffer` no miraba el código de
      respuesta, así que la página de error 404 se devolvía como si fuera el
      XLS y reventaba dentro de `XLSX.read`, tumbando la búsqueda entera en vez
      de pasar a la siguiente URL.
      *(hecho: las candidatas se prueban todas a la vez y gana la primera con
      filas; 6 s por URL y 12 s de tope global; se comprueba el statusCode; el
      lector de XLS va dentro de try/catch. Medido contra el servidor real:
      **1 segundo**.)*

- [x] **2.3 Los tres endpoints de BCV no comprueban sesión** (alto)
      `src/lib/bcv.functions.ts:121, 131, 157`. Únicos del proyecto sin
      `getSessionUser`. Cada llamada encadena hasta 12 peticiones × 15 s.
      `fetchTodayBcv` y `fetchBcvQuarter` además no los usa ningún componente.
      **Arreglo:** el mismo guard que el resto (`canReadFinanzas`), y borrar los
      dos endpoints muertos.

- [x] **2.4 Fail-open: sin `VITE_SUPABASE_URL` se monta un super_admin ficticio** (alto)
      *(hecho: fuera el mock. Ahora cae al camino normal, que ya sabía pintar
      `configError` en pantalla explicando qué falta configurar; `login` y
      `signUp` devuelven false en vez de true. Mismo criterio que supabase.ts:
      mejor una aplicación que no funciona y dice por qué, que una que funciona
      repartiendo permisos.)*
      `src/components/finanzas/AuthDialog.tsx:20, 100, 142-165`. `login()` y
      `signUp()` devuelven `true` sin autenticar. El servidor sigue rechazando,
      pero queda accesible todo lo de `localStorage`.
      **Arreglo:** unificar con la ruta de `configError` de `src/lib/supabase.ts`,
      que falla en cerrado y explica el motivo. Eliminar el mock.

- [x] **2.5 El bypass de auth viaja compilado al bundle de producción** (medio)
      `src/lib/api/auth-guard.ts:9`. La condición `!process.env.VERCEL` está bien
      pensada y hoy cubre Vercel, pero depende de un ajuste del dashboard
      («Automatically expose System Environment Variables») y no protege un
      self-host.
      **Arreglo:** `import.meta.env.DEV && process.env.SISFIA_DEV_BYPASS_AUTH === "1"`,
      que Vite elimina del build de producción.

- [x] **2.6 Falta `vercel.json` con cabeceras de seguridad** (medio)
      Cero CSP, X-Frame-Options, HSTS, Referrer-Policy, X-Content-Type-Options, en
      una app que guarda cédulas y teléfonos en `localStorage`. Empezar la CSP en
      `Content-Security-Policy-Report-Only` por el hidratado de TanStack.

- [x] **2.7 `xlsx@0.18.5` sin parche posible en npm** (medio)
      *(hecho: se instaló la 0.20.3 desde el CDN de SheetJS, que es donde
      publican desde que dejaron npm. Comprobado: ya no aparece en `npm audit`,
      `tsc` limpio y el build pasa en 17 s.*

      *Lo que hay que vigilar: `package.json` apunta ahora a una URL
      (`https://cdn.sheetjs.com/...`) en vez de al registro de npm. Si ese
      servidor no responde cuando Vercel construya, **el despliegue falla**. Se
      sabrá en el primer despliegue; la vuelta atrás es `npm i xlsx@0.18.5`.*

      *Nota: quedan 4 vulnerabilidades altas en `npm audit`, pero ya no son de
      xlsx — vienen de otras dependencias, sin revisar.)*
      CVE-2023-30533 (prototype pollution) y CVE-2024-22363 (ReDoS). SheetJS se
      movió a su CDN y no habrá arreglo por npm. Se le pasan archivos subidos por
      el usuario en `excel-import.ts:83`, `:186` y `attendance-store.ts:148`.
      **Arreglo:** migrar a `exceljs` (cubre también las notas de celda que usa
      `excel-export.ts:184`).

- [~] **2.8 Errores crudos y datos personales en los logs** (medio)
      *(hecha la parte que filtraba datos personales, que es la que importaba:
      `ocr.functions.ts` ya no vuelca 500 caracteres de la respuesta del modelo
      —nombres de alumnos y montos del libro— a los registros de Vercel, solo la
      longitud; y `OcrTab` ya no registra el nombre del archivo, que suele
      llevar el mes y el aula. También el sync de asistencias devuelve ahora un
      mensaje propio en vez del error crudo de Postgres.*

      *Sin hacer: los ~12 `return { ok: false, error: error.message }` que
      siguen devolviendo mensajes de PostgREST al navegador. Revelan nombres de
      tablas y políticas, pero no datos de personas. Es trabajo mecánico y sin
      urgencia.)*
      ~15 sitios devuelven `error.message` de Supabase al cliente (nombres de
      tablas, constraints, políticas RLS). Y `src/lib/ocr.functions.ts:391` hace
      `console.error("OCR raw output:", …)` volcando nombres y montos del libro a
      los logs de Vercel.
      **Arreglo:** registrar el detalle en servidor, devolver texto genérico con
      identificador de correlación. En el OCR, loguear solo la longitud.

- [x] **2.9 `resolverCuentaPendiente`: sin protección de «último administrador»** (medio)
      *(hecho a medias: ya no puedes cambiarte el rol a ti mismo. Sigue faltando
      el trigger en la base que impida dejar la escuela sin ningún super_admin
      aprobado, y la auditoría de cambios de rol.)*
      `src/lib/api/auth.functions.ts:197-228`. La autoprotección solo cubre el
      rechazo: un super_admin puede degradarse a sí mismo a `celador` y perder el
      acceso de forma irreversible desde la app. Además acepta cualquier `userId`,
      no solo cuentas pendientes, y no hay auditoría de cambios de rol.

---

## BLOQUE 3 — Base de datos (Supabase)

> **Estado al 10-ago-2026.** Inventario hecho (3.0). Aplicadas en Supabase las
> migraciones `20260810000001` (el 1.8) y `20260810000002` (3.4, 3.6, 3.7, 3.8).
> Quedan 3.1, 3.2, 3.3, 3.5 y 3.9.
>
> **Aviso de método:** el panel de Supabase se abrió con la traducción
> automática del navegador puesta, y traducía los NOMBRES de las tablas
> (`bcv_rates` → «tasas bcv», `BASE TABLE` → «MESA BASE»). Estuvo a punto de
> costar un diagnóstico equivocado. Al consultar el esquema, traducción
> apagada.

**Lo que decía este bloque y ya NO es cierto:** se sospechaba que las
migraciones no reconstruían la base porque cinco tablas (`aulas`,
`participantes`, `asistencias`, `temas`, `aula_participantes`) se referencian
sin que ninguna migración las cree. **Existen todas**, y las cuatro `att_`
también, así que ninguna migración abortó. Sigue siendo verdad lo otro: el
repositorio por sí solo no levanta la base de cero, porque esas tablas se
crearon fuera de él. No es urgente, pero conviene resolverlo antes de que haga
falta de verdad.

- [x] **3.0 Inventariar qué existe de verdad** — hecho, ver arriba
      ```sql
      select table_name, table_type from information_schema.tables
       where table_schema = 'public' order by table_name;

      select column_name from information_schema.columns
       where table_schema='public' and table_name='profiles'
         and column_name in ('aprobado','aula_nombre','aula_id');

      select p.proname, pg_get_functiondef(p.oid) like '%aprobado%' as exige_aprobado
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname like 'is\_%';
      ```
      Si `profiles.aprobado` no existe, la migración `20260805000005` hizo
      rollback y **no hay control de aprobación**: cualquier cuenta que se
      registre queda operativa. Verificar esto es urgente.

- [x] **3.0b Finanzas no podía guardar cambios de alumnos** (decidido 10-ago-2026)
      Finanzas lleva las cuotas especiales, pero `canManageStudents` no la
      incluía y `students` no tenía ninguna política RLS para ese rol: los
      cambios se le quedaban en el navegador y no llegaban a la nube.
      *(hecho en los dos sitios: `canManageStudents` y la migración
      `20260810000003_finanzas_escribe_alumnos.sql`. **Falta ejecutarla en
      Supabase.***)

      *Lo que concede, escrito a conciencia: la ficha es una sola fila, así que
      finanzas puede tocar también cédula, correo, dirección y teléfono. Se
      aceptó a cambio de que pueda trabajar sin depender de nadie. Si algún día
      hay que recortarlo, la vía es llevar las columnas de cuota a su propia
      tabla, no afinar la política por columnas.*

- [x] **3.1 El rol `director` recibe cero alumnos**
      *(hecho y **ya aplicado en Supabase** el 10-ago-2026, migración
      `20260810000004_vistas_director_y_barrier.sql`. Se añade
      `or public.is_director()` al WHERE de `students_finanzas`.*

      *La migración tuvo que pasar de `create or replace view` a `drop` +
      `create`: la vista que había en la base **no coincidía en orden de
      columnas** con la del repositorio, señal de que se editó a mano en algún
      momento. Otro recordatorio de que el repositorio no describe la base —
      ver la cabecera de este bloque.)*
      `supabase/migrations/20260806000006_vistas_no_pierden_celador.sql:40` vs
      `src/lib/api/students.functions.ts:153-157`. El código lo enruta a
      `students_finanzas`, cuya vista filtra por `is_finanzas() or is_super_admin()`.
      Falla en silencio, sin error.
      **Arreglo:** añadir `or public.is_director()` al `where` de la vista.

- [ ] **3.2 Aprobar un celador no le asigna aula**
      `src/lib/api/auth.functions.ts:222-225` hace `update` de `aprobado` y `role`
      pero nunca de `aula_nombre`, y el panel no lo ofrece. El celador queda
      aprobado sin ver nada, y hay que entrar al SQL Editor para arreglarlo.

- [ ] **3.3 Un celador puede escribir reflexiones de otras aulas**
      `20260806000002:76-83` + `20260806000003:186-189`. La política filtra por la
      columna `aula`, que el propio escritor controla y nada valida contra la
      reflexión referenciada.
      **Arreglo:** FK compuesta `(reflexion_id, aula)` contra
      `att_reflexiones(id, aula)`, con `unique (id, aula)` previo.

- [x] **3.4 Nueve funciones `SECURITY DEFINER` sin `SET search_path`**
      *(hecho y verificado en la base: 4 funciones de rol con search_path fijo,
      `can_edit()` eliminada. Migración `20260810000002`.)*
      Son precisamente las que *son* la capa de autorización (`is_super_admin`,
      `is_finanzas`, `handle_new_user`…). Es un `alter function … set search_path = ''`
      por cada una; todas cualifican ya `public.profiles`, así que no rompe nada.
      Aprovechar para `drop function public.can_edit()`, que nadie llama y —a
      diferencia del resto— no exige `aprobado`.

- [x] **3.5 Las vistas de alumnos puentean el RLS de `students`**
      *(hecho y aplicado, misma migración `20260810000004`: `security_barrier = true`
      en las dos vistas. NO se pasó a `security_invoker`, que habría roto a
      dirección —no tiene política propia sobre `students`—. De paso, el filtro
      del celador usa ahora `s.aulas && array[p.aula_nombre]` en vez de
      `= any(...)`, que no podía aprovechar índice, y se crea el GIN
      `idx_students_aulas_gin` (el resto del 3.7).)*
      Son SECURITY DEFINER por omisión y no declaran `security_barrier`, así que
      un `where` del usuario puede evaluarse antes que el filtro de rol.
      **Arreglo:** `alter view … set (security_barrier = true)` en
      `students_finanzas` y `students_celador`.
      Ojo: `security_invoker = true` **rompería a finanzas**, que ya no tiene
      política propia sobre `students`.

- [x] **3.6 `bcv_rates` legible sin autenticar**
      *(hecho y verificado: política `usuarios_aprobados_leen_bcv` activa.)*
      `20260717000002:190-192` — `using (true)` sin cláusula `to` incluye a `anon`,
      y la clave publishable está en el bundle. Restringir a `authenticated` con
      `aprobado`.

- [x] **3.7 Rendimiento: funciones de rol sin `STABLE` e índices que faltan**
      *(hecho y verificado: las 4 funciones son STABLE, `idx_students_nombre`
      creado, más el parcial de pendientes y el de reflexiones por aula/año;
      eliminados los 4 índices redundantes. Falta lo del GIN en `students.aulas`,
      que va junto con la reescritura de la vista del celador — ver 3.5.)*
      `is_super_admin`, `is_finanzas`, `is_director`, `is_celador_estudios` se
      reevalúan **por fila** en cada política (300 alumnos = 300 consultas extra).
      Marcarlas `stable` y envolver las llamadas en las políticas como
      `using ((select public.is_finanzas()))`.
      Índices que faltan: `students(nombre)`,
      `profiles(created_at) where aprobado = false`, GIN en `students(aulas)`
      (reescribiendo `= any(...)` como `&&`), `att_reflexiones(aula, year)`.

- [~] **3.8 Integridad: sin `CHECK` en importes y sin único en cédula**
      *(a medias: los CHECK de `bcv_rates.rate`, `monto`, `monto_usd` y `tasa`
      están puestos como NOT VALID, así que protegen de aquí en adelante. Falta
      (a) validarlos cuando se confirme que el histórico está limpio, con
      `alter table … validate constraint …`, y (b) el índice único de cédula,
      que exige comprobar duplicados antes — la consulta está más abajo.)*
      `bcv_rates.rate` acepta 0 y negativos (una tasa 0 llega a una división).
      `monto` / `monto_usd` aceptan negativos aunque el signo lo lleva `tipo`.
      Y `students.cedula` no tiene índice único: dos dispositivos duplican al
      mismo alumno (el upsert va por `id`, que lo inventa cada navegador).
      Nota buena: **todos los importes son `numeric`, ni un `float8`**.

- [x] **3.9 Ids generados en el navegador que no son UUID**
      *(hecho: `nuevoId()` en `utils.ts` arma un UUID v4 con
      `crypto.getRandomValues`, que sí existe fuera de contexto seguro. Sustituye
      los tres respaldos distintos que había en `SupabaseSync`, `lists-store` y
      `excel-import`. Sin esto, sirviendo la app por IP en la red local el id
      salía como "lz8k3f9x" y el upsert fallaba con el LOTE entero.)*
      `crypto.randomUUID` solo existe en contexto seguro. Sirviendo la app por
      HTTP en la red local, el fallback produce `"lz8k3f9x"` contra una columna
      `uuid` → falla **el lote entero**, no la fila mala.
      Sitios: `SupabaseSync.tsx:27-31`, `lists-store.ts:372, 394`,
      `excel-import.ts:87`.
      **Arreglo:** polyfill de UUID v4 con `crypto.getRandomValues`.

---

## BLOQUE 4 — Pérdida de trabajo del usuario

- [x] **4.1** Cambiar de pestaña **destruía lo extraído por el OCR** (Radix
      desmonta el contenido inactivo). Un clic en Transacciones para comprobar
      un pago repetido borraba las hojas ya revisadas a mano.
      *(hecho: `entries` y `previews` viven ahora en `index.tsx` y bajan como
      props. El trabajo solo se vacía al guardar o al pulsar vaciar. Los filtros
      de Transacciones siguen perdiéndose al cambiar de pestaña — mismo motivo,
      mismo remedio, pero cuesta menos volver a ponerlos que rehacer siete
      hojas de OCR.)*
- [x] **4.2** El botón «Cancelar» del OCR no cancelaba: el bucle seguía llamando
      a la API —pagándola— y metiendo filas mientras el usuario ya había subido
      otro lote. *(hecho: una ref `cancelado` que el bucle mira antes de cada
      foto. No hizo falta AbortController: el corte entre fotos basta y son tres
      líneas.)*
- [x] **4.3** La selección de Solvencias se guarda **por índice de array**.
      Borrabas una ficha, los índices se desplazaban y «Unir fichas» fusionaba a
      dos personas que no eran, eliminando las originales y sin deshacer.
      *(hecho: se limpia la selección en las tres operaciones que reordenan la
      lista — borrar una ficha, importar Excel y traer de asistencias. Las demás
      (`map` en el sitio, añadir al final) no desplazan nada y no se tocaron.
      Migrar a `student.id` sigue siendo lo correcto de fondo, pero el id es
      opcional en el tipo y muchos alumnos importados no lo traen; limpiar la
      selección quita el peligro hoy sin ese refactor.)*
- [x] **4.4** Ningún diálogo avisaba antes de descartar un formulario de 11
      campos. *(hecho: `onInteractOutside` prevenido en los cuatro diálogos con
      formulario. Un clic fuera ya no descarta nada; **Esc se deja funcionando
      a propósito**, que es el gesto deliberado y quitarlo rompería la
      accesibilidad.)*
- [x] **4.5** Ningún botón «Guardar» se deshabilita al pulsarse: doble clic =
      movimiento duplicado. *(hecho en `TransactionEditDialog`, que es el que
      crea dinero, con una ref y sin estado nuevo. **Quedan sin cubrir** los
      botones de `OcrTab`, `SolvenciasTab` y `TransactionsTab`: ahí un doble
      clic duplica una ficha o repite un guardado, molesto pero no descuadra
      cuentas.)*
- [x] **4.6** La escritura en `localStorage` fallaba en silencio al superar la
      cuota (~5 MB, alcanzable: las asistencias reescriben el array entero en
      cada marca). La pantalla decía que se guardó y no se guardaba.
      *(hecho: un solo `guardarLocal` en `utils.ts` sustituye los cinco
      `catch {}` mudos de los cuatro stores y avisa con un toast de 10 s.)*

---

## BLOQUE 5 — Importar / exportar Excel

> **Estado al 10-ago-2026.** Hechos 5.1, 5.2 y 5.3; `npx tsc --noEmit` limpio.
> Subieron de prioridad porque la carga real a Supabase todavía no se ha hecho:
> son los tres errores que se comen datos recién limpiados a mano.
> Queda **5.4** (previsualización antes de escribir).

- [x] **5.1** `Number("1.234,56")` es `NaN` → el `|| 0` lo convertía en **cero
      silencioso**. *(hecho: `excel-import.ts` usa ahora `aNumeroAvisando` de
      `formato.ts` para Monto, Tasa y Monto USD. Entiende "1.234,56",
      "1,234.56", "$ 900" y "20,00", y deja aviso en la consola cuando de
      verdad no puede leer una cifra. De paso `aNumero` aprendió a quitar
      símbolos de moneda, así que la calculadora y el diálogo de edición
      también aceptan "$ 900".)*
- [x] **5.2** `excelSerialToIso` mezclaba epoch UTC con getters locales y
      **desplazaba las fechas un día**. *(hecho: ahora usa `toISOString()`,
      igual que `attendance-store.ts:370`, que ya lo hacía bien.)*
- [x] **5.3** Al importar alumnos, una celda vacía **pisaba** el dato previo y
      `normalizeActividad` marcaba **Activo** cualquier cosa que no dijera
      "retir", resucitando a los retirados. *(hecho en los dos sitios: el
      helper `celda()` en `excel-import.ts` conserva el valor anterior cuando
      la celda viene vacía, `normalizeActividad` devuelve `undefined` en vez de
      "Activo", y la fusión de `SolvenciasTab` filtra los campos vacíos antes
      de escribir encima.)*
- [ ] **5.4** No hay previsualización ni confirmación antes de escribir. Debería
      mostrar cuántas filas tienen fecha ilegible, monto no numérico o categoría
      desconocida, antes de tocar nada.

---

## BLOQUE 6 — Consistencia, rendimiento y herramientas

- [ ] **6.1** Hay **4 reglas distintas** para decidir «este pago es de esta
      persona» (`TransactionsTab.tsx:167`, `SolvenciasTab.tsx:850`,
      `ficha-participante.tsx:43`, `PrestamosTab.tsx:73`) y **2 versiones
      incompatibles de `fechaToIso`** (`index.tsx:90` y `AnalisisTab.tsx:6`
      exigen dos dígitos; las otras seis no). La misma persona sale «al día» en
      Solvencias y sin pagos en su ficha.
      **Arreglo:** `src/lib/personas.ts` y `src/lib/fechas.ts`, una sola versión
      de cada cosa.
- [x] **6.2** Zona horaria: `new Date()` en Vercel es UTC, el centro está en
      UTC-4. El último día de mes, entre las 20:00 y medianoche, el servidor ya
      está en el mes siguiente → un mes de deuda de más y discrepancia de
      hidratación. `fees-logic.ts:117`, `excel-import.ts:11`, `excel-export.ts:17`,
      `SolvenciasTab.tsx:115`.
      *(hecho: `hoyVenezuela()` y `anioVenezuela()` en `formato.ts`, con
      `timeZone: "America/Caracas"`, usadas en los cinco sitios. Se fija por
      nombre de zona y no restando 4 horas porque Venezuela estuvo en UTC-4:30
      entre 2007 y 2016. Comprobado con el caso que fallaba: el 31-ago a las
      21:00 hora de allá, el servidor decía 2026-09 y ahora dice 2026-08.*

      *No se tocó la marca de tiempo del registro de WhatsApp
      (`SolvenciasTab.tsx:421`): ahí UTC es lo correcto, es un sello temporal y
      no una decisión de «qué día es hoy». De regalo, servidor y navegador ya
      calculan el mismo mes, así que se acabó el aviso de hidratación.)*
- [~] **6.3** El mapeo aula → categoría de cuota solo existe como texto dentro
      del prompt del OCR (`ocr.functions.ts:287-288`).
      *(parcheado lo urgente: la regla ya incluye **Krishna IV** y
      **Arjuna II 2026**, que faltaban y hacían que esos pagos volvieran con la
      categoría equivocada. Sigue pendiente lo de fondo: sacarlo a una función
      `categoriaDeAula(aula)` en `categorias.ts` que además VALIDE lo que
      devuelve el modelo, en vez de fiarse de que respetó el prompt.)*

- [x] **6.3b Sin padrón cargado, el OCR inventaba nombres en silencio**
      El prompt lleva un bloque «LISTA OFICIAL DE ALUMNOS (úsala para corregir
      nombres mal escritos)» y, si la lista venía vacía, quedaba el encabezado
      con un hueco debajo: el modelo actuaba como si existiera y transcribía a
      ojo, con total seguridad y sin que nada avisara.
      *(hecho: si no hay padrón, el prompt lo dice y le pide copiar literal sin
      "corregir" hacia nombres que le suenen; y la pestaña muestra un aviso en
      pantalla, más un toast al empezar a escanear.)*
- [~] **6.4** La salida del modelo de IA no se valida antes de convertirse en
      asientos contables (`ocr.functions.ts:35-68`).
      *(arreglada la mitad que perdía dinero: en la tabla del lector `monto`,
      `tasa` y `montoUsd` son TEXTO —lo que devuelve el modelo— y se convertían
      con `Number()`, que da NaN con cualquier separador de miles y entraba
      como **0 sin avisar**. Ahora se leen con `aNumero` en los tres sitios:
      `normalizeMoneyRow`, el guardado y el recálculo. Detectado por el usuario
      al ver que las cifras salían pegadas a la izquierda, como en Excel cuando
      un número está guardado como texto — el síntoma era real.*

      *Y hecha también la validación de la respuesta del modelo, resuelta en la
      interfaz en vez de con un `z.object`: la tabla del lector marca en ÁMBAR
      las filas mal leídas —categoría que no existe, importe que no es una
      cifra, fecha ilegible, falta la tasa en Bs o pesos—, el motivo sale al
      pasar el ratón por encima, y **los botones de guardar se desactivan**
      hasta arreglarlas. Se eligió ámbar y no rosado porque el rosado ya
      significa "esta fila está duplicada" y dos problemas distintos no pueden
      compartir color.)*

- [x] **6.4b Las cifras del lector OCR salían alineadas a la izquierda**
      Sin dos decimales y sin ancho fijo, imposible comparar dos importes de un
      vistazo, y contradecía la regla del propio `formato.ts` («el dinero lleva
      SIEMPRE dos decimales y va alineado a la derecha»).
      *(hecho: los tres campos usan `CELDA_NUMERO`, `inputMode="decimal"` y se
      formatean a dos decimales al salir del campo.)*
- [ ] **6.5** La rejilla de asistencias hace ~3.000 búsquedas lineales por render
      (`asistencias-tab.tsx:605`); cada clic del celador repite el barrido.
      Indexar en un `Map` con `useMemo`.
- [ ] **6.6** `xlsx` + `recharts` van en el paquete inicial (~700 KB) para todos,
      incluido un celador que solo pasa lista. `TasasBcvTab.tsx:60` ya usa
      `await import("xlsx")` — copiar ese patrón, más `React.lazy` en
      Dashboard/Análisis.
- [ ] **6.7** `ResumenTab.tsx:316, 413` mutan con `.sort()` los arrays que vienen
      por props (son estado de `useEditableList`): reordenan las categorías del
      usuario y lo persisten.
- [x] **6.8** `build` no ejecutaba `tsc`: los errores de tipo llegaban a
      producción. *(hecho: `"build": "tsc --noEmit && vite build"`. Comprobado,
      el build pasa. A partir de ahora un error de tipos rompe el build en vez
      de colarse.)*
- [~] **6.9 EN CURSO — se hace por archivos, no de golpe.**
      Encender los flags en `tsconfig.json` destaparía 219 errores ya
      existentes y, como el build ejecuta `tsc` desde el 6.8, dejaría el
      proyecto **sin poder desplegar** hasta arreglarlos todos.

      Montado para poder avanzarlo sin bloquear nada:
      **`tsconfig.strict.json`** lleva los dos flags y no lo usa el build.

      ```bash
      npm run tipos:estricto
      ```

      **Progreso: 219 → 139. `src/lib` ENTERO limpio** (11-ago-2026). Build y
      `tsc` normal siguen pasando en cada paso.

      Lo que destapó, que no era cosmético:
      - `precioClase` y `nextYm` hacían `split("-")` sin comprobar que hubiera
        dos partes: con una cadena mal formada daban `NaN`, y `NaN >= 202606`
        es `false`, así que devolvían el precio viejo **en silencio**.
      - `excel-export` leía `catData[cat].length` a pelo: una categoría sin
        movimientos reventaba la exportación entera.
      - `excel-import` y `attendance-store` pasaban una hoja inexistente al
        lector de Excel; ahora se descarta con un mensaje claro.
      - `bcvRateFor` podía devolver `undefined` donde el tipo prometía
        `number | null`.

      Un cambio con mucho efecto: el tipo `Student` declara ahora sus opcionales
      como `?: T | undefined`. El código escribe `undefined` a propósito para
      decir «no toques esto» (ver `celda()` en el importador), así que era
      declarar lo que ya hacía. Se llevó 24 errores por delante.

      **219 → 89.** Además de `src/lib` entero, quedaron limpios
      `AnalisisTab`, `OcrTab`, `ficha-participante`, `PrestamosTab`,
      `ReporteEjecutivo`, `TasasBcvTab`, `SupabaseSync`,
      `TransactionEditDialog` y los dos de `ui/`.

      Dos arreglos de tipo se llevaron ~30 de golpe:
      - **`ui/select.tsx`** y **`ui/dropdown-menu.tsx`** ahora omiten la prop
        cuando vale `undefined`, en vez de pasarla en undefined. Radix
        distingue las dos cosas: con la segunda avisa de un componente que pasa
        de no controlado a controlado. Arreglado una vez, sirve para las
        ~30 llamadas de toda la aplicación.
      - El tipo `Student` con `?: T | undefined` (arriba).

      **Lo que queda — tres pantallas:**

      | Archivo | Errores |
      |---|---|
      | `SolvenciasTab.tsx` | 35 |
      | `asistencias-tab.tsx` | 28 |
      | `TransactionsTab.tsx` | 14 |
      | `ResumenTab.tsx` | 6 |
      | `DashboardTab.tsx` | 6 |

      Son menos peligrosos que los de `src/lib`: en una pantalla un `undefined`
      se ve; en el cálculo se convierte en dinero mal contado.

      **Cuando llegue a 0:** mover los dos flags a `tsconfig.json`, borrar
      `tsconfig.strict.json` y el script. Desde ese día el build los exige.

      Faltan `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` en
      `tsconfig.json`; `no-unused-vars` está desactivado en `eslint.config.js:36`
      — por eso pasaron desapercibidos el campo `mes` muerto del 1.2 y varios
      imports sin usar.
- [ ] **6.10** Cero tests. Los cinco primeros por riesgo real, todos sobre
      funciones puras de `src/lib` (basta Vitest, sin DOM):
      1. `calcularCuotasDebidas` con mensualidades desordenadas (pago atrasado,
         adelantado, sin `mensualidad`) — el bug 1.2.
      2. `parseMoney`: `"1.234,56"`, `"20,00"`, `"$ 12"`, celda vacía.
      3. `excelSerialToIso` y `fechaToIso` con `TZ=America/Caracas` y `TZ=UTC`.
      4. `aulaStartYm` + `defaultFechaIngreso`, una aserción por aula — habría
         cazado el 1.6.
      5. `cuotaMensualUSD`: precedencia de overrides y el corte 2025-12 → 2026-01.
- [ ] **6.11** Accesibilidad: 40 etiquetas y solo 2 asociadas (`htmlFor`), cero
      `aria-label` en todo el proyecto, casillas de asistencia que son `<button>`
      vacíos, botones de acción de 24 px (mínimo táctil: 44).
- [ ] **6.12** `src/routes/__root.tsx:108` declara `<html lang="en">` y la pantalla
      de error está en inglés, en una app íntegramente en español.

---

## Añadido el 10-ago-2026 a petición, fuera de la auditoría

No son hallazgos: son cosas que se pidieron mientras se trabajaba. Se apuntan
aquí para que quien retome sepa que existen y por qué están hechas así.

- **Engranaje de «Cuotas especiales»** (`SolvenciasTab.tsx`,
  `CuotasEspecialesDialog`). Tabla única para cargar de una pasada quién paga
  algo distinto: becados a 0, cuotas reducidas, y los que cambian de importe
  desde un mes concreto. Escribe en los mismos campos de siempre
  (`cuotaOverride` y `cuotaOverridesTemporales`), así que la ficha individual
  sigue funcionando igual.
  - Los importes salen **tapados como una contraseña**, con un ojo para
    revelarlos. Sin poder verlos nunca, un 15 tecleado como 1.5 quedaría
    invisible y se cobraría mal durante meses.
  - Solo lo ven **finanzas y super_admin** (prop `puedeGestionarCuotas`).
    Esconder el engranaje **no es seguridad** — quien mire el código de la
    página lo encuentra igual. Es discreción: que no salga en la pantalla de un
    celador. Lo que protege el dato es el RLS.
  - Con el campo tapado se rechaza lo que no sea una cifra: un "abc" convertido
    en 0 significaría "beca" sin que nadie lo notara.

- **Deuda visible solo al pasar el ratón.** La insignia roja del estado ya
  llevaba el importe en el `title` desde antes, pero nadie lo descubría; se le
  puso `cursor-help`. Y se añadió el **total por aula** junto a «N
  participantes», más el de toda la escuela en la cabecera: sin etiqueta, en
  gris tenue, sin símbolo de moneda. Quien pasa por detrás ve un número que no
  significa nada. Los de «clase por clase» no suman.

- **Motivo de todo lo anterior:** esta pantalla se abre delante de gente y hay
  personas becadas y personas que pagan menos. Es el mismo criterio que ya
  estaba escrito en `ficha-participante.tsx`, donde la cuota individual no se
  muestra a propósito.

- **De paso:** la deuda de cada persona se calcula ahora una sola vez
  (`deudaPorAlumno`) en lugar de recalcularse en el render de cada fila.

## Lo que ya está bien (no tocar)

- Ninguna clave estuvo nunca commiteada (verificado sobre todo el historial), y
  la `service_role` no se usa en ninguna server function: las 14 construyen el
  cliente con anon key + el JWT del usuario, así que RLS es la autoridad real.
- El detector de clave secreta de `supabase.ts:21` arranca inutilizado y explica
  el motivo, en vez de funcionar repartiendo acceso total.
- El rol nunca viene del navegador, y una cuenta sin aprobar se degrada a
  `pendiente` en lugar de conservar su rol.
- La tasa BCV **sí se congela** por transacción: el histórico no se falsea.
- Todos los importes son `numeric`; se redondea a 2 decimales al escribir.
- La restricción del celador a su aula vive en SQL (`with check`), no solo en JS.
- La recursión de RLS en `profiles` se resolvió con la solución canónica.
- El cierre por inactividad está calibrado por rol desde el riesgo real.
- `loadAttendanceFromSupabase` sí pagina con `.range()` y documenta por qué.

---

## Cabos sueltos

- **Decisión pendiente (sale del 1.6):** `defaultFechaIngreso` devuelve
  `2026-01-01` para los Krishna y para Arjuna II, mientras que `aulaStartYm`
  (`fees-logic.ts:29`) dice que esas aulas se rastrean desde `2025-01`. Al
  arreglar el 1.6 solo se corrigió la comparación; **el año de respaldo se dejó
  como estaba a propósito**, porque cambiarlo altera cuántos meses se le deben
  a gente real y eso no lo decide el código. Hay que preguntarlo y ajustarlo.
- La carpeta `_COPIA_VIEJA_BORRAR` sigue en `Documents/Proyecto-nuevaacropolis/`.
- El README titula «Mnemósine» y `src/lib/branding.ts:27` fija «SISFIA».
- La tabla de variables de entorno del README omite `SUPABASE_SERVICE_ROLE_KEY` y
  `ANTHROPIC_API_KEY`, que sí están en el `.env` real.
- `20260806000001_segunda_cuenta_admin.sql:4` dice reemplazar a un archivo
  (`20260805000006_limpiar_correos_desconocidos.sql`) que no está en el repo.
