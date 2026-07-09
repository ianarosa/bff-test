// GET /api/quiz/:id/leaderboard — creatorName + attempts sorted score desc
// (earliest first as tie-break), each { friendName, score, total, tier }.

function json(obj, status = 200) {
  return Response.json(obj, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ params, env }) {
  try {
    const id = params.id;
    const quiz = await env.DB.prepare('SELECT creator_name FROM quizzes WHERE id = ?')
      .bind(id)
      .first();
    if (!quiz) return json({ error: 'Quiz not found' }, 404);

    const { results } = await env.DB.prepare(
      'SELECT friend_name, score, total, tier FROM attempts WHERE quiz_id = ? ORDER BY score DESC, created_at ASC, id ASC'
    )
      .bind(id)
      .all();

    // One row per friend (best score kept): rows arrive best-first, so keep only
    // the first row seen per normalized name (earliest attempt on ties).
    const seen = new Set();
    const attempts = (results || [])
      .filter((r) => {
        const key = String(r.friend_name).trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((r) => ({
        friendName: r.friend_name,
        score: r.score,
        total: r.total,
        tier: r.tier,
      }));

    return json({ creatorName: quiz.creator_name, attempts });
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
}
