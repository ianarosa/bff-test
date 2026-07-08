// confetti.js — the result-screen confetti burst. Pure canvas, emoji-flavored.
// launchConfetti(scale) drops ~70*scale emoji from the top of the #confetti
// canvas. Respects prefers-reduced-motion.

export function launchConfetti(scale) {
  const canvas = document.getElementById('confetti');
  if (!canvas) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  const W = (canvas.width = window.innerWidth);
  const H = (canvas.height = window.innerHeight);
  const emojis = ['💖', '✨', '🎉', '⭐', '🩷', '💛', '🌈', '🫶'];
  const count = Math.floor(70 * (scale || 1));
  const parts = [];
  for (let i = 0; i < count; i++) {
    parts.push({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.4,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.2,
      size: 18 + Math.random() * 18,
      e: emojis[(Math.random() * emojis.length) | 0],
    });
  }
  const start = performance.now();
  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (let j = 0; j < parts.length; j++) {
      const p = parts[j];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rot += p.vr;
      if (p.y < H + 40) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.font = p.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.max(0, 1 - t / 3200);
      ctx.fillText(p.e, 0, 0);
      ctx.restore();
    }
    if (alive && t < 3400) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}
