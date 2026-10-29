// POST { id, size, mode, board } -> a one-use game ticket. A score only counts if it comes with the ticket of the game that made it.
const crypto = require('crypto');
const { redis, ID_RE, SIZES, MODES, BOARDS, boardOf, sizeOf, modeOf, send, guard, limited, ipKey } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { id } = req.body || {};
    const size = sizeOf(req.body), mode = modeOf(req.body), board = boardOf(req.body);
    if (typeof id !== 'string' || !ID_RE.test(id)) return send(res, 400, { error: 'bad_id' });
    if (!SIZES.includes(size)) return send(res, 400, { error: 'bad_size' });
    if (!MODES.includes(mode)) return send(res, 400, { error: 'bad_mode' });
    if (!BOARDS.includes(board)) return send(res, 400, { error: 'bad_board' });
    if (await limited('rl:start:' + id, 80, 3600) || await limited('rl:startip:' + ipKey(req), 200, 3600)) return send(res, 429, { error: 'slow_down' });
    const token = crypto.randomBytes(18).toString('base64url');
    await redis.hset('tok:' + token, { id, size, mode, board, t0: Date.now(), max: 0 });
    await redis.expire('tok:' + token, 60 * 60 * 24 * 9);   // long enough for a weekly run
    send(res, 200, { token });
  } catch (e) {
    send(res, 500, { error: 'server' });
  }
};
