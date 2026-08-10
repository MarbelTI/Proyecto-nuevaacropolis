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
 * Lee una cifra escrita a mano.
 *
 * Se aceptan las cuatro formas en que la gente la escribe de verdad: "4500",
 * "4500,50", "4.500,50" y "4,500.50" (pegada del comprobante del banco). Cuando
 * aparecen los dos separadores, manda el último: el otro es de miles. Sin esto,
 * pegar una cifra del banco daría NaN y el resultado quedaría en blanco sin que
 * se entienda por qué.
 */
export function aNumero(texto: string): number {
  // Fuera todo lo que no sea cifra, separador o signo: "$ 1.234,56", "Bs 900"
  // y "12 USD" son cosas que la gente escribe y pega de verdad.
  const limpio = texto.trim().replace(/[^0-9,.-]/g, "");
  if (!limpio) return 0;
  const punto = limpio.lastIndexOf(".");
  const coma = limpio.lastIndexOf(",");
  const normalizado =
    coma > punto ? limpio.replace(/\./g, "").replace(",", ".") : limpio.replace(/,/g, "");
  const n = Number(normalizado);
  return isFinite(n) ? n : 0;
}

/**
 * Igual que `aNumero`, pero avisa por consola cuando había algo escrito y no se
 * pudo interpretar. Para leer archivos, donde un cero silencioso es un importe
 * perdido y nadie se entera.
 */
export function aNumeroAvisando(texto: string, contexto: string): number {
  const bruto = texto.trim();
  if (!bruto) return 0;
  const n = aNumero(bruto);
  if (n === 0 && !/^[0.,\s-]*$/.test(bruto)) {
    console.warn(`[${contexto}] no se pudo leer la cifra ${JSON.stringify(bruto)}, entra como 0`);
  }
  return n;
}

/**
 * Deja una cifra escrita a mano con dos decimales, para usar al salir del
 * campo. Si está vacía se queda vacía: un campo en blanco no es un 0.00.
 */
export function aDosDecimales(texto: string): string {
  if (!texto.trim()) return "";
  return aNumero(texto).toFixed(2);
}

/**
 * Clases de Tailwind para una celda de números.
 *
 * `tabular-nums` hace que todas las cifras ocupen lo mismo, así las columnas
 * quedan alineadas aunque cambien los dígitos.
 */
export const CELDA_NUMERO = "text-right tabular-nums";
