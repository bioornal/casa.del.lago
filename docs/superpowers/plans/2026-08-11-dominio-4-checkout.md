# Dominio 4 — Checkout: código único, límite de abuso y el selector de comprobante

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que dos reservas no puedan salir con el mismo código, que las dos rutas que escriben en la base y en el storage tengan un techo de pedidos por IP, y que el huésped encuentre cómo adjuntar el comprobante.

**Architecture:** Cuatro cambios independientes sobre el checkout. Los dos primeros son de una línea cada uno en las rutas de cobro y no tocan nada visible: cablear `generateUniqueBookingCode` —que ya existe y está testeada, y que hoy nadie llama— y agregar el `rateLimited` que la ruta de lookup ya usa. El tercero saca los límites del comprobante a un módulo client-safe del que el `.server` re-exporta, para que cliente y servidor no puedan divergir. El cuarto es el único visual, autorizado por el spec: el `<input type="file">` crudo pasa a ser un label con estado, y valida antes de subir.

**Tech Stack:** TypeScript, Next.js 16 App Router (route handlers y componentes cliente), Vitest + @testing-library/react, next-intl, Supabase Storage.

## Global Constraints

- Portado desde `bioornal/arumalodgeweb` @ `1e3eef2`. Los repos **no comparten historia git**: todo a mano.
- **No se porta nada de `calendar.server`.** Las rutas de Aruma importan `isRangeAvailable`, `createBookingEvent`, `createPendingEvent`, `deleteEvent` y `findBookingEventByCode`: es la integración con Google Calendar que la réplica **eliminó a propósito**. Acá la fuente de disponibilidad es Supabase, con una constraint de exclusión GiST. Conservar lo de la réplica.
- **No se porta nada de `test-unit.ts`.** `checkoutTotal`, `resolveUnit`, `isTestUnit`, `TEST_UNIT_ID` son del dominio 5.
- **Nada de los avisos al dueño.** Ya se portaron en el dominio 2B, cableados distinto y mejor: no volver a tocarlos.
- **El front no se toca**, salvo la excepción autorizada de la Task 4 (spec, sección "Excepciones autorizadas", fila del dominio 4): el selector de comprobante en `StepTransferencia.tsx`. Acotada a ese control.
- **No copiar colores del origen.** Aruma usa `#23362B` (su verde) y `#A04B2A` (su terracota). La réplica tiene su propia paleta. En la Task 4 se reusan los colores que el archivo ya usa, enumerados ahí.
- Comentarios en español, explicando el *porqué*, no el *qué*.
- `pnpm`, nunca `npm` ni `npx`.

## Lo que la inspección encontró

**El código de reserva puede repetirse, y la función que lo evita ya está escrita.** `generateUniqueBookingCode` vive en `lib/reservation/reservations.server.ts:102`, tiene su propio archivo de tests (`tests/reservation/unique-code.test.ts`, con los casos de choque y de reintento) y **no la llama nadie**. Las dos rutas de cobro usan `generateBookingCode()`, que —como dice el comentario de la propia función— "sortea sobre 32^4 ≈ 1M combinaciones sin mirar la base". El código es la clave de todo lo demás: `sendConfirmationEmailOnce(code)`, el lookup del huésped, `markConfirmationEmailSent(code)`. Dos reservas con el mismo código se pisan.

**Las dos rutas que escriben están sin techo.** `lib/rate-limit.ts` existe en la réplica y es prácticamente idéntico al de Aruma, pero solo lo usa `app/api/reservations/lookup/route.ts`. `POST /api/payments` y `POST /api/reservations/transfer` no tienen límite: la de transferencia, además, **sube un archivo al storage en cada pedido**.

**El `comprobante.ts` que el spec del portado listaba en el dominio 2 es de acá.** Aquella nota quedó abierta porque el archivo no existía en el `email/` de Aruma. Es `lib/reservation/comprobante.ts`, a nivel de `lib/reservation/`, y lo introduce `ffe8dad` junto con el selector. Queda resuelto en este dominio.

**Fuera de alcance pero anotado:** el botón de enviar de `StepTransferencia.tsx:95` usa `background: "#23362B"` y `color: "#F8F5F0"` — el verde y el marfil de Aruma, heredados del baseline, igual que le pasaba al mail de liberación antes del dominio 2. No se toca acá porque excede la excepción autorizada, que es solo el selector.

## Archivos

| Archivo | Task |
|---|---|
| `app/api/payments/route.ts` | 1, 2 |
| `app/api/reservations/transfer/route.ts` | 1, 2 |
| `tests/reservation/payments-route.test.ts` | 1, 2 |
| `tests/reservation/transfer-route.test.ts` | 1, 2 |
| `lib/reservation/comprobante.ts` (nuevo) | 3 |
| `lib/reservation/comprobante.server.ts` | 3 |
| `tests/reservation/comprobante.test.ts` (nuevo) | 3 |
| `messages/{es,en,pt}.json` | 4 |
| `components/reservas/StepTransferencia.tsx` | 4 |
| `tests/reservation/step-transferencia.test.tsx` (nuevo) | 4 |

---

### Task 1: Cablear el código único en las dos rutas de cobro

**Files:**
- Modify: `app/api/payments/route.ts:92`, `app/api/reservations/transfer/route.ts:85`
- Test: `tests/reservation/payments-route.test.ts`, `tests/reservation/transfer-route.test.ts`

**Interfaces:**
- Consumes: `generateUniqueBookingCode(attempts = 5): Promise<string>` de `@/lib/reservation/reservations.server`. Lanza si no encuentra un código libre en `attempts` intentos.
- Produces: nada nuevo. Las respuestas de las rutas suman un caso de error: `{ error: "code" }` con 502.

- [ ] **Step 1: La trampa de los mocks, primero**

Los dos tests de ruta mockean `@/lib/reservation/reservations.server` con un factory que devuelve **solo** las funciones que la ruta importa hoy. En cuanto la ruta importe `generateUniqueBookingCode`, ese import va a dar `undefined` y la ruta va a explotar en runtime dentro del test, con un error que no dice nada útil.

Agregá la función a los dos factories **antes** de tocar las rutas.

En `tests/reservation/transfer-route.test.ts`, junto a los otros `vi.fn()` del `vi.hoisted` o del scope del módulo, declará `const generateUniqueBookingCode = vi.fn();` y sumalo al factory:

```ts
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  generateUniqueBookingCode: (...a: unknown[]) => generateUniqueBookingCode(...a),
  OverlapError,
}));
```

Lo mismo en `tests/reservation/payments-route.test.ts`, que además ya mockea `upsertConfirmedByCode` y `setReservationStatusByCode`.

En el `beforeEach` de cada archivo, dale un valor por defecto que respete el formato real del código, para que las aserciones que hoy verifican la forma sigan valiendo:

```ts
  generateUniqueBookingCode.mockResolvedValue("CDL-2026-AB12");
```

- [ ] **Step 2: Escribir los tests que fallan**

En `tests/reservation/transfer-route.test.ts`, dentro del `describe` que ya existe:

Primero, en el caso del camino feliz que ya existe ("inserta pending y responde 200 con code"), sumá una línea:

```ts
    // generateBookingCode() sortea sobre 32^4 sin mirar la base. El código es la
    // clave del lookup, del email y del flip de dedup: dos reservas con el mismo
    // código se pisan.
    expect(generateUniqueBookingCode).toHaveBeenCalledOnce();
```

Y después el caso nuevo:

```ts
  it("502 si no se consigue un código libre, sin subir el comprobante", async () => {
    generateUniqueBookingCode.mockRejectedValueOnce(new Error("sin códigos libres"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("code");
    expect(uploadComprobante).not.toHaveBeenCalled();
    expect(insertReservation).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
```

En `tests/reservation/payments-route.test.ts`, lo mismo: la línea del `toHaveBeenCalledOnce()` en el caso del camino feliz, y este caso nuevo. El helper de request de ese archivo es `post(body)` (línea 64) y la fixture del body válido es `VALID` (línea 52):

```ts
  it("502 si no se consigue un código libre, sin cobrar", async () => {
    generateUniqueBookingCode.mockRejectedValueOnce(new Error("sin códigos libres"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("code");
    expect(createCardPayment).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
```

Si el mock del cobro no se llama `createCardPayment` en ese archivo, usá el que esté: lo que el caso tiene que probar es que **no se cobró**.

- [ ] **Step 3: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/transfer-route.test.ts tests/reservation/payments-route.test.ts`
Expected: FAIL — la ruta sigue llamando a `generateBookingCode` y nunca al mock.

- [ ] **Step 4: Cablear**

En los dos archivos, cambiar el import de `generateBookingCode` por la función de la base. En `app/api/reservations/transfer/route.ts`, `generateBookingCode` viene de `@/lib/reservation/code` y `insertReservation` de `@/lib/reservation/reservations.server`: sumá `generateUniqueBookingCode` a ese segundo import y sacá el primero si queda sin uso.

Reemplazar `const code = generateBookingCode();` por:

```ts
  // Contra la base, no a ciegas: generateBookingCode() sortea sobre 32^4 sin
  // mirar si el código ya existe, y el código es la clave del lookup, del email
  // y del flip de deduplicación.
  let code: string;
  try {
    code = await generateUniqueBookingCode();
  } catch (err) {
    console.error("[transfer] código único falló:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "code" }, { status: 502 });
  }
```

En `app/api/payments/route.ts`, lo mismo con el prefijo `[payments]` en el log.

**Ubicación:** en las dos rutas, el bloque va exactamente donde estaba la línea vieja. En la de transferencia eso es **antes** de `uploadComprobante`, que es lo que hace que el test de "sin subir el comprobante" tenga sentido: si el código falla, no queremos un archivo huérfano en el storage.

- [ ] **Step 5: Correr y ver el verde**

Run: `pnpm vitest run tests/reservation/transfer-route.test.ts tests/reservation/payments-route.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/payments/route.ts app/api/reservations/transfer/route.ts tests/reservation/payments-route.test.ts tests/reservation/transfer-route.test.ts
git commit -m "fix(checkout): el código de reserva se pide contra la base, no se sortea"
```

---

### Task 2: Techo de pedidos por IP en las dos rutas que escriben

**Files:**
- Modify: `app/api/payments/route.ts`, `app/api/reservations/transfer/route.ts`
- Test: `tests/reservation/payments-route.test.ts`, `tests/reservation/transfer-route.test.ts`

**Interfaces:**
- Consumes: `clientIp(req: Request): string` y `rateLimited(bucket: string, ip: string, max: number, windowMs: number): boolean` de `@/lib/rate-limit`. Ya existen y los usa `app/api/reservations/lookup/route.ts:7`.
- Produces: un caso de error nuevo en las dos rutas: 429.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/reservation/lookup-route.test.ts` ya tiene un test de 429 y el patrón para no chocar entre casos: **usa una IP distinta por request**, porque el contador es un módulo en memoria que persiste entre tests del mismo archivo. Mirá cómo lo hace ahí y seguí ese patrón; si no lo hacés, el resto de los tests del archivo van a empezar a dar 429 según el orden en que corran.

En `tests/reservation/transfer-route.test.ts`:

```ts
  it("429 al superar el techo de pedidos por IP", async () => {
    // Cada request sube un archivo al storage: sin techo, un script llena el
    // bucket. El límite es por IP y por ventana, igual que en el lookup.
    const ip = "203.0.113.77";
    let last: Response | undefined;
    for (let i = 0; i < 6; i++) last = await POST(formConIp(VALID, goodFile(), ip));
    expect(last!.status).toBe(429);
  });
```

`clientIp` lee la cabecera **`x-forwarded-for`** (`lib/rate-limit.ts:18`). El helper `form(fields, file?)` de ese archivo arma el `Request` sin cabeceras: agregale un tercer parámetro opcional `ip?: string` que, cuando venga, pase `headers: { "x-forwarded-for": ip }` al constructor. Así las llamadas existentes no cambian.

En `tests/reservation/payments-route.test.ts`, el mismo caso con el techo de esa ruta y otra IP.

**Importante:** los tests que ya existen en esos dos archivos van a empezar a compartir contador. Pasales una IP distinta a cada uno, o una IP única por request como hace el lookup.

- [ ] **Step 2: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/transfer-route.test.ts tests/reservation/payments-route.test.ts`
Expected: FAIL — hoy la sexta request devuelve 200, no 429.

- [ ] **Step 3: Cablear**

En las dos rutas, agregar el import y la guarda como **primera línea del handler**, antes de leer el body o el FormData: el punto de un rate limit es cortar temprano.

```ts
import { clientIp, rateLimited } from "@/lib/rate-limit";
```

En `app/api/reservations/transfer/route.ts`, al principio del `POST`:

```ts
  // Cada pedido sube un archivo al storage: el techo es más bajo que el del
  // lookup, que solo lee.
  if (rateLimited("transfer", clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
```

En `app/api/payments/route.ts`:

```ts
  if (rateLimited("payments", clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
```

Los buckets `"transfer"` y `"payments"` tienen que ser distintos entre sí y del `"lookup"` que ya existe: comparten el mismo mapa en memoria.

- [ ] **Step 4: Correr y ver el verde**

Run: `pnpm test`
Expected: verde. Si algún test de esos dos archivos empieza a dar 429, es el contador compartido: dale su propia IP.

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/route.ts app/api/reservations/transfer/route.ts tests/reservation/payments-route.test.ts tests/reservation/transfer-route.test.ts
git commit -m "fix(checkout): techo de pedidos por IP en pagos y transferencias"
```

---

### Task 3: Los límites del comprobante, en un módulo que el cliente pueda importar

**Files:**
- Create: `lib/reservation/comprobante.ts`
- Modify: `lib/reservation/comprobante.server.ts`
- Test: `tests/reservation/comprobante.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces, todo desde `@/lib/reservation/comprobante`:
  - `MAX_BYTES: number` (6 MB)
  - `ALLOWED_MIME: readonly string[]` y `type AllowedMime`
  - `ACCEPT_ATTR: string` — valor para el atributo `accept` del input
  - `extFor(mime: string): string`
  - `isAllowedMime(mime: string): mime is AllowedMime`
  - `formatBytes(bytes: number): string`
  - `comprobante.server.ts` re-exporta `MAX_BYTES`, `ALLOWED_MIME`, `extFor`, `isAllowedMime` y el tipo, para que sus importadores actuales no cambien.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/reservation/comprobante.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  MAX_BYTES, ACCEPT_ATTR, isAllowedMime, extFor, formatBytes,
} from "@/lib/reservation/comprobante";
import * as server from "@/lib/reservation/comprobante.server";

describe("reglas del comprobante", () => {
  it("acepta imágenes y PDF, rechaza el resto", () => {
    expect(isAllowedMime("image/jpeg")).toBe(true);
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("image/gif")).toBe(false);
    expect(isAllowedMime("")).toBe(false);
  });

  it("el accept del input lista los mismos tipos que valida el servidor", () => {
    // Si divergieran, el huésped elegiría un archivo que la UI acepta y el POST
    // rechaza, y el error aparecería recién al final del paso.
    for (const mime of ACCEPT_ATTR.split(",")) {
      expect(isAllowedMime(mime)).toBe(true);
    }
  });

  it("la extensión sale del mime, con fallback", () => {
    expect(extFor("image/jpeg")).toBe("jpg");
    expect(extFor("application/pdf")).toBe("pdf");
    expect(extFor("application/x-cosa")).toBe("bin");
  });

  it("el tamaño se muestra legible", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("el .server re-exporta los mismos valores: una sola fuente de verdad", () => {
    expect(server.MAX_BYTES).toBe(MAX_BYTES);
    expect(server.isAllowedMime("image/webp")).toBe(true);
  });
});
```

- [ ] **Step 2: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/comprobante.test.ts`
Expected: FAIL — no existe `@/lib/reservation/comprobante`.

- [ ] **Step 3: Crear el módulo**

Crear `lib/reservation/comprobante.ts` con las constantes y funciones declaradas arriba. Los valores **no se inventan**: `MAX_BYTES` y `ALLOWED_MIME` se mueven tal cual desde `comprobante.server.ts` (líneas 5-7), y `isAllowedMime` también. Encabezalo con un comentario que explique por qué vive separado del `.server`:

```ts
// Reglas del comprobante de transferencia, compartidas entre cliente y servidor.
//
// Viven acá y no en comprobante.server.ts porque el selector de archivo del
// checkout es un componente cliente y tiene que validar con los MISMOS límites
// que aplica el servidor: si divergieran, el huésped subiría un archivo que la
// UI acepta y el POST rechaza, y el error aparecería recién al final del paso.
// El módulo .server re-exporta estos valores, así que la fuente de verdad sigue
// siendo única.
//
// Mismo patrón que rate-settings.ts / rate-settings.server.ts.
```

`ACCEPT_ATTR` es `ALLOWED_MIME.join(",")`. `formatBytes` devuelve `"512 B"`, `"2 KB"` (redondeado) y `"3.0 MB"` (un decimal), con los cortes en 1024.

`extFor` y su tabla `EXT` **ya existen** en `comprobante.server.ts:9-18`, con el fallback `"bin"`: se mueven tal cual, no se reescriben. Es la función que nombró los archivos que ya están en el bucket (`comprobante.server.ts:26` la usa para armar el path), así que cambiar su resultado rompería la correspondencia con lo subido.

- [ ] **Step 4: Que el `.server` re-exporte**

En `lib/reservation/comprobante.server.ts`, borrar las constantes y `isAllowedMime`, y reemplazarlas por el re-export:

```ts
export { MAX_BYTES, ALLOWED_MIME, extFor, isAllowedMime } from "./comprobante";
export type { AllowedMime } from "./comprobante";
```

Si el archivo usa la extensión internamente, importala aparte (`import { extFor } from "./comprobante";`) para no depender del re-export.

Los importadores actuales (`app/api/reservations/transfer/route.ts`, `tests/reservation/comprobante-server.test.ts`) **no cambian**: siguen importando del `.server`.

- [ ] **Step 5: Correr y ver el verde**

Run: `pnpm test`
Expected: verde, incluido `tests/reservation/comprobante-server.test.ts`, que no se tocó.

- [ ] **Step 6: Commit**

```bash
git add lib/reservation/comprobante.ts lib/reservation/comprobante.server.ts tests/reservation/comprobante.test.ts
git commit -m "refactor(checkout): los límites del comprobante, compartidos con el cliente"
```

---

### Task 4: El selector de comprobante

Es la excepción visual autorizada del dominio. El paso de transferencia muestra hoy el `<input type="file">` crudo del navegador con `fontSize: 13` como único estilo: en una pantalla donde todo lo demás está diseñado, se lee como texto muerto. En el origen, la persona que probó el flujo no encontró cómo adjuntar y creyó que faltaba el botón.

**Files:**
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json`
- Modify: `components/reservas/StepTransferencia.tsx`
- Test: `tests/reservation/step-transferencia.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `ACCEPT_ATTR`, `MAX_BYTES`, `isAllowedMime`, `formatBytes` de `@/lib/reservation/comprobante` (Task 3).
- Produces: nada. Las props del componente no cambian.

- [ ] **Step 1: Las cinco claves i18n**

En el namespace `reservas` de los tres archivos, junto a las `transfer*` que ya están:

`es.json`:
```json
    "transferPickFile": "Elegir archivo",
    "transferPickHint": "JPG, PNG, WebP o PDF · hasta 6 MB",
    "transferChangeFile": "Cambiar archivo",
    "transferFileBadType": "Ese formato no se admite. Subí una imagen (JPG, PNG o WebP) o un PDF.",
    "transferFileTooBig": "El archivo pesa {size} y el máximo son 6 MB. Probá con una foto más chica o un PDF comprimido.",
```

`en.json`:
```json
    "transferPickFile": "Choose file",
    "transferPickHint": "JPG, PNG, WebP or PDF · up to 6 MB",
    "transferChangeFile": "Change file",
    "transferFileBadType": "That format isn't supported. Upload an image (JPG, PNG or WebP) or a PDF.",
    "transferFileTooBig": "The file is {size} and the limit is 6 MB. Try a smaller photo or a compressed PDF.",
```

`pt.json`:
```json
    "transferPickFile": "Escolher arquivo",
    "transferPickHint": "JPG, PNG, WebP ou PDF · até 6 MB",
    "transferChangeFile": "Trocar arquivo",
    "transferFileBadType": "Esse formato não é aceito. Envie uma imagem (JPG, PNG ou WebP) ou um PDF.",
    "transferFileTooBig": "O arquivo tem {size} e o máximo são 6 MB. Tente uma foto menor ou um PDF comprimido.",
```

Ubicalas por `transferSubmit`, que ya está en ese namespace. **Ojo:** los tres archivos tienen más de un bloque con claves parecidas; guiate por las otras `transfer*`, no por la primera coincidencia.

- [ ] **Step 2: Escribir el test que falla**

Crear `tests/reservation/step-transferencia.test.tsx`. Mirá `tests/reservation/order-summary.test.tsx` para el andamiaje de `NextIntlClientProvider` y copialo.

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { StepTransferencia } from "@/components/reservas/StepTransferencia";

import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import type { State } from "@/lib/reservation/reducer";

// Las tres props que declara el componente: state, settings y onPending.
const STATE: State = {
  step: 3, checkIn: new Date(2026, 6, 2), checkOut: new Date(2026, 6, 5), guests: 2,
  unitId: "aratiri", firstName: "Juan", lastName: "Pérez", email: "juan@test.com", phone: "+54",
};

function renderStep() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <StepTransferencia state={STATE} settings={DEFAULT_RATE_SETTINGS} onPending={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("selector de comprobante", () => {
  it("el input nativo está oculto pero sigue en el tab order", () => {
    // display:none lo sacaría del foco por teclado: quien navega sin mouse se
    // queda sin poder adjuntar.
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.style.display).not.toBe("none");
    expect(screen.getByText(/Elegir archivo/)).toBeInTheDocument();
  });

  it("rechaza un formato no admitido antes de subirlo", async () => {
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "a.gif", { type: "image/gif" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/formato no se admite/i);
  });

  it("al elegir un archivo válido muestra su nombre y ofrece cambiarlo", async () => {
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "comprobante.pdf", { type: "application/pdf" }));
    expect(screen.getByText("comprobante.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Cambiar archivo/)).toBeInTheDocument();
  });
});
```

Si `@testing-library/user-event` no está instalado, instalalo como devDependency (`pnpm add -D @testing-library/user-event`) — es la forma estándar de simular la selección de archivo y el repo ya usa el resto de `@testing-library`.

- [ ] **Step 3: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/step-transferencia.test.tsx`
Expected: FAIL — hoy no hay label, ni validación, ni estado de confirmación.

- [ ] **Step 4: Reemplazar el control**

En `components/reservas/StepTransferencia.tsx`, sustituir el bloque del `<label>` + `<input type="file">` (líneas 80-88) por: el rótulo, el input oculto-pero-accesible, y **dos estados excluyentes** — el label punteado cuando no hay archivo, y la tarjeta de confirmación cuando sí.

El input va con `ref`, `id="comprobante"`, `accept={ACCEPT_ATTR}`, y este estilo, que lo saca de la vista **sin** sacarlo del tab order:

```ts
{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }
```

El `onChange` no llama a `setFile` directo: llama a una función `pickFile(f)` que valida primero y, si el archivo no pasa, deja el estado en `null` y escribe el error en el mismo `error` que el componente ya usa para mostrar el `role="alert"`:

```ts
  function pickFile(f: File | null) {
    if (!f) { setFile(null); return; }
    if (!isAllowedMime(f.type)) { setFile(null); setError(t("transferFileBadType")); return; }
    if (f.size > MAX_BYTES) { setFile(null); setError(t("transferFileTooBig", { size: formatBytes(f.size) })); return; }
    setError(null);
    setFile(f);
  }
```

Sin archivo, el control visible es el `<label htmlFor="comprobante">`: zona punteada de ~22px de padding vertical, `cursor: pointer`, con `transferPickFile` en negrita y subrayado y `transferPickHint` debajo, más chico.

Con archivo, una tarjeta con el nombre (truncado con ellipsis si no entra), `formatBytes(file.size)` debajo, y un `<button type="button">` que hace `inputRef.current?.click()` con el texto `transferChangeFile`.

**Colores: solo los que el archivo ya usa.** `#ece5d8` para bordes, `#fbf8f2` para el fondo suave, `#6b665d` para el texto atenuado, `#2f6b46` para el verde de confirmación, y `#a24b2a` —la terracota de la paleta del lago— para el enlace de cambiar archivo. **No** copies `#23362B` ni `#A04B2A` del origen: son los de Aruma.

No toques nada más del componente: ni el encabezado, ni la caja de datos bancarios, ni la nota de ahorro, ni el botón de enviar, ni el bloque de error.

- [ ] **Step 5: Correr y ver el verde**

Run: `pnpm vitest run tests/reservation/step-transferencia.test.tsx`
Expected: PASS.

- [ ] **Step 6: Suite, build y lint**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: los dos primeros verdes; el lint con los errores preexistentes de siempre y ninguno nuevo.

- [ ] **Step 7: Commit**

```bash
git add messages/ components/reservas/StepTransferencia.tsx tests/reservation/step-transferencia.test.tsx
git commit -m "fix(checkout): el selector de comprobante era invisible para el huésped"
```

Si instalaste `@testing-library/user-event`, sumá `package.json` y `pnpm-lock.yaml`.

---

### Task 5: El tercer lugar donde nace una reserva

Agregada el 2026-08-11, después de la Task 1. El review encontró que `app/admin/reservas/actions.ts:53` también sortea el código a ciegas, para las reservas que el dueño carga a mano desde el panel. Es el mismo bug, el mismo arreglo, y es el tercero y último call site: sin esto el gate del dominio no puede pasar. El archivo pertenece al dominio 5 por el spec, pero esto no es portar la versión de Aruma —es aplicar el mismo fix de una línea—, así que no colisiona con lo que el dominio 5 vaya a hacer ahí.

**Files:**
- Modify: `app/admin/reservas/actions.ts:5,53`
- Test: `tests/admin/actions.test.ts`

**Interfaces:**
- Consumes: `generateUniqueBookingCode` de `@/lib/reservation/reservations.server`, igual que la Task 1.
- Produces: nada nuevo. La server action suma un camino de error.

- [ ] **Step 1: Ver qué mockea el test**

`tests/admin/actions.test.ts` ya mockea módulos de este árbol. Si mockea `@/lib/reservation/reservations.server`, agregale `generateUniqueBookingCode` al factory **antes** de tocar la action, por la misma razón que en la Task 1: un factory incompleto deja la función en `undefined`. Si no lo mockea, fijate contra qué corre hoy y seguí ese patrón.

- [ ] **Step 2: Escribir los tests que fallan**

En el caso del camino feliz que ya exista, sumá `expect(generateUniqueBookingCode).toHaveBeenCalledOnce();`.

Y un caso nuevo para el fallo. La action devuelve un objeto de resultado, no una `Response`: mirá qué forma tienen sus retornos de error (por ejemplo `{ ok: false, error: "conflict" }` en el caso de solapamiento, `app/admin/reservas/actions.ts:64`) y seguí esa misma forma, con un valor de `error` propio para este caso. El test tiene que verificar que **no se insertó nada** cuando el código falla.

- [ ] **Step 3: Correr y ver el rojo**

Run: `pnpm vitest run tests/admin/actions.test.ts`
Expected: FAIL — la action sigue usando el sorteo ciego.

- [ ] **Step 4: Cablear**

Sacar el import de `generateBookingCode` y pedir el código antes del `insertReservation`, con el mismo patrón de la Task 1 y un comentario que explique el porqué. La diferencia con las rutas es que acá se devuelve el objeto de resultado de la action, no un `NextResponse`.

- [ ] **Step 5: Correr y ver el verde**

Run: `pnpm test`
Expected: verde.

- [ ] **Step 6: Verificar el gate**

Run: `grep -rn "generateBookingCode" app/ | grep -v "//"`
Expected: sin resultados. El `grep` sin filtrar sí devuelve tres líneas, pero son los comentarios que explican por qué **no** se usa el sorteo ciego. Lo que no puede quedar es un import ni una llamada.

- [ ] **Step 7: Commit**

```bash
git add app/admin/reservas/actions.ts tests/admin/actions.test.ts
git commit -m "fix(admin): la reserva manual también pide el código contra la base"
```

---

## Gate de verificación del dominio

- [ ] `pnpm test` en verde, con la salida a la vista
- [ ] `pnpm build` sin errores
- [ ] `pnpm lint` sin errores nuevos
- [ ] `grep -rn "generateBookingCode" app/` no devuelve nada: las dos rutas piden el código contra la base
- [ ] En `pnpm dev`, recorrer el paso de transferencia: que se vea el control punteado, que un `.gif` sea rechazado en el momento, que un PDF válido muestre nombre y tamaño, y que se pueda llegar al input con Tab

## Fuera de alcance

- **`calendar.server` y `test-unit`**: ver Global Constraints.
- **El verde y el marfil de Aruma en el botón de enviar** (`StepTransferencia.tsx:95`): excede la excepción autorizada, que es solo el selector. Anotado para una pasada de branding aparte, junto con cualquier otro resto del baseline en `components/reservas/`.
- **Dominio 5 (admin)**: plan aparte. La Task 5 toca `app/admin/reservas/actions.ts`, pero solo para aplicarle el fix de la Task 1: no adelanta nada del portado del panel.
