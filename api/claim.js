// POST { id, name } -> reserves a username for this player id (case-insensitive, first come first served)
const { redis, ID_RE, NAME_RE, badName, send, guard } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { id, name } = req.body || {};
    if (typeof id !== 'string' || !ID_RE.test(id)) return send(res, 400, { error: 'bad_id' });
    const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!NAME_RE.test(clean) || badName(clean)) return send(res, 400, { error: 'bad_name' });

    const key = 'name:' + clean.toLowerCase();
    const old = await redis.hget('players', id);
    const got = await redis.set(key, id, { nx: true });
    if (got !== 'OK' && (await redis.get(key)) !== id) return send(res, 409, { error: 'taken' });

    // free the previous name if this player owned it
    if (old && old.toLowerCase() !== clean.toLowerCase()) {
      const oldKey = 'name:' + old.toLowerCase();
      if ((await redis.get(oldKey)) === id) await redis.del(oldKey);
    }
    await redis.hset('players', { [id]: clean });
    send(res, 200, { name: clean });
  } catch (e) {
    send(res, 500, { error: 'server' });
  }
};
