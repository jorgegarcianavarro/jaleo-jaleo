'use strict';
const { db, toPlan, json, isAdmin } = require('./_lib');

/* Copia de seguridad en JSON. Solo administrador. */
module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'Método no permitido.' }); }
    if (!isAdmin(req)) return json(res, 401, { error: 'Necesitas entrar como administrador.' });
    const p = await db();
    const r = await p.query('SELECT * FROM plans ORDER BY start_date, at_time, title');
    const day = new Date().toISOString().slice(0, 10);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="jaleo-jaleo-copia-' + day + '.json"');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ exportado: new Date().toISOString(), planes: r.rows.map(toPlan) }, null, 2));
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Error del servidor.' });
  }
};
