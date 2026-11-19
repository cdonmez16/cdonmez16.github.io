/* Renders the whole site from content/site.json and wires up the
   interactions (hover-enlarge spotlight, scroll reveal, filters,
   lightbox, navigation). Edit content in /admin, not here. */
(function () {
  'use strict';

  var DRAFT_KEY = 'cd-site-draft';

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '#';
    if (/^(javascript|data|vbscript):/i.test(u)) return '#';
    return u;
  }
  function isExternal(u) { return /^https?:\/\//i.test(u); }
  function linkAttrs(u) {
    var url = safeUrl(u);
    var ext = isExternal(url) || /\.(pdf|pptx?|docx?|xlsx?|zip)$/i.test(url);
    return 'href="' + esc(url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '');
  }
  function inline(s) { // escaped text with **bold** and [label](url)
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
        return '<a ' + linkAttrs(url.replace(/&amp;/g, '&')) + '>' + label + '</a>';
      });
  }
  function paras(s) {
    return String(s || '').split(/\n\s*\n/).filter(function (p) { return p.trim(); })
      .map(function (p) { return '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function list(a) { return Array.isArray(a) ? a : []; }
  function has(s) { return s != null && String(s).trim() !== ''; }

  /* ---------- building blocks ---------- */
  function button(b, extra) {
    if (!b || !has(b.label)) return '';
    var style = b.style === 'primary' ? 'primary' : 'ghost';
    return '<a class="btn btn--' + style + (extra ? ' ' + extra : '') + '" ' + linkAttrs(b.url) + '>' + esc(b.label) + '</a>';
  }
  function buttons(arr, extra) {
    var html = list(arr).map(function (b) { return button(b, extra); }).join('');
    return html ? '<div class="btn-row">' + html + '</div>' : '';
  }
  function fileKind(path) {
    var m = String(path || '').toLowerCase().match(/\.([a-z0-9]+)(\?|#|$)/);
    var ext = m ? m[1] : '';
    if (ext === 'pdf') return { label: 'PDF', cls: 'pdf' };
    if (ext === 'ppt' || ext === 'pptx' || ext === 'key') return { label: ext.toUpperCase(), cls: 'ppt' };
    if (/^(png|jpe?g|gif|webp|svg|tiff?)$/.test(ext)) return { label: ext.toUpperCase(), cls: 'img' };
    return { label: ext ? ext.toUpperCase() : 'FILE', cls: '' };
  }
  function files(arr) {
    var html = list(arr).filter(function (f) { return f && has(f.file); }).map(function (f) {
      var k = fileKind(f.file);
      var label = has(f.label) ? f.label : String(f.file).split('/').pop();
      return '<a class="file" ' + linkAttrs(f.file) + '><span class="file__kind ' + (k.cls ? 'file__kind--' + k.cls : '') + '">' +
        esc(k.label) + '</span>' + esc(label) + '</a>';
    }).join('');
    return html ? '<div class="files">' + html + '</div>' : '';
  }
  function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function placeholderSvg(seedText, dark) {
    var h = hash(seedText), cx = 20 + (h % 60), cy = 25 + ((h >> 3) % 50), rings = '';
    var stroke = dark ? '#3E6E5F' : '#9CC3B4', bg = dark ? '#15302A' : '#E3EFEA', dot = dark ? '#E0A458' : '#0F5C4C';
    for (var k = 1; k <= 9; k++) {
      var rx = k * (9 + (h % 4)), ry = k * (6 + ((h >> 2) % 3));
      rings += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + ((h % 40) - 20) + ' ' + cx + ' ' + cy + ')"/>';
    }
    var dots = '';
    for (var d = 0; d < 6; d++) {
      var x = (h >> d) % 100, y = (h >> (d + 4)) % 60 + 10;
      dots += '<circle cx="' + x + '" cy="' + y + '" r="1.6"/>';
    }
    return '<svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="100" height="80" fill="' + bg + '"/><g fill="none" stroke="' + stroke + '" stroke-width=".5">' + rings + '</g>' +
      '<g fill="' + dot + '">' + dots + '</g></svg>';
  }
  function media(image, cls, alt, seed, opts) {
    opts = opts || {};
    if (has(image)) {
      return '<div class="media ' + cls + '"><img src="' + esc(safeUrl(image)) + '" alt="' + esc(alt || '') + '" loading="lazy"></div>';
    }
    if (opts.noPlaceholder) return '';
    return '<div class="media media--placeholder ' + cls + '">' + placeholderSvg(seed || alt, opts.dark) + '</div>';
  }
  function head(sec) {
    var right = buttons(sec.buttons);
    return '<div class="section__head"><div class="section__titles">' +
      (has(sec.eyebrow) ? '<p class="eyebrow">' + esc(sec.eyebrow) + '</p>' : '') +
      '<h2 class="section__title">' + esc(sec.title) + '</h2>' +
      (has(sec.intro) ? '<p class="section__intro">' + inline(sec.intro) + '</p>' : '') +
      '</div>' + right + '</div><div class="section__rule"></div>';
  }
  function sectionExtras(sec) {
    var out = '';
    if (has(sec.image) && sec.type !== 'about') out += '<figure class="figure" style="margin-top:28px"><img src="' + esc(safeUrl(sec.image)) + '" alt="' + esc(sec.title) + '" loading="lazy"></figure>';
    var f = files(sec.attachments);
    if (f && sec.type !== 'about') out += '<div style="margin-top:22px">' + f + '</div>';
    return out;
  }
  function wrapSection(sec, inner) {
    return '<section class="section reveal" id="' + esc(sec.id) + '" aria-labelledby="h-' + esc(sec.id) + '"><div class="wrap">' +
      inner.replace('<h2 class="section__title">', '<h2 class="section__title" id="h-' + esc(sec.id) + '">') +
      sectionExtras(sec) + '</div></section>';
  }

  /* ---------- section renderers ---------- */
  var R = {};
  R.about = function (sec) {
    var side = '<div class="about__side"><p class="eyebrow">' + esc(sec.eyebrow) + '</p>' +
      '<h2 class="section__title">' + esc(sec.title) + '</h2>' +
      (has(sec.image) ? '<figure class="figure"><img src="' + esc(safeUrl(sec.image)) + '" alt="' + esc(sec.title) + '" loading="lazy"></figure>' : '') +
      '</div>';
    var body = '<div class="about__body">' + paras(sec.body) + buttons(sec.buttons) + files(sec.attachments) + '</div>';
    return '<section class="section reveal" id="' + esc(sec.id) + '"><div class="wrap"><div class="about">' + side + body + '</div></div></section>';
  };
  R.cards = function (sec) {
    var items = list(sec.items).map(function (it, i) {
      var n = i + 1 < 10 ? '0' + (i + 1) : String(i + 1);
      return '<article class="lift card reveal">' +
        (has(it.image) ? media(it.image, 'card__media', it.title) : '<div class="card__num">' + n + '</div>') +
        '<h3 class="lift__title">' + esc(it.title) + '</h3><p>' + inline(it.text) + '</p>' +
        files(it.attachments) + buttons(it.buttons, 'btn--small') + '</article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="grid">' + items + '</div>');
  };
  R.tools = function (sec) {
    var items = list(sec.items).map(function (it) {
      var featured = !!it.featured;
      var tags = list(it.tags).length ? '<div class="tags">' + list(it.tags).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' : '';
      return '<article class="lift tool reveal' + (featured ? ' tool--featured dark' : '') + '">' +
        media(it.image, 'tool__media', it.name, it.name, { dark: featured }) +
        '<div class="tool__body">' + (has(it.role) ? '<div class="tool__role">' + esc(it.role) + '</div>' : '') +
        '<h3 class="lift__title">' + esc(it.name) + '</h3><p>' + inline(it.text) + '</p>' + tags +
        files(it.attachments) + buttons(it.buttons) + '</div></article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="tools">' + items + '</div>');
  };
  R.projects = function (sec) {
    var items = list(sec.items).map(function (it) {
      return '<article class="lift project reveal">' + media(it.image, 'project__media', it.title) +
        '<div class="project__body"><div class="project__meta"><span>' + esc(it.category) + '</span><span>' + esc(it.period) + '</span></div>' +
        '<h3 class="lift__title">' + esc(it.title) + '</h3><p>' + inline(it.text) + '</p>' +
        files(it.attachments) + buttons(it.buttons, 'btn--small') + '</div></article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="projects">' + items + '</div>');
  };
  R.publications = function (sec) {
    var items = list(sec.items);
    var types = [];
    items.forEach(function (p) { if (has(p.type) && types.indexOf(p.type) < 0) types.push(p.type); });
    var chips = types.length > 1 ? '<div class="filters" role="group" aria-label="Filter publications">' +
      '<button type="button" class="chip is-on" data-filter="*" aria-pressed="true">' + esc(sec.allLabel || 'All') + '</button>' +
      types.map(function (t) { return '<button type="button" class="chip" data-filter="' + esc(t) + '" aria-pressed="false">' + esc(t) + '</button>'; }).join('') +
      '</div>' : '';
    var rows = items.map(function (p) {
      var doi = has(p.doi) ? (isExternal(p.doi) ? p.doi : 'https://doi.org/' + String(p.doi).replace(/^doi:\s*/i, '')) : '';
      return '<article class="lift pub reveal" data-type="' + esc(p.type) + '">' +
        '<div class="pub__year">' + esc(p.year) + '</div>' +
        (has(p.image) ? media(p.image, 'pub__thumb', p.title) : '') +
        '<div class="pub__main"><div class="pub__title lift__title">' + esc(p.title) + '</div>' +
        '<div class="pub__meta">' + esc([p.authors, p.venue].filter(has).join(' · ')) + '</div>' +
        (has(p.summary) ? '<p class="pub__summary">' + inline(p.summary) + '</p>' : '') + '</div>' +
        '<div class="pub__side">' + (has(p.type) ? '<span class="tag">' + esc(p.type) + '</span>' : '') +
        (doi ? '<a class="file" ' + linkAttrs(doi) + '>' + esc(sec.doiLabel || 'DOI') + '</a>' : '') +
        files(p.attachments).replace(/^<div class="files">|<\/div>$/g, '') + '</div></article>';
    }).join('');
    var h = head(sec).replace('</div><div class="section__rule">', chips + '</div><div class="section__rule">');
    return wrapSection(sec, h + '<div class="pubs">' + rows + '</div>');
  };
  R.teaching = function (sec) {
    var items = list(sec.items).map(function (it) {
      return '<article class="lift course reveal">' + media(it.image, 'course__media', it.course) +
        '<div class="course__body">' + (has(it.level) ? '<span class="course__level">' + esc(it.level) + '</span>' : '') +
        '<h3 class="lift__title">' + esc(it.course) + '</h3>' +
        '<div class="course__where">' + esc([it.institution, it.period].filter(has).join(' · ')) + '</div>' +
        '<p>' + inline(it.text) + '</p>' + files(it.attachments) + buttons(it.buttons, 'btn--small') + '</div></article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="teach">' + items + '</div>');
  };
  R.talks = function (sec) {
    var items = list(sec.items).map(function (it) {
      return '<article class="lift talk reveal">' + media(it.image, 'talk__thumb', it.title) +
        '<div class="talk__main"><div class="talk__title lift__title">' + esc(it.title) + '</div>' +
        '<div class="talk__meta">' + esc([it.event, it.place, it.date].filter(has).join(' · ')) + '</div>' +
        files(it.attachments) + buttons(it.buttons, 'btn--small') + '</div></article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="talks">' + items + '</div>');
  };
  R.news = function (sec) {
    var items = list(sec.items).map(function (it) {
      return '<div class="news__item reveal">' + media(it.image, 'news__thumb', it.text, '', { noPlaceholder: true }) +
        '<div><div class="news__date">' + esc(it.date) + '</div><p class="news__text">' + inline(it.text) + '</p>' +
        files(it.attachments) + buttons(it.buttons, 'btn--small') + '</div></div>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="news">' + items + '</div>');
  };
  R.contact = function (sec) {
    var contours = '<svg class="contours" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#7FB8A4">' +
      [1, 2, 3, 4, 5, 6, 7].map(function (k) { return '<ellipse cx="980" cy="120" rx="' + (k * 70) + '" ry="' + (k * 42) + '" transform="rotate(-12 980 120)"/>'; }).join('') + '</g></svg>';
    var email = has(sec.email) ? '<a class="contact__email" href="mailto:' + esc(String(sec.email).replace(/[\[\]]/g, '')) + '">' + esc(sec.email) + '</a>' : '';
    return '<section class="contact dark" id="' + esc(sec.id) + '">' + contours + '<div class="wrap contact__inner">' +
      '<div style="display:flex;flex-direction:column;gap:16px;flex:999 1 520px">' +
      '<p class="eyebrow eyebrow--light">' + esc(sec.eyebrow) + '</p><h2 class="contact__title">' + esc(sec.title) + '</h2>' +
      (has(sec.image) ? '<figure class="figure" style="max-width:420px;border-color:#2E5547"><img src="' + esc(safeUrl(sec.image)) + '" alt="" loading="lazy"></figure>' : '') +
      '</div><div class="contact__side">' + email + (has(sec.address) ? '<div>' + inline(sec.address) + '</div>' : '') +
      buttons(sec.buttons) + files(sec.attachments) + '</div></div></section>';
  };

  /* ---------- top-level render ---------- */
  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }

  function render(data) {
    var site = data.site || {}, hero = data.hero || {};
    document.title = site.title || site.name || document.title;
    var md = document.querySelector('meta[name="description"]');
    if (md && site.description) md.setAttribute('content', site.description);

    document.querySelectorAll('[data-bind]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-bind'));
      el.textContent = v == null ? '' : v;
      if (!has(v) && el.tagName === 'P') el.hidden = true;
    });

    var slot = function (name) { return document.querySelector('[data-slot="' + name + '"]'); };
    slot('hero.buttons').innerHTML = list(hero.buttons).map(function (b) { return button(b); }).join('');
    slot('hero.links').innerHTML = list(hero.links).filter(function (l) { return has(l.label); })
      .map(function (l) { return '<a ' + linkAttrs(l.url) + '>' + esc(l.label) + '</a>'; }).join('');
    var initials = String(site.name || '').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2);
    slot('hero.portrait').innerHTML = '<div><div class="portrait">' + (has(hero.portrait)
      ? '<img src="' + esc(safeUrl(hero.portrait)) + '" alt="Portrait of ' + esc(site.name) + '">'
      : '<svg viewBox="0 0 320 400" style="width:100%;height:100%" role="img" aria-label="Portrait placeholder"><rect width="320" height="400" fill="#1C3A30"/>' +
        '<g fill="none" stroke="#3E6E5F">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (k) { return '<ellipse cx="160" cy="200" rx="' + (k * 22) + '" ry="' + (k * 28) + '"/>'; }).join('') + '</g>' +
        '<text x="160" y="214" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="56" fill="#9CCBB9">' + esc(initials) + '</text></svg>') +
      '</div>' + (has(hero.portraitCaption) ? '<figcaption class="portrait__caption">' + esc(hero.portraitCaption) + '</figcaption>' : '') + '</div>';
    var nets = list(hero.networks);
    slot('hero.networks').innerHTML = nets.length ? '<span class="networks__label">' + esc(hero.networksLabel) + '</span><div class="networks__list">' +
      nets.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') + '</div>' : '';
    if (!nets.length) slot('hero.networks').parentElement.hidden = true;

    var sections = list(data.sections).filter(function (s) { return s && s.visible !== false; });
    document.getElementById('main').innerHTML = sections.map(function (s) {
      var fn = R[s.type] || R.cards;
      return fn(s);
    }).join('');

    var nav = document.getElementById('nav');
    nav.innerHTML = sections.filter(function (s) { return has(s.nav); })
      .map(function (s) { return '<a href="#' + esc(s.id) + '">' + esc(s.nav) + '</a>'; }).join('') +
      (site.cvButton && has(site.cvButton.label) ? '<a class="nav__cv" ' + linkAttrs(site.cvButton.url) + '>' + esc(site.cvButton.label) + '</a>' : '');

    wire();
  }

  /* ---------- interactions ---------- */
  function wire() {
    // cursor spotlight + enlarge on cards
    document.querySelectorAll('.lift').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // reveal on scroll
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function (el, i) { el.style.transitionDelay = (el.classList.contains('section') ? 0 : (i % 4) * 70) + 'ms'; io.observe(el); });
    } else reveals.forEach(function (el) { el.classList.add('is-visible'); });

    // publication filter
    document.querySelectorAll('.filters').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        group.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-on', c === b); c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
        var f = b.getAttribute('data-filter');
        group.closest('section').querySelectorAll('.pub').forEach(function (p) {
          p.classList.toggle('is-hidden', f !== '*' && p.getAttribute('data-type') !== f);
        });
      });
    });

    // lightbox
    var lb = document.querySelector('.lightbox'), lbImg = lb.querySelector('img');
    document.querySelectorAll('.media img, .figure img').forEach(function (img) {
      img.addEventListener('click', function (e) {
        e.preventDefault(); lbImg.src = img.src; lbImg.alt = img.alt; lb.hidden = false; lb.querySelector('button').focus();
      });
    });
    function closeLb() { lb.hidden = true; lbImg.src = ''; }
    lb.addEventListener('click', function (e) { if (e.target !== lbImg) closeLb(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

    // active nav link
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    if ('IntersectionObserver' in window && links.length) {
      var navIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) navIo.observe(s); });
    }

    // mobile menu
    var toggle = document.querySelector('.menu-toggle'), nav = document.getElementById('nav');
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
    });
  }

  var topbar = document.querySelector('.topbar');
  function onScroll() { topbar.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- load content ---------- */
  function showError(msg) {
    document.getElementById('main').innerHTML = '<div class="wrap" style="padding:80px 0"><p>' + esc(msg) + '</p></div>';
  }
  var params = new URLSearchParams(location.search);
  if (params.get('preview') === 'draft') {
    try {
      var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft) {
        render(draft);
        var b = document.createElement('div'); b.className = 'draft-banner'; b.textContent = 'Preview of unpublished changes';
        document.body.appendChild(b);
        return;
      }
    } catch (e) { /* fall through to published content */ }
  }
  if (window.SITE_CONTENT) { render(window.SITE_CONTENT); return; }
  fetch('content/site.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () { showError('Content could not be loaded. If you opened this file directly from your computer, run it through GitHub Pages or a local web server instead.'); });
})();
