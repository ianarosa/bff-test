// POST /api/quiz/:id/check — check ONE guess for a single question and reveal
// that question's correct option. The full answer key is still never sent up
// front (GET /api/quiz/:id has no answers); the correct pick is only returned
// here, after the friend commits a guess. Returns { right, correctPick }.

function json(obj, status = 200) {
  return Response.json(obj, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ params, request, env }) {
  try {
    const id = params.id;
    const row = await env.DB.prepare('SELECT questions FROM quizzes WHERE id = ?')
      .bind(id)
      .first();
    if (!row) return json({ error: 'Quiz not found' }, 404);

    let questions;
    try {
      questions = JSON.parse(row.questions);
    } catch (e) {
      return json({ error: 'Server error' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Invalid request body' }, 400);
    }
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request body' }, 400);
    }

    const index = body.index;
    const guess = body.guess;
    if (!Number.isInteger(index) || index < 0 || index >= questions.length) {
      return json({ error: 'Invalid selection' }, 400);
    }
    if (!Number.isInteger(guess) || guess < 0 || guess >= questions[index].options.length) {
      return json({ error: 'Invalid selection' }, 400);
    }

    return json({ right: guess === questions[index].answer, correctPick: questions[index].answer }, 200);
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
}
