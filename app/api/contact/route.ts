import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/reservation/email/client";
import { esc } from "@/lib/reservation/email/format";
import { isValidEmail } from "@/lib/reservation/validation";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const MAX = { name: 100, email: 160, phone: 60, dates: 120, message: 3000 } as const;

function adminEmail(): string | null {
  const explicit = (process.env.CDL_ADMIN_EMAIL ?? "").trim();
  if (explicit) return explicit;
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((v) => v.trim()).filter(Boolean)[0] ?? null;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

export async function POST(req: Request) {
  if (rateLimited("contact", clientIp(req), 3, 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  // Honeypot for simple bots. It is intentionally not announced to users.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = text(body.name, MAX.name);
  const email = text(body.email, MAX.email);
  const phone = text(body.phone, MAX.phone) ?? "No informado";
  const dates = text(body.dates, MAX.dates) ?? "No informadas";
  const message = text(body.message, MAX.message);
  const to = adminEmail();

  if (!name || !email || !message || !isValidEmail(email) || !to) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const subject = `Consulta desde la web — ${name}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">
    <h2 style="font-size:18px">Nueva consulta desde La Casa del Lago</h2>
    <p><strong>Nombre:</strong> ${esc(name)}<br>
    <strong>Email:</strong> ${esc(email)}<br>
    <strong>Teléfono:</strong> ${esc(phone)}<br>
    <strong>Fechas:</strong> ${esc(dates)}</p>
    <p style="white-space:pre-wrap">${esc(message)}</p>
  </div>`;
  const sent = await sendEmail({
    to,
    subject,
    html,
    text: `Nueva consulta desde La Casa del Lago\n\nNombre: ${name}\nEmail: ${email}\nTeléfono: ${phone}\nFechas: ${dates}\n\n${message}`,
    replyTo: email,
  });

  return sent
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "email" }, { status: 502 });
}
