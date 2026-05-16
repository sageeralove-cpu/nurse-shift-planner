
// Submit a community review (pending admin approval)
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
    const { name, role, rating, message } = req.body || {};
    if (!name || !message) return res.status(400).json({ error: 'name and message are required' });
    if (rating && (rating < 1 || rating > 5)) return res.status(400).json({ error: 'rating must be 1-5' });

    const { error } = await supabase.from('reviews').insert({
      name: name.trim().slice(0, 60),
      role: (role || '').trim().slice(0, 60),
      rating: rating || 5,
      message: message.trim().slice(0, 500),
      approved: false
    });

    if (error) throw error;
    return res.status(200).json({ ok: true, message: 'Review submitted — thank you!' });
  } catch (err) {
    console.error('submit-review error:', err);
    return res.status(500).json({ error: err.message });
  }
};
