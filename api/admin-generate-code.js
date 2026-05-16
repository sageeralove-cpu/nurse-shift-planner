// Admin — generate unique ENJ-XXXXXX code, optionally email via Resend REST API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

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
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorised' });

  try {
    const { email, sendEmail } = req.body || {};

    // Generate unique code with up to 5 retries
    let code, inserted = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const r = await fetch(`${SUPABASE_URL}/rest/v1/access_codes`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ code, email: email || null })
      });
      if (r.ok || r.status === 201) { inserted = true; break; }
      const errBody = await r.json().catch(() => ({}));
      if (!errBody?.message?.includes('duplicate')) break; // non-collision error, stop
    }
    if (!inserted) return res.status(500).json({ error: 'Could not generate unique code' });

    // Optionally send email via Resend REST API
    let emailSent = false;
    if (sendEmail && email && RESEND_API_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Elite Nurse Jackie <onboarding@resend.dev>',
          to: email,
          subject: '🏥 Your Nurse Shift Planner Access Code',
          html: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
            <h1 style="color:#3b82f6;">🏥 Nurse Shift Planner</h1>
            <p style="color:#94a3b8;">by Elite Nurse Jackie</p>
            <hr style="border-color:#1e3a5f;margin:24px 0;">
            <p>Thank you so much for your support! 💙</p>
            <div style="background:#1e3a5f;border:2px solid #3b82f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
              <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#60a5fa;">${code}</span>
            </div>
            <ol style="color:#94a3b8;line-height:1.8;">
              <li>Go to <a href="https://nurse-shift-planner.vercel.app" style="color:#3b82f6;">nurse-shift-planner.vercel.app</a></li>
              <li>Click "I've already paid — enter my code"</li>
              <li>Enter your code — you're in! 🎉</li>
            </ol>
            <p style="color:#64748b;font-size:12px;">Your code is personal — please don't share it. Built with 💙 for Australian nurses.</p>
          </div>`
        })
      });
      emailSent = emailRes.ok;
    }

    return res.status(200).json({ ok: true, code, emailSent });
  } catch (err) {
    console.error('admin-generate-code error:', err);
    return res.status(500).json({ error: err.message });
  }
};
