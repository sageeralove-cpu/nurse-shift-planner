$ cat /Users/jackiedouma/nurse-shift-planner/api/verify-code.js

// Verify an ENJ-XXXXXX access code — uses native fetch, no npm packages needed
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, error: 'No code provided' });
    const clean = code.trim().toUpperCase();

    // Look up code in Supabase via REST API
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(clean)}&select=*`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const rows = await lookupRes.json();

    if (!rows || rows.length === 0) return res.status(200).json({ valid: false, error: 'Code not found' });
    const row = rows[0];
    if (row.used) return res.status(200).json({ valid: false, error: 'Code already used' });

    // Mark as used
    await fetch(
      `${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(clean)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ used: true, used_at: new Date().toISOString() })
      }
    );

    return res.status(200).json({ valid: true });
  } catch (err) {
    console.error('verify-code error:', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
};
