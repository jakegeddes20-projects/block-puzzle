// POST { id, name } -> report a leaderboard name. Five different reporters hide that player from the boards.
const { redis, ID_RE, NAME_RE, send, guard, limited } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { id, name } = req.body || {};
    if (typeof id !== 'string' || !ID_RE.test(id)) return send(res, 400, { error: 'bad_id' });
    if (typeof name !== 'string' || !NAME_RE.test(name)) return send(res, 400, { error: 'bad_name' });
    if (await limited('rl:report:' + id, 10, 86400)) return send(res, 429, { error: 'slow_down' });
    const target = await redis.get('name:' + name.toLowerCase());
    if (!target) return send(res, 404, { error: 'not_found' });
    if (target === id) return send(res, 400, { error: 'self' });
    const added = await redis.sadd('reporters:' + target, id);
    if (added) {
      await redis.lpush('reports', JSON.stringify({ target, name, by: id, at: new Date().toISOString() }));
      await redis.ltrim('reports', 0, 499);
    }
    if ((await redis.scard('reporters:' + target)) >= 5) await redis.sadd('hidden', target);
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 500, { error: 'server' });
  }
};
