// result.js — the score / breakdown screen. Rendered in-place by take.js after
// an attempt is scored (not a route). resultData carries everything it needs:
//   { quizId, creator, score, total, tier, breakdown }
// where breakdown = [{ text, options, yourPick, correctPick, right }] — the
// options/answers arrive only NOW, in the scored response, never before.

import { esc, toast } from '../main.js';
import { launchConfetti } from '../confetti.js';

export function render(app, resultData) {
  const { quizId, creator, score, total, tier, breakdown } = resultData;

  // Share bits — the viral loop: brag about your score, drag your friends back in.
  const quizUrl = location.origin + '/q/' + quizId;
  const shareText = 'I scored ' + score + '/' + total + ' — ' + tier + " on " + creator + "'s quiz! Think you know them better? 🎯 ";

  const bd = breakdown.map((b) => {
    const cls = b.right ? 'right' : 'wrong';
    const mark = b.right ? '✅' : '❌';
    const you = '<span class="pill you">You: ' + esc(b.options[b.yourPick]) + '</span>';
    const real = b.right ? '' : ' <span class="pill real">' + esc(creator) + ': ' + esc(b.options[b.correctPick]) + '</span>';
    return '<div class="brow ' + cls + '"><div class="bq"><span class="bmark">' + mark + '</span><span>' + esc(b.text) + '</span></div>' +
      '<div class="bans">' + you + real + '</div></div>';
  }).join('');

  app.innerHTML =
    '<div class="card center result">' +
    '<span class="eyebrow">results are in 🎊</span>' +
    '<div class="scorebig">' + score + '<span>/' + total + '</span></div>' +
    '<div class="charm"><span class="badge">' + esc(tier) + '</span></div>' +
    '<p class="sub result-sub">Here\'s how you did on knowing <span class="name-chip">' + esc(creator) + '</span> 👇</p>' +
    '<div class="breakdown">' + bd + '</div>' +
    '<button class="btn" id="share">Share my score 📲</button>' +
    '<div class="btn-row">' +
    '<button class="btn alt small" id="board">Leaderboard 🏆</button>' +
    '<button class="btn mint small" id="own">Make Your Own 🎉</button>' +
    '</div></div>';
  document.getElementById('board').onclick = () => { location.hash = '#/q/' + quizId + '/board'; };
  document.getElementById('own').onclick = () => { location.hash = '#/create'; };

  const shareBtn = document.getElementById('share');
  if (shareBtn) shareBtn.onclick = shareScore;

  // ---- share plumbing -----------------------------------------------------

  // Draw a polished square score card offscreen, resolve with a PNG blob.
  function buildScoreCard() {
    return new Promise((resolve, reject) => {
      try {
        const S = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        // diagonal brand gradient, corner to corner
        const grad = ctx.createLinearGradient(0, 0, S, S);
        grad.addColorStop(0, '#8a7bf0');
        grad.addColorStop(0.34, '#5b8fe6');
        grad.addColorStop(0.7, '#2fbecb');
        grad.addColorStop(1, '#4fd0a6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, S, S);

        const cx = S / 2;
        const font = (size) => "700 " + size + "px Poppins, 'Segoe UI', system-ui, -apple-system, sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // eyebrow — letter-spaced, up top
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = font(34);
        drawSpaced(ctx, 'HOW WELL YOU KNOW ME', cx, 150, 6);

        // big score with a soft shadow
        ctx.save();
        ctx.shadowColor = 'rgba(20,30,60,0.35)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = '#ffffff';
        ctx.font = font(360);
        ctx.fillText(score + '/' + total, cx, 460);
        ctx.restore();

        // tier pill — white rounded rect, dark ink text
        ctx.font = font(48);
        const tierTxt = tier;
        const tw = ctx.measureText(tierTxt).width;
        const padX = 54;
        const pillW = Math.min(tw + padX * 2, S - 80);
        const pillH = 104;
        const pillX = cx - pillW / 2;
        const pillY = 700;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, pillX, pillY, pillW, pillH, 52);
        ctx.fill();
        ctx.fillStyle = '#22314f';
        ctx.fillText(tierTxt, cx, pillY + pillH / 2 + 2);

        // "on {creator}'s quiz" — guard against long names
        ctx.fillStyle = '#ffffff';
        let cSize = 52;
        ctx.font = font(cSize);
        let line = 'on ' + creator + "'s quiz";
        while (ctx.measureText(line).width > 900 && cSize > 30) {
          cSize -= 2;
          ctx.font = font(cSize);
        }
        if (ctx.measureText(line).width > 900) {
          // still too wide — truncate the name with an ellipsis
          let name = creator;
          while (name.length > 1 && ctx.measureText('on ' + name + "…'s quiz").width > 900) {
            name = name.slice(0, -1);
          }
          line = 'on ' + name + "…'s quiz";
        }
        ctx.fillText(line, cx, 910);

        // footer branding
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = font(40);
        ctx.fillText('knowsme.fun', cx, 1010);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('toBlob returned null'));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    });
  }

  // letter-spaced text (measureText per char so the block stays centered)
  function drawSpaced(ctx, text, x, y, spacing) {
    const chars = text.split('');
    let total = 0;
    for (const ch of chars) total += ctx.measureText(ch).width + spacing;
    total -= spacing;
    let cur = x - total / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (const ch of chars) {
      ctx.fillText(ch, cur, y);
      cur += ctx.measureText(ch).width + spacing;
    }
    ctx.textAlign = prevAlign;
  }

  // rounded rectangle path — use native roundRect when available
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      try {
        ctx.roundRect(x, y, w, h, r);
        return;
      } catch (e) { /* fall through to manual path */ }
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // image-first share with graceful fallbacks
  async function shareScore() {
    const url = quizUrl;
    try {
      const blob = await buildScoreCard();
      const file = new File([blob], 'my-score.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText + url });
        return;
      }
      // no file share (desktop / unsupported): hand them the card as a download
      downloadBlob(blob, 'my-score.png');
    } catch (e) { /* canvas/share failed — fall through to text */ }
    if (navigator.share) {
      try { await navigator.share({ title: 'How Well You Know Me', text: shareText, url }); return; } catch (e) {}
    }
    // final fallback: copy a brag message to clipboard
    copyShare(shareText + url);
  }

  function downloadBlob(blob, name) {
    try {
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      toast('Saved your score card 📸 — share it!');
    } catch (e) { /* if even download fails, nothing left to do */ }
  }

  function copyShare(text) {
    const done = () => toast('Copied your score — paste to brag 🎯');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text, done));
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    } catch (e) { /* clipboard genuinely unavailable */ }
  }

  if (score >= total * 0.5) launchConfetti();
  else if (score >= 1) launchConfetti(0.5);
}
