'use strict';
/* Utilidades compartidas: base de datos, sesión de administrador y validación.
   Los archivos que empiezan por "_" no se publican como rutas. */
const crypto = require('crypto');
const { Pool } = require('pg');

const CATS = ['musica', 'deporte', 'eventos', 'fiestas', 'cultural', 'gastro', 'otros'];

/* ---------- Base de datos ---------- */
let pool = null;
let ready = null;

function getPool() {
  if (globalThis.__JJ_POOL__) return globalThis.__JJ_POOL__; /* gancho para pruebas */
  if (!pool) {
    const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!cs) throw new Error('Falta la base de datos (DATABASE_URL).');
    pool = new Pool({ connectionString: cs, max: 1, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 });
  }
  return pool;
}

async function db() {
  const p = getPool();
  if (!ready) {
    ready = p.query(
      'CREATE TABLE IF NOT EXISTS plans (' +
      'id text PRIMARY KEY, title text NOT NULL, cat text NOT NULL, start_date text NOT NULL, end_date text NOT NULL DEFAULT \'\', ' +
      'at_time text NOT NULL DEFAULT \'\', price numeric(8,2), city text NOT NULL, loc text NOT NULL DEFAULT \'\', ' +
      'descr text NOT NULL DEFAULT \'\', url text NOT NULL DEFAULT \'\', icon text NOT NULL DEFAULT \'\', ' +
      'sold_out boolean NOT NULL DEFAULT false, recommended boolean NOT NULL DEFAULT false, featured boolean NOT NULL DEFAULT false, ' +
      'added bigint NOT NULL)'
    ).then(() => p.query('CREATE TABLE IF NOT EXISTS login_fails (ip text NOT NULL, at bigint NOT NULL)'))
      .catch((e) => { ready = null; throw e; });
  }
  await ready;
  return p;
}

function toPlan(r) {
  return {
    id: r.id, title: r.title, cat: r.cat, start: r.start_date, end: r.end_date || '', time: r.at_time || '',
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    city: r.city, loc: r.loc || '', desc: r.descr || '', url: r.url || '', icon: r.icon || '',
    soldOut: !!r.sold_out, recommended: !!r.recommended, featured: !!r.featured, added: Number(r.added)
  };
}

/* ---------- Respuestas ---------- */
function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

/* ---------- Administrador: contraseña en variable de entorno + cookie firmada ---------- */
function configured() { return (process.env.ADMIN_PASSWORD || '').length >= 10; }

function sessionKey() {
  return crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update('jaleo-jaleo-sesion-v1').digest();
}
function sign(text) { return crypto.createHmac('sha256', sessionKey()).update(text).digest('base64url'); }
function safeEq(a, b) {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
function passwordOk(pw) {
  if (!configured()) return false;
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
function makeToken() {
  const exp = String(Date.now() + 30 * 86400000);
  return exp + '.' + sign(exp);
}
function checkToken(t) {
  if (!t || typeof t !== 'string') return false;
  const i = t.indexOf('.');
  if (i < 1) return false;
  const exp = t.slice(0, i), sig = t.slice(i + 1);
  return safeEq(sig, sign(exp)) && Number(exp) > Date.now();
}
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = c.slice(i + 1).trim();
  });
  return out;
}
function isAdmin(req) { return configured() && checkToken(parseCookies(req).jj); }
function setSession(res) {
  res.setHeader('Set-Cookie', 'jj=' + makeToken() + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000');
}
function clearSession(res) {
  res.setHeader('Set-Cookie', 'jj=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}

/* Protección contra peticiones desde otras webs: cabecera propia y mismo origen. */
function sameOriginWrite(req, res) {
  if (req.headers['x-requested-with'] !== 'jaleo') { json(res, 403, { error: 'Petición no permitida.' }); return false; }
  const o = req.headers.origin;
  if (o) {
    let host = '';
    try { host = new URL(o).host; } catch (e) { /* origen no válido */ }
    if (host !== req.headers.host) { json(res, 403, { error: 'Petición no permitida.' }); return false; }
  }
  return true;
}
function requireAdmin(req, res) {
  if (!sameOriginWrite(req, res)) return false;
  if (!isAdmin(req)) { json(res, 401, { error: 'Necesitas entrar como administrador.' }); return false; }
  return true;
}
function clientIp(req) {
  const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return f || (req.socket && req.socket.remoteAddress) || 'desconocida';
}

/* ---------- Validación de un plan (siempre en el servidor) ---------- */
function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function clean(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Datos no válidos.' };
  const str = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);
  const title = str(body.title, 120), city = str(body.city, 80), loc = str(body.loc, 140);
  const descr = str(body.desc, 800), cat = str(body.cat, 20), start = str(body.start, 10);
  let end = str(body.end, 10), time = str(body.time, 5), url = str(body.url, 500), icon = str(body.icon, 20);
  if (!title) return { error: 'Escribe un título para el plan.' };
  if (CATS.indexOf(cat) < 0) return { error: 'Categoría no válida.' };
  if (!validDate(start)) return { error: 'Elige la fecha de inicio.' };
  if (end && !validDate(end)) return { error: 'La fecha de fin no es válida.' };
  if (end && end < start) return { error: 'La fecha de fin no puede ser anterior a la de inicio.' };
  if (end === start) end = '';
  if (!city) return { error: 'Indica la ciudad en la que se celebra.' };
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: 'La hora no es válida.' };
  if (icon && !/^[a-z]{2,20}$/.test(icon)) return { error: 'Icono no válido.' };
  let price = null;
  if (body.price !== null && body.price !== undefined && body.price !== '') {
    price = Number(body.price);
    if (!isFinite(price) || price < 0 || price > 100000) return { error: 'El precio debe ser un número igual o mayor que 0.' };
    price = Math.round(price * 100) / 100;
  }
  if (url) {
    let u = null;
    try { u = new URL(url); } catch (e) { /* no válida */ }
    if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:') || /\s/.test(url)) return { error: 'El enlace no parece válido. Debe empezar por https://' };
  }
  return {
    value: {
      title, cat, start, end, time, price, city, loc, descr, url, icon,
      sold_out: body.soldOut === true, recommended: body.recommended === true, featured: body.featured === true
    }
  };
}

module.exports = {
  CATS, db, toPlan, json, configured, passwordOk, isAdmin, setSession, clearSession,
  sameOriginWrite, requireAdmin, clientIp, clean, validDate
};
