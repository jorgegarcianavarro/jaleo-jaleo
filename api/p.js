'use strict';
const fs = require('fs');
const path = require('path');
const { db, toPlan } = require('./_lib');

function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* /p/<id>: la misma aplicación, con título y descripción del plan para la vista previa de WhatsApp. */
module.exports = async (req, res) => {
  let html = '';
  try { html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8'); } catch (e) {
    res.statusCode = 500; res.end('Error'); return;
  }
  try {
    const id = String((req.query || {}).id || '');
    if (/^[a-f0-9]{8}$/.test(id)) {
      const pool = await db();
      const r = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
      if (r.rows.length) {
        const p = toPlan(r.rows[0]);
        const date = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(p.start + 'T00:00:00Z'));
        const price = p.price === 0 ? 'Gratis' : (typeof p.price === 'number' ? p.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '');
        const bits = [date.charAt(0).toUpperCase() + date.slice(1) + (p.time ? ' · ' + p.time + ' h' : ''), [p.loc, p.city].filter(Boolean).join(', '), price].filter(Boolean);
        let desc = bits.join(' · ');
        if (p.desc) desc += ' — ' + (p.desc.length > 140 ? p.desc.slice(0, 137) + '…' : p.desc);
        const proto = req.headers['x-forwarded-proto'] || 'https', host = req.headers['x-forwarded-host'] || req.headers.host || '';
        const og = '<title>' + h(p.title) + ' · Jaleo Jaleo</title>\n' +
          '<meta property="og:type" content="website">\n<meta property="og:site_name" content="Jaleo Jaleo">\n' +
          '<meta property="og:title" content="' + h(p.title) + '">\n<meta property="og:description" content="' + h(desc) + '">\n' +
          '<meta property="og:url" content="' + h(proto + '://' + host + '/p/' + p.id) + '">\n' +
          '<meta name="description" content="' + h(desc) + '">\n';
        html = html.replace(/<!--OG-->[\s\S]*?<!--\/OG-->/, '<!--OG-->\n' + og + '<!--/OG-->');
      }
    }
  } catch (e) { console.error(e); /* si falla la base de datos, se sirve la aplicación igualmente */ }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.end(html);
};
