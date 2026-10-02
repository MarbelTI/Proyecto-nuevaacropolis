## Purpose

Que las transacciones financieras de SISFIA se lean y se escriban siempre contra la base de
datos compartida (Supabase) en cada acción, en vez de depender de que cada persona recuerde
sincronizar manualmente su copia local con la de los demás.

## ADDED Requirements

### Requirement: Cargar transacciones desde la nube al abrir la app
Al iniciar sesión con conexión a internet, el sistema SHALL cargar la lista de transacciones
desde Supabase como fuente de verdad, en vez de usar únicamente lo guardado en este dispositivo.

#### Scenario: Apertura normal, con conexión
- **WHEN** alguien con sesión activa y conexión abre la pestaña Transacciones
- **THEN** el sistema muestra las transacciones que existen en Supabase en ese momento, no una
  copia desactualizada guardada en este dispositivo

#### Scenario: Apertura sin conexión
- **WHEN** alguien abre la pestaña Transacciones sin internet
- **THEN** el sistema muestra la última copia guardada en este dispositivo y avisa explícitamente
  que está trabajando sin conexión y que los datos pueden no ser los más recientes

### Requirement: Cada cambio se guarda en la nube al momento
Crear, editar, duplicar o eliminar una transacción SHALL guardarse contra Supabase en el momento
de la acción (no solo al presionar un botón de sincronización manual), además de guardarse en
este dispositivo.

#### Scenario: Crear una transacción
- **WHEN** alguien agrega una transacción nueva con conexión disponible
- **THEN** la transacción queda guardada en Supabase antes de que termine la acción, visible para
  cualquier otra persona que cargue la app después

#### Scenario: Editar una transacción
- **WHEN** alguien modifica un campo de una transacción existente con conexión disponible
- **THEN** el cambio queda guardado en Supabase, no solo en este dispositivo

#### Scenario: Eliminar una transacción
- **WHEN** alguien elimina una transacción con conexión disponible
- **THEN** la eliminación se refleja en Supabase (la transacción deja de estar disponible para
  cualquier otra persona que cargue la app después)

### Requirement: Protección ante ediciones simultáneas sobre la misma fila
El sistema SHALL impedir que una escritura sobreescriba en silencio un cambio ajeno más reciente
sobre la MISMA transacción. Si al guardar se detecta que la fila cambió en Supabase desde que se
cargó localmente, el sistema SHALL rechazar la escritura y avisar explícitamente, en vez de
aplicarla igual.

#### Scenario: Dos personas editan la misma transacción casi al mismo tiempo
- **WHEN** la persona A carga una transacción, la persona B la modifica y guarda primero, y luego
  la persona A intenta guardar su propia modificación sobre esa misma transacción sin haber
  vuelto a cargarla
- **THEN** el sistema rechaza el guardado de la persona A, le avisa que alguien más modificó esa
  fila, y no pierde el cambio que ya hizo la persona B

#### Scenario: Ediciones sobre transacciones distintas
- **WHEN** la persona A y la persona B editan transacciones distintas al mismo tiempo
- **THEN** ambos cambios se guardan sin conflicto

### Requirement: Modo sin conexión no bloquea el trabajo
Si no hay conexión a internet (o la escritura contra Supabase falla por red), el sistema SHALL
seguir permitiendo crear, editar y eliminar transacciones localmente, avisando que el cambio no
se compartió todavía.

#### Scenario: Se pierde la conexión a mitad de la sesión
- **WHEN** alguien edita una transacción sin internet
- **THEN** el cambio se guarda en este dispositivo y el sistema avisa que no se pudo compartir con
  la nube, sin bloquear la edición ni perder el cambio local

### Requirement: Los botones de sincronización manual se conservan
Las acciones "Subir a nube", "Cargar desde nube" y "Subir [mes] a la nube" SHALL seguir
funcionando exactamente igual que antes de este cambio, como respaldo manual y para el resto de
módulos (alumnos, tasas BCV, asistencias).

#### Scenario: Uso del respaldo manual existente
- **WHEN** alguien usa "Subir a nube" o "Cargar desde nube" desde "Copia en la nube"
- **THEN** el comportamiento es el mismo que tenía antes de este cambio
