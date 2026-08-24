## Purpose

Mantener y exponer las tasas de cambio del BCV (dólar y euro) por fecha, para
que el resto del sistema pueda convertir montos en bolívares a dólares con una
tasa histórica confiable.

## ADDED Requirements

### Requirement: Descarga de la tasa dólar y euro desde el XLS del BCV
El sistema SHALL leer, de cada hoja (fecha) del XLS trimestral del BCV, tanto
la tasa dólar (celda G15) como la tasa euro (celda G11), y SHALL asociar
ambas a la misma fecha.

#### Scenario: Descarga automática de un trimestre
- **WHEN** se descarga el XLS trimestral del BCV para un año y trimestre
- **THEN** el sistema guarda, para cada fecha con datos válidos, la tasa
  dólar y la tasa euro correspondientes a esa fecha

#### Scenario: Una de las dos celdas no tiene un valor numérico válido
- **WHEN** una hoja del XLS trae la celda G15 o la G11 vacía, en texto, o con
  un valor no mayor a 1
- **THEN** el sistema descarta solo esa tasa (dólar o euro) para esa fecha, sin
  descartar la otra tasa si es válida, y sin descartar la fecha completa

### Requirement: Importación manual de XLS con ambas tasas
El sistema SHALL extraer también la tasa euro (celda G11) al importar
manualmente un archivo XLS del BCV, con el mismo criterio de validez que la
tasa dólar.

#### Scenario: Importar un XLS válido con ambas tasas
- **WHEN** Nancy importa manualmente un archivo XLS del BCV que trae valores
  válidos en G15 y G11 para una fecha
- **THEN** el sistema guarda ambas tasas para esa fecha en el almacenamiento
  de tasas

### Requirement: Almacenamiento de dos tasas por fecha
El sistema SHALL almacenar, por cada fecha, la tasa dólar y la tasa euro de
forma independiente, permitiendo que una fecha tenga una sin la otra.

#### Scenario: Fecha con tasa dólar ya guardada, se agrega la tasa euro
- **WHEN** ya existe una tasa dólar guardada para una fecha (de antes de este
  cambio) y se descarga o importa esa misma fecha con tasa euro disponible
- **THEN** el sistema conserva la tasa dólar existente y agrega la tasa euro
  para esa fecha, sin perder ningún dato previo

#### Scenario: Sincronización con Supabase
- **WHEN** el sistema sincroniza las tasas guardadas localmente con Supabase
- **THEN** ambas tasas (dólar y euro) de cada fecha viajan en la
  sincronización, en ambos sentidos

### Requirement: Visualización de ambas tasas
El sistema SHALL mostrar, en la pestaña "Tasas BCV", una columna con la tasa
dólar y una columna con la tasa euro para cada fecha, y SHALL permitir cargar
manualmente ambas tasas para una fecha.

#### Scenario: Tabla de tasas con ambas columnas
- **WHEN** Nancy abre la pestaña "Tasas BCV"
- **THEN** la tabla muestra, para cada fecha con datos, la tasa Bs/$ y la tasa
  Bs/€ en columnas separadas

#### Scenario: Carga manual de una tasa para una fecha
- **WHEN** Nancy guarda manualmente una tasa (dólar, euro, o ambas) para una
  fecha desde el formulario de carga manual
- **THEN** el sistema guarda la tasa indicada para esa fecha sin requerir que
  la otra tasa también se cargue en el mismo momento

### Requirement: Ambas tasas visibles en el encabezado
El sistema SHALL mostrar, en el encabezado de la aplicación, tanto la tasa
dólar como la tasa euro de la fecha seleccionada — no solo la tasa dólar —
porque hay pagos que se hacen a la tasa del banco (dólar) y otros a la tasa
que se aproxima con el euro.

#### Scenario: Encabezado con ambas tasas
- **WHEN** se selecciona una fecha en el encabezado
- **THEN** se muestran dos indicadores: la tasa Bs/$ y la tasa Bs/€ de esa
  fecha (o "—" si no hay tasa cargada para esa fecha)

### Requirement: Sugerencia de tasa por tipo de transacción en Bolívares
El sistema SHALL sugerir, al cargar o editar una transacción en Bolívares sin
tasa cargada, la tasa euro si el tipo es Ingreso y la fecha es igual o
posterior al 24/06/2026, y la tasa dólar BCV en cualquier otro caso (Gasto, o
Ingreso con fecha anterior al 24/06/2026 — antes de esa fecha no existía la
práctica de recibir a tasa Binance/Euro). Esta sugerencia SHALL seguir siendo
editable por quien carga la transacción, nunca un valor fijo obligatorio.

#### Scenario: Ingreso en Bolívares desde el 24/06/2026
- **WHEN** se crea o edita una transacción de tipo Ingreso, moneda Bolívares,
  con fecha 24/06/2026 o posterior, y sin tasa cargada
- **THEN** el sistema sugiere la tasa euro de esa fecha (o la más cercana
  anterior) como tasa de cambio

#### Scenario: Gasto en Bolívares, cualquier fecha
- **WHEN** se crea o edita una transacción de tipo Gasto, moneda Bolívares, y
  sin tasa cargada
- **THEN** el sistema sugiere la tasa dólar BCV de esa fecha (o la más
  cercana anterior), sin importar si la fecha es anterior o posterior al
  24/06/2026

#### Scenario: Ingreso en Bolívares antes del 24/06/2026
- **WHEN** se crea o edita una transacción de tipo Ingreso, moneda Bolívares,
  con fecha anterior al 24/06/2026, y sin tasa cargada
- **THEN** el sistema sugiere la tasa dólar BCV de esa fecha, igual que para
  un Gasto

#### Scenario: Falta la tasa preferida para esa fecha
- **WHEN** el tipo de tasa preferido para el caso (ej. euro para un Ingreso
  desde el 24/06/2026) no tiene ningún valor disponible para esa fecha ni
  antes
- **THEN** el sistema sugiere la tasa dólar BCV como respaldo, en vez de
  dejar el campo sin sugerencia

#### Scenario: Cambiar el tipo de una transacción recalcula la sugerencia
- **WHEN** se cambia el tipo (Ingreso/Gasto) de una transacción en Bolívares
  que todavía no tiene tasa cargada a mano
- **THEN** el sistema vuelve a calcular la sugerencia de tasa según el nuevo
  tipo

### Requirement: La carga masiva desde Excel no distingue tipo
El sistema SHALL seguir completando la tasa de transacciones en Bolívares
importadas en bloque desde Excel usando únicamente la tasa dólar BCV más
cercana a la fecha de cada fila, sin distinguir Ingreso de Gasto — la
distinción por tipo del requerimiento anterior aplica solo a la carga o
edición de una transacción a la vez (formulario manual, OCR).

#### Scenario: Importación masiva de un Excel con movimientos en Bolívares
- **WHEN** se importa un archivo Excel con movimientos en Bolívares sin tasa
- **THEN** el sistema completa la tasa dólar BCV más cercana a la fecha de
  cada fila, sin importar si la fila es Ingreso o Gasto

### Requirement: La tasa euro no reemplaza el cálculo por defecto de Monto USD
Salvo la sugerencia de tasa por tipo para transacciones en Bolívares (ver
requerimiento anterior), el sistema SHALL seguir calculando el Monto USD de
cualquier otra transacción con la tasa que tenga cargada esa fila, sin que la
sola existencia de una tasa euro para una fecha cambie ningún cálculo ya
guardado.

#### Scenario: Transacción con tasa ya cargada no cambia
- **WHEN** una transacción en bolívares ya tiene una tasa de cambio cargada
- **THEN** el sistema no la sobreescribe con la tasa euro ni la dólar,
  independientemente de cuál esté disponible para esa fecha

### Requirement: Corrección manual de una tasa ya guardada
El sistema SHALL permitir corregir, desde la tabla de tasas, la tasa dólar
y/o euro ya guardada para una fecha, para el caso en que ese día se haya
manejado una tasa distinta a la que trae el BCV.

#### Scenario: Corregir una fila de la tabla
- **WHEN** Nancy hace clic en el ícono de editar de una fila de la tabla de
  tasas
- **THEN** el formulario de carga manual se llena con la fecha y las tasas
  de esa fila, y muestra un aviso de que está editando esa fecha en
  particular

#### Scenario: Guardar la corrección
- **WHEN** Nancy cambia el valor y guarda desde el formulario en modo edición
- **THEN** el sistema sobreescribe la tasa de esa fecha con el nuevo valor y
  el formulario vuelve a su estado vacío (fecha de hoy)
