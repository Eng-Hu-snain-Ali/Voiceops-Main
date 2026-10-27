/* ===== VoiceOps marketing site — shared JS (zero deps) ===== */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Mobile nav toggle ---- */
  function initNav() {
    var toggle = document.querySelector('.navtoggle');
    var links = document.querySelector('.navlinks');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  /* ---- Scroll reveal ---- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---- Constellation canvas (ported from HeroBackground.jsx) ---- */
  function initConstellation() {
    var canvas = document.getElementById('constellation');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var colors = ['#86d519', '#b9e01b', '#d8e81a'];
    var link = { r: 134, g: 213, b: 25 };
    var linkDistance = 132, speed = 0.35, density = 0.00012;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], raf = 0;
    var mouse = { x: -9999, y: -9999 };

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(30, Math.min(120, Math.floor(w * h * density)));
      pts = new Array(count).fill(0).map(function () {
        return {
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
          c: colors[(Math.random() * colors.length) | 0], r: 1 + Math.random() * 1.8
        };
      });
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      var i, j, p, a, b, d2, f;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        var dx = p.x - mouse.x, dy = p.y - mouse.y; d2 = dx * dx + dy * dy;
        if (d2 < 14400) { f = (1 - Math.sqrt(d2) / 120) * 0.6; p.x += dx * 0.02 * f; p.y += dy * 0.02 * f; }
      }
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          a = pts[i]; b = pts[j];
          var dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < linkDistance) {
            ctx.strokeStyle = 'rgba(' + link.r + ',' + link.g + ',' + link.b + ',' + ((1 - dist / linkDistance) * 0.5) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    document.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });
    window.addEventListener('blur', function () { mouse.x = -9999; mouse.y = -9999; });
    if (reduce) { frame(); cancelAnimationFrame(raf); } else { raf = requestAnimationFrame(frame); }
  }

  function boot() { initNav(); initReveal(); initConstellation(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
