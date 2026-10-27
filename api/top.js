// POST { id? } -> today's top 10 (names and scores only, never ids) plus the caller's own rank
const { redis, today, ID_RE, SIZES, MODES, BOARDS, boardOf, boardKey, weekId, sizeOf, modeOf, dayKey, send, guard, limited, ipKey } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { id } = req.body || {};
    const size = sizeOf(req.body);
    if (!SIZES.includes(size)) return send(res, 400, { error: 'bad_size' });
    const mode = modeOf(req.body);
    if (!MODES.includes(mode)) return send(res, 400, { error: 'bad_mode' });
    const board = boardOf(req.body);
    if (!BOARDS.includes(board)) return send(res, 400, { error: 'bad_board' });
    if (await limited('rl:top:' + ipKey(req), 90, 60)) return send(res, 429, { error: 'slow_down' });
    const key = boardKey(board, size, mode);
    const flat = await redis.zrange(key, 0, 29, { rev: true, withScores: true });   // [member, score, member, score, ...]
    const hidden = new Set((await redis.smembers('hidden')) || []);   // players that several others reported
    const ids = [], scores = [];
    for (let i = 0; i < flat.length && ids.length < 10; i += 2) {
      const pid = String(flat[i]);
      if (hidden.has(pid) && pid !== id) continue;
      ids.push(pid); scores.push(Number(flat[i + 1]));
    }
    const names = ids.length ? (await redis.hmget('players', ...ids)) || {} : {};
    const rows = ids.map((pid, i) => ({ rank: i + 1, name: names[pid] || 'Player', score: scores[i], me: pid === id }));

    let you = null;
    if (typeof id === 'string' && ID_RE.test(id)) {
      const [rank, score] = await Promise.all([redis.zrevrank(key, id), redis.zscore(key, id)]);
      if (rank !== null && score !== null) you = { rank: rank + 1, score: Number(score) };
    }
    send(res, 200, { day: today(), period: board === 'weekly' ? weekId() : today(), rows, you });
  } catch (e) {
    send(res, 500, { error: 'server' });
  }
};
