import React, { useEffect, useRef } from 'react';

/**
 * HeroBackground — a lightweight animated "constellation" network for the VoiceOps hero.
 * Zero dependencies (React + canvas 2D only), so it drops straight into a native.builder
 * custom-code / React block. Honors prefers-reduced-motion and cleans up on unmount.
 *
 * Usage inside the hero section:
 *   <div style={{ position: 'relative', minHeight: '72vh', overflow: 'hidden' }}>
 *     <HeroBackground />
 *     <div style={{ position: 'relative', zIndex: 1 }}> ...hero title / CTA... </div>
 *   </div>
 */
export default function HeroBackground({
  colors = ['#86d519', '#b9e01b', '#d8e81a'],
  density = 0.00012,          // particles per pixel of hero area
  linkDistance = 132,
  speed = 0.35,
  background = 'linear-gradient(135deg,#02140f 0%,#06231a 55%,#0a2a1e 100%)',
  className,
  style,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const link = hexToRgb(colors[0]);

    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pts = [];
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(28, Math.min(120, Math.floor(w * h * density)));
      pts = new Array(count).fill(0).map(() => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
        c: colors[(Math.random() * colors.length) | 0], r: 1 + Math.random() * 1.8,
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) { const f = (1 - Math.sqrt(d2) / 120) * 0.6; p.x += dx * 0.02 * f; p.y += dy * 0.02 * f; }
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < linkDistance) {
            ctx.strokeStyle = `rgba(${link.r},${link.g},${link.b},${(1 - dist / linkDistance) * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    resize();
    const onResize = () => resize();
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    if (reduce) frame(), cancelAnimationFrame(rafRef.current); // one static frame, no loop
    else rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [colors, density, linkDistance, speed]);

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, background, overflow: 'hidden', ...style }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 60% at 50% 0%, transparent 40%, rgba(2,20,15,.55) 100%)' }} />
    </div>
  );
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#86d519');
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 134, g: 213, b: 25 };
}
