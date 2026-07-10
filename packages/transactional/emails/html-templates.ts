/**
 * Plain HTML email templates. Use these in the backend to avoid React
 * rendering in Node (which can cause minified React errors). The React
 * components in this package remain for local preview via React Email.
 *
 * All copy is in Spanish — the product's only user-facing language.
 */

export interface EmailTemplateOptions {
  appName: string;
  appAddress: string;
}

/**
 * Both OTP providers (ResendOTP / ResendOTPPasswordReset) are configured with
 * maxAge 20 minutes — the copy must match, or users discard valid codes.
 */
const OTP_VALIDITY_MINUTES = 20;

/** Admin invite email – plain HTML, no React */
export function renderAdminInviteHtml(
  props: { name?: string; inviteUrl: string },
  options: EmailTemplateOptions
): string {
  const { name, inviteUrl } = props;
  const { appName, appAddress } = options;
  const greeting = name ? `Hola, ${escapeHtml(name)}:` : "Hola:";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#fff;color:#51525C;">
  <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
    <p style="font-size:14px;margin:8px 0;">${greeting}</p>
    <p style="font-size:14px;margin:8px 0;">Has recibido una invitación para unirte al equipo de administración de ${escapeHtml(appName)}.</p>
    <p style="font-size:14px;margin:8px 0;">Haz clic en el botón para configurar tu cuenta y empezar:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:6px;">Aceptar la invitación</a>
    </p>
    <p style="font-size:14px;margin:8px 0;">Esta invitación caducará en 7 días.</p>
    <p style="font-size:14px;margin:8px 0;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
    <p style="font-size:14px;margin:8px 0;">Gracias,</p>
    <p style="font-size:14px;margin:8px 0;">El equipo de ${escapeHtml(appName)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
    <p style="font-size:14px;margin:8px 0;color:#51525C;">© ${new Date().getFullYear()} ${escapeHtml(appName)}, ${escapeHtml(appAddress)}</p>
  </div>
</body>
</html>`;
}

/** Verify email (OTP code) – plain HTML, no React */
export function renderVerifyEmailHtml(
  props: { code: string },
  options: EmailTemplateOptions
): string {
  const { code } = props;
  const { appName, appAddress } = options;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#fff;color:#51525C;">
  <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
    <p style="font-size:14px;margin:8px 0;">Hola:</p>
    <p style="font-size:14px;margin:8px 0;">Para verificar tu correo electrónico, utiliza el siguiente código:</p>
    <p style="font-size:24px;font-weight:600;margin:24px 0;"><strong>${escapeHtml(code)}</strong></p>
    <p style="font-size:14px;margin:8px 0;">Este código solo será válido durante los próximos ${OTP_VALIDITY_MINUTES} minutos.</p>
    <p style="font-size:14px;margin:8px 0;">Gracias,</p>
    <p style="font-size:14px;margin:8px 0;">El equipo de ${escapeHtml(appName)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
    <p style="font-size:14px;margin:8px 0;color:#51525C;">© ${new Date().getFullYear()} ${escapeHtml(appName)}, ${escapeHtml(appAddress)}</p>
  </div>
</body>
</html>`;
}

/** Forgot password (OTP code) – plain HTML, no React */
export function renderForgotPasswordHtml(
  props: { code: string },
  options: EmailTemplateOptions
): string {
  const { code } = props;
  const { appName, appAddress } = options;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#fff;color:#51525C;">
  <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
    <p style="font-size:14px;margin:8px 0;">Hola:</p>
    <p style="font-size:14px;margin:8px 0;">Para restablecer tu contraseña, utiliza el siguiente código:</p>
    <p style="font-size:24px;font-weight:600;margin:24px 0;"><strong>${escapeHtml(code)}</strong></p>
    <p style="font-size:14px;margin:8px 0;">Este código solo será válido durante los próximos ${OTP_VALIDITY_MINUTES} minutos.</p>
    <p style="font-size:14px;margin:8px 0;">Gracias,</p>
    <p style="font-size:14px;margin:8px 0;">El equipo de ${escapeHtml(appName)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
    <p style="font-size:14px;margin:8px 0;color:#51525C;">© ${new Date().getFullYear()} ${escapeHtml(appName)}, ${escapeHtml(appAddress)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
