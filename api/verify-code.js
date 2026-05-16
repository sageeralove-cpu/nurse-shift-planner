$ cat /Users/jackiedouma/nurse-shift-planner/api/verify-code.js

// Verify an ENJ-XXXXXX access code and mark it used
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', clean)
      .single();

    if (error || !data) return res.status(200).json({ valid: false, error: 'Code not found' });
    if (data.used) return res.status(200).json({ valid: false, error: 'Code already used' });

    // Mark as used
    await supabase
      .from('access_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('code', clean);

    return res.status(200).json({ valid: true });
  } catch (err) {
    console.error('verify-code error:', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
};
