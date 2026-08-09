# Dominio 2A — Email al huésped: arreglos funcionales y rediseño

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el mail de confirmación llegue con el link de WhatsApp, sobreviva a Outlook y lleve la identidad de La Casa del Lago, y que una falla de Resend no rompa el flujo de liberación.

**Architecture:** Tres tareas independientes sobre `lib/reservation/email/`. La primera arregla dos fallas funcionales en `guest.ts` sin tocar el diseño. La segunda reemplaza el `renderEnvelope` actual por el shell de tres piezas (`renderShell` / `renderStay` / `renderRows`) adaptado de Aruma, con la paleta del lago. La tercera suma el script de preview y el test de robustez.

**Tech Stack:** TypeScript, Resend, Vitest, tsx.

## Global Constraints

- Portado desde `bioornal/arumalodgeweb` @ `f1ce901`. Los repos **no comparten historia git**: todo a mano.
- **Excepción visual autorizada** (ver spec, sección "Restricción de alcance"): este dominio sí modifica diseño, pero solo dentro del email. No toca el front del sitio.
- El adjunto `.ics` se llama `cdl-<code minúscula>.ics`. Es branding propio: **no** portar el `aruma-<code>.ics` del origen.
- Franja de estado en **lago `#155e75`** (decisión del 2026-08-09).
- El bucket de fotos se llama **`imagenes`**, no `casa-lago-fotos` — `ADAPTACION.md` está desactualizado en ese punto. Usar `bucketSrc()` de `components/ui/ImageSlot.tsx`, no rearmar la URL.
- Las imágenes son **decorativas**: todo dato (código, unidad, total, estado) viaja como texto. Gmail y Outlook bloquean imágenes por defecto.
- Sin `NEXT_PUBLIC_SITE_URL` no hay logo; sin `NEXT_PUBLIC_PHOTOS_BUCKET_READY === "1"` no hay foto. **Nunca** caer a un placeholder de Unsplash en un email transaccional.

## Nota sobre el origen

El template de Aruma tiene 425 líneas contra 223 acá. Este plan **no inlinea** las 425: especifica el mapeo de paleta, las URLs, la estructura destino y los arreglos concretos, y el implementador adapta desde el archivo fuente, que está en disco:

```
C:\Users\spezi\Documents\PROYECTOS\arumalodgeweb\lib\reservation\email\guest-templates.ts
```

Es un asset de presentación, no lógica: copiarlo verbatim al plan lo haría ilegible sin agregar información.

## Mapeo de paleta — Aruma → La Casa del Lago

| Constante | Aruma | Lago | Origen |
|---|---|---|---|
| `COLOR_PAGE` | `#EFEAE1` | `#f1ece3` | `--color-arena-clara` |
| `COLOR_CARD` | `#FFFFFF` | `#FFFFFF` | sin cambio |
| `COLOR_BAND` | `#F8F5F0` | `#f5eee1` | `--color-marfil` |
| `COLOR_INK` | `#23362B` | `#155e75` | `--color-lago` — franja de estado y titulares |
| `COLOR_INTRO` | `#5b5347` | `#5b5347` | neutro cálido, sin cambio |
| `COLOR_MUTED` | `#6b665d` | `#6b665d` | sin cambio |
| `COLOR_FAINT` | `#9a9388` | `#9a9388` | sin cambio |
| `COLOR_BORDER` | `#ece5d8` | `#eae0ce` | `--color-arena` |
| `COLOR_ACCENT` | `#A04B2A` | `#a24b2a` | `--color-terracota` |
| `COLOR_SAGE` | `#9DBF9E` | `#1fa2b8` | `--color-turquesa` — claro sobre la franja lago |

`FONT_SERIF` y `FONT_SANS` se portan tal cual: Georgia y Arial son ubicuas, y los clientes de email ignoran o bloquean webfonts, así que la Fraunces del sitio no es una opción.

---

### Task 1: Arreglos funcionales en guest.ts

Independiente del rediseño. Se puede mergear sola.

**Files:**
- Modify: `lib/reservation/email/guest.ts`
- Modify: `lib/reservation/email/guest-templates.ts` (solo el tipo, no el render)
- Test: `tests/reservation/email-guest.test.ts`

**Interfaces:**
- Consumes: `waLink` de `@/lib/contact` (ya importado en el archivo).
- Produces: `ConfirmationEmailInput` gana el campo `whatsappUrl?: string`.

**Verificado el 2026-08-09:** `ConfirmationEmailInput` **no** declara hoy ese campo —
tiene diez y ninguno es `whatsappUrl`—, así que hay que agregarlo o la tarea no compila.
`ReleaseEmailInput` sí lo declara: `sendReleaseEmail` ya lo pasa.

Se declara opcional a propósito. La Task 2 renderiza el botón solo si viene, así que
el template no rompe con inputs viejos ni en los tests que no lo pasan.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `tests/reservation/email-guest.test.ts`:

```ts
  it("el mail de confirmación incluye el link de WhatsApp con el código", async () => {
    const { sent } = await enviarConfirmacion({ code: "CDL-1234" });
    expect(sent.html).toContain("wa.me");
    expect(sent.html).toContain("CDL-1234");
  });

  it("una falla al mandar la liberación no propaga la excepción", async () => {
    sendEmail.mockRejectedValueOnce(new Error("Resend 500"));
    await expect(enviarLiberacion({ code: "CDL-9999" })).resolves.toBeUndefined();
  });
```

Adaptar los helpers (`enviarConfirmacion`, `enviarLiberacion`, el mock `sendEmail`) a los que ya use el archivo — no inventar una infraestructura nueva de test.

- [ ] **Step 2: Correr y verificar que fallan**

Run: `pnpm vitest run tests/reservation/email-guest.test.ts`
Expected: FAIL. El primero porque el html no tiene `wa.me`; el segundo porque la excepción de `sendEmail` se propaga.

- [ ] **Step 3: Agregar el campo al tipo**

En `lib/reservation/email/guest-templates.ts`, dentro de `ConfirmationEmailInput`, después
de `miReservaUrl`:

```ts
  /** Link de WhatsApp prellenado con el código. Opcional: sin él no se
   *  renderiza el botón, y el template sigue válido para inputs viejos. */
  whatsappUrl?: string;
```

- [ ] **Step 4: Poblar whatsappUrl en la confirmación**

En `sendConfirmationEmailOnce`, dentro del objeto que se pasa a `buildConfirmationEmail`, agregar:

```ts
      whatsappUrl: waLink(`Hola, escribo por la reserva ${row.code}`),
```

Es la misma línea que ya existe en `sendReleaseEmail` de este archivo.

- [ ] **Step 5: Envolver la liberación en try/catch**

En `sendReleaseEmail`, envolver el cuerpo existente:

```ts
  try {
    const locale = normLocale(row.locale);
    const { subject, html, text } = buildReleaseEmail({
      code: row.code,
      unitName: row.unit_name,
      firstName: row.first_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      locale,
      whatsappUrl: waLink(`Hola, escribo por la reserva ${row.code}`),
    });
    await sendEmail({ to: row.email, subject, html, text });
  } catch (err) {
    console.error(
      `[email] liberación falló (code ${row.code}):`,
      err instanceof Error ? err.message : err,
    );
  }
```

Avisar de fechas liberadas es best-effort: que Resend falle no puede tumbar la operación que ya liberó las fechas en la base.

- [ ] **Step 6: Correr y verificar que pasan**

Run: `pnpm vitest run tests/reservation/email-guest.test.ts`
Expected: PASS.

- [ ] **Step 7: Suite completa y commit**

Run: `pnpm test`
Expected: PASS (334 + 2).

```bash
git add lib/reservation/email/guest.ts lib/reservation/email/guest-templates.ts tests/reservation/email-guest.test.ts
git commit -m "fix(email): link de WhatsApp en la confirmación y liberación best-effort"
```

---

### Task 2: Rediseño del template con la identidad del lago

**Files:**
- Modify: `lib/reservation/email/guest-templates.ts`
- Test: `tests/reservation/email-template.test.ts`

**Interfaces:**
- Consumes: `bucketSrc` de `@/components/ui/ImageSlot`. `ConfirmationEmailInput`, `ReleaseEmailInput`, `BuiltEmail`, `EmailLocale` — tipos ya existentes, **no cambian de forma**.
- Produces: `buildConfirmationEmail(input: ConfirmationEmailInput): BuiltEmail` y `buildReleaseEmail(input: ReleaseEmailInput): BuiltEmail`, mismas firmas que hoy. Los consumidores (`guest.ts`) no se tocan.

- [ ] **Step 1: Escribir el test de robustez que falla**

Es el test que justifica el rediseño: si el cliente bloquea imágenes, el mail tiene que seguir sirviendo.

```ts
  it("sin imágenes, el mail sigue entregando código, unidad, total y estado", () => {
    const { html } = buildConfirmationEmail(input); // reusar el fixture del archivo
    const sinImgs = html.replace(/<img[^>]*>/g, "");
    expect(sinImgs).toContain(input.code);
    expect(sinImgs).toContain(input.unitName);
    expect(sinImgs).toContain("155e75"); // la franja de estado sobrevive como color de fondo
  });

  it("la maqueta es una tabla de ancho fijo, no un div con max-width", () => {
    const { html } = buildConfirmationEmail(input);
    // Outlook de escritorio renderiza con el motor de Word, que ignora max-width:
    // con un div el mail se estira a toda la ventana.
    expect(html).toContain('width="560"');
    expect(html).not.toMatch(/<div[^>]*max-width/);
  });
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `pnpm vitest run tests/reservation/email-template.test.ts`
Expected: FAIL. Hoy `renderEnvelope` arma un `div` y no hay `width="560"` ni la franja lago.

- [ ] **Step 3: Introducir constantes de paleta y assets**

Agregar cerca del tope del archivo, con los valores de la tabla de mapeo de arriba:

```ts
const COLOR_PAGE = "#f1ece3";
const COLOR_CARD = "#FFFFFF";
const COLOR_BAND = "#f5eee1";
const COLOR_INK = "#155e75";
const COLOR_INTRO = "#5b5347";
const COLOR_MUTED = "#6b665d";
const COLOR_FAINT = "#9a9388";
const COLOR_BORDER = "#eae0ce";
const COLOR_ACCENT = "#a24b2a";
const COLOR_SAGE = "#1fa2b8";

const FONT_SERIF = "Georgia,'Times New Roman',Times,serif";
const FONT_SANS = "Arial,Helvetica,sans-serif";

const CARD_W = 560;

// Assets. Ambos son decorativos y opcionales: si falta la variable, el bloque
// no se renderiza y el dato viaja igual como texto. Nunca cae a un placeholder
// de Unsplash — en un mail de confirmación sería peor que no poner nada.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const LOGO_URL = SITE_URL ? `${SITE_URL}/logo-lago-marfil.png` : null;
const HERO_URL =
  process.env.NEXT_PUBLIC_PHOTOS_BUCKET_READY === "1" ? bucketSrc("hero/hero2.jpg") : null;
```

Variante marfil del logo porque va sobre la franja lago, que es oscura.

- [ ] **Step 4: Reemplazar renderEnvelope por el shell de tres piezas**

Adaptar de `guest-templates.ts` del origen (ver "Nota sobre el origen"): `renderShell`, `renderStay` y la versión de `renderRows` que acepta `emphasizeLast`. Reemplazan al `renderEnvelope` actual, que se elimina.

Lo que tiene que quedar:
- Tabla de ancho fijo `width="560"`, nunca un `div` con `max-width`
- Franja de estado en `COLOR_INK` con el código de reserva grande y espaciado
- Check-in y check-out en bloque de dos columnas, con los horarios de `CHECK_IN` / `CHECK_OUT` de `lib/site.ts` — ya existen y hoy no se muestran
- Total en serif grande, resto del detalle discreto
- Mención explícita del `.ics` adjunto, que hoy se manda y nunca se nombra
- Botón de WhatsApp usando el `whatsappUrl` que puebla la Task 1
- `buildReleaseEmail` comparte el shell y hereda la marca, **pero sin foto de portada**: para una mala noticia es el tono equivocado

- [ ] **Step 5: Correr y verificar que pasan**

Run: `pnpm vitest run tests/reservation/email-template.test.ts`
Expected: PASS.

- [ ] **Step 6: Suite completa y commit**

Run: `pnpm test`

```bash
git add lib/reservation/email/guest-templates.ts tests/reservation/email-template.test.ts
git commit -m "feat(email): rediseña la confirmación con la identidad del lago"
```

---

### Task 3: Preview de emails sin disparar una reserva

**Files:**
- Create: `scripts/preview-email.mts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `buildConfirmationEmail` y `buildReleaseEmail` de la Task 2, con las firmas declaradas allí.
- Produces: script `pnpm email:preview`, que escribe los dos mails a HTML en `.preview-emails/`.

- [ ] **Step 1: Portar el script**

Adaptar `scripts/preview-email.mts` del origen (50 líneas). Renderiza los dos mails con datos de ejemplo y los escribe como archivos HTML para abrirlos en el navegador. Usar un código de ejemplo con el prefijo propio (`CDL-…`), no `ARU-…`.

- [ ] **Step 2: Registrar el script**

En `package.json`, dentro de `scripts`:

```json
    "email:preview": "pnpm --package=tsx dlx tsx scripts/preview-email.mts .preview-emails"
```

- [ ] **Step 3: Ignorar la salida**

Agregar a `.gitignore`:

```
.preview-emails/
```

- [ ] **Step 4: Verificar que corre**

Run: `pnpm email:preview`
Expected: escribe los HTML en `.preview-emails/` sin error. Abrirlos y confirmar que el logo y la foto cargan si las variables están puestas, y que sin ellas el mail sigue legible.

- [ ] **Step 5: Commit**

```bash
git add scripts/preview-email.mts package.json .gitignore
git commit -m "chore(email): pnpm email:preview para revisar los mails sin reservar"
```

---

## Gate de verificación del dominio

- [ ] `pnpm test` en verde, con la salida a la vista
- [ ] `pnpm build` sin errores
- [ ] `pnpm email:preview` y revisión visual de los dos mails en el navegador
- [ ] Revisión con imágenes bloqueadas: el mail sigue entregando código, unidad, total y estado

## Fuera de alcance

- **2B — mail al administrador** (`email/admin.ts`, 138 líneas nuevas, más `CDL_ADMIN_EMAIL` y `CDL_EMAIL_REPLY_TO`). Plan aparte.
- **2C — retirar el shim `email.server.ts`** (una línea de re-export, más los 3 imports de los API routes). Se pliega en 2B.
