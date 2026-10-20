/**
 * Renderiza los emails al huésped a archivos HTML para mirarlos en el navegador.
 * No forma parte del build ni del deploy: es una herramienta de revisión visual.
 *
 *   pnpm email:preview
 *
 * Sin argumento escribe en .preview-emails/ (gitignorada).
 *
 * El logo y la foto dependen de env vars (NEXT_PUBLIC_SITE_URL y
 * NEXT_PUBLIC_PHOTOS_BUCKET_READY=1). Sin ellas el mail se renderiza igual, sin
 * imágenes: ese es justamente el estado que hay que revisar, porque es el que
 * ve cualquiera que tenga las imágenes bloqueadas.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildConfirmationEmail,
  buildReleaseEmail,
} from "../lib/reservation/email/guest-templates";
import { waLink } from "../lib/contact";

const outDir = process.argv[2] ?? ".preview-emails";
mkdirSync(outDir, { recursive: true });

const code = "CDL-2026-PP2P";
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lacasadellagouruguai.com";
// El mismo mensaje prellenado que arma guest.ts, para que el preview muestre el
// link que sale de verdad y no uno inventado.
const whatsappUrl = waLink(`Hola, escribo por la reserva ${code}`);

const confirmacion = buildConfirmationEmail({
  code,
  unitName: "Cabaña Aratirí",
  firstName: "Christian",
  checkIn: "2027-08-07",
  checkOut: "2027-08-10",
  nights: 3,
  guests: 4,
  total: 390000,
  locale: "es",
  miReservaUrl: `${base}/es/mi-reserva?code=${code}`,
  whatsappUrl,
});

const liberacion = buildReleaseEmail({
  code,
  unitName: "Cabaña Aratirí",
  firstName: "Christian",
  checkIn: "2027-08-07",
  checkOut: "2027-08-10",
  locale: "es",
  whatsappUrl,
});

for (const [nombre, mail] of [
  ["confirmacion", confirmacion],
  ["liberacion", liberacion],
] as const) {
  writeFileSync(join(outDir, `${nombre}.html`), mail.html, "utf8");
  writeFileSync(join(outDir, `${nombre}.txt`), `Asunto: ${mail.subject}\n\n${mail.text}`, "utf8");
  console.log(`${nombre}: ${mail.html.length} bytes html · asunto "${mail.subject}"`);
}
