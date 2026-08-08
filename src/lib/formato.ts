/**
 * Cómo se escriben los números en toda la aplicación.
 *
 * Existía la misma función copiada en siete archivos, y en varios sitios los
 * importes se pintaban sin pasar por ninguna: por eso aparecían cifras con
 * cuatro decimales al lado de otras con dos, y el sistema se veía descuidado.
 *
 * Regla única: el dinero lleva SIEMPRE dos decimales y va alineado a la
 * derecha. Alinear a la derecha no es un capricho estético — es lo que permite
 * comparar dos columnas de cifras de un vistazo, porque las unidades, decenas
 * y centenas quedan una debajo de otra.
 */

/** Importe con dos decimales y separador de miles: 1234.5 → "1,234.50". */
export function usd(n: number): string {
  const v = Number(n);
  if (!isFinite(v)) return "0.00";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Importe sin decimales, para gráficos y rótulos donde los céntimos estorban.
 * Solo para ADORNO: nunca para una cifra que alguien vaya a cuadrar.
 */
export function usdCorto(n: number): string {
  const v = Number(n);
  if (!isFinite(v)) return "0";
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Clases de Tailwind para una celda de números.
 *
 * `tabular-nums` hace que todas las cifras ocupen lo mismo, así las columnas
 * quedan alineadas aunque cambien los dígitos.
 */
export const CELDA_NUMERO = "text-right tabular-nums";
