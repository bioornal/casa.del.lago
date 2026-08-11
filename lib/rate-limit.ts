// Rate limit best-effort por IP, en memoria del proceso.
//
// LIMITACIÓN CONOCIDA: en serverless el contador es POR INSTANCIA, así que no es
// una garantía dura — un atacante distribuido o un escalado agresivo lo diluyen.
// Alcanza para el volumen de un lodge y para frenar el abuso obvio
// (scripts, reintentos en loop, subida masiva de comprobantes).

type Bucket = { count: number; reset: number };

const scopes = new Map<string, Map<string, Bucket>>();

/** Solo para tests: limpia todos los contadores. */
export function resetRateLimits(): void {
  scopes.clear();
}

// Tamaño máximo de la clave que se guarda en el mapa. Sin esto, una IP (o lo
// que sea que el fallback termine usando) arbitrariamente larga infla la
// memoria de la instancia; con esto, dos valores que comparten el mismo
// prefijo largo caen en la misma entrada, que es exactamente lo que se quiere
// para un abuso que intenta variar la clave en cada pedido.
const MAX_KEY_LEN = 100;

// Umbral de tamaño del bucket a partir del cual conviene barrer entradas
// vencidas. Recorrer el mapa en cada hit sería desperdiciar ciclos la
// mayoría del tiempo; recorrerlo solo cuando ya creció mucho mantiene el
// costo amortizado bajo control.
const SWEEP_THRESHOLD = 1000;

export function clientIp(req: Request): string {
  // Netlify agrega esta cabecera con la IP real de la conexión TCP en su edge;
  // el cliente no puede escribirla (Netlify la pisa). Va primero porque es la
  // única fuente que un atacante no controla.
  const nfIp = req.headers.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp.trim();

  // Fallback para dev local u otro host sin la cabecera de Netlify: se toma
  // el extremo DERECHO de x-forwarded-for, que es el que agrega el proxy más
  // cercano al servidor, no el cliente. split(",")[0] (el extremo izquierdo)
  // es el que escribe quien llama, así que un atacante podía mandar un valor
  // inventado ahí y conseguir un cupo nuevo en cada pedido.
  // Trade-off del fallback: el extremo derecho es más difícil de falsificar,
  // pero si algún día esto corre detrás de un proxy que no agrega su propio
  // valor (reenvía el header del cliente tal cual), puede terminar agrupando
  // a varios usuarios reales bajo el mismo cupo. Por eso es el segundo
  // intento, no el primero.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}

/**
 * Registra un hit y devuelve true si hay que rechazarlo.
 * `scope` separa contadores por endpoint: saturar el checkout no debe
 * bloquear la consulta de reserva.
 */
export function rateLimited(scope: string, ip: string, max: number, windowMs: number): boolean {
  const key = ip.length > MAX_KEY_LEN ? ip.slice(0, MAX_KEY_LEN) : ip;

  let bucket = scopes.get(scope);
  if (!bucket) {
    bucket = new Map();
    scopes.set(scope, bucket);
  }

  const now = Date.now();

  // Purga entradas vencidas antes de sumar la nueva: sin esto, una clave
  // distinta en cada pedido (el mismo patrón que la cabecera falsificada
  // explotaba) deja una entrada colgada para siempre y el mapa crece sin
  // límite en la vida de la instancia.
  if (bucket.size > SWEEP_THRESHOLD) {
    for (const [k, v] of bucket) {
      if (now > v.reset) bucket.delete(k);
    }
  }

  const entry = bucket.get(key);
  if (!entry || now > entry.reset) {
    bucket.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

/** Solo para tests: tamaño actual del bucket de un scope. */
export function _bucketSizeForTests(scope: string): number {
  return scopes.get(scope)?.size ?? 0;
}
