import { useEffect, useState } from "react";

/**
 * Equivalencias de nombre para los préstamos.
 *
 * En el libro, la misma persona aparece escrita de varias formas: "profesor",
 * "Ricardo", "Ricardo García". Son la misma deuda y tienen que sumarse juntas.
 *
 * `claves` son los textos que, si aparecen en la descripción, significan que
 * ese movimiento es de `persona`.
 *
 * ESTO NO VA EN EL CÓDIGO. Quién recibe préstamos de la escuela es información
 * de personas concretas, y el repositorio lo ve cualquiera que programe. Por
 * eso vive aquí, como dato que se carga desde la pantalla.
 */
export type GrupoPrestamo = {
  persona: string;
  claves: string[];
};

const K_ALIAS = "lector_ocr_prestamo_alias_v1";

function load(): GrupoPrestamo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(K_ALIAS);
    return raw ? (JSON.parse(raw) as GrupoPrestamo[]) : [];
  } catch {
    return [];
  }
}

export function usePrestamoAliases(): [GrupoPrestamo[], (next: GrupoPrestamo[]) => void] {
  const [grupos, setGrupos] = useState<GrupoPrestamo[]>([]);

  // Se lee después del primer render: en el servidor no hay localStorage, y
  // leerlo durante el render haría que lo pintado en el servidor y en el
  // navegador no coincidan.
  useEffect(() => {
    setGrupos(load());
  }, []);

  const guardar = (next: GrupoPrestamo[]) => {
    setGrupos(next);
    try {
      localStorage.setItem(K_ALIAS, JSON.stringify(next));
    } catch {
      /* si el navegador no deja escribir, al menos sigue en pantalla */
    }
  };

  return [grupos, guardar];
}

/** Añade una clave a una persona, creándola si todavía no existe. */
export function unir(grupos: GrupoPrestamo[], persona: string, clave: string): GrupoPrestamo[] {
  const nombre = persona.trim();
  const c = clave.trim();
  if (!nombre || !c) return grupos;

  const existe = grupos.find((g) => g.persona.toLowerCase() === nombre.toLowerCase());
  if (!existe) return [...grupos, { persona: nombre, claves: [c] }];

  return grupos.map((g) => {
    if (g !== existe) return g;
    const yaEsta = g.claves.some((k) => k.toLowerCase() === c.toLowerCase());
    return yaEsta ? g : { ...g, claves: [...g.claves, c] };
  });
}

/** Quita una clave. Si la persona se queda sin ninguna, desaparece. */
export function separar(grupos: GrupoPrestamo[], persona: string, clave: string): GrupoPrestamo[] {
  return grupos
    .map((g) =>
      g.persona === persona
        ? { ...g, claves: g.claves.filter((k) => k.toLowerCase() !== clave.toLowerCase()) }
        : g,
    )
    .filter((g) => g.claves.length > 0);
}
