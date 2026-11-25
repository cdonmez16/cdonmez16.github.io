/* Builds every page of the site from content/site.json and wires up the
   interactions (hover-enlarge spotlight, scroll reveal, publication search
   and filters, lightbox, navigation). Edit content in /admin, not here. */
(function () {
  'use strict';

  var DRAFT_KEY = 'cd-site-draft';
  var PAGE = document.body.getAttribute('data-page') || 'home';
  var DATA = null, COUNTS = {};

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
  function tokens(s) {
    return String(s == null ? '' : s).replace(/\{(\w+)\}/g, function (m, k) { return COUNTS[k] != null ? COUNTS[k] : m; });
  }
  function inline(s) { // escaped text with **bold**, *italic* and [label](url)
    return esc(tokens(s))
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
        return '<a ' + linkAttrs(url.replace(/&amp;/g, '&')) + '>' + label + '</a>';
      });
  }
  function paras(s) {
    return String(s || '').split(/\n\s*\n/).filter(function (p) { return p.trim(); })
      .map(function (p) { return '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function networkItems(hero) {
    return Array.isArray(hero.networkItems) ? hero.networkItems : (Array.isArray(hero.networks) ? hero.networks : []).map(function (name) {
      return { name: String(name), logo: '', url: '', relationship: '', visible: true };
    });
  }
  function list(a) { return Array.isArray(a) ? a : []; }
  function has(s) { return s != null && String(s).trim() !== ''; }
  function themeLabel(id) { var t = list(DATA.themes).filter(function (x) { return x.id === id; })[0]; return t ? t.label : id; }

  /* ---------- building blocks ---------- */
  function button(b, extra) {
    if (!b || !has(b.label)) return '';
    var style = b.style === 'primary' ? 'primary' : 'ghost';
    return '<a class="btn btn--' + style + (extra ? ' ' + extra : '') + '" ' + linkAttrs(b.url) + '>' + esc(tokens(b.label)) + '</a>';
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
    return { label: 'LINK', cls: '' };
  }
  function fileLinks(arr) {
    return list(arr).filter(function (f) { return f && has(f.file); }).map(function (f) {
      var k = fileKind(f.file);
      var label = has(f.label) ? f.label : String(f.file).split('/').pop();
      return '<a class="file" ' + linkAttrs(f.file) + '><span class="file__kind ' + (k.cls ? 'file__kind--' + k.cls : '') + '">' +
        esc(k.label) + '</span>' + esc(label) + '</a>';
    }).join('');
  }
  function files(arr) { var h = fileLinks(arr); return h ? '<div class="files">' + h + '</div>' : ''; }
  function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function placeholderSvg(seedText, dark) {
    var h = hash(seedText), cx = 20 + (h % 60), cy = 25 + ((h >> 3) % 40), rings = '';
    var stroke = dark ? '#3E6E5F' : '#A9C6B9', bg = dark ? '#15302A' : '#E8EFEA', dot = dark ? '#E0A458' : '#0F5C4C';
    for (var k = 1; k <= 10; k++) {
      var rx = k * (8 + (h % 4)), ry = k * (5 + ((h >> 2) % 3));
      rings += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + ((h % 40) - 20) + ' ' + cx + ' ' + cy + ')"/>';
    }
    var dots = '';
    for (var d = 0; d < 5; d++) dots += '<circle cx="' + ((h >> d) % 100) + '" cy="' + ((h >> (d + 4)) % 60 + 10) + '" r="1"/>';
    return '<svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="100" height="70" fill="' + bg + '"/><g fill="none" stroke="' + stroke + '" stroke-width=".35">' + rings + '</g>' +
      '<g fill="' + dot + '">' + dots + '</g></svg>';
  }
  function media(image, cls, alt, seed, opts) {
    opts = opts || {};
    if (has(image)) return '<div class="media ' + cls + '"><img src="' + esc(safeUrl(image)) + '" alt="' + esc(alt || '') + '" loading="lazy"></div>';
    if (opts.noPlaceholder) return '';
    return '<div class="media media--placeholder ' + cls + '">' + placeholderSvg(seed || alt, opts.dark) + '</div>';
  }
  function head(sec, extraRight) {
    var right = (extraRight || '') + buttons(sec.buttons);
    return '<div class="section__head"><div class="section__titles">' +
      (has(sec.eyebrow) ? '<p class="eyebrow">' + esc(sec.eyebrow) + '</p>' : '') +
      (has(sec.title) ? '<h2 class="section__title" id="h-' + esc(sec.id) + '">' + esc(sec.title) + '</h2>' : '') +
      (has(sec.intro) ? '<p class="section__intro">' + inline(sec.intro) + '</p>' : '') +
      '</div>' + (right ? '<div class="section__actions">' + right + '</div>' : '') + '</div><div class="section__rule"></div>';
  }
  function sectionExtras(sec) {
    var out = '';
    if (has(sec.image) && sec.type !== 'about') out += '<figure class="figure" style="margin-top:28px"><img src="' + esc(safeUrl(sec.image)) + '" alt="' + esc(sec.title) + '" loading="lazy"></figure>';
    var f = files(sec.attachments);
    if (f && sec.type !== 'about') out += '<div style="margin-top:22px">' + f + '</div>';
    return out;
  }
  function wrapSection(sec, inner, cls) {
    return '<section class="section reveal' + (cls ? ' ' + cls : '') + '" id="' + esc(sec.id) + '"' + (has(sec.title) ? ' aria-labelledby="h-' + esc(sec.id) + '"' : '') + '><div class="wrap">' +
      inner + sectionExtras(sec) + '</div></section>';
  }

  /* ---------- line icons ---------- */
  var ICONS = {
    soil: '<path d="M3 15h18M3 19h18"/><path d="M12 15V9"/><path d="M12 11c-3 0-5-2-5-5 3 0 5 2 5 5z"/><path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5z"/>',
    agriculture: '<path d="M12 21V8"/><path d="M12 12c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4z"/><path d="M12 12c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/><path d="M12 8c-1.6 0-2.5-1-2.5-2.5C11 5.5 12 6.5 12 8z"/><path d="M12 8c1.6 0 2.5-1 2.5-2.5C13 5.5 12 6.5 12 8z"/><path d="M5 21h14"/>',
    assessment: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/><path d="M8 13l2-3 2 2 2-4"/>',
    planning: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    people: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5"/><path d="M11 20c0-3 2.5-5 5-5s5 2 5 5"/>',
    data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3 3 7 3s7-1.3 7-3v-6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.globe) + '</svg>';
  }

  /* ---------- publications ---------- */
  var GROUPS = [
    { id: 'review', label: 'Under review & in preparation', test: function (p) { return p.status && p.status !== 'Published' && p.category !== 'Conference contribution'; } },
    { id: 'article', label: 'Peer-reviewed publications', test: function (p) { return p.category === 'Peer-reviewed publication' && (!p.status || p.status === 'Published'); } },
    { id: 'chapter', label: 'Book chapters', test: function (p) { return p.category === 'Book chapter' && (!p.status || p.status === 'Published'); } },
    { id: 'conference', label: 'Conference contributions', test: function (p) { return p.category === 'Conference contribution'; } }
  ];
  function groupOf(p) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].test(p)) return GROUPS[i].id; return 'article'; }
  function authorsHtml(a) {
    return esc(a).replace(/(D[oö]nmez,?\s*C\.?(?=[\s,]|$))/g, '<strong>$1</strong>');
  }
  function doiUrl(d) { return !has(d) ? '' : (isExternal(d) ? d : 'https://doi.org/' + String(d).replace(/^doi:\s*/i, '').trim()); }
  function pubHtml(p, opts) {
    opts = opts || {};
    var doi = doiUrl(p.doi), link = doi || (has(p.url) ? p.url : '');
    var title = esc(p.title);
    if (link) title = '<a class="pub__link" ' + linkAttrs(link) + '>' + title + '</a>';
    var venue = [has(p.venue) ? '<em>' + esc(p.venue) + '</em>' : '', has(p.details) ? esc(p.details) : ''].filter(Boolean).join(', ');
    var badges = '';
    if (p.status && p.status !== 'Published') badges += '<span class="badge badge--status">' + esc(p.status) + '</span>';
    if (opts.showType && p.category === 'Book chapter') badges += '<span class="badge">Book chapter</span>';
    if (opts.showType && p.category === 'Conference contribution') badges += '<span class="badge">Conference</span>';
    var themes = list(p.themes).map(function (t) { return '<span class="tag tag--small">' + esc(themeLabel(t)) + '</span>'; }).join('');
    var actions = (doi ? '<a class="file" ' + linkAttrs(doi) + '><span class="file__kind">DOI</span>' + esc(String(p.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, '')) + '</a>' : '') +
      (has(p.url) && p.url !== doi ? '<a class="file" ' + linkAttrs(p.url) + '><span class="file__kind">WEB</span>Link</a>' : '') + fileLinks(p.attachments);
    return '<article class="lift pub' + (opts.compact ? ' pub--compact' : '') + '">' +
      '<div class="pub__year">' + esc(p.year || '—') + '</div>' +
      (has(p.image) ? media(p.image, 'pub__thumb', p.title) : '') +
      '<div class="pub__main">' + (badges ? '<div class="pub__badges">' + badges + '</div>' : '') +
      '<h3 class="pub__title lift__title">' + title + '</h3>' +
      '<div class="pub__authors">' + authorsHtml(p.authors) + (p.corresponding ? ' <span class="corr" title="Corresponding author" aria-label="corresponding author">✉</span>' : '') + '</div>' +
      (venue ? '<div class="pub__venue">' + venue + '</div>' : '') +
      (!opts.compact && themes ? '<div class="tags">' + themes + '</div>' : '') +
      (actions ? '<div class="files">' + actions + '</div>' : '') +
      '</div></article>';
  }

  /* ---------- section renderers ---------- */
  var R = {};
  R.about = function (sec) {
    var side = '<div class="about__side">' + (has(sec.eyebrow) ? '<p class="eyebrow">' + esc(sec.eyebrow) + '</p>' : '') +
      '<h2 class="section__title" id="h-' + esc(sec.id) + '">' + esc(sec.title) + '</h2>' +
      (has(sec.image) ? '<figure class="figure"><img src="' + esc(safeUrl(sec.image)) + '" alt="' + esc(sec.title) + '" loading="lazy"></figure>' : '') + '</div>';
    var body = '<div class="about__body">' + paras(sec.body) + buttons(sec.buttons) + files(sec.attachments) + '</div>';
    return '<section class="section reveal" id="' + esc(sec.id) + '"><div class="wrap"><div class="about">' + side + body + '</div></div></section>';
  };
  R.achievements = function (sec) {
    var items = list(sec.items).map(function (it) {
      return '<article class="lift stat reveal">' + (has(it.image) ? media(it.image, 'stat__media', it.label) : '') +
        '<div class="stat__value' + (/^[\d.,+%\s]+$/.test(tokens(it.value)) ? '' : ' stat__value--word') + '">' + esc(tokens(it.value)) + '</div><div class="stat__label lift__title">' + esc(tokens(it.label)) + '</div>' +
        (has(it.text) ? '<p>' + inline(it.text) + '</p>' : '') + files(it.attachments) + buttons(it.buttons, 'btn--small') + '</article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="stats">' + items + '</div>', 'section--tight');
  };
  R.areas = function (sec) {
    var items = list(sec.items).map(function (it, i) {
      var n = list(DATA.publications).filter(function (p) { return list(p.themes).indexOf(it.theme) >= 0; }).length;
      var methods = list(it.methods).map(function (m) { return '<span class="tag">' + esc(m) + '</span>'; }).join('');
      return '<article class="lift area reveal">' + (has(it.image) ? media(it.image, 'area__media', it.title) : '') +
        '<div class="area__body"><div class="area__num">0' + (i + 1) + '</div><h3 class="lift__title">' + esc(it.title) + '</h3>' +
        '<p>' + inline(it.text) + '</p>' + (methods ? '<div class="tags">' + methods + '</div>' : '') + files(it.attachments) + buttons(it.buttons, 'btn--small') +
        (it.theme && n ? '<a class="area__more" href="publications.html?theme=' + encodeURIComponent(it.theme) + '">' + n + ' publications & contributions <span aria-hidden="true">→</span></a>' : '') +
        '</div></article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="areas">' + items + '</div>');
  };
  R.features = function (sec) {
    var items = list(sec.items).map(function (it) {
      var big = !!it.featured;
      var tags = list(it.tags).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
      return '<article class="lift feature reveal' + (big ? ' feature--big dark' : '') + '">' +
        media(it.image, 'feature__media', it.title, it.title, { dark: big }) +
        '<div class="feature__body">' + (has(it.category) ? '<div class="kicker">' + esc(it.category) + '</div>' : '') +
        '<h3 class="lift__title">' + esc(it.title) + '</h3>' +
        (has(it.text) ? '<p>' + inline(it.text) + '</p>' : '') +
        '<dl class="roles">' +
        (has(it.myRole) ? '<div class="roles__row roles__row--mine"><dt>My contribution</dt><dd>' + inline(it.myRole) + '</dd></div>' : '') +
        (has(it.context) ? '<div class="roles__row"><dt>Project context</dt><dd>' + inline(it.context) + '</dd></div>' : '') +
        '</dl>' + (tags ? '<div class="tags">' + tags + '</div>' : '') + files(it.attachments) + buttons(it.buttons, big ? '' : 'btn--small') +
        '</div></article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="features">' + items + '</div>');
  };
  R.practice = function (sec) {
    var items = list(sec.items).map(function (it) {
      return '<article class="lift practice__item reveal">' + (has(it.image) ? media(it.image, 'practice__media', it.title) : '<div class="practice__icon">' + icon(it.icon) + '</div>') +
        '<h3 class="lift__title">' + esc(it.title) + '</h3><p>' + inline(it.text) + '</p>' +
        (has(it.evidence) ? '<div class="practice__evidence"><span>Related work</span>' + inline(it.evidence) + '</div>' : '') +
        files(it.attachments) + buttons(it.buttons, 'btn--small') + '</article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="practice">' + items + '</div>', 'section--practice');
  };
  R.selectedPubs = function (sec) {
    var limit = parseInt(sec.limit, 10) || 8;
    var pubs = list(DATA.publications).filter(function (p) { return p.featured; }).slice(0, limit);
    return wrapSection(sec, head(sec) + '<div class="pubs pubs--grid">' + pubs.map(function (p) { return pubHtml(p, { compact: true }); }).join('') + '</div>');
  };
  R.publications = function (sec) {
    var pubs = list(DATA.publications);
    var years = [];
    pubs.forEach(function (p) { if (has(p.year) && years.indexOf(p.year) < 0) years.push(p.year); });
    years.sort(function (a, b) { return b - a; });
    var counts = {}; pubs.forEach(function (p) { var g = groupOf(p); counts[g] = (counts[g] || 0) + 1; });
    var controls = '<div class="pubtools">' +
      '<label class="pubtools__search"><span class="sr-only">Search publications</span>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>' +
      '<input type="search" id="pubSearch" placeholder="' + esc(sec.searchPlaceholder || 'Search…') + '"></label>' +
      '<label class="pubtools__select"><span>Type</span><select id="pubType"><option value="">All types</option>' +
      GROUPS.map(function (g) { return '<option value="' + g.id + '">' + esc(g.label) + ' (' + (counts[g.id] || 0) + ')</option>'; }).join('') + '</select></label>' +
      '<label class="pubtools__select"><span>Year</span><select id="pubYear"><option value="">All years</option>' +
      years.map(function (y) { return '<option>' + esc(y) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="filters" role="group" aria-label="Filter by research area"><button type="button" class="chip is-on" data-theme="" aria-pressed="true">All research areas</button>' +
      list(DATA.themes).map(function (t) { return '<button type="button" class="chip" data-theme="' + esc(t.id) + '" aria-pressed="false">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
      '<div class="pubtools__meta"><span id="pubCount" aria-live="polite"></span>' + (has(sec.note) ? '<span>' + esc(sec.note) + '</span>' : '') + '</div>';
    return wrapSection(sec, head(sec) + controls + '<div id="pubList"></div>', 'section--pubs');
  };
  R.cards = function (sec) {
    if (PAGE === 'leadership') {
      var cards=list(sec.items).map(function(it,i){
        var text=String(it.text||'').trim(), points=text.split(/\n+/).map(function(p){return p.replace(/^\s*[-•]\s*/, '').trim();}).filter(Boolean);
        return '<article class="lift project reveal">'+media(it.image,'project__media',it.title)+'<div class="project__body"><div class="project__meta">Selected contribution · '+String(i+1).padStart(2,'0')+'</div><h3 class="lift__title">'+esc(it.title)+'</h3><ul class="lead-points">'+points.map(function(p){return '<li>'+inline(p)+'</li>';}).join('')+'</ul>'+files(it.attachments)+buttons(it.buttons,'btn--small')+'</div></article>';
      }).join('');
      return wrapSection(sec,head(sec)+'<div class="projects lead-grid">'+cards+'</div>');
    }

    var items = list(sec.items).map(function (it, i) {
      var n = i + 1 < 10 ? '0' + (i + 1) : String(i + 1);
      return '<article class="lift card reveal">' +
        (has(it.image) ? media(it.image, 'card__media', it.title) : '<div class="card__num">' + n + '</div>') +
        '<h3 class="lift__title">' + esc(it.title) + '</h3><p>' + inline(it.text) + '</p>' +
        files(it.attachments) + buttons(it.buttons, 'btn--small') + '</article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="grid">' + items + '</div>');
  };
  R.timeline = function (sec) {
    var items = list(sec.items).map(function (it) {
      return '<li class="tl__item reveal"><div class="tl__period">' + esc(it.period) + '</div><div class="tl__body lift">' +
        (has(it.image) ? media(it.image, 'tl__media', it.title) : '') +
        '<h3 class="lift__title">' + esc(it.title) + '</h3><div class="tl__org">' + esc(it.organization) + '</div>' +
        (has(it.text) ? '<p>' + inline(it.text) + '</p>' : '') + files(it.attachments) + '</div></li>';
    }).join('');
    return wrapSection(sec, head(sec) + '<ol class="tl">' + items + '</ol>');
  };
  R.tools = function (sec) {
    if(PAGE==='tools' && !sec._grouped){ var groups=[]; list(sec.items).forEach(function(it){var k=it.category||'Research platforms';if(groups.indexOf(k)<0)groups.push(k);}); if(groups.length) return groups.map(function(k,i){return R.tools(Object.assign({},sec,{_grouped:true,id:i?sec.id+'-'+i:sec.id,title:i===0?(sec.title||k):k,eyebrow: i===0?sec.eyebrow:'',intro:i===0?sec.intro:'',items:list(sec.items).filter(function(it){return (it.category||'Research platforms')===k;})}));}).join(''); } 
    var items = list(sec.items).map(function (it) {
      var featured = !!it.featured;
      var tags = list(it.tags).length ? '<div class="tags">' + list(it.tags).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' : '';
      return '<article class="lift tool reveal' + (featured ? ' tool--featured dark' : '') + '">' +
        media(it.image, 'tool__media', it.name, it.name, { dark: featured }) +
        '<div class="tool__body">' + (has(it.status) ? '<div class="kicker">' + esc(it.status) + '</div>' : '') + (has(it.role) ? '<div class="kicker">' + esc(it.role) + '</div>' : '') +
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
        (has(it.role) ? '<dl class="roles"><div class="roles__row roles__row--mine"><dt>My role</dt><dd>' + inline(it.role) + '</dd></div></dl>' : '') +
        files(it.attachments) + buttons(it.buttons, 'btn--small') + '</div></article>';
    }).join('');
    return wrapSection(sec, head(sec) + '<div class="projects">' + items + '</div>');
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
        '<div class="talk__main"><div class="talk__meta">' + esc(it.date) + '</div><h3 class="talk__title lift__title">' + esc(it.title) + '</h3>' +
        '<div class="talk__meta">' + esc([it.event, it.place].filter(has).join(' · ')) + '</div>' +
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
  R.text = function (sec) { return wrapSection(sec, head(sec) + '<div class="prose">' + paras(sec.body) + '</div>'); };

  /* ---------- publication list behaviour ---------- */
  function wirePublications() {
    var listEl = document.getElementById('pubList'); if (!listEl) return;
    var q = document.getElementById('pubSearch'), ty = document.getElementById('pubType'), yr = document.getElementById('pubYear');
    var theme = '';
    var params = new URLSearchParams(location.search);
    if (params.get('theme')) theme = params.get('theme');
    if (params.get('type')) ty.value = params.get('type');
    if (params.get('q')) q.value = params.get('q');
    var chips = document.querySelectorAll('.section--pubs .chip');
    function syncChips() { chips.forEach(function (c) { var on = c.getAttribute('data-theme') === theme; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i'); }
    function draw() {
      var all = list(DATA.publications), words = norm(q.value).split(/\s+/).filter(Boolean);
      var shown = all.filter(function (p) {
        if (theme && list(p.themes).indexOf(theme) < 0) return false;
        if (ty.value && groupOf(p) !== ty.value) return false;
        if (yr.value && String(p.year) !== yr.value) return false;
        if (words.length) { var hay = norm([p.title, p.authors, p.venue, p.details, p.year, p.doi].join(' ')); for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false; }
        return true;
      });
      document.getElementById('pubCount').textContent = 'Showing ' + shown.length + ' of ' + all.length;
      var html = GROUPS.map(function (g) {
        var items = shown.filter(function (p) { return groupOf(p) === g.id; })
          .sort(function (a, b) { return (parseInt(b.year, 10) || 9999) - (parseInt(a.year, 10) || 9999); });
        if (!items.length) return '';
        return '<div class="pubgroup"><h3 class="pubgroup__title">' + esc(g.label) + ' <span>' + items.length + '</span></h3><div class="pubs">' +
          items.map(function (p) { return pubHtml(p, { showType: false }); }).join('') + '</div></div>';
      }).join('');
      listEl.innerHTML = html || '<p class="empty">No publications match these filters.</p>';
      wireLift(listEl);
    }
    var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(draw, 120); });
    ty.addEventListener('change', draw); yr.addEventListener('change', draw);
    chips.forEach(function (c) { c.addEventListener('click', function () { theme = c.getAttribute('data-theme'); syncChips(); draw(); }); });
    syncChips(); draw();
  }

  /* ---------- top-level render ---------- */
  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function computeCounts(pubs) {
    var c = { articles: 0, chapters: 0, conferences: 0, underreview: 0, total: 0, firstyear: '', firstconference: '' };
    var first = 9999, firstConf = 9999;
    pubs.forEach(function (p) {
      var g = groupOf(p), y = parseInt(p.year, 10);
      if (g === 'article') c.articles++; else if (g === 'chapter') c.chapters++; else if (g === 'conference') c.conferences++; else c.underreview++;
      if (y && y < first) first = y;
      if (g === 'conference' && y && y < firstConf) firstConf = y;
    });
    c.total = c.articles + c.chapters + c.conferences;
    c.firstyear = first < 9999 ? first : ''; c.firstconference = firstConf < 9999 ? firstConf : '';
    return c;
  }
  function currentFile() { var f = location.pathname.split('/').pop(); return f || 'index.html'; }

  function render(data) {
    DATA = data;
    data.publications = list(data.publications);
    COUNTS = computeCounts(data.publications);
    var site = data.site || {}, hero = data.hero || {};
    var pageInfo = (data.pages || {})[PAGE] || {};
    if (PAGE !== 'home' && has(pageInfo.title)) document.title = pageInfo.title + ' — ' + (site.name || '');
    else document.title = site.title || site.name || document.title;
    var md = document.querySelector('meta[name="description"]');
    if (md && site.description) md.setAttribute('content', site.description);

    document.querySelectorAll('[data-bind]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-bind'));
      el.textContent = v == null ? '' : v;
      if (!has(v) && el.tagName === 'P') el.hidden = true;
    });
    var slot = function (name) { return document.querySelector('[data-slot="' + name + '"]'); };
    var setSlot = function (name, html) { var el = slot(name); if (el) el.innerHTML = html; };

    if (PAGE === 'home') {
      setSlot('hero.buttons', list(hero.buttons).map(function (b) { return button(b); }).join(''));
      setSlot('hero.links', list(hero.links).filter(function (l) { return has(l.label); })
        .map(function (l) { return '<a ' + linkAttrs(l.url) + '>' + esc(l.label) + '</a>'; }).join(''));
      var initials = String(site.name || '').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2);
      setSlot('hero.portrait', '<div class="portrait-wrap"><div class="portrait">' + (has(hero.portrait)
        ? '<img src="' + esc(safeUrl(hero.portrait)) + '" alt="Portrait of ' + esc(site.name) + '" fetchpriority="high">'
        : '<svg viewBox="0 0 320 400" style="width:100%;height:100%" role="img" aria-label="Portrait placeholder"><rect width="320" height="400" fill="#1C3A30"/>' +
          '<g fill="none" stroke="#3E6E5F">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (k) { return '<ellipse cx="160" cy="200" rx="' + (k * 22) + '" ry="' + (k * 28) + '"/>'; }).join('') + '</g>' +
          '<text x="160" y="214" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="56" fill="#9CCBB9">' + esc(initials) + '</text></svg>') +
        '</div>' + (has(hero.portraitCaption) ? '<figcaption class="portrait__caption">' + esc(hero.portraitCaption) + '</figcaption>' : '') + '</div>');
      var nets = networkItems(hero).filter(function(n) { return n && n.visible !== false && has(n.name); });
      var networkHeading = hero.networksHeading == null ? 'Connecting research across institutions and borders' : hero.networksHeading;
      setSlot('hero.networks', nets.length ? '<div class="networks__heading"><span class="networks__label">' + esc(hero.networksLabel || 'Research networks & initiatives') + '</span>' + (has(networkHeading) ? '<h2>' + esc(networkHeading) + '</h2>' : '') + '</div><div class="networks__list">' +
        nets.map(function(n) {
          var name = esc(n.name), tip = esc(n.relationship || n.name);
          var content = (has(n.logo) ? '<img src="' + esc(safeUrl(n.logo)) + '" alt="' + name + '" loading="lazy" decoding="async">' : '') + '<span class="networks__name"' + (has(n.logo) ? ' hidden' : '') + '>' + name + '</span>';
          return has(n.url) ? '<a class="networks__item" title="' + tip + '" ' + linkAttrs(n.url) + '>' + content + '</a>' : '<div class="networks__item" title="' + tip + '">' + content + '</div>';
        }).join('') + '</div>' : '');
      var networkSlot = slot('hero.networks');
      if (networkSlot) {
        networkSlot.parentElement.hidden = !nets.length;
        networkSlot.querySelectorAll('img').forEach(function(img) {
          function fallback() { img.hidden = true; img.nextElementSibling.hidden = false; }
          img.addEventListener('error', fallback);
          if (img.complete && !img.naturalWidth) fallback();
        });
      }
    } else {
      var ph = slot('pagehead');
      if (ph) ph.innerHTML = '<div class="pagehead__text">' + (has(pageInfo.eyebrow) ? '<p class="eyebrow eyebrow--light">' + esc(pageInfo.eyebrow) + '</p>' : '') +
        '<h1 id="page-title" class="pagehead__title">' + esc(pageInfo.title || pageInfo.label || '') + '</h1>' +
        (has(pageInfo.intro) ? '<p class="pagehead__intro">' + inline(pageInfo.intro) + '</p>' : '') + '</div>' +
        (has(pageInfo.image) ? '<figure class="pagehead__media"><img src="' + esc(safeUrl(pageInfo.image)) + '" alt=""></figure>' : '');
    }

    var sections = list(data.sections).filter(function (s) { return s && s.visible !== false && (s.page || 'home') === PAGE; });
    document.getElementById('main').innerHTML = sections.map(function (s) { return (R[s.type] || R.cards)(s); }).join('') ||
      '<div class="wrap" style="padding:80px 0"><p class="empty">This page has no visible sections yet.</p></div>';

    if (PAGE === 'tools') {
      var toolNav = slot('tools.buttons');
      if (toolNav) {
        var toolButtons = Array.isArray(pageInfo.buttons) ? pageInfo.buttons : [{"label": "Research infrastructures ↓", "url": "#infrastructure", "style": "ghost"}, {"label": "Geospatial modelling ↓", "url": "#geospatial-workflows", "style": "ghost"}, {"label": "Software & technologies ↓", "url": "#software-technologies", "style": "ghost"}];
        toolNav.innerHTML = toolButtons.filter(function(b) { return b && (!String(b.url || '').startsWith('#') || document.getElementById(String(b.url).slice(1))); }).map(function(b) { return button(b); }).join('');
        toolNav.parentElement.hidden = !toolNav.innerHTML;
      }
    }

    // contact band (every page)
    var c = data.contact || {}, cEl = document.getElementById('contact');
    if (cEl) {
      var email = has(c.email) ? '<a class="contact__email" href="mailto:' + esc(String(c.email).replace(/[\[\]\s]/g, '')) + '">' + esc(c.email) + '</a>' : '';
      cEl.innerHTML = '<svg class="contours" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#7FB8A4">' +
        [1, 2, 3, 4, 5, 6, 7].map(function (k) { return '<ellipse cx="980" cy="120" rx="' + (k * 70) + '" ry="' + (k * 42) + '" transform="rotate(-12 980 120)"/>'; }).join('') + '</g></svg>' +
        '<div class="wrap contact__inner"><div class="contact__main">' +
        (has(c.eyebrow) ? '<p class="eyebrow eyebrow--light">' + esc(c.eyebrow) + '</p>' : '') + '<h2 class="contact__title">' + esc(c.title) + '</h2>' +
        (has(c.text) ? '<p class="contact__text">' + inline(c.text) + '</p>' : '') + '</div>' +
        '<div class="contact__side">' + email + (has(c.address) ? '<div>' + inline(c.address) + '</div>' : '') + buttons(c.buttons) + files(c.attachments) + '</div></div>';
    }

    // navigation
    var here = currentFile();
    document.getElementById('nav').innerHTML = list(data.nav).filter(function (n) { return has(n.label); }).map(function (n) {
      var url = String(n.url || ''), file = url.split('#')[0].split('?')[0];
      var active = file && file === here && url.indexOf('#') < 0;
      return '<a ' + linkAttrs(url) + ' class="' + (n.style === 'primary' ? 'nav__cv' : '') + (active ? ' is-active' : '') + '"' + (active ? ' aria-current="page"' : '') + '>' + esc(n.label) + '</a>';
    }).join('');

    wire();
    wirePublications();
  }

  /* ---------- interactions ---------- */
  function wireLift(root) {
    (root || document).querySelectorAll('.lift').forEach(function (el) {
      if (el._lift) return; el._lift = true;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    (root || document).querySelectorAll('.media img, .figure img').forEach(function (img) {
      if (img._lb) return; img._lb = true;
      img.addEventListener('click', function (e) { e.preventDefault(); openLb(img); });
    });
  }
  var lb = document.querySelector('.lightbox'), lbImg = lb.querySelector('img');
  function openLb(img) { lbImg.src = img.src; lbImg.alt = img.alt; lb.hidden = false; lb.querySelector('button').focus(); }
  function closeLb() { lb.hidden = true; lbImg.src = ''; }
  lb.addEventListener('click', function (e) { if (e.target !== lbImg) closeLb(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  function wire() {
    wireLift(document);
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
      }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
      reveals.forEach(function (el, i) { el.style.transitionDelay = (el.classList.contains('section') ? 0 : (i % 4) * 60) + 'ms'; io.observe(el); });
    } else reveals.forEach(function (el) { el.classList.add('is-visible'); });

    var toggle = document.querySelector('.menu-toggle'), nav = document.getElementById('nav');
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
    });
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 60); }
  }

  var topbar = document.querySelector('.topbar');
  function onScroll() { topbar.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- load content ---------- */
  function showError(msg) { document.getElementById('main').innerHTML = '<div class="wrap" style="padding:80px 0"><p>' + esc(msg) + '</p></div>'; }
  var params = new URLSearchParams(location.search);
  if (params.get('preview') === 'draft') {
    try {
      var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft) {
        render(draft);
        var b = document.createElement('div'); b.className = 'draft-banner'; b.textContent = 'Preview of unpublished changes';
        document.body.appendChild(b);
        // keep preview mode when moving between pages
        document.querySelectorAll('a[href$=".html"], a[href*=".html#"], a[href*=".html?"]').forEach(function (a) {
          var h = a.getAttribute('href'); if (/^https?:/i.test(h)) return;
          var parts = h.split('#'); a.setAttribute('href', parts[0] + (parts[0].indexOf('?') >= 0 ? '&' : '?') + 'preview=draft' + (parts[1] ? '#' + parts[1] : ''));
        });
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
