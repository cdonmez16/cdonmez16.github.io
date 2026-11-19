/* Hero vector animation: breathing contour lines (a landscape) and a
   drifting network of experiment sites that reacts to the cursor.
   Pure canvas, no libraries. Pauses when off-screen; static if the
   visitor prefers reduced motion. */
(function () {
  'use strict';
  var canvas = document.querySelector('.hero__canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1, nodes = [], pulses = [], t = 0, running = true, raf = 0;
  var mouse = { x: -9999, y: -9999, active: false };
  var COLORS = { mint: '156,203,185', ochre: '224,164,88', line: '127,184,164' };

  function resize() {
    var rect = hero.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    var count = Math.max(28, Math.min(95, Math.round((W * H) / 15000)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      var site = Math.random() < 0.28;
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: site ? 2.6 + Math.random() * 1.8 : 1.2 + Math.random() * 1.2,
        site: site, phase: Math.random() * Math.PI * 2
      });
    }
    pulses = [];
  }

  function contourSet(cx, cy, rings, step, amp, speed, alpha) {
    for (var k = 1; k <= rings; k++) {
      var base = k * step;
      ctx.beginPath();
      for (var s = 0; s <= 140; s++) {
        var th = (s / 140) * Math.PI * 2;
        var r = base * (1 +
          amp * Math.sin(3 * th + t * 0.35 * speed + k * 0.45) +
          amp * 0.6 * Math.sin(5 * th - t * 0.22 * speed + k * 0.9) +
          amp * 0.35 * Math.cos(2 * th + t * 0.15 * speed));
        var x = cx + Math.cos(th) * r * 1.25, y = cy + Math.sin(th) * r;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      var a = alpha * (1 - k / (rings + 2));
      ctx.strokeStyle = 'rgba(' + COLORS.line + ',' + a.toFixed(3) + ')';
      ctx.lineWidth = k % 4 === 0 ? 1.3 : 0.8;
      ctx.stroke();
    }
  }

  function terrain() {
    for (var i = 0; i < 6; i++) {
      var y0 = H * (0.78 + i * 0.045);
      ctx.beginPath();
      for (var x = 0; x <= W; x += 8) {
        var y = y0 +
          Math.sin(x * 0.004 + t * 0.25 + i * 0.7) * 16 +
          Math.sin(x * 0.011 - t * 0.18 + i) * 7;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(' + COLORS.line + ',' + (0.16 - i * 0.018).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function network() {
    var maxD = Math.min(150, W / 8), maxD2 = maxD * maxD, i, j, a, b, dx, dy, d2;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      // cursor attraction
      if (mouse.active) {
        dx = mouse.x - a.x; dy = mouse.y - a.y; d2 = dx * dx + dy * dy;
        if (d2 < 32000) { a.vx += dx * 0.000035; a.vy += dy * 0.000035; }
      }
      a.vx *= 0.992; a.vy *= 0.992;
      a.vx += (Math.random() - 0.5) * 0.008; a.vy += (Math.random() - 0.5) * 0.008;
      a.x += a.vx; a.y += a.vy;
      if (a.x < -20) a.x = W + 20; if (a.x > W + 20) a.x = -20;
      if (a.y < -20) a.y = H + 20; if (a.y > H + 20) a.y = -20;
    }
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
        if (d2 < maxD2) {
          var o = (1 - d2 / maxD2) * 0.22;
          ctx.strokeStyle = 'rgba(' + COLORS.mint + ',' + o.toFixed(3) + ')';
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (!reduce && pulses.length < 14 && Math.random() < 0.0009) pulses.push({ a: a, b: b, p: 0 });
        }
      }
    }
    // cursor links
    if (mouse.active) {
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i]; dx = mouse.x - a.x; dy = mouse.y - a.y; d2 = dx * dx + dy * dy;
        if (d2 < 40000) {
          ctx.strokeStyle = 'rgba(' + COLORS.ochre + ',' + ((1 - d2 / 40000) * 0.45).toFixed(3) + ')';
          ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(a.x, a.y); ctx.stroke();
        }
      }
    }
    // pulses travelling along links
    for (i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i]; p.p += 0.012;
      if (p.p >= 1) { pulses.splice(i, 1); continue; }
      var px = p.a.x + (p.b.x - p.a.x) * p.p, py = p.a.y + (p.b.y - p.a.y) * p.p;
      ctx.fillStyle = 'rgba(' + COLORS.ochre + ',' + (Math.sin(p.p * Math.PI) * 0.9).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // nodes
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      var near = 0;
      if (mouse.active) { dx = mouse.x - a.x; dy = mouse.y - a.y; near = Math.max(0, 1 - (dx * dx + dy * dy) / 40000); }
      var col = a.site ? COLORS.ochre : COLORS.mint;
      if (a.site) { // breathing halo on experiment sites
        var halo = a.r * (2.4 + Math.sin(t * 1.4 + a.phase) * 0.8 + near * 2);
        ctx.strokeStyle = 'rgba(' + col + ',' + (0.25 + near * 0.4).toFixed(3) + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(a.x, a.y, halo, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(' + col + ',' + (a.site ? 0.9 : 0.55 + near * 0.4).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r + near * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    var s = Math.min(W, 1400) / 1400;
    contourSet(W * 0.76, H * 0.42, 11, 34 * Math.max(s, 0.55), 0.07, 1, 0.42);
    contourSet(W * 0.08, H * 0.92, 7, 30 * Math.max(s, 0.55), 0.09, 0.8, 0.30);
    terrain();
    network();
    t += 0.016;
    if (running && !reduce) raf = requestAnimationFrame(frame);
  }

  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  hero.addEventListener('pointerleave', function () { mouse.active = false; });

  var resizeTimer, lastW = 0, lastH = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var r = hero.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 2) return;
      lastW = r.width; lastH = r.height;
      resize(); if (reduce) frame();
    }, 150);
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);
  else window.addEventListener('resize', onResize);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; if (!reduce) raf = requestAnimationFrame(frame); }
      if (!vis) { running = false; cancelAnimationFrame(raf); }
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; if (!reduce) raf = requestAnimationFrame(frame); }
  });

  resize();
  frame();
})();
