$ cat /Users/jackiedouma/nurse-shift-planner/api/kofi-webhook.js

// Ko-fi webhook → generate unique ENJ-XXXXXX code → email buyer via Resend
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusables
  let code = 'ENJ-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Ko-fi sends data as form-encoded JSON string in the "data" field
    const raw = req.body?.data || req.body;
    const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Verify Ko-fi token
    if (payload.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Only handle completed shop orders or donations (not recurring failures)
    if (payload.type === 'Subscription' && !payload.is_first_subscription_payment) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const email = payload.email;
    if (!email) return res.status(400).json({ error: 'No email in payload' });

    // Generate a unique code (retry up to 5 times on collision)
    let code, inserted = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const { error } = await supabase.from('access_codes').insert({ code, email });
      if (!error) { inserted = true; break; }
    }
    if (!inserted) return res.status(500).json({ error: 'Could not generate unique code' });

    // Send email via Resend
    await resend.emails.send({
      from: 'Elite Nurse Jackie <no-reply@elitenursejackie.com>',
      to: email,
      subject: '🏥 Your Nurse Shift Planner Access Code',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
          <h1 style="color:#3b82f6;margin-bottom:4px;">🏥 Nurse Shift Planner</h1>
          <p style="color:#94a3b8;margin-top:0;">by Elite Nurse Jackie</p>
          <hr style="border-color:#1e3a5f;margin:24px 0;">
          <p>Thank you so much for your support — it means everything! 💙</p>
          <p>Here is your personal access code:</p>
          <div style="background:#1e3a5f;border:2px solid #3b82f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
            <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#60a5fa;">${code}</span>
          </div>
          <p>To unlock the app:</p>
          <ol style="color:#94a3b8;line-height:1.8;">
            <li>Go to <a href="https://nurse-shift-planner.vercel.app" style="color:#3b82f6;">nurse-shift-planner.vercel.app</a></li>
            <li>Click <strong style="color:#e2e8f0;">"I've already paid — enter code"</strong></li>
            <li>Enter your code above</li>
            <li>You're in! 🎉</li>
          </ol>
          <p style="color:#94a3b8;font-size:13px;">Your code is personal — please don't share it publicly.<br>
          If you'd like to share the app with a colleague, send them to <a href="https://ko-fi.com/elitenursejackie" style="color:#3b82f6;">ko-fi.com/elitenursejackie</a> to get their own code.</p>
          <hr style="border-color:#1e3a5f;margin:24px 0;">
          <p style="color:#64748b;font-size:12px;">Built with 💙 for Australian nurses. Questions? Message me on Ko-fi.</p>
        </div>
      `
    });

    return res.status(200).json({ ok: true, code });
  } catch (err) {
    console.error('kofi-webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
};
