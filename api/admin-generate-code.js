// Admin endpoint — manually generate a code and optionally email it
// Protected by ADMIN_SECRET env var
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ENJ-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-admin-secret'] || req.body?.adminSecret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  try {
    const { email, sendEmail } = req.body || {};

    let code, inserted = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const { error } = await supabase.from('access_codes').insert({
        code,
        email: email || null
      });
      if (!error) { inserted = true; break; }
    }
    if (!inserted) return res.status(500).json({ error: 'Could not generate unique code' });

    if (sendEmail && email && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Elite Nurse Jackie <no-reply@elitenursejackie.com>',
        to: email,
        subject: '🏥 Your Nurse Shift Planner Access Code',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
            <h1 style="color:#3b82f6;margin-bottom:4px;">🏥 Nurse Shift Planner</h1>
            <p style="color:#94a3b8;margin-top:0;">by Elite Nurse Jackie</p>
            <hr style="border-color:#1e3a5f;margin:24px 0;">
            <p>Thank you so much for your support! 💙</p>
            <div style="background:#1e3a5f;border:2px solid #3b82f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
              <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#60a5fa;">${code}</span>
            </div>
            <ol style="color:#94a3b8;line-height:1.8;">
              <li>Go to <a href="https://nurse-shift-planner.vercel.app" style="color:#3b82f6;">nurse-shift-planner.vercel.app</a></li>
              <li>Click "I've already paid — enter my code"</li>
              <li>Enter your code above — you're in! 🎉</li>
            </ol>
          </div>
        `
      });
    }

    return res.status(200).json({ ok: true, code, emailSent: !!(sendEmail && email && process.env.RESEND_API_KEY) });
  } catch (err) {
    console.error('admin-generate-code error:', err);
    return res.status(500).json({ error: err.message });
  }
};
