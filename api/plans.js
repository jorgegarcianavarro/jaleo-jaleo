'use strict';
const crypto = require('crypto');
const { db, toPlan, json, requireAdmin, clean } = require('./_lib');

/* GET: lista pública (solo lectura). POST / PUT / DELETE: solo administrador. */
module.exports = async (req, res) => {
  try {
    const q = req.query || {};

    if (req.method === 'GET') {
      const p = await db();
      /* Planes futuros y de los últimos 400 días (el listado "Pasados" no crece sin límite). */
      const from = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
      const r = await p.query(
        "SELECT * FROM plans WHERE (CASE WHEN end_date <> '' THEN end_date ELSE start_date END) >= $1 ORDER BY start_date, at_time, title",
        [from]
      );
      return json(res, 200, { plans: r.rows.map(toPlan) });
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const c = clean(req.body);
      if (c.error) return json(res, 400, { error: c.error });
      const v = c.value, p = await db();
      for (let i = 0; i < 5; i++) {
        const id = crypto.randomBytes(4).toString('hex');
        try {
          const r = await p.query(
            'INSERT INTO plans (id,title,cat,start_date,end_date,at_time,price,city,loc,descr,url,icon,sold_out,recommended,featured,added) ' +
            'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *',
            [id, v.title, v.cat, v.start, v.end, v.time, v.price, v.city, v.loc, v.descr, v.url, v.icon, v.sold_out, v.recommended, v.featured, Date.now()]
          );
          return json(res, 201, { plan: toPlan(r.rows[0]) });
        } catch (e) {
          if (e && e.code === '23505') continue; /* identificador repetido: probar otro */
          throw e;
        }
      }
      return json(res, 500, { error: 'No se ha podido guardar.' });
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const id = String(q.id || '');
      if (!/^[a-f0-9]{8}$/.test(id)) return json(res, 400, { error: 'Plan no válido.' });
      const c = clean(req.body);
      if (c.error) return json(res, 400, { error: c.error });
      const v = c.value, p = await db();
      const r = await p.query(
        'UPDATE plans SET title=$2,cat=$3,start_date=$4,end_date=$5,at_time=$6,price=$7,city=$8,loc=$9,descr=$10,url=$11,icon=$12,sold_out=$13,recommended=$14,featured=$15 WHERE id=$1 RETURNING *',
        [id, v.title, v.cat, v.start, v.end, v.time, v.price, v.city, v.loc, v.descr, v.url, v.icon, v.sold_out, v.recommended, v.featured]
      );
      if (!r.rows.length) return json(res, 404, { error: 'Ese plan ya no existe.' });
      return json(res, 200, { plan: toPlan(r.rows[0]) });
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = String(q.id || '');
      if (!/^[a-f0-9]{8}$/.test(id)) return json(res, 400, { error: 'Plan no válido.' });
      const p = await db();
      await p.query('DELETE FROM plans WHERE id=$1', [id]);
      return json(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return json(res, 405, { error: 'Método no permitido.' });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Error del servidor. Inténtalo de nuevo en un momento.' });
  }
};
