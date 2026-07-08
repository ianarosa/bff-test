// POST /api/quiz — create a quiz from a full definition, returns { id }.
// D1-backed twin of server.js's POST /api/quiz (file-store version). Same
// validation, same JSON shapes, same cheat-proof contract (answers stay in D1).

function json(obj, status = 200) {
  return Response.json(obj, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function cleanName(name, fallback) {
  if (typeof name !== 'string') return fallback;
  const t = name.trim().slice(0, 40);
  return t.length ? t : fallback;
}

// questions:[ { text:string, options:[string,...] (2+), answer:int in range } ]
function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1) return false;
  for (const q of questions) {
    if (!q || typeof q !== 'object') return false;
    if (typeof q.text !== 'string' || !q.text.trim()) return false;
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (!q.options.every((o) => typeof o === 'string' && o.length > 0)) return false;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return false;
  }
  return true;
}

function normalizeQuestions(questions) {
  return questions.map((q) => ({
    text: String(q.text).slice(0, 200),
    options: q.options.map((o) => String(o).slice(0, 120)),
    answer: q.answer | 0,
  }));
}

// url-safe short id, 6 chars, no ambiguous glyphs — same alphabet as lib/store.js.
function makeId() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < 6; i++) id += alphabet[bytes[i] % alphabet.length];
  return id;
}

export async function onRequestPost({ request, env }) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Invalid request body' }, 400);
    }
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request body' }, 400);
    }

    const creatorName = cleanName(body.creatorName, '');
    if (!creatorName) return json({ error: 'Tell us your name first' }, 400);
    if (!validateQuestions(body.questions)) {
      return json({ error: 'Add valid questions (2+ options, a picked answer each)' }, 400);
    }

    const questions = normalizeQuestions(body.questions);
    const questionsJson = JSON.stringify(questions);
    const createdAt = Date.now();

    // Allocate a unique id, retrying on the (extremely unlikely) collision.
    let id = null;
    for (let guard = 0; guard < 20; guard++) {
      const candidate = makeId();
      const existing = await env.DB.prepare('SELECT id FROM quizzes WHERE id = ?')
        .bind(candidate)
        .first();
      if (!existing) {
        id = candidate;
        break;
      }
    }
    if (!id) return json({ error: 'Could not allocate quiz id' }, 500);

    await env.DB.prepare(
      'INSERT INTO quizzes (id, creator_name, questions, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(id, creatorName, questionsJson, createdAt)
      .run();

    return json({ id }, 200);
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
}
