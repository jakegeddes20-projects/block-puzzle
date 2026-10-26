// POST { id? } -> today's top 10 (names and scores only, never ids) plus the caller's own rank
const { redis, today, ID_RE, send, guard } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { id } = req.body || {};
    const key = 'day:' + today();
    const flat = await redis.zrange(key, 0, 9, { rev: true, withScores: true });   // [member, score, member, score, ...]
    const ids = [], scores = [];
    for (let i = 0; i < flat.length; i += 2) { ids.push(String(flat[i])); scores.push(Number(flat[i + 1])); }
    const names = ids.length ? (await redis.hmget('players', ...ids)) || {} : {};
    const rows = ids.map((pid, i) => ({ rank: i + 1, name: names[pid] || 'Player', score: scores[i], me: pid === id }));

    let you = null;
    if (typeof id === 'string' && ID_RE.test(id)) {
      const [rank, score] = await Promise.all([redis.zrevrank(key, id), redis.zscore(key, id)]);
      if (rank !== null && score !== null) you = { rank: rank + 1, score: Number(score) };
    }
    send(res, 200, { day: today(), rows, you });
  } catch (e) {
    send(res, 500, { error: 'server' });
  }
};
