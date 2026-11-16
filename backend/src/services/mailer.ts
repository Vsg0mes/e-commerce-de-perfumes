import nodemailer, { Transporter } from 'nodemailer';
import prisma from '../prisma';

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Registro em memória dos últimos e-mails processados (útil em dev/testes automatizados)
export const sentEmailsLog: Array<MailPayload & { sentAt: Date }> = [];

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  if (!cachedTransporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }
  return cachedTransporter;
}

const formatBRL = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const shortId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family: Georgia, serif; background-color: #f9fafb; color: #111827; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="background: #080808; color: #D4AF37; padding: 20px 24px; text-align: center; letter-spacing: 0.25em; font-size: 20px; font-weight: bold;">
      MEMORARE
    </div>
    <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6;">
      <h2 style="margin-top: 0; color: #111827;">${escapeHtml(title)}</h2>
      ${bodyHtml}
    </div>
    <div style="padding: 16px 24px; background: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center;">
      Memorare Alta Perfumaria — E-mail automático, não responda.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Envia um e-mail via SMTP (se configurado) ou registra no console em desenvolvimento.
 * Nunca propaga exceção para não derrubar requisições HTTP ou webhooks.
 */
export async function sendMailSafe(payload: MailPayload): Promise<void> {
  try {
    const from = process.env.MAIL_FROM?.trim() || 'Memorare Perfumes <no-reply@memorare.local>';
    const transporter = getTransporter();

    sentEmailsLog.push({ ...payload, sentAt: new Date() });
    if (sentEmailsLog.length > 50) sentEmailsLog.shift();

    if (!transporter) {
      console.log(
        `[MAILER DEV] Para: ${payload.to} | Assunto: ${payload.subject}\n${payload.text}\n---`
      );
      return;
    }

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } catch (err) {
    console.error(`[MAILER ERROR] Falha ao enviar e-mail "${payload.subject}" para ${payload.to}:`, err);
  }
}

async function fetchOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      address: true,
      items: { include: { product: { select: { name: true, volume: true } } } },
    },
  });
}

/** 1. Pedido confirmado (pago) */
export async function sendOrderConfirmedEmail(orderId: string): Promise<void> {
  try {
    const order = await fetchOrderForEmail(orderId);
    if (!order?.user?.email) return;

    const code = shortId(order.id);
    const subject = `Pedido ${code} confirmado — Memorare`;
    const addr = order.address;
    const addressLine = `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''} — ${addr.neighborhood}, ${addr.city}/${addr.state} (CEP ${addr.zipCode})`;

    const itemsText = order.items
      .map((i) => `- ${i.quantity}x ${i.product.name}${i.product.volume ? ` (${i.product.volume})` : ''}: ${formatBRL(Number(i.price) * i.quantity)}`)
      .join('\n');

    const text = [
      `Olá, ${order.user.name}!`,
      ``,
      `Seu pagamento foi confirmado e o pedido ${code} já está sendo preparado.`,
      ``,
      `Itens do pedido:`,
      itemsText,
      ``,
      `Frete: ${formatBRL(order.shippingAmount)}`,
      ...(Number(order.discountAmount) > 0 ? [`Desconto: -${formatBRL(order.discountAmount)}`] : []),
      `Total pago: ${formatBRL(order.totalAmount)}`,
      ``,
      `Endereço de entrega:`,
      addressLine,
    ].join('\n');

    const itemsHtml = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${i.quantity}× ${escapeHtml(i.product.name)}${i.product.volume ? ` (${escapeHtml(i.product.volume)})` : ''}</td>
            <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${formatBRL(Number(i.price) * i.quantity)}</td>
          </tr>`
      )
      .join('');

    const html = wrapHtml(
      `Pedido ${code} confirmado!`,
      `<p>Olá, <strong>${escapeHtml(order.user.name)}</strong>!</p>
       <p>Recebemos a confirmação do seu pagamento e seu pedido já está em separação.</p>
       <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
         ${itemsHtml}
         <tr>
           <td style="padding: 6px 0; color: #6b7280;">Frete</td>
           <td style="padding: 6px 0; text-align: right; color: #6b7280;">${formatBRL(order.shippingAmount)}</td>
         </tr>
         ${
           Number(order.discountAmount) > 0
             ? `<tr><td style="padding: 6px 0; color: #059669;">Desconto</td><td style="padding: 6px 0; text-align: right; color: #059669;">-${formatBRL(order.discountAmount)}</td></tr>`
             : ''
         }
         <tr>
           <td style="padding: 8px 0; font-weight: bold;">Total pago</td>
           <td style="padding: 8px 0; font-weight: bold; text-align: right;">${formatBRL(order.totalAmount)}</td>
         </tr>
       </table>
       <p><strong>Endereço de entrega:</strong><br/>${escapeHtml(addressLine)}</p>`
    );

    await sendMailSafe({ to: order.user.email, subject, text, html });
  } catch (err) {
    console.error('[MAILER ERROR] sendOrderConfirmedEmail:', err);
  }
}

/** 2. Pedido enviado (com código de rastreio) */
export async function sendOrderShippedEmail(orderId: string): Promise<void> {
  try {
    const order = await fetchOrderForEmail(orderId);
    if (!order?.user?.email) return;

    const code = shortId(order.id);
    const tracking = order.trackingCode || 'Informado em breve';
    const subject = `Pedido ${code} enviado — Código de rastreio ${tracking}`;

    const text = [
      `Olá, ${order.user.name}!`,
      ``,
      `Seu pedido ${code} foi enviado.`,
      `Código de rastreio: ${tracking}`,
    ].join('\n');

    const html = wrapHtml(
      `Seu pedido ${code} foi enviado!`,
      `<p>Olá, <strong>${escapeHtml(order.user.name)}</strong>!</p>
       <p>Seu pedido acabou de ser despachado e está a caminho.</p>
       <p style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px;">
         <strong>Código de rastreio:</strong> <code style="font-size: 15px;">${escapeHtml(tracking)}</code>
       </p>`
    );

    await sendMailSafe({ to: order.user.email, subject, text, html });
  } catch (err) {
    console.error('[MAILER ERROR] sendOrderShippedEmail:', err);
  }
}

/** 3. Pedido entregue */
export async function sendOrderDeliveredEmail(orderId: string): Promise<void> {
  try {
    const order = await fetchOrderForEmail(orderId);
    if (!order?.user?.email) return;

    const code = shortId(order.id);
    const subject = `Pedido ${code} entregue — Memorare`;

    const text = [
      `Olá, ${order.user.name}!`,
      ``,
      `Seu pedido ${code} foi marcado como entregue. Esperamos que sua nova fragrância seja inesquecível!`,
    ].join('\n');

    const html = wrapHtml(
      `Pedido ${code} entregue!`,
      `<p>Olá, <strong>${escapeHtml(order.user.name)}</strong>!</p>
       <p>Confirmamos a entrega do seu pedido <strong>${code}</strong>. Esperamos que sua experiência com a Memorare seja inesquecível!</p>`
    );

    await sendMailSafe({ to: order.user.email, subject, text, html });
  } catch (err) {
    console.error('[MAILER ERROR] sendOrderDeliveredEmail:', err);
  }
}

/** 4. Pedido cancelado / reembolsado */
export async function sendOrderCancelledEmail(orderId: string): Promise<void> {
  try {
    const order = await fetchOrderForEmail(orderId);
    if (!order?.user?.email) return;

    const code = shortId(order.id);
    const refunded = order.paymentStatus === 'REFUNDED';
    const subject = refunded
      ? `Pedido ${code} cancelado e reembolsado — Memorare`
      : `Pedido ${code} cancelado — Memorare`;

    const refundLine = refunded
      ? `O reembolso integral no valor de ${formatBRL(order.totalAmount)} foi processado junto à operadora do seu pagamento.`
      : `Nenhum valor foi cobrado pelo pedido.`;

    const text = [
      `Olá, ${order.user.name}!`,
      ``,
      `Seu pedido ${code} foi cancelado.`,
      refundLine,
    ].join('\n');

    const html = wrapHtml(
      subject,
      `<p>Olá, <strong>${escapeHtml(order.user.name)}</strong>!</p>
       <p>Informamos que o pedido <strong>${code}</strong> foi cancelado.</p>
       <p>${escapeHtml(refundLine)}</p>`
    );

    await sendMailSafe({ to: order.user.email, subject, text, html });
  } catch (err) {
    console.error('[MAILER ERROR] sendOrderCancelledEmail:', err);
  }
}

/** 5. Redefinição de senha */
export async function sendPasswordResetEmail(
  user: { name: string; email: string },
  rawToken: string
): Promise<void> {
  try {
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const subject = 'Redefinição de senha — Memorare';

    const text = [
      `Olá, ${user.name}!`,
      ``,
      `Recebemos uma solicitação para redefinir a senha da sua conta na Memorare.`,
      `Acesse o link abaixo para criar uma nova senha (válido por 1 hora):`,
      resetUrl,
      ``,
      `Se você não solicitou esta alteração, ignore este e-mail.`,
    ].join('\n');

    const html = wrapHtml(
      'Redefinição de senha',
      `<p>Olá, <strong>${escapeHtml(user.name)}</strong>!</p>
       <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha (o link é válido por <strong>1 hora</strong> e pode ser usado uma única vez):</p>
       <p style="margin: 24px 0; text-align: center;">
         <a href="${escapeHtml(resetUrl)}" style="background: #D4AF37; color: #080808; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
           Redefinir minha senha
         </a>
       </p>
       <p style="font-size: 12px; color: #6b7280;">Ou copie e cole no navegador:<br/>${escapeHtml(resetUrl)}</p>
       <p style="font-size: 12px; color: #6b7280;">Se você não solicitou esta alteração, ignore este e-mail.</p>`
    );

    await sendMailSafe({ to: user.email, subject, text, html });
  } catch (err) {
    console.error('[MAILER ERROR] sendPasswordResetEmail:', err);
  }
}
