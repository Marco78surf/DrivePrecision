// api/contact.js — Vercel Serverless Function
// Envoie les messages du formulaire vers contact@driveprecision.fr via Resend
// Variable d'environnement requise : RESEND_API_KEY

module.exports = async function handler(req, res) {
  // CORS (même domaine en prod, utile pour tests locaux)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });

  const { prenom, nom, email, telephone, entreprise, sujet, message, _hp_website } = req.body || {};

  // ── Honeypot anti-spam ─────────────────────────────────
  if (_hp_website) return res.status(200).json({ success: true });

  // ── Validation des champs obligatoires ─────────────────
  if (!prenom?.trim() || !nom?.trim() || !sujet?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  // ── Envoi via Resend ───────────────────────────────────
  const emailBody = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'DrivePrecision <noreply@driveprecision.fr>',
      to: ['contact@driveprecision.fr'],
      reply_to: email.trim(),
      subject: `[DrivePrecision] ${sujet} — ${prenom} ${nom}`,
      html: buildHtml({ prenom, nom, email, telephone, entreprise, sujet, message }),
      text: buildText({ prenom, nom, email, telephone, entreprise, sujet, message }),
    }),
  });

  if (emailBody.ok) {
    return res.status(200).json({ success: true });
  }

  const errData = await emailBody.json().catch(() => ({}));
  console.error('Resend error:', errData);
  return res.status(500).json({ error: "Erreur lors de l'envoi. Veuillez réessayer." });
};

// ─────────────────────────────────────────────────────────
// Templates email
// ─────────────────────────────────────────────────────────

function buildHtml({ prenom, nom, email, telephone, entreprise, sujet, message }) {
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const row = (label, value) => value
    ? `<tr><td style="padding:6px 16px 6px 0;color:#888;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 0;font-size:14px;color:#222;">${esc(value)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr>
          <td style="background:#DF3C3D;padding:24px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:.05em;">DRIVE PRECISION</p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.8);">Nouveau message via le formulaire de contact</p>
          </td>
        </tr>
        <!-- Sujet -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#888;">Sujet</p>
            <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#111;">${esc(sujet)}</p>
          </td>
        </tr>
        <!-- Infos contact -->
        <tr>
          <td style="padding:20px 32px;">
            <table cellpadding="0" cellspacing="0">
              ${row('Prénom', prenom)}
              ${row('Nom', nom)}
              ${row('Email', email)}
              ${row('Téléphone', telephone)}
              ${row('Entreprise', entreprise)}
            </table>
          </td>
        </tr>
        <!-- Message -->
        <tr>
          <td style="padding:0 32px 32px;">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#888;">Message</p>
            <div style="background:#f8f8f8;border-left:3px solid #DF3C3D;padding:16px 20px;font-size:14px;line-height:1.7;color:#333;white-space:pre-wrap;">${esc(message)}</div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#aaa;">Répondre directement à cet email répondra à <strong>${esc(email)}</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText({ prenom, nom, email, telephone, entreprise, sujet, message }) {
  return [
    'DRIVE PRECISION — Nouveau message de contact',
    '='.repeat(48),
    `Sujet     : ${sujet}`,
    `Prénom    : ${prenom}`,
    `Nom       : ${nom}`,
    `Email     : ${email}`,
    telephone  ? `Téléphone : ${telephone}` : null,
    entreprise ? `Entreprise: ${entreprise}` : null,
    '',
    'Message :',
    '-'.repeat(48),
    message,
  ].filter(l => l !== null).join('\n');
}
