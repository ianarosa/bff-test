// api.js — thin fetch wrappers around the server's quiz API. Every call resolves
// to { ok, status, data } so callers can branch on ok without try/catch.

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

// POST /api/quiz  { creatorName, questions:[{text,options,answer}] } -> { id }
export function createQuiz(creatorName, questions) {
  return request('POST', '/api/quiz', { creatorName, questions });
}

// GET /api/quiz/:id -> { creatorName, total, questions:[{text,options}] } (no answers)
export function getQuiz(id) {
  return request('GET', '/api/quiz/' + encodeURIComponent(id));
}

// POST /api/quiz/:id/attempt { friendName, guesses } -> { score, total, tier, breakdown }
export function submitAttempt(id, friendName, guesses) {
  return request('POST', '/api/quiz/' + encodeURIComponent(id) + '/attempt', { friendName, guesses });
}

// GET /api/quiz/:id/leaderboard -> { creatorName, attempts:[{friendName,score,total,tier}] }
export function getLeaderboard(id) {
  return request('GET', '/api/quiz/' + encodeURIComponent(id) + '/leaderboard');
}
