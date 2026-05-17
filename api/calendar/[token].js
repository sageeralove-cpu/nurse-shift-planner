// Live calendar feed — returns ICS generated from user's saved shift data
// Subscribed via webcal://nurse-shift-planner.vercel.app/api/calendar/[token]
// Calendar apps poll this URL automatically (typically every few hours)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SHIFT_META = {
  day:     { label: 'Day Shift',     defaultStart: '07:00', defaultEnd: '15:30' },
  evening: { label: 'Evening Shift', defaultStart: '14:00', defaultEnd: '22:30' },
  night:   { label: 'Night Shift',   defaultStart: '22:00', defaultEnd: '07:00' },
  oncall:  { label: 'On Call',       defaultStart: '08:00', defaultEnd: '17:00' },
  rdo:     { label: 'RDO',           defaultStart: '00:00', defaultEnd: '00:00' },
  leave:   { label: 'Leave',         defaultStart: '00:00', defaultEnd: '00:00' },
  off:     { label: 'Off',           defaultStart: '00:00', defaultEnd: '00:00' },
};

function pad(n) { return String(n).padStart(2, '0'); }

function icsDateTime(y, m, d, timeStr, spansMidnight = false) {
  const [h, min] = timeStr.split(':').map(Number);
  const dt = new Date(y, m, d, h, min, 0);
  if (spansMidnight) dt.setDate(dt.getDate() + 1);
  return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function icsAllDay(y, m, d) {
  const dt = new Date(y, m, d + 1); // all-day end = next day
  return {
    start: `${y}${pad(m+1)}${pad(d)}`,
    end:   `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}`,
  };
}

function parseTime(t) {
  if (!t) return 0;
  const [h, min] = t.split(':').map(Number);
  return h * 60 + (min || 0);
}

function escape(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function generateICS(allData) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Elite Nurse Jackie//Nurse Shift Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:🏥 Nurse Shifts',
    'X-WR-TIMEZONE:Australia/Sydney',
    'REFRESH-INTERVAL;VALUE=DURATION:PT3H',
    'X-PUBLISHED-TTL:PT3H',
  ];

  const allDayTypes = new Set(['rdo', 'leave', 'off']);

  for (const [ym, days] of Object.entries(allData || {})) {
    const [y, month] = ym.split('-').map(Number);
    for (const [dayStr, d] of Object.entries(days || {})) {
      if (!d?.shiftType) continue;
      const day = parseInt(dayStr);
      const meta = SHIFT_META[d.shiftType] || SHIFT_META.day;
      const uid = `ENJ-${y}-${pad(month+1)}-${pad(day)}-${d.shiftType}@nurseshiftplanner.vercel.app`;
      const actDesc = (d.activities || []).map(a => `${a.label}${a.dur ? ' (' + a.dur + ')' : ''}`).join(', ');
      const notes = d.notes ? `Notes: ${d.notes}` : '';
      const descParts = [actDesc, notes].filter(Boolean).join('\\n');

      if (allDayTypes.has(d.shiftType)) {
        const { start, end } = icsAllDay(y, month, day);
        lines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTART;VALUE=DATE:${start}`,
          `DTEND;VALUE=DATE:${end}`,
          `SUMMARY:${escape(meta.label)}`,
          descParts ? `DESCRIPTION:${escape(descParts)}` : 'DESCRIPTION:',
          'END:VEVENT'
        );
      } else {
        const actualStart = d.startTime || meta.defaultStart;
        const actualEnd   = d.endTime   || meta.defaultEnd;
        const crosses     = parseTime(actualEnd) < parseTime(actualStart);
        const dtStart = icsDateTime(y, month, day, actualStart);
        const dtEnd   = icsDateTime(y, month, day, actualEnd, crosses);
        lines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          `SUMMARY:${escape(meta.label)}`,
          descParts ? `DESCRIPTION:${escape(descParts)}` : 'DESCRIPTION:',
          'END:VEVENT'
        );
      }
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

module.exports = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/access_codes?sync_token=eq.${encodeURIComponent(token)}&select=shift_data`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).send('Calendar not found — check your subscription URL');
    }

    // Support v2 payload {_version:2, shifts:{...}} and legacy v1 {dateKey:{...}}
    const raw = rows[0]?.shift_data || {};
    const ics = generateICS(raw._version === 2 ? (raw.shifts || {}) : raw);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="nurse-shifts.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(ics);
  } catch (err) {
    console.error('calendar feed error:', err);
    return res.status(500).send('Server error');
  }
};
