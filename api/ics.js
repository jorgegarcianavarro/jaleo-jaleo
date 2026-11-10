'use strict';
const { db, toPlan, json } = require('./_lib');

function esc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function fold(line) {
  const out = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > 74) { out.push(cur); cur = ' ' + ch; bytes = 1 + b; } else { cur += ch; bytes += b; }
  }
  out.push(cur);
  return out.join('\r\n');
}
const p2 = (n) => (n < 10 ? '0' + n : '' + n);
function stamp(d) { return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + '00'; }
function dateOnly(d) { return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()); }

/* Archivo .ics: lo abren Apple Calendar, Outlook, Google Calendar y casi cualquier calendario. */
module.exports = async (req, res) => {
  try {
    const id = String((req.query || {}).id || '');
    if (req.method !== 'GET' || !/^[a-f0-9]{8}$/.test(id)) return json(res, 400, { error: 'Plan no válido.' });
    const pool = await db();
    const r = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (!r.rows.length) return json(res, 404, { error: 'Ese plan ya no existe.' });
    const p = toPlan(r.rows[0]);
    const s = new Date(p.start + 'T00:00:00Z'), e = new Date((p.end || p.start) + 'T00:00:00Z');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jaleo Jaleo//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + p.id + '@jaleojaleo', 'DTSTAMP:' + stamp(new Date()) + 'Z'];
    if (p.time) {
      const hm = p.time.split(':').map(Number);
      const st = new Date(s.getTime() + (hm[0] * 60 + hm[1]) * 60000);
      const en = new Date(e.getTime() + (hm[0] * 60 + hm[1]) * 60000 + 2 * 3600000);
      lines.push('DTSTART:' + stamp(st), 'DTEND:' + stamp(en));
    } else {
      lines.push('DTSTART;VALUE=DATE:' + dateOnly(s), 'DTEND;VALUE=DATE:' + dateOnly(new Date(e.getTime() + 86400000)));
    }
    lines.push('SUMMARY:' + esc(p.title));
    const where = [p.loc, p.city].filter(Boolean).join(', ');
    if (where) lines.push('LOCATION:' + esc(where));
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const link = host ? 'https://' + host + '/p/' + p.id : '';
    const det = [p.desc, p.url, link].filter(Boolean).join('\n');
    if (det) lines.push('DESCRIPTION:' + esc(det));
    if (link) lines.push('URL:' + link);
    lines.push('END:VEVENT', 'END:VCALENDAR');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="plan-' + p.id + '.ics"');
    res.setHeader('Cache-Control', 'no-store');
    res.end(lines.map(fold).join('\r\n') + '\r\n');
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Error del servidor.' });
  }
};
