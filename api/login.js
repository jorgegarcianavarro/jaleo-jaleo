'use strict';
const { db, json, configured, passwordOk, isAdmin, setSession, clearSession, sameOriginWrite, clientIp } = require('./_lib');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* GET: ¿hay sesión de administrador? · POST: entrar con la contraseña · DELETE: salir. */
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return json(res, 200, { admin: isAdmin(req) });

    if (req.method === 'DELETE') {
      if (!sameOriginWrite(req, res)) return;
      clearSession(res);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST') {
      if (!sameOriginWrite(req, res)) return;
      if (!configured()) {
        return json(res, 500, { error: 'Falta configurar la contraseña de administrador en Vercel (ADMIN_PASSWORD, mínimo 10 caracteres).' });
      }
      const p = await db(), ip = clientIp(req), since = Date.now() - 15 * 60000;
      await p.query('DELETE FROM login_fails WHERE at < $1', [Date.now() - 24 * 3600000]);
      const mine = await p.query('SELECT count(*) AS n FROM login_fails WHERE ip = $1 AND at > $2', [ip, since]);
      const all = await p.query('SELECT count(*) AS n FROM login_fails WHERE at > $1', [since]);
      if (Number(mine.rows[0].n) >= 5 || Number(all.rows[0].n) >= 30) {
        return json(res, 429, { error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' });
      }
      const pw = req.body && typeof req.body.password === 'string' ? req.body.password : '';
      if (!passwordOk(pw)) {
        await p.query('INSERT INTO login_fails (ip, at) VALUES ($1, $2)', [ip, Date.now()]);
        await sleep(700);
        return json(res, 401, { error: 'Contraseña incorrecta.' });
      }
      await p.query('DELETE FROM login_fails WHERE ip = $1', [ip]);
      setSession(res);
      return json(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { error: 'Método no permitido.' });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Error del servidor. Inténtalo de nuevo en un momento.' });
  }
};
