/* Content Studio — a browser-only admin panel for a GitHub Pages site.
   It reads and writes content/site.json and uploads files to
   assets/uploads through the GitHub REST API, using a personal access
   token that never leaves your browser (except to api.github.com). */
(function () {
  'use strict';

  var C = window.ADMIN_CONFIG || {};
  var DRAFT_KEY = 'cd-site-draft', TOKEN_KEY = 'cd-admin-token';
  var API = 'https://api.github.com';
  var S = { token: null, online: false, data: null, sha: null, dirty: false, view: 'overview', uploads: {}, saved: '' };

  /* =========================================================
     Small helpers
     ========================================================= */
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function toast(msg, kind, ms) {
    var t = h('div', { class: 'toast' + (kind ? ' toast--' + kind : ''), text: msg });
    $('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, ms || (kind === 'error' ? 7000 : 3500));
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function humanize(k) { return String(k).replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function slugify(name) {
    var dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
    base = base.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
    return base.slice(0, 60) + ext.replace(/[^a-z0-9.]/g, '');
  }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function fileKind(path) {
    var m = String(path || '').toLowerCase().match(/\.([a-z0-9]+)(\?|#|$)/), e = m ? m[1] : '';
    if (e === 'pdf') return { label: 'PDF', cls: 'pdf', img: false };
    if (/^(pptx?|key|odp)$/.test(e)) return { label: e.toUpperCase(), cls: 'ppt', img: false };
    if (/^(png|jpe?g|gif|webp|svg)$/.test(e)) return { label: e.toUpperCase(), cls: '', img: true };
    return { label: e ? e.toUpperCase() : 'LINK', cls: '', img: false };
  }

  /* base64 that survives ü, ö, ş, é … */
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function fileToBase64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(file);
    });
  }

  /* =========================================================
     GitHub API
     ========================================================= */
  function gh(path, opts) {
    opts = opts || {};
    var headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: 'Bearer ' + S.token };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
      .then(function (r) {
        return r.text().then(function (txt) {
          var json = null; try { json = txt ? JSON.parse(txt) : null; } catch (e) { /* not json */ }
          if (!r.ok) { var err = new Error((json && json.message) || ('GitHub error ' + r.status)); err.status = r.status; throw err; }
          return json;
        });
      });
  }
  function contentsUrl(p) { return '/repos/' + C.owner + '/' + C.repo + '/contents/' + p.split('/').map(encodeURIComponent).join('/'); }

  function verifyRepo() {
    return gh('/repos/' + C.owner + '/' + C.repo).then(function (repo) {
      if (repo.permissions && !repo.permissions.push) throw new Error('This token can read the repository but not write to it. Give it "Contents: read and write".');
      if (!C.branch) C.branch = repo.default_branch;
      return repo;
    });
  }
  function loadRemote() {
    return gh(contentsUrl(C.contentPath) + '?ref=' + encodeURIComponent(C.branch)).then(function (f) {
      S.sha = f.sha;
      return JSON.parse(b64decode(f.content));
    });
  }
  function saveRemote() {
    var json = JSON.stringify(S.data, null, 2) + '\n';
    return gh(contentsUrl(C.contentPath), {
      method: 'PUT',
      body: { message: 'Update site content (Content Studio)', content: b64encode(json), sha: S.sha, branch: C.branch }
    }).then(function (res) { S.sha = res.content.sha; S.saved = json; return res; });
  }
  function uploadFile(file) {
    if (!S.online) return Promise.reject(new Error('Sign in with a GitHub token to upload files.'));
    var max = (C.maxUploadMB || 95) * 1048576;
    if (file.size > max) return Promise.reject(new Error(file.name + ' is ' + fmtSize(file.size) + '. GitHub accepts up to ' + (C.maxUploadMB || 95) + ' MB per file — save slides as PDF or compress images.'));
    var year = new Date().getFullYear();
    var name = slugify(file.name), path = C.uploadDir + '/' + year + '/' + name;
    return fileToBase64(file).then(function (b64) {
      function put(p, tries) {
        return gh(contentsUrl(p), { method: 'PUT', body: { message: 'Upload ' + p.split('/').pop() + ' (Content Studio)', content: b64, branch: C.branch } })
          .then(function () { return p; })
          .catch(function (e) {
            if ((e.status === 422 || e.status === 409) && tries < 3) { // a file with that name exists → add a suffix
              var dot = name.lastIndexOf('.');
              var alt = C.uploadDir + '/' + year + '/' + (dot > 0 ? name.slice(0, dot) : name) + '-' + Date.now().toString(36) + (dot > 0 ? name.slice(dot) : '');
              return put(alt, tries + 1);
            }
            throw e;
          });
      }
      return put(path, 0);
    }).then(function (p) { S.uploads[p] = URL.createObjectURL(file); return p; });
  }
  function listLibrary() {
    return gh('/repos/' + C.owner + '/' + C.repo + '/git/trees/' + encodeURIComponent(C.branch) + '?recursive=1').then(function (t) {
      return (t.tree || []).filter(function (n) {
        return n.type === 'blob' && n.path.indexOf(C.uploadDir + '/') === 0 && !/\.gitkeep$/.test(n.path);
      }).sort(function (a, b) { return a.path < b.path ? 1 : -1; });
    });
  }
  function deleteRemoteFile(path, sha) {
    return gh(contentsUrl(path), { method: 'DELETE', body: { message: 'Delete ' + path.split('/').pop() + ' (Content Studio)', sha: sha, branch: C.branch } });
  }
  function srcFor(path) {
    if (!path) return '';
    if (S.uploads[path]) return S.uploads[path];
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    if (S.online) return 'https://raw.githubusercontent.com/' + C.owner + '/' + C.repo + '/' + C.branch + '/' + path.replace(/^\//, '');
    return '../' + path.replace(/^\//, '');
  }

  /* =========================================================
     File picking & uploading with progress
     ========================================================= */
  function pickFiles(accept, multiple) {
    return new Promise(function (res) {
      var inp = $('filePicker');
      inp.value = ''; inp.accept = accept || ''; inp.multiple = !!multiple;
      inp.onchange = function () { res(Array.prototype.slice.call(inp.files || [])); };
      inp.click();
    });
  }
  function uploadMany(files) {
    if (!files.length) return Promise.resolve([]);
    if (!S.online) { toast('Sign in with a GitHub token to upload files. In offline mode you can still type a path or a web link.', 'error'); return Promise.resolve([]); }
    var bar = h('div', { class: 'toast' }, [h('div', { text: 'Uploading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '…' }), h('div', { class: 'progress', style: { marginTop: '8px' } }, h('span'))]);
    $('toasts').appendChild(bar);
    var out = [];
    return files.reduce(function (p, f) {
      return p.then(function () {
        return uploadFile(f).then(function (path) { out.push({ path: path, name: f.name }); })
          .catch(function (e) { toast(e.message, 'error'); });
      });
    }, Promise.resolve()).then(function () {
      bar.remove();
      if (out.length) toast('Uploaded ' + out.length + ' file' + (out.length > 1 ? 's' : '') + '. Remember to publish your changes.', 'ok');
      return out;
    });
  }
  function enableDrop(el, onFiles) {
    el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('is-over'); });
    el.addEventListener('dragleave', function () { el.classList.remove('is-over'); });
    el.addEventListener('drop', function (e) {
      e.preventDefault(); el.classList.remove('is-over');
      onFiles(Array.prototype.slice.call(e.dataTransfer.files || []));
    });
  }

  /* =========================================================
     Dirty state, drafts
     ========================================================= */
  var draftTimer;
  function markDirty() {
    S.dirty = true; $('dirtyPill').hidden = false;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 400);
  }
  function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S.data)); } catch (e) { /* storage full or blocked */ } }
  function clearDirty() { S.dirty = false; $('dirtyPill').hidden = true; try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }

  /* =========================================================
     Field schema
     ========================================================= */
  var LABELS = {
    name: 'Name', title: 'Title', description: 'Description (search engines)', footerNote: 'Footer note', copyright: 'Copyright line',
    cvButton: 'CV button in the menu', eyebrow: 'Small label above the title', text: 'Text', affiliation: 'Position & affiliation',
    portrait: 'Portrait photo', portraitCaption: 'Caption under portrait', buttons: 'Buttons', links: 'Profile links',
    networksLabel: 'Networks label', networks: 'Networks (one per line)', nav: 'Menu label', visible: 'Show on website',
    intro: 'Introduction', body: 'Text', image: 'Image', attachments: 'Files (PDF, slides, images, links)', items: 'Items',
    role: 'Role', tags: 'Tags (one per line)', featured: 'Feature as large card', category: 'Category', period: 'Period',
    allLabel: '“All” filter label', doiLabel: 'DOI button label', year: 'Year', authors: 'Authors', venue: 'Journal / venue',
    type: 'Type', doi: 'DOI', summary: 'Summary', course: 'Course / activity', institution: 'Institution', level: 'Level',
    event: 'Event', place: 'Place', date: 'Date', email: 'E-mail', address: 'Address', id: 'Anchor id (used in links: #id)',
    label: 'Text', url: 'Link (web address, #section or uploaded file)', style: 'Style'
  };
  var HINTS = {
    body: 'Leave a blank line for a new paragraph. **bold** and [link text](https://…) work.',
    text: '**bold** and [link text](https://…) work.',
    id: 'Lowercase, no spaces. Changing it changes the menu link.'
  };
  var TEXTAREA = ['body', 'text', 'summary', 'intro', 'description', 'address'];
  var IMAGE = ['image', 'portrait', 'logo', 'cover', 'thumbnail'];
  var STRINGLIST = ['tags', 'networks', 'themes', 'methods'];
  var BUTTONLIST = ['buttons', 'links'];
  var PUB_TYPES = ['Article', 'Review', 'Dataset', 'Report', 'Chapter', 'Book', 'Preprint', 'Software', 'Conference paper', 'Policy brief'];
  var SECTION_TYPES = { achievements:'Achievements', areas:'Research areas', features:'Featured contributions', practice:'Research to practice', selectedPubs:'Selected publications', timeline:'Timeline', text:'Text', about: 'About text', cards: 'Cards / supervision & mentoring', tools: 'Tools & platforms', projects: 'Projects', publications: 'Publications', teaching: 'Teaching', talks: 'Talks', news: 'News', contact: 'Contact' };
  var TEMPLATES = { navigation:{label:'',url:'',style:'ghost'}, themes:{id:'',label:''}, achievements:{value:'',label:'',text:'',image:'',buttons:[]}, areas:{theme:'',title:'',text:'',methods:'',image:'',attachments:[],buttons:[]}, features:{title:'',category:'',featured:false,myRole:'',context:'',tags:[],image:'',attachments:[],buttons:[]}, practice:{icon:'',title:'',text:'',evidence:'',image:''}, timeline:{period:'',title:'',organization:'',text:'',image:'',attachments:[]},
    cards: { title: '', text: '', image: '', attachments: [], buttons: [] },
    tools: { category: 'Research platforms', status: '', name: '', role: '', text: '', tags: [], image: '', featured: false, attachments: [], buttons: [] },
    projects: { title: '', category: '', period: '', role: '', text: '', image: '', attachments: [], buttons: [] },
    publications: { year: String(new Date().getFullYear()), title: '', authors: '', venue: '', type: 'Article', doi: '', summary: '', image: '', attachments: [] },
    teaching: { course: '', institution: '', period: '', level: '', text: '', image: '', attachments: [], buttons: [] },
    talks: { title: '', event: '', place: '', date: '', image: '', attachments: [], buttons: [] },
    news: { date: '', text: '', image: '', attachments: [], buttons: [] }
  };
  var NEWEST_FIRST = ['publications', 'talks', 'news'];
  function blankLike(o) {
    if (Array.isArray(o)) return [];
    if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { r[k] = blankLike(o[k]); }); return r; }
    if (typeof o === 'boolean') return false;
    return '';
  }
  function itemTitle(it) {
    var t = it && (it.title || it.name || it.course || it.label || it.text || it.date);
    t = String(t || '(untitled)'); return t.length > 90 ? t.slice(0, 88) + '…' : t;
  }

  /* =========================================================
     Field renderers
     ========================================================= */
  function labelFor(key) { return LABELS[key] || humanize(key); }

  function textField(obj, key, opts) {
    opts = opts || {};
    var long = TEXTAREA.indexOf(key) >= 0;
    var input = long
      ? h('textarea', { rows: key === 'body' ? 8 : 3, value: obj[key] || '' })
      : h('input', { type: 'text', value: obj[key] == null ? '' : obj[key], list: opts.list || null });
    input.addEventListener('input', function () { obj[key] = input.value; markDirty(); if (opts.onChange) opts.onChange(); });
    var control = input;
    if (key === 'url' || key === 'file') control = h('div', { class: 'inline' }, [input, uploadLinkButton(function (p) { input.value = p; obj[key] = p; markDirty(); })]);
    return h('label', { class: 'field' + (long ? ' field--full' : '') }, [
      h('span', { class: 'field__label', text: labelFor(key) }), control,
      HINTS[key] ? h('span', { class: 'field__hint', text: HINTS[key] }) : null
    ]);
  }
  function uploadLinkButton(onPath) {
    return h('button', { type: 'button', class: 'btn btn--small btn--ghost', title: 'Upload a file and link to it', onclick: function () {
      pickFiles('', false).then(uploadMany).then(function (r) { if (r[0]) onPath(r[0].path); });
    } }, 'Upload');
  }
  function checkField(obj, key) {
    var inp = h('input', { type: 'checkbox', checked: obj[key] !== false && !!obj[key] || (key === 'visible' && obj[key] !== false) });
    inp.addEventListener('change', function () { obj[key] = inp.checked; markDirty(); if (key === 'visible') renderNav(); });
    return h('label', { class: 'check field--full' }, [inp, labelFor(key)]);
  }
  function selectField(obj, key, options) {
    var sel = h('select', null, Object.keys(options).map(function (v) { return h('option', { value: v, text: options[v] }); }));
    sel.value = obj[key] || Object.keys(options)[0];
    sel.addEventListener('change', function () { obj[key] = sel.value; markDirty(); });
    return h('label', { class: 'field' }, [h('span', { class: 'field__label', text: labelFor(key) }), sel]);
  }
  function stringListField(obj, key) {
    var ta = h('textarea', { rows: 3, value: (obj[key] || []).join('\n') });
    ta.addEventListener('input', function () { obj[key] = ta.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); markDirty(); });
    return h('label', { class: 'field' }, [h('span', { class: 'field__label', text: labelFor(key) }), ta]);
  }

  function imageField(obj, key) {
    var preview = h('div', { class: 'imgfield__preview drop' });
    var path = h('input', { type: 'text', class: 'input', placeholder: 'No image — upload one or paste a path / web address', value: obj[key] || '' });
    function paint() {
      var src = srcFor(obj[key]);
      preview.style.backgroundImage = src ? 'url("' + src.replace(/"/g, '%22') + '")' : 'none';
      preview.textContent = src ? '' : 'Drop image here';
    }
    function set(p) { obj[key] = p; path.value = p; paint(); markDirty(); }
    path.addEventListener('input', function () { obj[key] = path.value.trim(); paint(); markDirty(); });
    enableDrop(preview, function (fs) { uploadMany(fs.filter(function (f) { return /^image\//.test(f.type); }).slice(0, 1)).then(function (r) { if (r[0]) set(r[0].path); }); });
    paint();
    return h('div', { class: 'field field--full' }, [
      h('span', { class: 'field__label', text: labelFor(key) }),
      h('div', { class: 'imgfield' }, [preview, h('div', { class: 'imgfield__side' }, [
        path,
        h('div', { class: 'inline' }, [
          h('button', { type: 'button', class: 'btn btn--small btn--primary', onclick: function () {
            pickFiles('image/*', false).then(uploadMany).then(function (r) { if (r[0]) set(r[0].path); });
          } }, 'Upload image'),
          h('button', { type: 'button', class: 'btn btn--small btn--ghost', onclick: function () {
            openLibrary(function (p) { set(p); }, 'image');
          } }, 'Choose from library'),
          h('button', { type: 'button', class: 'btn btn--small btn--danger', onclick: function () { set(''); } }, 'Remove')
        ])
      ])])
    ]);
  }

  function attachmentsField(obj) {
    if (!Array.isArray(obj.attachments)) obj.attachments = [];
    var wrap = h('div', { class: 'field field--full' });
    function draw() {
      wrap.innerHTML = '';
      wrap.appendChild(h('span', { class: 'field__label', text: labelFor('attachments') }));
      var box = h('div', { class: 'att' });
      obj.attachments.forEach(function (a, i) {
        var k = fileKind(a.file);
        var lab = h('input', { type: 'text', value: a.label || '', placeholder: 'Label shown on the site (e.g. Slides, Preprint)' });
        var fp = h('input', { type: 'text', value: a.file || '', placeholder: 'assets/uploads/… or https://…' });
        lab.addEventListener('input', function () { a.label = lab.value; markDirty(); });
        fp.addEventListener('input', function () { a.file = fp.value.trim(); markDirty(); });
        box.appendChild(h('div', { class: 'att__row' }, [
          h('span', { class: 'att__kind' + (k.cls ? ' att__kind--' + k.cls : ''), text: k.label }), lab, fp,
          a.file ? h('a', { class: 'btn btn--small btn--ghost', href: srcFor(a.file), target: '_blank', rel: 'noopener' }, 'Open') : null,
          h('button', { type: 'button', class: 'iconbtn', title: 'Move up', 'aria-label': 'Move up', onclick: function () { if (i > 0) { obj.attachments.splice(i - 1, 0, obj.attachments.splice(i, 1)[0]); markDirty(); draw(); } } }, '↑'),
          h('button', { type: 'button', class: 'iconbtn iconbtn--danger', title: 'Remove', 'aria-label': 'Remove file', onclick: function () { obj.attachments.splice(i, 1); markDirty(); draw(); } }, '×')
        ]));
      });
      var drop = h('div', { class: 'drop att__drop', tabindex: '0', role: 'button' }, 'Drop PDF, PPT/PPTX, images or other files here — or click to upload');
      function add(files) {
        uploadMany(files).then(function (r) {
          r.forEach(function (x) { obj.attachments.push({ label: x.name.replace(/\.[^.]+$/, ''), file: x.path }); });
          if (r.length) { markDirty(); draw(); }
        });
      }
      drop.addEventListener('click', function () { pickFiles('', true).then(add); });
      drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFiles('', true).then(add); } });
      enableDrop(drop, add);
      box.appendChild(drop);
      box.appendChild(h('div', { class: 'inline' }, [
        h('button', { type: 'button', class: 'btn btn--small btn--ghost', onclick: function () {
          openLibrary(function (p) { obj.attachments.push({ label: p.split('/').pop().replace(/\.[^.]+$/, ''), file: p }); markDirty(); draw(); }, 'any');
        } }, 'Choose from library'),
        h('button', { type: 'button', class: 'btn btn--small btn--ghost', onclick: function () {
          obj.attachments.push({ label: '', file: 'https://' }); markDirty(); draw();
        } }, 'Add web link')
      ]));
      wrap.appendChild(box);
    }
    draw();
    return wrap;
  }

  function buttonListField(obj, key) {
    if (!Array.isArray(obj[key])) obj[key] = [];
    var withStyle = key === 'buttons';
    var wrap = h('div', { class: 'field field--full' });
    function draw() {
      wrap.innerHTML = '';
      wrap.appendChild(h('span', { class: 'field__label', text: labelFor(key) }));
      var list = h('div', { class: 'subitems' });
      obj[key].forEach(function (b, i) {
        var lab = h('input', { type: 'text', value: b.label || '', placeholder: withStyle ? 'Button text' : 'Link text', 'aria-label': 'Text' });
        var url = h('input', { type: 'text', value: b.url || '', placeholder: 'https://…, #section or uploaded file', 'aria-label': 'Link' });
        lab.addEventListener('input', function () { b.label = lab.value; markDirty(); });
        url.addEventListener('input', function () { b.url = url.value.trim(); markDirty(); });
        var urlBox = h('div', { class: 'inline' }, [url, uploadLinkButton(function (p) { url.value = p; b.url = p; markDirty(); })]);
        var style = null;
        if (withStyle) {
          style = h('select', { 'aria-label': 'Style' }, [h('option', { value: 'primary', text: 'Filled' }), h('option', { value: 'ghost', text: 'Outline' })]);
          style.value = b.style === 'primary' ? 'primary' : 'ghost';
          style.addEventListener('change', function () { b.style = style.value; markDirty(); });
        }
        list.appendChild(h('div', { class: 'subitem', style: withStyle ? null : { gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,2fr) auto' } }, [
          lab, urlBox, style,
          h('button', { type: 'button', class: 'iconbtn iconbtn--danger', 'aria-label': 'Remove', onclick: function () { obj[key].splice(i, 1); markDirty(); draw(); } }, '×')
        ]));
      });
      wrap.appendChild(list);
      wrap.appendChild(h('button', { type: 'button', class: 'btn btn--small btn--ghost adder', onclick: function () {
        obj[key].push(withStyle ? { label: '', url: '', style: 'ghost' } : { label: '', url: '' }); markDirty(); draw();
      } }, withStyle ? '+ Add button' : '+ Add link'));
    }
    draw();
    return wrap;
  }

  function itemsField(owner, key, sectionType) {
    var arr = owner[key] || (owner[key] = []);
    var wrap = h('div', { class: 'items' });
    var open = {};
    function draw() {
      wrap.innerHTML = '';
      if (!arr.length) wrap.appendChild(h('div', { class: 'empty', text: 'No items yet.' }));
      arr.forEach(function (it, i) {
        var titleEl = h('span', { class: 'item__title', text: itemTitle(it) });
        var body = h('div', { class: 'item__body' });
        var card = h('div', { class: 'item' + (open[i] ? ' is-open' : '') }, [
          h('div', { class: 'item__head', onclick: function (e) {
            if (e.target.closest('button')) return;
            open[i] = !open[i]; card.classList.toggle('is-open', !!open[i]);
            if (open[i] && !body.childNodes.length) body.appendChild(objectEditor(it, { sectionType: sectionType, onTitle: function () { titleEl.textContent = itemTitle(it); } }));
          } }, [
            h('span', { class: 'item__caret', text: '▸', 'aria-hidden': 'true' }), titleEl,
            h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Move up', title: 'Move up', onclick: function () { move(i, -1); } }, '↑'),
            h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Move down', title: 'Move down', onclick: function () { move(i, 1); } }, '↓'),
            h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Duplicate', title: 'Duplicate', onclick: function () { arr.splice(i + 1, 0, clone(it)); open = {}; open[i + 1] = true; markDirty(); draw(); } }, '⧉'),
            h('button', { type: 'button', class: 'iconbtn iconbtn--danger', 'aria-label': 'Delete', title: 'Delete', onclick: function () {
              if (confirm('Delete “' + itemTitle(it) + '”?')) { arr.splice(i, 1); open = {}; markDirty(); draw(); }
            } }, '×')
          ]), body
        ]);
        if (open[i]) body.appendChild(objectEditor(it, { sectionType: sectionType, onTitle: function () { titleEl.textContent = itemTitle(it); } }));
        wrap.appendChild(card);
      });
    }
    function move(i, d) {
      var j = i + d; if (j < 0 || j >= arr.length) return;
      arr.splice(j, 0, arr.splice(i, 1)[0]); var o = open[i]; open = {}; if (o) open[j] = true; markDirty(); draw();
    }
    var addBtn = h('button', { type: 'button', class: 'btn btn--primary adder', onclick: function () {
      var tpl = TEMPLATES[sectionType] ? clone(TEMPLATES[sectionType]) : (arr[0] ? blankLike(arr[0]) : { title: '', text: '', image: '', attachments: [] });
      var top = NEWEST_FIRST.indexOf(sectionType) >= 0;
      if (top) arr.unshift(tpl); else arr.push(tpl);
      open = {}; open[top ? 0 : arr.length - 1] = true; markDirty(); draw();
    } }, '+ Add item');
    draw();
    return h('div', null, [wrap, addBtn]);
  }

  /* Generic editor: turns any content object into a form. */
  function objectEditor(obj, opts) {
    opts = opts || {};
    var skip = opts.skip || [];
    if(opts.sectionType && opts.onTitle && TEMPLATES[opts.sectionType]) Object.keys(TEMPLATES[opts.sectionType]).forEach(function(k){if(!(k in obj))obj[k]=clone(TEMPLATES[opts.sectionType][k]);});
    var grid = h('div', { class: 'fields' });
    var rest = h('div', { class: 'fields', style: { marginTop: '16px' } });
    Object.keys(obj).forEach(function (key) {
      if (skip.indexOf(key) >= 0) return;
      var v = obj[key];
      var isTitleKey = ['title', 'name', 'course', 'label', 'text', 'date'].indexOf(key) >= 0;
      if (IMAGE.indexOf(key) >= 0) rest.appendChild(imageField(obj, key));
      else if (key === 'attachments') rest.appendChild(attachmentsField(obj));
      else if (BUTTONLIST.indexOf(key) >= 0) rest.appendChild(buttonListField(obj, key));
      else if (STRINGLIST.indexOf(key) >= 0 && Array.isArray(v)) grid.appendChild(stringListField(obj, key));
      else if (key === 'items' && Array.isArray(v)) { /* rendered by the section view */ }
      else if (Array.isArray(v)) rest.appendChild(h('div', { class: 'field field--full' }, [h('span', { class: 'field__label', text: labelFor(key) }), itemsField(obj, key, null)]));
      else if (v && typeof v === 'object') {
        rest.appendChild(h('fieldset', { class: 'panel field--full', style: { margin: 0 } }, [h('legend', { class: 'field__label', text: labelFor(key) }), objectEditor(v)]));
      }
      else if (typeof v === 'boolean' || key === 'visible' || key === 'featured') grid.appendChild(checkField(obj, key));
      else if (key === 'style') grid.appendChild(selectField(obj, key, { primary: 'Filled', ghost: 'Outline' }));
      else if (key === 'type' && opts.sectionType === 'publications') grid.appendChild(textField(obj, key, { list: 'pubTypes' }));
      else grid.appendChild(textField(obj, key, isTitleKey && opts.onTitle ? { onChange: opts.onTitle } : null));
    });
    return h('div', null, [grid, rest.childNodes.length ? rest : null]);
  }

  /* =========================================================
     Views
     ========================================================= */
  function setView(v) { S.view = v; renderNav(); renderView(); window.scrollTo(0, 0); }
  function renderNav() {
    var nav = $('sideNav'); nav.innerHTML = '';
    function link(id, label, extra) {
      nav.appendChild(h('button', { type: 'button', class: 'side__link' + (S.view === id ? ' is-on' : ''), onclick: function () { setView(id); } }, [h('span', { text: label }), extra ? h('span', { class: 'muted', text: extra }) : null]));
    }
    nav.appendChild(h('div', { class: 'side__group', text: 'General' }));
    link('overview', 'Overview'); link('site', 'Site & menu'); link('hero', 'Hero (top of page)');
    link('contact', 'Contact & collaboration'); link('themes', 'Research themes / filters');
    Object.keys(S.data.pages || {}).forEach(function (key) {
      var page = S.data.pages[key];
      nav.appendChild(h('div', { class:'side__group', text: page.label || key }));
      if(key !== 'home') link('page:'+key, 'Page header');
      (S.data.sections || []).forEach(function(s,i){if((s.page || 'home')===key) link('section:'+i,s.title || s.id,s.visible===false?'hidden':'');});
      if(key==='publications') link('publications','All publications',String((S.data.publications||[]).length));
    });
    (S.data.sections || []).forEach(function(s,i){if(!(S.data.pages||{})[s.page||'home']) link('section:'+i,s.title||s.id,'Unassigned');});
    nav.appendChild(h('div', { class: 'side__group', text: 'Manage' }));
    link('sections', 'Add / reorder sections'); link('library', 'Media library');
  }
  function header(crumb, title) { $('crumb').textContent = crumb; $('viewTitle').textContent = title; }
  function panel(title, hint, body, actions) {
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel__head' }, [h('h2', { class: 'panel__title', text: title }), actions || null]),
      hint ? h('p', { class: 'panel__hint', text: hint }) : null, body
    ]);
  }

  function renderView() {
    var v = $('view'); v.innerHTML = '';
    v.appendChild(h('datalist', { id: 'pubTypes' }, PUB_TYPES.map(function (t) { return h('option', { value: t }); })));
    if (S.view === 'overview') {
      header('Content Studio', 'Overview');
      var rows = (S.data.sections || []).map(function (s, i) {
        return h('div', { class: 'secrow' }, [
          h('span', { class: 'secrow__name', text: s.title || s.id }),
          h('span', { class: 'secrow__type', text: (SECTION_TYPES[s.type] || s.type) + (Array.isArray(s.items) ? ' · ' + s.items.length + ' items' : '') }),
          s.visible === false ? h('span', { class: 'pill pill--warn', text: 'Hidden' }) : null,
          h('button', { type: 'button', class: 'btn btn--small btn--ghost', onclick: function () { setView('section:' + i); } }, 'Edit')
        ]);
      });
      v.appendChild(panel('Welcome', S.online
        ? 'Edit any section on the left. Uploads go straight to your repository; text changes go live when you press “Publish changes”. Use “Preview” to see unpublished edits first.'
        : 'Offline mode: you can edit and preview, then “Download JSON” and upload it to content/site.json on GitHub. Sign in with a token to upload files and publish directly.', null));
      v.appendChild(panel('Your sections', null, h('div', null, rows)));
      return;
    }
    if (S.view === 'site') { header('General', 'Site & menu'); v.appendChild(panel('Site settings', 'Name, browser title, footer and the CV button in the top menu.', objectEditor(S.data.site))); v.appendChild(panel('Navigation & CV', 'Edit labels, links and order.', itemsField(S.data,'nav','navigation'))); return; }
    if (S.view === 'hero') { header('General', 'Hero'); v.appendChild(panel('Top of the homepage', 'Headline, introduction, portrait, buttons, profile links and partner networks.', objectEditor(S.data.hero))); return; }
    if (S.view === 'contact') { header('General','Contact & collaboration'); v.appendChild(panel('Shared contact section',null,objectEditor(S.data.contact || (S.data.contact={eyebrow:'',title:'',text:'',email:'',address:'',buttons:[],attachments:[]})))); return; }
    if (S.view === 'themes') { header('General','Research themes'); v.appendChild(panel('Publication filters', 'Keep theme IDs consistent with publication records.',itemsField(S.data,'themes','themes'))); return; }
    if (S.view === 'publications') { header('Publications','All publications'); v.appendChild(panel('Publication records', 'Add, edit, duplicate or remove records.',itemsField(S.data,'publications','publications'))); return; }
    if (S.view.indexOf('page:') === 0) { var key=S.view.slice(5), p=S.data.pages[key]; if(!p)return setView('overview'); ['eyebrow','title','intro','image'].forEach(function(k){if(!(k in p))p[k]='';}); header(p.label||key,'Page header'); v.appendChild(panel('Public page header', 'Changes appear on the corresponding page after publishing.',objectEditor(p,{skip:['file']}))); return; }
    if (S.view.indexOf('section:') === 0) {
      var i = +S.view.split(':')[1], sec = S.data.sections[i];
      if (!sec) return setView('overview');
      header('Sections › ' + (SECTION_TYPES[sec.type] || sec.type), sec.title || sec.id);
      v.appendChild(panel('Section settings', 'Heading, menu label, section image, files and buttons.', objectEditor(sec, { skip: ['type'], sectionType: sec.type })));
      if (Array.isArray(sec.items)) {
        v.appendChild(panel('Items', 'Click an item to edit it. Each item can have its own image, files and buttons.', itemsField(sec, 'items', sec.type)));
      }
      return;
    }
    if (S.view === 'sections') { header('Manage', 'Add / reorder sections'); v.appendChild(sectionsManager()); return; }
    if (S.view === 'library') { header('Manage', 'Media library'); var box = h('div'); v.appendChild(panel('Uploaded files', 'Everything in ' + C.uploadDir + '. Images, PDFs and slides you upload anywhere appear here.', box)); drawLibrary(box, null, 'any'); return; }
  }

  function sectionsManager() {
    var box = h('div');
    function draw() {
      box.innerHTML = '';
      S.data.sections.forEach(function (s, i) {
        var vis = h('input', { type: 'checkbox', checked: s.visible !== false, 'aria-label': 'Visible' });
        vis.addEventListener('change', function () { s.visible = vis.checked; markDirty(); renderNav(); });
        box.appendChild(h('div', { class: 'secrow' }, [
          h('label', { class: 'check' }, [vis, 'Show']),
          h('span', { class: 'secrow__name', text: s.title || s.id }),
          h('span', { class: 'secrow__type', text: SECTION_TYPES[s.type] || s.type }),
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Move up', onclick: function () { mv(i, -1); } }, '↑'),
          h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Move down', onclick: function () { mv(i, 1); } }, '↓'),
          h('button', { type: 'button', class: 'iconbtn iconbtn--danger', 'aria-label': 'Delete section', onclick: function () {
            if (confirm('Delete the section “' + (s.title || s.id) + '” and all its items?')) { S.data.sections.splice(i, 1); markDirty(); renderNav(); draw(); }
          } }, '×')
        ]));
      });
    }
    function mv(i, d) { var j = i + d; if (j < 0 || j >= S.data.sections.length) return; S.data.sections.splice(j, 0, S.data.sections.splice(i, 1)[0]); markDirty(); renderNav(); draw(); }
    draw();
    var typeSel = h('select', { class: 'input', style: { maxWidth: '260px' } }, Object.keys(SECTION_TYPES).map(function (t) { return h('option', { value: t, text: SECTION_TYPES[t] }); }));
    var pageSel = h('select',null,Object.keys(S.data.pages||{}).map(function(k){return h('option',{value:k,text:S.data.pages[k].label||k});}));
    var nameIn = h('input', { type: 'text', class: 'input', placeholder: 'Section title, e.g. Awards', style: { maxWidth: '300px' } });
    var add = h('button', { type: 'button', class: 'btn btn--primary', onclick: function () {
      var title = nameIn.value.trim() || 'New section', t = typeSel.value;
      var id = slugify(title).replace(/\./g, '') || ('section-' + Date.now().toString(36));
      while (S.data.sections.some(function (s) { return s.id === id; })) id += '-2';
      var sec = { id: id, page: pageSel.value, type: t, nav: title, visible: true, eyebrow: title, title: title, intro: '', image: '', attachments: [], buttons: [] };
      if (t === 'about') sec.body = '';
      else if (t === 'contact') { sec.email = ''; sec.address = ''; }
      else sec.items = [];
      S.data.sections.push(sec); markDirty(); setView('section:' + (S.data.sections.length - 1));
    } }, 'Add section');
    return h('div', null, [
      panel('Order & visibility', 'The website shows sections in this order. Untick “Show” to hide a section without deleting it.', box),
      panel('Add a new section', 'For example Awards, Supervision, Software or Media coverage. Pick the layout that fits.', h('div', { class: 'inline', style: { flexWrap: 'wrap' } }, [pageSel, nameIn, typeSel, add]))
    ]);
  }

  /* =========================================================
     Media library
     ========================================================= */
  function drawLibrary(box, onPick, accept) {
    box.innerHTML = '';
    var upBtn = h('button', { type: 'button', class: 'btn btn--primary btn--small', onclick: function () {
      pickFiles(accept === 'image' ? 'image/*' : '', true).then(uploadMany).then(function (r) { if (r.length) drawLibrary(box, onPick, accept); });
    } }, 'Upload new files');
    box.appendChild(h('div', { class: 'inline', style: { marginBottom: '16px' } }, [upBtn]));
    if (!S.online) { box.appendChild(h('div', { class: 'empty', text: 'Sign in with a GitHub token to see and upload files.' })); return; }
    var grid = h('div', { class: 'lib' }, h('div', { class: 'progress', style: { gridColumn: '1/-1' } }, h('span')));
    box.appendChild(grid);
    listLibrary().then(function (files) {
      grid.innerHTML = '';
      if (accept === 'image') files = files.filter(function (f) { return fileKind(f.path).img; });
      if (!files.length) { grid.appendChild(h('div', { class: 'empty', style: { gridColumn: '1/-1' }, text: 'No files yet.' })); return; }
      files.forEach(function (f) {
        var k = fileKind(f.path), name = f.path.split('/').pop();
        var thumb = h('div', { class: 'lib__thumb', text: k.img ? '' : k.label });
        if (k.img) thumb.style.backgroundImage = 'url("' + srcFor(f.path) + '")';
        grid.appendChild(h('div', { class: 'lib__item' }, [
          thumb, h('div', { class: 'lib__name', text: name }), h('div', { class: 'lib__meta', text: fmtSize(f.size || 0) }),
          h('div', { class: 'lib__actions' }, [
            onPick ? h('button', { type: 'button', class: 'btn btn--small btn--primary', onclick: function () { onPick(f.path); $('libraryDialog').close(); } }, 'Use') : null,
            h('button', { type: 'button', class: 'btn btn--small btn--ghost', onclick: function () {
              (navigator.clipboard ? navigator.clipboard.writeText(f.path) : Promise.reject()).then(function () { toast('Path copied: ' + f.path); }, function () { prompt('Copy this path:', f.path); });
            } }, 'Copy path'),
            !onPick ? h('button', { type: 'button', class: 'iconbtn iconbtn--danger', 'aria-label': 'Delete file', onclick: function () {
              if (!confirm('Delete ' + name + ' from the repository? Pages that link to it will show a broken link.')) return;
              deleteRemoteFile(f.path, f.sha).then(function () { toast('Deleted ' + name, 'ok'); drawLibrary(box, onPick, accept); }, function (e) { toast(e.message, 'error'); });
            } }, '×') : null
          ])
        ]));
      });
    }).catch(function (e) { grid.innerHTML = ''; grid.appendChild(h('div', { class: 'empty', text: 'Could not load files: ' + e.message })); });
  }
  function openLibrary(onPick, accept) {
    var dlg = $('libraryDialog');
    drawLibrary($('libraryBody'), onPick, accept);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  /* =========================================================
     Top-bar actions
     ========================================================= */
  function download() {
    var blob = new Blob([JSON.stringify(S.data, null, 2) + '\n'], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'site.json' });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function publish() {
    if (!S.online) {
      download();
      toast('Downloaded site.json. Upload it to content/site.json in your repository to publish.', null, 8000);
      return;
    }
    var btn = $('publishBtn'); btn.disabled = true; btn.textContent = 'Publishing…';
    saveRemote().then(function () {
      clearDirty();
      toast('Published! Your site updates in about a minute.', 'ok', 6000);
    }).catch(function (e) {
      if (e.status === 409 || e.status === 422) toast('The content changed on GitHub since you opened it (another tab or device?). Download JSON to keep your edits, then reload.', 'error', 12000);
      else toast('Publishing failed: ' + e.message, 'error');
    }).then(function () { btn.disabled = false; btn.textContent = 'Publish changes'; });
  }
  function preview() {
    saveDraft();
    var key=S.view.indexOf('page:')===0?S.view.slice(5):S.view.indexOf('section:')===0?(S.data.sections[+S.view.split(':')[1]]||{}).page:S.view==='publications'?'publications':'home'; var p=(S.data.pages||{})[key]||{}; window.open('../'+(p.file||'index.html')+'?preview=draft','_blank');
  }

  /* =========================================================
     Start-up
     ========================================================= */
  function start(data) {
    S.data = data;
    S.data.site = S.data.site || {}; S.data.hero = S.data.hero || {}; S.data.sections = S.data.sections || [];
    S.saved = JSON.stringify(data, null, 2) + '\n';
    $('login').hidden = true; $('app').hidden = false;
    $('repoLabel').textContent = C.owner + '/' + C.repo + ' · ' + C.branch;
    $('connStatus').textContent = S.online ? 'Connected to GitHub' : 'Offline mode';
    $('publishBtn').textContent = S.online ? 'Publish changes' : 'Download to publish';
    try {
      var draft = localStorage.getItem(DRAFT_KEY);
      if (draft && draft !== JSON.stringify(data)) $('draftNotice').hidden = false;
    } catch (e) { /* ignore */ }
    renderNav(); renderView();
  }
  function showLoginError(msg) { var e = $('loginError'); e.textContent = msg; e.hidden = false; }
  function signIn(token, remember) {
    S.token = token; S.online = true;
    var btn = $('loginForm').querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Connecting…';
    return verifyRepo().then(loadRemote).then(function (data) {
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
        if (remember) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
      } catch (e) { /* ignore */ }
      start(data);
    }).catch(function (e) {
      S.online = false; S.token = null;
      try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (er) { /* ignore */ }
      showLoginError(e.status === 401 ? 'GitHub did not accept this token. Check that it is copied completely and has not expired.'
        : e.status === 404 ? 'Repository ' + C.owner + '/' + C.repo + ' or ' + C.contentPath + ' not found — or the token has no access to it. Check admin/config.js and the token’s repository access.'
        : e.message);
    }).then(function () { btn.disabled = false; btn.textContent = 'Sign in'; });
  }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); $('loginError').hidden = true;
    var t = $('token').value.trim(); if (t) signIn(t, $('remember').checked);
  });
  $('offlineBtn').addEventListener('click', function () {
    S.online = false;
    fetch('../' + C.contentPath, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(start).catch(function () { showLoginError('Could not read ' + C.contentPath + '. Open the admin panel through your website address (or a local web server).'); });
  });
  $('signOut').addEventListener('click', function () {
    if (S.dirty && !confirm('You have unpublished changes. Sign out anyway? (A draft stays saved in this browser.)')) return;
    try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });
  $('publishBtn').addEventListener('click', publish);
  $('downloadBtn').addEventListener('click', download);
  $('previewBtn').addEventListener('click', preview);
  $('restoreDraft').addEventListener('click', function () {
    try { S.data = JSON.parse(localStorage.getItem(DRAFT_KEY)); markDirty(); renderNav(); renderView(); toast('Draft restored.', 'ok'); } catch (e) { toast('Could not restore draft.', 'error'); }
    $('draftNotice').hidden = true;
  });
  $('discardDraft').addEventListener('click', function () { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } $('draftNotice').hidden = true; });
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { $('libraryDialog').close(); }); });
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && S.data) { e.preventDefault(); publish(); }
  });

  // auto sign-in with a remembered token
  var saved = null;
  try { saved = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  if (saved) { $('token').value = saved; $('remember').checked = !!localStorage.getItem(TOKEN_KEY); signIn(saved, $('remember').checked); }
})();
