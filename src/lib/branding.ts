/**
 * Identidad visible de la aplicación.
 *
 * ── Por qué existe este archivo ──
 * El nombre de cara al público puede cambiar (en la escuela todo lleva
 * nombres filosóficos y se revisan seguido). Antes estaba escrito a mano en
 * ocho sitios: encabezado, bienvenida, título de pestaña, y los metadatos de
 * dos rutas. Cambiarlo obligaba a recorrerlos uno por uno con el riesgo de
 * dejar alguno viejo.
 *
 * Para cambiar el nombre ahora solo se toca NOMBRE_APP, aquí abajo.
 *
 * ── Nombre interno ──
 * El proyecto se llama SISFIA por dentro. Ese nombre vive en sitios que NO
 * deben seguir a la etiqueta de la pantalla — las claves de localStorage
 * (sisfia_asistencias_v1, …), la variable SISFIA_DEV_BYPASS_AUTH y el
 * repositorio. Renombrar esas claves dejaría sin datos a quien ya tenga
 * transacciones y asistencias cargadas en su navegador, así que no se tocan
 * aunque la pantalla diga otra cosa.
 *
 * ── Sobre el nombre visible ──
 * Estuvo un tiempo como "Mnemósine" y vuelve a SISFIA para la entrega: es el
 * nombre con el que nació el proyecto y con el que la escuela lo conoce.
 */

/** Nombre visible. Cambiar aquí y queda cambiado en toda la app. */
export const NOMBRE_APP = "SISFIA";

/** Qué es el sistema. Va debajo del nombre, en el encabezado. */
export const LEMA = "Sistema de gestión académica y financiera";

/** Sede a la que pertenece. */
export const SEDE = "Nueva Acrópolis San Cristóbal";

/** Línea completa del encabezado y de los metadatos. */
export const SUBTITULO = `${LEMA} · ${SEDE}`;

/** Título de la pestaña del navegador y de las tarjetas al compartir. */
export const TITULO_PAGINA = `${NOMBRE_APP} — ${LEMA}`;

/** Descripción larga, para buscadores y vista previa de enlaces. */
export const DESCRIPCION =
  `${NOMBRE_APP}: ${LEMA.toLowerCase()} de ${SEDE}. ` +
  "Lector OCR del libro diario, transacciones, análisis, solvencias, asistencias y tasas BCV.";
