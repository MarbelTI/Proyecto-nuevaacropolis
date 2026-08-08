# Mnemósine — Arquitectura del proyecto

Nueva Acrópolis San Cristóbal. Nombre interno del proyecto: **SISFIA**.

## Para qué sirve este archivo

Aquí se explica **cómo está construido** el sistema: qué es cada pieza, dónde
vive y cómo encaja con las demás. Es el mapa que se lee antes de tocar código.

No se repite aquí lo que ya está en **ESTADO-DEL-PROYECTO.txt**, que es el otro
documento del proyecto y cubre cosas distintas:

| Pregunta                                     | Dónde se responde        |
| -------------------------------------------- | ------------------------ |
| ¿Qué funciona y qué falta? ¿Quién es quién?   | ESTADO-DEL-PROYECTO.txt  |
| ¿Qué se hizo en la última tanda de trabajo?   | ESTADO-DEL-PROYECTO.txt  |
| ¿Dónde está X y por qué está hecho así?       | este archivo             |

---

## 1. Qué es la aplicación

Una sola página web donde la escuela lleva dos mundos que antes iban por
separado:

- **Escolásticas** — la asistencia de los alumnos a las 52 clases del año, el
  análisis por aula, el diagnóstico global y la ficha de cada participante.
- **Finanzas** — el libro diario (con lectura automática por OCR), las
  transacciones, el resumen mensual, el análisis anual, los préstamos, las
  tasas BCV y las solvencias de los alumnos.

Cada persona entra con su correo y solo ve la parte que le toca.

Producción: <https://nueva-acropolis-sc.vercel.app>
Repositorio (privado): <https://github.com/MarbelTI/Proyecto-nuevaacropolis>

---

## 2. Cómo está construido

| Pieza          | Qué se usa                                             |
| -------------- | ------------------------------------------------------ |
| Framework      | TanStack Start (React con SSR + funciones de servidor)  |
| Enrutado       | TanStack Router, por archivos en `src/routes/`          |
| Lenguaje       | TypeScript estricto                                     |
| Interfaz       | React 19 + Tailwind CSS v4 + shadcn/ui (base Radix)     |
| Empaquetado    | Vite + Nitro (preset `vercel`)                          |
| Base de datos  | Supabase — PostgreSQL con RLS y funciones SECURITY DEFINER |
| Autenticación  | **Supabase Auth con correo y contraseña** (no hay OAuth) |
| OCR            | Google Gemini a través del SDK `ai` (OpenRouter de reserva) |
| Excel          | SheetJS (`xlsx`) para importar y exportar               |
| Despliegue     | Vercel, automático en cada push a `main`                |

**Sobre la autenticación:** se entra con correo y contraseña. Hay registro,
recuperación de contraseña y cambio de contraseña, todo contra Supabase Auth
(`supabase.auth.signInWithPassword`, `signUp`, `resetPasswordForEmail`,
`updateUser`). Alguna migración vieja menciona activar Google OAuth: es un
resto de la primera versión y no aplica.

---

## 3. Estructura de archivos

```
src/
├── routes/
│   ├── __root.tsx              Cáscara de la página: metadatos, CSS, Toaster
│   ├── index.tsx               ÚNICA página. Menú lateral, sesión y tasa BCV
│   └── README.md               Recordatorio de las convenciones de rutas
│
├── components/
│   ├── asistencias-tab.tsx     Sección "Escolásticas" completa (4 sub-vistas)
│   ├── asistencias-sync.tsx    Botones subir/cargar asistencias en Supabase
│   ├── ficha-participante.tsx  Ficha de una persona (datos personales por rol)
│   │
│   ├── finanzas/
│   │   ├── OcrTab.tsx              Foto del libro diario → transacciones
│   │   ├── TransactionsTab.tsx     Tabla de movimientos, WhatsApp y "Settings"
│   │   ├── TransactionEditDialog.tsx  Ventana de editar un movimiento
│   │   ├── ResumenTab.tsx          Resumen mensual + export Excel + OINA
│   │   ├── DashboardTab.tsx        Dashboard ejecutivo (KPIs y gráficos)
│   │   ├── ReporteEjecutivo.tsx    Informe en texto, dentro del Dashboard
│   │   ├── AnalisisTab.tsx         Análisis anual por categoría
│   │   ├── PrestamosTab.tsx        Préstamos y quién debe qué
│   │   ├── TasasBcvTab.tsx         Tasas BCV (consulta e importación)
│   │   ├── SolvenciasTab.tsx       Cuotas debidas y pagadas por alumno
│   │   ├── SupabaseSync.tsx        Copia en la nube de finanzas y alumnos
│   │   ├── AuthDialog.tsx          Entrar, registrarse, recuperar contraseña
│   │   └── CuentasPendientes.tsx   Aprobar cuentas nuevas (solo super_admin)
│   │
│   └── ui/                     Componentes shadcn/ui (base de la interfaz)
│
├── lib/
│   ├── branding.ts             ⭐ Nombre visible de la app. Vive AQUÍ y solo aquí
│   ├── supabase.ts             Cliente del navegador + aviso si la clave está mal
│   ├── utils.ts                `cn()` para juntar clases de Tailwind
│   │
│   ├── attendance-store.ts     Modelo de asistencias + importador del Excel
│   ├── lists-store.ts          Transacciones, categorías, bancos, alumnos, tasas
│   ├── students-data.ts        Aulas y categorías por defecto (SIN nombres reales)
│   ├── fees-logic.ts           Cuotas: cuánto debe cada quien y desde cuándo
│   ├── mensajes-store.ts       ⭐ Plantillas de WhatsApp (saludo + concepto + cierre)
│   ├── prestamos-alias.ts      Equivalencias de nombre en los préstamos
│   ├── excel-import.ts         Leer Excel de transacciones y de alumnos
│   ├── excel-export.ts         Escribir Resumen Mensual, Transacciones e OINA
│   ├── use-idle-logout.ts      Cierre de sesión por inactividad
│   │
│   ├── ocr.functions.ts        Servidor: imagen → transacciones con IA
│   ├── bcv.functions.ts        Servidor: buscar la tasa BCV del día
│   │
│   └── api/
│       ├── env.ts              Lectura de las variables de entorno
│       ├── auth-guard.ts       ⭐ Valida el JWT y decide qué puede hacer cada rol
│       ├── auth.functions.ts   Permisos por rol, minutos de inactividad, aprobaciones
│       ├── transactions.functions.ts  Sincroniza transacciones y tasas BCV
│       ├── students.functions.ts      Sincroniza alumnos (con vistas por rol)
│       └── attendance.functions.ts    Sincroniza asistencias (tablas att_)
│
├── hooks/use-mobile.tsx        Detecta pantalla pequeña
├── styles.css                  Tailwind v4 y la paleta de colores
├── router.tsx / start.ts       Arranque del enrutador
├── server.ts                   Envoltorio de SSR que atrapa los errores
├── routeTree.gen.ts            Generado automáticamente. No editar a mano
└── lib/error-page.ts,
    lib/error-capture.ts,
    lib/lovable-error-reporting.ts   Pantalla y registro de errores del servidor

supabase/migrations/            13 archivos .sql (ver sección 7)
datos-privados/                 Los Excel reales. No se sube a GitHub
public/                         logo.jpg y favicon.jpg
```

---

## 4. Cómo se navega la aplicación

Todo ocurre en **una sola página** (`src/routes/index.tsx`). No hay más rutas.
El menú lateral cambia lo que se muestra a la derecha, y cada entrada aparece o
no según el rol de quien entró.

```
Registro OCR
Transacciones           (con el número de movimientos al lado)
Finanzas  ▾             ← grupo desplegable
   Resumen mensual
   Dashboard
   Análisis anual
   Préstamos
   Tasas BCV
Solvencias
Escolásticas            ← por dentro se sigue llamando "asistencias"
Copia en la nube        (solo super_admin)
```

### Escolásticas

Es lo que en el código se llama `asistencias`. **El nombre cambió en pantalla,
no por dentro**: el valor de la pestaña, el componente y las claves de
localStorage siguen diciendo `asistencias`. Agrupa cuatro sub-vistas
(`src/components/asistencias-tab.tsx`):

1. **Control de Asistencia** — la cuadrícula de 52 clases en dos semestres, con
   las celdas A/R/J/I y los temas con sus reflexiones.
2. **Análisis por aula** — los 12 meses con totales por semestre y general.
3. **Diagnóstico Global** — tablero con todas las aulas comparadas. Solo lo ven
   los roles con `canAccessDiagnostico` (queda fuera el celador).
4. **Ficha del participante** — la hoja de una persona concreta. Va al final
   porque las otras tres son vista de grupo y esta es individual.

### Finanzas

Además de las pestañas del menú, dentro de **Transacciones** hay un botón
**Settings** que abre una ventana con cuatro pestañas:

| Pestaña   | Qué configura                                            |
| --------- | -------------------------------------------------------- |
| Ingresos  | Las categorías de ingreso                                 |
| Gastos    | Las categorías de gasto                                   |
| Bancos    | Las cuentas y cajas donde entra o sale el dinero          |
| Mensajes  | Los textos de WhatsApp (ver abajo)                        |

---

## 5. Los mensajes de WhatsApp

`src/lib/mensajes-store.ts`.

Un mensaje se arma siempre con tres piezas:

```
saludo  +  concepto  +  cierre
```

El **concepto** lo genera el sistema y no se puede editar: es el dato duro
(cuánto pagó, cuántos meses debe, de qué mes). Se hizo así a propósito, porque
si se dejara escribir a mano cualquiera podría mandar una cifra equivocada o
borrarla sin darse cuenta.

El **saludo** y el **cierre** sí se editan, desde Settings → Mensajes. Ahí está
el tono, que es lo que se pidió poder cambiar.

Hay cuatro plantillas: `pago`, `deuda`, `alDia` y `clase`. Se guardan en el
navegador y admiten `{nombre}`, que se reemplaza por el primer nombre.

---

## 6. Dónde viven los datos

### En el navegador (localStorage)

Es el sitio primario de casi todo. Las claves de asistencias empiezan por
`sisfia_` y las de finanzas por `lector_ocr_`. **No se renombran nunca**: quien
ya tenga datos cargados los perdería.

### En Supabase

Con dos caminos de subida distintos, según la sección:

| Qué                                    | Tablas                                                          | Desde dónde se sincroniza          |
| -------------------------------------- | --------------------------------------------------------------- | ---------------------------------- |
| Transacciones, tasas BCV y alumnos     | `transactions`, `bcv_rates`, `students`                          | "Copia en la nube" (menú lateral)  |
| Asistencias, temas y reflexiones       | `att_aulas`, `att_asistencias`, `att_reflexiones`, `att_reflexion_asistencia` | Dentro de Escolásticas             |
| Cuentas y roles                        | `profiles`                                                        | Automático, al registrarse          |

**Las asistencias ya se sincronizan con Supabase**, mediante esas cuatro tablas
con prefijo `att_`. El prefijo existe porque las migraciones viejas hablaban de
unas tablas `aulas`/`asistencias` que nunca llegaron a crearse; empezar de cero
con nombres nuevos evitó arrastrar ese enredo.

Detalle importante de la subida de asistencias: **reemplaza, pero solo las
aulas que van en el envío**. Así un celador que sincroniza la suya no deja sin
datos a las demás.

---

## 7. Base de datos

Las migraciones están en `supabase/migrations/` y se ejecutan pegando el `.sql`
en el editor SQL de Supabase. Están escritas para poder correrse más de una vez
sin romper nada.

**Tablas que existen de verdad:**

`transactions`, `bcv_rates`, `students`, `profiles`,
`att_aulas`, `att_asistencias`, `att_reflexiones`, `att_reflexion_asistencia`.

Sobre `students` hay además dos vistas de acceso recortado, que son las que lee
el servidor cuando quien consulta no es control de estudio:
`students_finanzas` (nombre, teléfono, aula y cuotas) y `students_celador`
(nombre y aula, solo de su propia aula). Van declaradas en
`20260805000001_students_perfil_completo_y_roles.sql`. **Ojo:**
`students_celador` está escrita contra la tabla `aulas`, que no existe, así que
esa vista no llega a crearse — un celador que intente cargar alumnos desde la
nube recibirá un error. Está pendiente de arreglo.

**Tablas que NO existen** aunque varias migraciones las nombren: `aulas`,
`participantes`, `aula_participantes`, `asistencias`, `temas`. Ninguna
migración las crea. Es un resto del diseño original que quedó a medias; está
anotado como pendiente de limpieza en ESTADO-DEL-PROYECTO.txt.

**La migración que arma la base desde cero** es
`20260717000002_full_setup.sql`. Es autosuficiente: crea las tablas
financieras, el enum de roles, `profiles`, el trigger de registro y las
políticas RLS. Las anteriores (`20260715223600` y `20260717000001`) dependen de
las tablas que no existen.

Los correos de las personas se guardan en las migraciones como **hash md5**,
nunca en texto plano. Para mapear a alguien nuevo:

```sql
select md5(lower('usuario@ejemplo.com'));
```

---

## 8. Roles y permisos

El rol vive en la tabla `profiles` de Supabase. **Nunca en el navegador**: el
servidor lo lee de la base cada vez, así que no se puede suplantar mandando un
correo distinto desde el cliente.

| Rol                | Finanzas | Escolásticas | Diagnóstico | Escribe        |
| ------------------ | -------- | ------------ | ----------- | -------------- |
| `super_admin`      | Sí       | Sí           | Sí          | Todo           |
| `finanzas`         | Sí       | No           | No          | Solo finanzas  |
| `director`         | Sí       | Sí           | Sí          | Nada (solo lee)|
| `celador_estudios` | No       | Sí           | Sí          | Todas las aulas|
| `celador`          | No       | Sí           | No          | Solo su aula   |
| `pendiente`        | No       | No           | No          | Nada           |

Una cuenta recién creada entra como `pendiente` y no ve nada hasta que un
`super_admin` la habilita desde el botón de cuentas pendientes del encabezado.
Mientras no esté aprobada, el servidor le quita el rol y la trata como
`pendiente`, para que ninguna comprobación de permisos la deje pasar por
descuido.

### Datos personales restringidos por rol

La cédula, el correo y la dirección de los alumnos **solo los ven `super_admin`
y `celador_estudios`**. La restricción está puesta en tres sitios a la vez:

1. **En pantalla** — `ficha-participante.tsx` no dibuja esos campos si el rol no
   corresponde.
2. **En el servidor** — `students.functions.ts` elige qué leer según el rol:
   `students` (perfil completo), `students_finanzas` (nombre, teléfono, aula y
   cuotas) o `students_celador` (nombre y aula de su propia aula).
3. **En la base** — políticas RLS de PostgreSQL, que son la autoridad final
   aunque alguien evite la aplicación.

### Cierre de sesión por inactividad

Los minutos dependen del rol, porque una sesión de finanzas desatendida en la
PC compartida es mucho más delicada que la de un celador pasando lista:

`super_admin` 15 · `finanzas` 30 · `director` 30 · `celador_estudios` 60 ·
`celador` 480 · sin aprobar 10.

---

## 9. Las funciones de servidor

Todo lo que toca Supabase o la IA pasa por una función de servidor
(`createServerFn`), nunca directo desde el navegador. Cada una hace lo mismo al
empezar: valida el JWT contra Supabase, lee el rol de `profiles` y solo
entonces trabaja.

| Archivo                     | Qué expone                                                    |
| --------------------------- | ------------------------------------------------------------- |
| `api/auth.functions.ts`     | Sesión, permisos por rol, listar y resolver cuentas pendientes |
| `api/transactions.functions.ts` | Subir y bajar transacciones y tasas BCV                    |
| `api/students.functions.ts` | Subir y bajar alumnos, con la vista que toque según el rol     |
| `api/attendance.functions.ts` | Subir y bajar asistencias, temas y reflexiones               |
| `ocr.functions.ts`          | Imagen del libro diario → lista de transacciones               |
| `bcv.functions.ts`          | Tasa BCV de un día o de un trimestre                           |

El guardián común es `src/lib/api/auth-guard.ts`.

---

## 10. El nombre visible de la app

`src/lib/branding.ts` es **el único sitio** donde se escribe el nombre de cara
al público. Hoy dice `Mnemósine`. Se cambia ahí y queda cambiado en el
encabezado, la pantalla de bienvenida, el título de la pestaña del navegador y
los metadatos para compartir enlaces.

Antes estaba repetido a mano en ocho sitios y cambiarlo obligaba a recorrerlos
uno por uno.

Lo que **no** sigue a ese nombre, y no debe seguirlo: las claves de
localStorage (`sisfia_…`), la variable `SISFIA_DEV_BYPASS_AUTH` y el nombre del
repositorio.

---

## 11. Variables de entorno

| Variable                              | Para qué                                          |
| ------------------------------------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`                   | Dirección de Supabase (la lee cliente y servidor) |
| `VITE_SUPABASE_ANON_KEY`              | Clave pública de Supabase                          |
| `GOOGLE_API_KEY`                      | Gemini, para el OCR                                |
| `GEMINI_MODEL`                        | Opcional: fijar otra versión del modelo            |
| `OPENROUTER_API_KEY`                  | Proveedor de IA de reserva                         |
| `SISFIA_DEV_BYPASS_AUTH=1`            | SOLO en local. Entra sin pedir sesión              |

Las que llevan `VITE_` se incrustan en el JavaScript que descarga cualquiera
que abra la página. **Ahí nunca va una clave secreta.** `src/lib/supabase.ts`
comprueba al arrancar que la clave configurada no sea la `service_role`; si lo
es, arranca con una clave inservible a propósito y muestra el motivo en
pantalla. Ya pasó una vez; esa comprobación existe para que no vuelva a pasar
en silencio.

`SISFIA_DEV_BYPASS_AUTH` además exige que **no** estemos en Vercel (la variable
`VERCEL` la pone Vercel sola), como red de seguridad por si alguien la define
por error en el panel.

---

## 12. Reglas al tocar el código

1. **Nada de datos reales en el repositorio.** Ni Excel, ni CSV, ni nombres, ni
   correos en texto plano. La semilla de alumnos de `students-data.ts` está
   vacía a propósito y las equivalencias de préstamos se cargan desde la
   pantalla, no desde el código. Los archivos reales van a `datos-privados/`.
2. **No renombrar las claves de localStorage.** Empiezan por `sisfia_` y
   `lector_ocr_`; cambiarlas deja sin datos a quien ya los tenga cargados.
3. **El rol se lee siempre del servidor**, nunca de algo que mande el navegador.
4. **`routeTree.gen.ts` no se edita a mano**, se regenera solo.
5. **Todo el texto y los comentarios, en español.**

## 13. Día a día

```bash
npm run dev      # ver la app en local (puerto 8080)
npm run build    # compilar y comprobar que no hay errores
npm run lint     # revisar el estilo del código
git push         # Vercel despliega solo, en un minuto aprox.
```
