const { Redis } = require('@upstash/redis');

// The Upstash integration from the Vercel Marketplace sets one of these pairs.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const today = () => new Date().toISOString().slice(0, 10);   // UTC day, same as the game's daily seed
const ID_RE = /^[a-zA-Z0-9-]{16,64}$/;
const NAME_RE = /^[A-Za-z0-9 _-]{3,16}$/;
const SIZES = [6, 8, 10, 12];
const MAX_SCORE = 100000;   // sanity cap, there is no deeper anti-cheat yet
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'dick', 'cock', 'pussy', 'whore', 'slut'];
const badName = n => { const s = n.toLowerCase().replace(/[^a-z]/g, ''); return BLOCKED.some(w => s.includes(w)); };

// board size from the request body: missing means 8x8; anything else must be a known size
const sizeOf = body => (body && body.size !== undefined ? body.size : 8);
// 8x8 keeps the original key, so scores saved before board sizes existed stay valid
const MODES = ['classic', 'crazy'];
const BOARDS = ['daily', 'weekly'];
const boardOf = body => (body && body.board !== undefined ? body.board : 'daily');
// ISO week (Monday to Sunday, UTC), the same maths the game uses
function isoWeek(dstr) {
  const d = new Date(Date.parse(dstr + 'T00:00:00Z'));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const wk = 1 + Math.round(((d - week1) / 864e5 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
  return d.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
}
const weekId = () => isoWeek(today());
const modeOf = body => (body && body.mode !== undefined ? body.mode : 'classic');
// classic 8x8 keeps the original key; crazy boards get a 'c' in the key
const boardKey = (board, size, mode) => (board === 'weekly' ? 'week:' + weekId() + ':' + (mode === 'crazy' ? 'c:' : '') + size : dayKey(size, mode));
const dayKey = (size, mode) => 'day:' + (mode === 'crazy' ? 'c:' : '') + (size === 8 && mode !== 'crazy' ? '' : size + ':') + today();

function send(res, code, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json(body);
}
// shared guard: POST only, storage configured
function guard(req, res) {
  if (req.method !== 'POST') { send(res, 405, { error: 'method' }); return false; }
  if (!redis) { send(res, 503, { error: 'unavailable' }); return false; }
  return true;
}

module.exports = { redis, today, ID_RE, NAME_RE, MAX_SCORE, SIZES, MODES, BOARDS, boardOf, boardKey, weekId, sizeOf, modeOf, dayKey, badName, send, guard };
