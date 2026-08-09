export type RangeValue = { checkIn: Date | null; checkOut: Date | null };

/** Transición de rango por click de día (check-out exclusivo, ≥ 1 noche). */
export function pickDay(current: RangeValue, day: Date): RangeValue {
  const { checkIn, checkOut } = current;
  if (checkIn === null || checkOut !== null) return { checkIn: day, checkOut: null };
  if (day > checkIn) return { checkIn, checkOut: day };
  return { checkIn: day, checkOut: null };
}

/**
 * Clave numérica de la parte de fecha (YYYYMMDD). Comparar Date con `<`
 * arrastra la hora: dos objetos del mismo día pueden salir distintos según de
 * dónde vinieron (medianoche local vs. el `new Date()` de ahora).
 */
function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * ¿La estadía [checkIn, checkOut) pisa alguna fecha ocupada?
 *
 * El check-out es EXCLUSIVO: quien se va el día B no ocupa la noche B, así que
 * una salida justo sobre una fecha ocupada es válida (es el turnover, uno entra
 * el día que el otro se va).
 *
 * Deshabilitar los días ocupados en el calendario NO alcanza para evitar esto:
 * el huésped puede elegir llegada ANTES del bloque y salida DESPUÉS, saltándolo
 * por encima. Las dos puntas están libres y el clic es válido en ambas.
 */
export function rangeHasBlocked(checkIn: Date, checkOut: Date, blocked: Date[]): boolean {
  const from = dayKey(checkIn);
  const to = dayKey(checkOut);
  return blocked.some((b) => {
    const k = dayKey(b);
    return k >= from && k < to;
  });
}

/**
 * Primera fecha ocupada estrictamente posterior a `from`, o null si no hay.
 *
 * Es el tope de la salida: con la llegada puesta, el calendario de check-out
 * deshabilita todo lo que venga DESPUÉS de esta fecha. La fecha en sí queda
 * seleccionable, porque salir ese día no ocupa esa noche.
 */
export function firstBlockedAfter(from: Date, blocked: Date[]): Date | null {
  const k = dayKey(from);
  let best: Date | null = null;
  for (const b of blocked) {
    if (dayKey(b) <= k) continue;
    if (best === null || dayKey(b) < dayKey(best)) best = b;
  }
  return best;
}
