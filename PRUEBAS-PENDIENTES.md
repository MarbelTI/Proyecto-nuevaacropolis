# Qué hay que probar en pantalla

Lista de trabajo para Nancy. Compañera de `AUDITORIA-2026-08-09.md`: allí está
qué se arregló y por qué; aquí, cómo comprobar que de verdad funciona.

Casi todo lo de la auditoría se dio por bueno con `tsc` y el build, que solo
demuestran que **compila**, no que haga lo correcto. Estas son las que faltan.

Se marca `[x]` al probarlas. Si algo falla, apúntalo debajo del punto: es más
útil saber qué pasó exactamente que volver a describirlo de memoria.

---

## 0. PRIMERO — dos migraciones sin ejecutar bloquean pantallas enteras

No tiene sentido probar nada de asistencias antes de esto.

- [ ] **Subir asistencias falla hasta que corras esta migración.**
      Pegar entera en el SQL Editor de Supabase:
      `supabase/migrations/20260810000001_sync_asistencias_transaccional.sql`
      El código ya llama a `sync_asistencias`; mientras la función no exista en
      la base, la pantalla queda inservible. **El fallo es limpio: no borra
      nada.** Pero no vas a poder subir una sola lista.

- [ ] **Finanzas no puede guardar cambios de alumnos hasta esta otra.**
      `supabase/migrations/20260810000003_finanzas_escribe_alumnos.sql`
      Sin ella, los cambios de cuotas especiales se quedan en el navegador y
      nunca llegan a la nube. **Y no avisa de nada** — es el peor tipo de fallo:
      parece que guardó.

      *Cómo confirmar que funcionó:* cambia la cuota de alguien, recarga la
      página en **otro navegador o dispositivo**, y mira si el cambio está. En
      el mismo navegador siempre se verá bien, aunque no haya subido.

---

## 1. Lo que cambié el 13-ago-2026

### 1.1 La categoría del OCR se corrige sola con el padrón (6.3)

- [ ] **Con el padrón cargado**, escanea una hoja donde haya cuotas sociales de
      gente de Arjuna y de Krishna mezclada. Comprueba en la tabla del lector
      que los de Arjuna salen **PROBAS** y los de Krishna **MIEMBROS**.

- [ ] Prueba concreta que antes fallaba: alguien de **Krishna IV** o de
      **Arjuna II 2026**. Esas dos aulas faltaban en el prompt y volvían con la
      categoría equivocada. Ahora la regla se redacta desde el código, así que
      deberían salir bien.

- [ ] **Sin padrón cargado** (o con la lista vacía), escanea igual. No debe
      romperse: cae a la lista de aulas por defecto y el modelo copia los
      nombres literalmente en vez de inventarlos.

> **Pendiente MÍO, no tuyo:** cuando la corrección se aplica, el motivo se
> guarda en el campo `avisoCategoria` pero **todavía no se pinta en pantalla**.
> O sea: hoy corrige bien, pero en silencio. Falta mostrarlo en la fila del
> lector, como el aviso ámbar de las filas mal leídas. Hasta que lo haga, no
> puedes distinguir una categoría que el modelo acertó de una que se corrigió.

### 1.2 La rejilla de asistencias (6.5)

Se reescribió cómo busca cada casilla. Es un cambio de rendimiento, pero toca
lo que se ve, así que hay que mirarlo.

- [ ] Abre un aula con bastantes alumnos y fechas. **Las marcas que ya estaban
      deben verse exactamente igual que antes.** Es lo único que importa aquí:
      si alguna casilla cambió de estado sola, es un fallo serio — avísame.
- [ ] Marca y desmarca asistencia y reflexión en varias casillas. Debe
      responder igual o más rápido, y no "saltar" a otra casilla.
- [ ] Cambia de aula y vuelve. Las marcas de cada aula deben seguir en su sitio.

### 1.3 Las categorías del Resumen ya no se reordenan solas (6.7)

- [ ] En Ajustes, pon las categorías en un orden que no sea alfabético.
- [ ] Abre la pestaña **Resumen** y vuelve a Ajustes.
      **El orden que pusiste debe seguir intacto.** Antes, abrir Resumen las
      reordenaba alfabéticamente y lo dejaba guardado.

### 1.4 Idioma (6.12)

- [ ] Visita una dirección que no exista (por ejemplo `/loquesea`).
      Debe salir **"Página no encontrada"** e **"Ir al inicio"**, en español.
- [ ] El navegador ya no debe ofrecerte "¿Traducir esta página al español?".

---

## 2. Lo que la auditoría dejó hecho pero sin comprobar en pantalla

Estos son de sesiones anteriores. Están marcados como resueltos, pero nadie los
ha visto funcionando.

- [ ] **Las tasas del BCV siguen entrando** (2.2 / 2.10).
      Abre «Tasas BCV». Deben aparecer tasas con la etiqueta **«BCV oficial»**.
      Si todas dicen «dolarapi», la descarga del BCV está fallando y se está
      usando el respaldo. Mira también que **enero a marzo tengan tasas**: el
      primer trimestre no se cargaba nunca por un fallo ya corregido.

- [ ] **La CSP no rompe nada** (2.6).
      Está puesta como `Content-Security-Policy-Report-Only` **a propósito**:
      avisa pero no bloquea. Abre la aplicación **en producción**, mira la
      consola del navegador y apunta qué dice que bloquearía.
      **No la actives sin mirar esto primero** — a ciegas rompe el hidratado y
      la aplicación deja de responder.

- [ ] **El atajo de desarrollo ya no existe en producción** (2.5).
      Comprobar que la aplicación desplegada pide iniciar sesión de verdad.

- [ ] **Sin configurar Supabase, la aplicación falla en cerrado** (2.4).
      Antes montaba un administrador ficticio con todos los permisos. Ahora debe
      salir una pantalla explicando qué falta configurar.

- [ ] **El rol dirección ve alumnos** (3.1).
      Entrar con una cuenta `director` y confirmar que la lista no sale vacía.

- [ ] **Más de 1000 movimientos** (1.7).
      Cuando cargues el libro entero pasarás de 1000. Comprueba que **salen
      todos** y que están **ordenados por fecha de verdad**, no por día del mes
      (que se nota porque los días 1 de todos los meses saldrían juntos).

---

## 3. Lo que se rompe de formas silenciosas — mirar de vez en cuando

No son pruebas de un cambio concreto: son los sitios donde esta aplicación ya ha
fallado sin avisar. Vale la pena mirarlos cada tanto.

- [ ] **Los importes con decimales.** Escribe `90.50` en un monto y en una tasa,
      sal del campo y vuelve a entrar. Debe seguir diciendo `90.50`.
      Ya falló dos veces: llegó a guardar `9050` (error de 100×) y a convertir
      `755.60` en `705.00` mientras se escribía.

- [ ] **Importar un Excel con importes tipo `1.234,56`.**
      Deben entrar como mil doscientos treinta y cuatro con cincuenta y seis, no
      como cero. El cero silencioso era el fallo 5.1.

- [ ] **Las fechas al importar.** Que no se desplacen un día.

- [ ] **La solvencia usa la MENSUALIDAD, no la fecha del pago.**
      Prueba definitiva: registra un pago hecho **hoy** con mensualidad de
      **enero**. Esa persona debe quedar al día **con enero**, no con agosto.

- [ ] **Cargar desde nube no duplica el libro.**
      Cuenta los movimientos, pulsa «Cargar desde nube», vuelve a contar.
      **Debe dar el mismo número.**

---

## 4. Antes de dar la aplicación por buena

- [ ] Hacer **copia de seguridad de la base en Supabase**. Va primero que nada
      de lo demás.
- [ ] Liberar espacio en el disco. El 13-ago-2026 llegó a **0 bytes libres** y
      quedó en 7 GB de 237. Con el disco así, Windows y git empiezan a fallar de
      formas silenciosas — ese mismo día un archivo escrito con éxito desapareció
      y otro dejó de figurar como modificado en git. Los grandes son `AppData`
      (60 GB) y `Documents` (23 GB).
