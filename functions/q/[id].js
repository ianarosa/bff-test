// GET /q/:id — server-rendered social-preview shim for shared quiz links.
// Scrapers (WhatsApp/iMessage/Facebook/Twitter) can't run the client-side hash
// router, so this real-path route fetches the static app shell, injects
// per-quiz Open Graph / Twitter meta tags ("How well do you know <Name>?"), and
// boots the SPA into the quiz's hash route so humans still get the normal app.
// No answer key is exposed here — only the creator's display name is read.

const ORIGIN = 'https://knowsme.fun';
const OG_IMAGE = `${ORIGIN}/og.png`;

// Escape a string for safe use inside an HTML attribute (double-quoted) or text.
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Minimal fallback shell if the static /index.html subrequest fails. Mirrors the
// real app shell's asset links so the SPA still boots.
function fallbackShell() {
  return [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    '<title>How Well You Know Me 🎯</title>',
    '<link rel="stylesheet" href="/css/fonts.css" />',
    '<link rel="stylesheet" href="/css/base.css" />',
    '<link rel="stylesheet" href="/css/create.css" />',
    '<link rel="stylesheet" href="/css/take.css" />',
    '<link rel="stylesheet" href="/css/result.css" />',
    '<link rel="stylesheet" href="/css/leaderboard.css" />',
    '<div class="wrap"><div id="app"></div></div>',
    '<script type="module" src="/js/main.js"></script>',
  ].join('\n');
}

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const id = params.id;

  // Only trust simple alphanumeric ids for the boot script. Anything else is
  // treated as unknown → generic preview, no SPA-boot injection.
  const safeId = /^[A-Za-z0-9]+$/.test(id || '') ? id : null;

  // 1. Look up the creator's display name (same table/column/binding as the API).
  let creator = null;
  if (safeId) {
    try {
      const row = await env.DB.prepare('SELECT creator_name FROM quizzes WHERE id = ?')
        .bind(safeId)
        .first();
      if (row && row.creator_name) creator = row.creator_name;
    } catch (e) {
      creator = null;
    }
  }

  // 2. Fetch the static app shell (/index.html is not routed by a function → no recursion).
  let html;
  try {
    const shellRes = await fetch(new URL('/index.html', request.url));
    if (!shellRes.ok) throw new Error(`shell ${shellRes.status}`);
    html = await shellRes.text();
  } catch (e) {
    html = fallbackShell();
  }

  // 3. Build personalized meta values.
  let title;
  let desc;
  if (creator) {
    const name = escapeHtml(creator);
    title = `How well do you know ${name}? 🎯`;
    desc = `Take ${name}'s quiz and prove you're their real one — can you top the leaderboard?`;
  } else {
    title = 'How Well You Know Me 🎯';
    desc = 'Take this quiz and see how well you really know them.';
  }
  const url = escapeHtml(`${ORIGIN}/q/${safeId || ''}`);
  const image = escapeHtml(OG_IMAGE);

  // Strip any pre-existing social tags so the personalized ones are canonical.
  // Defensive: fine if these match nothing.
  html = html
    .replace(/[ \t]*<meta[^>]*property=["']og:[^>]*>\s*/gi, '')
    .replace(/[ \t]*<meta[^>]*name=["']twitter:[^>]*>\s*/gi, '')
    .replace(/[ \t]*<meta[^>]*name=["']description["'][^>]*>\s*/gi, '');

  // 4. Inject personalized meta at the very top, before the first <meta charset.
  const metaBlock =
    `<meta property="og:type" content="website" />\n` +
    `<meta property="og:site_name" content="How Well You Know Me" />\n` +
    `<meta property="og:title" content="${title}" />\n` +
    `<meta property="og:description" content="${desc}" />\n` +
    `<meta property="og:url" content="${url}" />\n` +
    `<meta property="og:image" content="${image}" />\n` +
    `<meta property="og:image:width" content="1200" />\n` +
    `<meta property="og:image:height" content="630" />\n` +
    `<meta name="twitter:card" content="summary_large_image" />\n` +
    `<meta name="twitter:title" content="${title}" />\n` +
    `<meta name="twitter:description" content="${desc}" />\n` +
    `<meta name="twitter:image" content="${image}" />\n`;

  if (/<meta\s+charset/i.test(html)) {
    html = html.replace(/<meta\s+charset/i, `${metaBlock}<meta charset`);
  } else {
    html = metaBlock + html;
  }

  // 5. Boot the SPA into this quiz's hash route (only for a validated id).
  if (safeId) {
    const bootScript =
      `<script>try{history.replaceState(null,'','/#/q/${safeId}');}catch(e){location.hash='#/q/${safeId}';}</script>\n`;
    const mainTag = '<script type="module" src="/js/main.js">';
    if (html.includes(mainTag)) {
      html = html.replace(mainTag, bootScript + mainTag);
    } else {
      html = html + bootScript;
    }
  }

  // 6. Return the personalized shell.
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
