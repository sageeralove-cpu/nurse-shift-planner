// Save shift data to Supabase for live calendar sync
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { sync_token, shift_data } = req.body || {};
    if (!sync_token) return res.status(400).json({ error: 'Missing sync_token' });
    if (!shift_data) return res.status(400).json({ error: 'Missing shift_data' });

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/access_codes?sync_token=eq.${encodeURIComponent(sync_token)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ shift_data }),
      }
    );

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return res.status(500).json({ error: err.message || 'Supabase update failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('save-shifts error:', err);
    return res.status(500).json({ error: err.message });
  }
};
