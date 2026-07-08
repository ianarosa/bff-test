// GET /api/quiz/:id — public projection of a quiz: creatorName, total, and
// questions WITHOUT any `answer` field. The answer key never leaves D1 here.

function json(obj, status = 200) {
  return Response.json(obj, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ params, env }) {
  try {
    const id = params.id;
    const row = await env.DB.prepare('SELECT creator_name, questions FROM quizzes WHERE id = ?')
      .bind(id)
      .first();
    if (!row) return json({ error: 'Quiz not found' }, 404);

    let questions;
    try {
      questions = JSON.parse(row.questions);
    } catch (e) {
      return json({ error: 'Server error' }, 500);
    }

    // Strip answers — client-safe projection only.
    const publicQuestions = questions.map((q) => ({ text: q.text, options: q.options.slice() }));

    return json({
      creatorName: row.creator_name,
      total: questions.length,
      questions: publicQuestions,
    });
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
}
