// POST { id, score } -> records today's best score for a player who has claimed a name
const { redis, ID_RE, MAX_SCORE, SIZES, sizeOf, dayKey, send, guard } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { id, score } = req.body || {};
    const size = sizeOf(req.body);
    if (!SIZES.includes(size)) return send(res, 400, { error: 'bad_size' });
    if (typeof id !== 'string' || !ID_RE.test(id)) return send(res, 400, { error: 'bad_id' });
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return send(res, 400, { error: 'bad_score' });
    if (!(await redis.hget('players', id))) return send(res, 403, { error: 'no_name' });

    const key = dayKey(size);
    await redis.zadd(key, { gt: true }, { score, member: id });   // gt: only ever raises the player's score
    await redis.expire(key, 60 * 60 * 24 * 3);
    const rank = await redis.zrevrank(key, id);
    send(res, 200, { rank: rank === null ? null : rank + 1 });
  } catch (e) {
    send(res, 500, { error: 'server' });
  }
};
