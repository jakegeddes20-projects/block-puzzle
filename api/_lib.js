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
const dayKey = size => (size === 8 ? 'day:' + today() : 'day:' + size + ':' + today());

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

module.exports = { redis, today, ID_RE, NAME_RE, MAX_SCORE, SIZES, sizeOf, dayKey, badName, send, guard };
