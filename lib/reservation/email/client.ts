import { Resend } from "resend";

export type EmailAttachment = {
  filename: string;
  /** Contenido codificado en base64. */
  content: string;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
};

const DEFAULT_FROM = "La Casa del Lago Urugua-í <onboarding@resend.dev>";

/**
 * Único punto del código que habla con Resend.
 *
 * Contrato: NUNCA lanza. Devuelve true solo si Resend aceptó el mensaje.
 * Por eso los call sites no envuelven los envíos en try/catch: un email que
 * falla se loguea y se pierde, pero jamás rompe una reserva.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY ausente; no se envía "${input.subject}"`);
    return false;
  }

  try {
    const replyTo = process.env.CDL_EMAIL_REPLY_TO;
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.CDL_EMAIL_FROM ?? DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(replyTo ? { replyTo } : {}),
      ...(input.attachments ? { attachments: input.attachments } : {}),
    });
    if (error) {
      console.error(`[email] Resend rechazó "${input.subject}":`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      `[email] envío falló "${input.subject}":`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}
