/* IdeaForest — shared logic for prepare.html and workshop.html */
(function () {
  'use strict';

  var CFG = window.IF_CONFIG || {};
  var PAGE = window.IF_PAGE || 'live'; // 'pre' (before the workshop) or 'live' (in the workshop)
  var TREE = CFG.TREE_THRESHOLD || 8;
  var NAMES = (CFG.NAMES || []).filter(Boolean);
  var JOURNEYS = CFG.JOURNEYS || [];
  var TEAM_EMAIL = (CFG.TEAM_EMAIL || 'team@ideaforest.example').toLowerCase();
  var ROOM_EMAIL = (CFG.ROOM_EMAIL || 'room@ideaforest.example').toLowerCase();

  var FIX = {
    governance: { label: 'Governance', hint: 'Data, dashboards, reports and design standards. Example: Disruption dashboard.' },
    process: { label: 'Process', hint: 'A policy, SOP or new way of working. Example: changes to excess baggage waiver policy which is more easily governed.' },
    automation: { label: 'Automation', hint: 'A system does it instantly. Example: eVouchers as alternative payment mode or a single centralised compensation eligibility check.' }
  };
  var EFFORT = { S: 'Small (weeks)', M: 'Medium (a quarter or two)', L: 'Large (6+ months)' };

  // ---------- helpers ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function linkify(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>';
    });
  }
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function keyOf(name) { return String(name).replace(/[.$#\[\]\/]/g, '_'); }
  function timeAgo(ts) {
    var mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }
  function journeyLabel(id) {
    for (var i = 0; i < JOURNEYS.length; i++) if (JOURNEYS[i].id === id) return JOURNEYS[i].label.split(':')[0];
    return id;
  }
  var toastTimer;
  function toast(msg, type) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  // ---------- data layer: Demo (this browser only) ----------
  function demoSeed() {
    var now = Date.now();
    return {
      ideas: {
        demo1: { author: 'Demo Person', authorKey: 'Demo Person', stage: 'pre', journey: 'disruption', title: 'Auto-send hotel and cab details by WhatsApp',
          idea: 'When a hotel is allocated, send the hotel, cab and meal details on WhatsApp as well as in the app.',
          moment: 'Customers delayed overnight cannot find their hotel details if they have not opened the app.',
          proof: 'Frequent complaint theme: "nobody told me where to go".', outside: 'Several airlines push hotel vouchers by SMS and messaging apps.',
          fixType: 'automation', noCapex: true, sixMonths: true, effort: 'S', doable: true, createdAt: now - 7200000,
          votes: { A: { type: 'up', name: 'A', at: now }, B: { type: 'up', name: 'B', at: now }, C: { type: 'up', name: 'C', at: now } } },
        demo2: { author: 'Demo Person', authorKey: 'Demo Person', stage: 'pre', journey: 'assisted', title: 'RFID tags on every bag',
          idea: 'Tag every bag with RFID so we always know where it is.', moment: 'Bags go missing at transfer points.',
          proof: '', outside: 'Some large airlines have done this.', fixType: 'automation', noCapex: false, sixMonths: false, effort: 'L', doable: false,
          createdAt: now - 3600000, votes: { A: { type: 'up', name: 'A', at: now }, B: { type: 'up', name: 'B', at: now } } }
      },
      settings: { votingOpen: true }
    };
  }
  function demoAdapter() {
    var KEY = 'ideaforest-demo-data';
    var listeners = [], adminL = [], admin = false;
    function read() {
      var raw = LS.get(KEY);
      if (!raw) return demoSeed();
      try { return JSON.parse(raw) || { ideas: {}, settings: {} }; } catch (e) { return { ideas: {}, settings: {} }; }
    }
    function write(d) { LS.set(KEY, JSON.stringify(d)); emit(); }
    function emit() { var d = read(); listeners.forEach(function (f) { f(d); }); }
    window.addEventListener('storage', function (e) { if (e.key === KEY) emit(); });
    function setAdmin(v) { admin = v; adminL.forEach(function (f) { f(v); }); }
    return {
      mode: 'demo',
      subscribe: function (cb) { listeners.push(cb); cb(read()); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; },
      addIdea: function (idea) {
        var d = read(); var id = 'idea_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        d.ideas[id] = idea; write(d); return Promise.resolve(id);
      },
      setVote: function (id, key, vote) {
        var d = read(); var i = d.ideas[id]; if (!i) return Promise.resolve();
        i.votes = i.votes || {};
        if (vote === null) delete i.votes[key]; else i.votes[key] = vote;
        write(d); return Promise.resolve();
      },
      deleteIdea: function (id) {
        if (!admin) return Promise.reject(new Error('Admin only'));
        var d = read(); delete d.ideas[id]; write(d); return Promise.resolve();
      },
      setSetting: function (k, v) {
        if (!admin) return Promise.reject(new Error('Admin only'));
        var d = read(); d.settings = d.settings || {}; d.settings[k] = v; write(d); return Promise.resolve();
      },
      adminLogin: function (email, pw) {
        if (pw === (CFG.DEMO_ADMIN_PASSWORD || 'admin')) { setAdmin(true); return Promise.resolve(); }
        return Promise.reject(new Error('Wrong password. (Demo mode: the password is set in config.js.)'));
      },
      adminLogout: function () { setAdmin(false); return Promise.resolve(); },
      clearAll: function () {
        if (!admin) return Promise.reject(new Error('Admin only'));
        var d = read(); d.ideas = {}; d.settings = d.settings || {}; d.settings.votingOpen = false; write(d); return Promise.resolve();
      },
      signIn: function () { return Promise.reject(new Error('Demo mode has no passwords.')); },
      onAuth: function (cb) { adminL.push(function (v) { cb(v ? 'admin' : 'room'); }); cb(admin ? 'admin' : 'room'); }
    };
  }

  // ---------- data layer: Firebase (shared by everyone) ----------
  function firebaseAdapter(onError) {
    if (!firebase.apps.length) firebase.initializeApp(CFG.firebase);
    var db = firebase.database();
    var auth = firebase.auth();
    // Stay signed in only while this browser tab is open.
    try { var pp = auth.setPersistence(firebase.auth.Auth.Persistence.SESSION); if (pp && pp.catch) pp.catch(function () {}); } catch (e) {}
    function roleOf(u) {
      if (!u || !u.email) return 'none';
      var em = String(u.email).toLowerCase();
      if (em === TEAM_EMAIL) return 'team';
      if (em === ROOM_EMAIL) return 'room';
      return 'admin';
    }
    return {
      mode: 'live',
      subscribe: function (cb) {
        var ideas = {}, settings = {};
        var rI = db.ref('ideas'), rS = db.ref('settings');
        function push() { cb({ ideas: ideas, settings: settings }); }
        var fI = function (s) { ideas = s.val() || {}; push(); };
        var fS = function (s) { settings = s.val() || {}; push(); };
        rI.on('value', fI, onError);
        rS.on('value', fS, onError);
        return function () { rI.off('value', fI); rS.off('value', fS); };
      },
      addIdea: function (idea) { var ref = db.ref('ideas').push(); return ref.set(idea).then(function () { return ref.key; }); },
      setVote: function (id, key, vote) { return db.ref('ideas/' + id + '/votes/' + key).set(vote); },
      deleteIdea: function (id) { return db.ref('ideas/' + id).remove(); },
      setSetting: function (k, v) { return db.ref('settings/' + k).set(v); },
      clearAll: function () { return db.ref('ideas').remove().then(function () { return db.ref('settings/votingOpen').set(false); }); },
      signIn: function (email, pw) { return auth.signInWithEmailAndPassword(email, pw); },
      adminLogin: function (email, pw) { return auth.signInWithEmailAndPassword(email, pw); },
      adminLogout: function () { return auth.signOut(); },
      onAuth: function (cb) { auth.onAuthStateChanged(function (u) { cb(roleOf(u)); }); }
    };
  }

  // ---------- state ----------
  var state = {
    ideas: [], settings: {}, me: LS.get('if-me') || '', isAdmin: false, role: 'none',
    view: 'all', journey: 'all', loaded: false, mode: 'demo', error: '', pendingDown: null
  };
  var store;

  function configured() {
    var f = CFG.firebase || {};
    return !!(f.apiKey && f.databaseURL && !/PASTE/i.test(f.apiKey + f.databaseURL));
  }

  function initStore() {
    if (configured() && typeof firebase !== 'undefined') {
      try {
        store = firebaseAdapter(function (err) {
          state.error = 'Cannot read from the database (' + (err && err.message ? err.message : 'unknown error') + '). Check the database rules in the Setup Guide.';
          renderAll();
        });
        state.mode = 'live';
        return;
      } catch (e) { state.error = 'Firebase could not start: ' + e.message; }
    } else if (configured()) {
      state.error = 'The Firebase library did not load (check your internet). Showing demo mode instead.';
    }
    store = demoAdapter();
    state.mode = 'demo';
  }

  function normalize(d) {
    state.ideas = Object.keys(d.ideas || {}).map(function (id) {
      var v = d.ideas[id] || {}; var o = {}; for (var k in v) o[k] = v[k];
      o.id = id; o.votes = v.votes || {}; return o;
    });
    state.settings = d.settings || {};
    state.loaded = true;
  }

  function tally(idea) {
    var ups = 0, downs = 0, reasons = [];
    Object.keys(idea.votes || {}).forEach(function (k) {
      var v = idea.votes[k];
      if (v.type === 'up') ups++;
      else if (v.type === 'down') { downs++; reasons.push(v.reason || ''); }
    });
    return { ups: ups, downs: downs, net: ups - downs, reasons: reasons };
  }
  function myVote(idea) {
    if (!state.me) return null;
    var v = (idea.votes || {})[keyOf(state.me)];
    return v ? v.type : null;
  }
  function topPicks() {
    return state.ideas.filter(function (i) { return i.doable && tally(i).net > 0; })
      .sort(function (a, b) {
        var ta = tally(a), tb = tally(b);
        return (tb.net - ta.net) || (tb.ups - ta.ups) || (a.createdAt - b.createdAt);
      }).slice(0, 2);
  }

  // ---------- tree drawing ----------
  function treeSVG(net) {
    var pct = Math.min(Math.max(0, net) / TREE, 1);
    var stage = pct < 0.15 ? 'seed' : pct < 0.35 ? 'sprout' : pct < 0.55 ? 'sapling' : pct < 0.75 ? 'young' : pct < 0.95 ? 'mature' : 'tree';
    var trunk = '#8B5E3C';
    var leaf = pct > 0.9 ? '#2E7D32' : pct > 0.6 ? '#43A047' : pct > 0.3 ? '#66BB6A' : '#A5D6A7';
    var s = '<svg viewBox="0 0 80 90" class="tree-svg" aria-hidden="true">';
    if (stage === 'seed') {
      s += '<ellipse cx="40" cy="78" rx="20" ry="5" fill="#C8A97E" opacity="0.3"/><circle cx="40" cy="72" r="7" fill="' + trunk + '"/>' +
        '<line x1="40" y1="65" x2="40" y2="55" stroke="' + trunk + '" stroke-width="1.5" stroke-dasharray="3"/><circle cx="40" cy="52" r="4" fill="' + leaf + '" opacity="0.6"/>';
    } else if (stage === 'sprout') {
      s += '<ellipse cx="40" cy="85" rx="22" ry="5" fill="#C8A97E" opacity="0.3"/><line x1="40" y1="85" x2="40" y2="50" stroke="' + trunk + '" stroke-width="3" stroke-linecap="round"/>' +
        '<ellipse cx="40" cy="44" rx="12" ry="10" fill="' + leaf + '"/><circle cx="32" cy="55" r="6" fill="' + leaf + '"/><circle cx="48" cy="55" r="6" fill="' + leaf + '"/>';
    } else if (stage === 'sapling') {
      s += '<ellipse cx="40" cy="87" rx="24" ry="5" fill="#C8A97E" opacity="0.3"/><line x1="40" y1="87" x2="40" y2="42" stroke="' + trunk + '" stroke-width="4" stroke-linecap="round"/>' +
        '<line x1="40" y1="65" x2="28" y2="55" stroke="' + trunk + '" stroke-width="2"/><line x1="40" y1="60" x2="52" y2="50" stroke="' + trunk + '" stroke-width="2"/>' +
        '<ellipse cx="40" cy="34" rx="18" ry="14" fill="' + leaf + '"/><circle cx="26" cy="48" r="9" fill="' + leaf + '"/><circle cx="54" cy="44" r="9" fill="' + leaf + '"/>';
    } else if (stage === 'young') {
      s += '<ellipse cx="40" cy="88" rx="25" ry="5" fill="#C8A97E" opacity="0.3"/><rect x="37" y="55" width="6" height="33" rx="3" fill="' + trunk + '"/>' +
        '<line x1="40" y1="70" x2="24" y2="58" stroke="' + trunk + '" stroke-width="2.5"/><line x1="40" y1="65" x2="56" y2="54" stroke="' + trunk + '" stroke-width="2.5"/>' +
        '<ellipse cx="40" cy="38" rx="22" ry="18" fill="' + leaf + '"/><circle cx="22" cy="50" r="12" fill="' + leaf + '"/><circle cx="58" cy="48" r="11" fill="' + leaf + '"/><circle cx="40" cy="22" r="10" fill="' + leaf + '" opacity="0.8"/>';
    } else if (stage === 'mature') {
      s += '<ellipse cx="40" cy="88" rx="26" ry="5" fill="#C8A97E" opacity="0.3"/><rect x="36" y="48" width="8" height="40" rx="4" fill="' + trunk + '"/>' +
        '<line x1="40" y1="72" x2="20" y2="60" stroke="' + trunk + '" stroke-width="3"/><line x1="40" y1="66" x2="60" y2="54" stroke="' + trunk + '" stroke-width="3"/>' +
        '<ellipse cx="40" cy="30" rx="26" ry="22" fill="' + leaf + '"/><circle cx="18" cy="48" r="14" fill="' + leaf + '"/><circle cx="62" cy="46" r="13" fill="' + leaf + '"/>' +
        '<circle cx="40" cy="14" r="13" fill="' + leaf + '" opacity="0.85"/><circle cx="26" cy="22" r="9" fill="' + leaf + '" opacity="0.7"/><circle cx="54" cy="20" r="9" fill="' + leaf + '" opacity="0.7"/>';
    } else {
      s += '<ellipse cx="40" cy="88" rx="28" ry="5" fill="#C8A97E" opacity="0.35"/><rect x="36" y="44" width="8" height="44" rx="4" fill="' + trunk + '"/>' +
        '<line x1="40" y1="74" x2="16" y2="60" stroke="' + trunk + '" stroke-width="3.5"/><line x1="40" y1="68" x2="64" y2="55" stroke="' + trunk + '" stroke-width="3.5"/>' +
        '<ellipse cx="40" cy="26" rx="28" ry="24" fill="' + leaf + '"/><circle cx="14" cy="46" r="15" fill="' + leaf + '"/><circle cx="66" cy="44" r="14" fill="' + leaf + '"/>' +
        '<circle cx="40" cy="8" r="15" fill="' + leaf + '" opacity="0.9"/><circle cx="22" cy="18" r="10" fill="' + leaf + '" opacity="0.8"/><circle cx="58" cy="16" r="10" fill="' + leaf + '" opacity="0.8"/>';
    }
    return s + '</svg>';
  }
  function stageLabel(net) {
    var pct = Math.min(Math.max(0, net) / TREE, 1);
    if (pct === 0) return 'Seed 🌰';
    if (pct < 0.35) return 'Sprout 🌱';
    if (pct < 0.65) return 'Sapling 🌿';
    if (pct < 0.95) return 'Growing 🌲';
    return 'Full tree 🌳';
  }

  // ---------- shell ----------
  function headerHTML() {
    return '<header><div class="header-inner">' +
      '<a class="logo" href="index.html"><div class="logo-icon">🌳</div><div class="logo-text"><h1>IdeaForest</h1><p>' + esc(CFG.WORKSHOP_TITLE || '') + '</p></div></a>' +
      '<nav class="nav"><a href="prepare.html" class="' + (PAGE === 'pre' ? 'active' : '') + '">🌱 Before the workshop</a>' +
      '<a href="workshop.html" class="' + (PAGE === 'live' ? 'active' : '') + '">🌳 In the workshop</a></nav>' +
      '<div class="who" id="who"></div></div></header>';
  }
  function renderWho() {
    var el = $('#who'); if (!el) return;
    var h = '';
    if (state.me) h += '<button class="chip" data-act="switch-name" title="Not you? Click to switch">👤 ' + esc(state.me) + ' · switch</button>';
    else h += '<button class="chip" data-act="switch-name">👤 Pick your name</button>';
    if (state.isAdmin) h += '<button class="chip admin-on" data-act="admin-logout" title="Click to log out">🔑 Admin · log out</button>';
    else h += '<button class="chip" data-act="admin-open">🔑 Admin</button>';
    el.innerHTML = h;
  }

  function renderBanners() {
    var el = $('#banners'); if (!el) return;
    var h = '';
    if (state.mode === 'demo') h += '<div class="banner-demo"><b>Demo mode.</b> Nothing you do here is shared with anyone and it only lives in this browser. Connect Firebase (Setup Guide, Part 1) to go live.</div>';
    if (state.error) h += '<div class="banner-warn">⚠️ ' + esc(state.error) + '</div>';
    el.innerHTML = h;
  }

  function ageNote() {
    if (!state.ideas.length) return '';
    var oldest = Math.min.apply(null, state.ideas.map(function (i) { return i.createdAt || Date.now(); }));
    var days = Math.floor((Date.now() - oldest) / 86400000);
    return '<span class="age-note ' + (days >= 5 ? 'due' : '') + '">Oldest idea: ' + days + ' day' + (days === 1 ? '' : 's') + ' old' + (days >= 5 ? ' · time to export and clear' : '') + '</span>';
  }
  function adminBarHTML() {
    if (!state.isAdmin) return '';
    var open = !!state.settings.votingOpen;
    var h = '<div class="admin-bar">';
    if (PAGE === 'live') h += '<button class="btn small ' + (open ? 'danger' : '') + '" data-act="toggle-voting">' + (open ? '🔒 Close voting' : '🗳️ Open voting') + '</button>';
    h += '<button class="btn small secondary" data-act="export">⬇ Export all to CSV</button>' +
      '<button class="btn small danger" data-act="clear-open">🗑 Clear all data</button>' + ageNote() + '</div>';
    return h;
  }
  function renderStatus() {
    var el = $('#status-bar'); if (!el) return;
    var open = !!state.settings.votingOpen;
    el.className = 'status-bar ' + (open ? 'open' : 'closed');
    el.innerHTML = '<div>' + (open
      ? '🗳️ <b>Voting is open.</b> One vote per idea. A downvote 🍂 needs a reason. You cannot vote on your own idea.'
      : '🔒 <b>Voting is closed.</b> Plant ideas now; your facilitator will open voting.') + '</div>' + adminBarHTML();
  }
  function renderAdminBarPre() {
    var el = $('#admin-bar'); if (el) el.innerHTML = adminBarHTML();
  }

  function renderTop() {
    var el = $('#top-banner'); if (!el) return;
    var picks = topPicks();
    var h = '<h2>🏆 Top 2 feasible ideas</h2><p class="s">Ranked by net votes, counting only ideas marked feasible (no major capital spend, first version within about 6 months).</p><div class="top-list">';
    if (!picks.length) h += '<div class="top-badge"><div class="rank">Waiting for votes</div><div class="nm">—</div></div>';
    picks.forEach(function (i, n) {
      var t = tally(i);
      h += '<div class="top-badge"><div class="rank">' + (n === 0 ? '🥇 1st' : '🥈 2nd') + '</div><div class="nm">' + esc(i.title) + '</div><div class="vc">' + t.net + ' net votes · ' + esc(FIX[i.fixType] ? FIX[i.fixType].label : '') + '</div></div>';
    });
    el.className = 'top-banner'; el.innerHTML = h + '</div>';
  }

  function renderFilters() {
    var el = $('#filters'); if (!el) return;
    var chips = PAGE === 'live'
      ? [['all', 'All ideas'], ['doable', '✅ Feasible only'], ['growing', '🌱 Growing'], ['tree', '🌳 Full trees'], ['newest', '✨ Newest']]
      : [['all', 'All ideas'], ['doable', '✅ Feasible only'], ['newest', '✨ Newest']];
    var h = '<span class="sub" style="margin:0">Show:</span>';
    chips.forEach(function (c) { h += '<button class="filter-btn ' + (state.view === c[0] ? 'active' : '') + '" data-act="set-view" data-view="' + c[0] + '">' + c[1] + '</button>'; });
    h += '<select id="journey-filter" aria-label="Filter by journey"><option value="all">All journeys</option>';
    JOURNEYS.forEach(function (j) { h += '<option value="' + esc(j.id) + '"' + (state.journey === j.id ? ' selected' : '') + '>' + esc(j.label.split(':')[0]) + '</option>'; });
    el.innerHTML = h + '</select>';
  }

  function visibleIdeas() {
    var list = state.ideas.slice();
    if (state.journey !== 'all') list = list.filter(function (i) { return i.journey === state.journey; });
    if (state.view === 'doable') list = list.filter(function (i) { return i.doable; });
    else if (state.view === 'growing') list = list.filter(function (i) { return tally(i).net < TREE; });
    else if (state.view === 'tree') list = list.filter(function (i) { return tally(i).net >= TREE; });
    if (state.view === 'newest' || PAGE === 'pre') list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    else list.sort(function (a, b) { return (tally(b).net - tally(a).net) || (b.createdAt - a.createdAt); });
    return list;
  }

  function cardHTML(idea) {
    var t = tally(idea), net = t.net, pct = Math.min(Math.max(0, net) / TREE * 100, 100);
    var isTree = PAGE === 'live' && net >= TREE;
    var mine = myVote(idea);
    var own = state.me && idea.authorKey === keyOf(state.me);
    var canVote = state.settings.votingOpen && state.me && !own;
    var h = '<div class="idea-card ' + (isTree ? 'is-tree' : '') + '" data-id="' + esc(idea.id) + '">';
    if (isTree) h += '<span class="ribbon">🏆 Ready for review</span>';
    if (PAGE === 'live') {
      h += '<div class="tree-visual">' + treeSVG(net) + '<span class="growth-label">' + stageLabel(net) + '</span></div>' +
        '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-meta"><span>🍃 ' + net + ' net</span><span>' + Math.round(pct) + '% to full tree (' + TREE + ')</span></div>';
    }
    h += '<div class="tags"><span class="tag">' + esc(journeyLabel(idea.journey)) + '</span>' +
      (FIX[idea.fixType] ? '<span class="tag fix">' + FIX[idea.fixType].label + '</span>' : '') +
      '<span class="tag ' + (idea.doable ? 'ok' : 'big') + '">' + (idea.doable ? '✅ Feasible' : '⚠️ Big') + (idea.effort ? ' · ' + esc(idea.effort) : '') + '</span></div>';
    h += '<div class="idea-title">' + esc(idea.title) + '</div><div class="idea-desc">' + esc(idea.idea) + '</div>';
    var ev = '';
    if (idea.moment) ev += '<div><b>The moment:</b> ' + esc(idea.moment) + '</div>';
    if (idea.proof) ev += '<div><b>The proof:</b> ' + linkify(idea.proof) + '</div>';
    if (idea.outside) ev += '<div><b>The outside look:</b> ' + linkify(idea.outside) + '</div>';
    if (ev) h += '<div class="evidence">' + ev + '</div>';
    if (PAGE === 'live' && t.reasons.length) h += t.reasons.map(function (r) { return '<div class="downvote-reason">“' + esc(r) + '”</div>'; }).join('');
    h += '<div class="idea-footer"><div class="idea-author"><div class="avatar">' + esc((idea.author || '?').charAt(0).toUpperCase()) + '</div>' + esc(idea.author || 'Anonymous') + '</div>';
    if (PAGE === 'live') {
      h += '<div class="vote-actions">' +
        '<button class="vote-btn vote-up ' + (mine === 'up' ? 'mine' : '') + '" data-act="up" ' + (canVote ? '' : 'data-blocked="1"') + ' title="Vote up">🍃 ' + t.ups + '</button>' +
        '<button class="vote-btn vote-down ' + (mine === 'down' ? 'mine' : '') + '" data-act="down" ' + (canVote ? '' : 'data-blocked="1"') + ' title="Vote down (reason required)">🍂 ' + t.downs + '</button></div>';
    }
    h += '</div><div class="idea-date"><span>🌱 Planted ' + timeAgo(idea.createdAt) + (idea.stage === 'live' ? ' · in the room' : '') + '</span>' +
      (state.isAdmin ? '<button class="del-btn" data-act="delete">Delete</button>' : '') + '</div></div>';
    return h;
  }

  function renderGrid() {
    var el = $('#grid'); if (!el) return;
    if (!state.loaded) { el.innerHTML = '<div class="loading">Loading the forest…</div>'; return; }
    var list = visibleIdeas();
    var cnt = $('#idea-count'); if (cnt) cnt.textContent = '(' + state.ideas.length + ')';
    if (!list.length) {
      el.innerHTML = '<div class="empty-state"><span class="big-icon">🌰</span><h3>' + (state.ideas.length ? 'No ideas match this filter' : 'The forest is empty!') + '</h3><p>' +
        (state.ideas.length ? 'Try a different filter.' : 'Be the first to plant an idea.') + '</p></div>';
      return;
    }
    el.innerHTML = list.map(cardHTML).join('');
  }

  function renderAll() {
    renderWho(); renderBanners();
    if (PAGE === 'live') { renderStatus(); renderTop(); } else renderAdminBarPre();
    renderFilters(); renderGrid();
  }

  // ---------- modals ----------
  function openModal(html) {
    closeModal();
    var o = document.createElement('div'); o.className = 'modal-overlay'; o.id = 'modal';
    o.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    o.addEventListener('mousedown', function (e) { if (e.target === o) closeModal(); });
    document.body.appendChild(o);
    var first = o.querySelector('input,textarea,select,button.name-btn'); if (first) first.focus();
  }
  function closeModal() { var m = $('#modal'); if (m) m.parentNode.removeChild(m); }

  function namePickerHTML() {
    var h = '<h2>👤 Who are you?</h2><p class="sub">Pick your name so your ideas and votes are counted once. You can switch later from the top of the page.</p>';
    if (NAMES.length) {
      h += '<div class="name-grid">' + NAMES.map(function (n) { return '<button class="name-btn" data-act="choose-name" data-name="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') + '</div>';
    } else {
      h += '<input type="text" id="name-input" placeholder="Your name" maxlength="40"><div class="modal-actions"><button class="btn" data-act="choose-typed">Continue</button></div>';
    }
    return h;
  }
  function chooseName(n) {
    state.me = n; LS.set('if-me', n); closeModal(); renderAll(); updatePlantAs();
    toast('Hi ' + n + '! 🌱', 'success');
  }

  // ---------- plant form ----------
  function journeyOptions() {
    return '<option value="">Choose a journey…</option>' + JOURNEYS.map(function (j) { return '<option value="' + esc(j.id) + '">' + esc(j.label) + '</option>'; }).join('');
  }
  function radioFix() {
    return '<div class="radio-row">' + Object.keys(FIX).map(function (k) {
      return '<label><input type="radio" name="f-fix" value="' + k + '"><span><b>' + FIX[k].label + '</b><br><span class="hint" style="margin:0">' + FIX[k].hint + '</span></span></label>';
    }).join('') + '</div>';
  }
  function formHTML(stage) {
    var pre = stage === 'pre';
    var opt = pre ? '' : ' <span class="hint" style="display:inline">(if you have it)</span>';
    return '<div class="form" data-stage="' + stage + '">' +
      '<label for="f-journey">Which journey does this belong to?</label><select id="f-journey">' + journeyOptions() + '</select>' +
      '<label for="f-title">Name your idea in one line</label><input type="text" id="f-title" maxlength="120" placeholder="e.g. create a VIP equivalent unique customer profile of all those who request assisted travel, for targeted handling and marketing.">' +
      '<hr class="divider">' +
      '<label for="f-moment">1. The moment</label><span class="hint">Where in the journey does the customer get let down, and what do they experience? Or what frustrates you that operations should be fixing, but is not? Or what would you like to initiate even if it doesn’t frustrate you.</span>' +
      '<textarea id="f-moment" rows="3" maxlength="600"></textarea>' +
      '<label for="f-proof">2. The proof' + opt + '</label><span class="hint">One real example: a complaint, something you lived through as a customer or at the airport, a news or social media post. What led you to believe this is a problem worth solving.</span>' +
      '<textarea id="f-proof" rows="2" maxlength="600"></textarea>' +
      '<label for="f-outside">3. The outside look' + opt + '</label><span class="hint">What do other airlines or industries do about this? Have others solved this? Is there a best practice you wish to replicate? One search, website reading or one chat with a good AI platform is enough. Paste a link or explain what you found. Spend 30 mins to ensure idea is solid!</span>' +
      '<textarea id="f-outside" rows="2" maxlength="600"></textarea>' +
      '<hr class="divider">' +
      '<label for="f-idea">Your idea: what is the fix?</label><span class="hint">Two or three sentences. What would we change, and what would the customer notice? You need not have the complete solution, just a direction.</span>' +
      '<textarea id="f-idea" rows="3" maxlength="600"></textarea>' +
      '<label>4. Which kind of fix is it?</label>' + radioFix() +
      '<label>Is it doable?</label>' +
      '<span class="hint">Can it be delivered without new aircraft, airport infrastructure or a major capital purchase?</span>' +
      '<div class="radio-row compact"><label><input type="radio" name="f-capex" value="yes"> Yes</label><label><input type="radio" name="f-capex" value="no"> No</label></div>' +
      '<span class="hint">Could a first version go live within about 6 months?</span>' +
      '<div class="radio-row compact"><label><input type="radio" name="f-six" value="yes"> Yes</label><label><input type="radio" name="f-six" value="no"> No</label></div>' +
      '<div class="nudge" id="f-nudge">💡 We don’t need to stop thinking big! But think if a smaller first step solves the same frustration? You can still plant it as is though.</div>' +
      '<label for="f-effort">Rough size of the first version</label><select id="f-effort"><option value="">Choose…</option>' +
      Object.keys(EFFORT).map(function (k) { return '<option value="' + k + '">' + EFFORT[k] + '</option>'; }).join('') + '</select>' +
      '</div>';
  }
  function radioVal(name, root) { var r = (root || document).querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }

  function collectForm(root) {
    var stage = root.getAttribute('data-stage');
    var v = function (id) { var e = root.querySelector('#' + id); return e ? e.value.trim() : ''; };
    var f = {
      journey: v('f-journey'), title: v('f-title'), moment: v('f-moment'), proof: v('f-proof'), outside: v('f-outside'),
      idea: v('f-idea'), fixType: radioVal('f-fix', root), capex: radioVal('f-capex', root), six: radioVal('f-six', root), effort: v('f-effort')
    };
    var missing = null;
    if (!state.me) missing = 'Pick your name first (top right).';
    else if (!f.journey) missing = 'Choose a journey.';
    else if (!f.title) missing = 'Give your idea a one-line name.';
    else if (!f.moment) missing = 'Describe the moment (box 1).';
    else if (stage === 'pre' && !f.proof) missing = 'Add the proof (box 2): one real example.';
    else if (stage === 'pre' && !f.outside) missing = 'Add the outside look (box 3): what do others do?';
    else if (!f.idea) missing = 'Describe your idea (what is the fix?).';
    else if (!f.fixType) missing = 'Choose the kind of fix (governance, process or automation).';
    else if (!f.capex || !f.six) missing = 'Answer both feasibility questions.';
    else if (!f.effort) missing = 'Choose the rough size.';
    return { stage: stage, f: f, missing: missing };
  }

  function submitIdea(root) {
    var r = collectForm(root);
    if (r.missing) { toast(r.missing, 'error'); return; }
    var f = r.f;
    var idea = {
      author: state.me, authorKey: keyOf(state.me), stage: r.stage, journey: f.journey, title: f.title,
      idea: f.idea, moment: f.moment, proof: f.proof, outside: f.outside, fixType: f.fixType,
      noCapex: f.capex === 'yes', sixMonths: f.six === 'yes', effort: f.effort,
      doable: f.capex === 'yes' && f.six === 'yes', createdAt: Date.now()
    };
    var btn = root.parentNode.querySelector('[data-act="submit-idea"]'); if (btn) btn.disabled = true;
    store.addIdea(idea).then(function () {
      toast('🌱 Planted! Watch it grow.', 'success');
      if (PAGE === 'live') closeModal(); else resetForm(root);
    }).catch(function (e) {
      toast('Could not save: ' + (e && e.message ? e.message : e), 'error');
    }).then(function () { if (btn) btn.disabled = false; });
  }
  function resetForm(root) {
    root.querySelectorAll('input[type=text],textarea').forEach(function (e) { e.value = ''; });
    root.querySelectorAll('select').forEach(function (e) { e.selectedIndex = 0; });
    root.querySelectorAll('input[type=radio]').forEach(function (e) { e.checked = false; });
    var n = root.querySelector('#f-nudge'); if (n) n.classList.remove('show');
  }

  // ---------- admin ----------
  function adminModalHTML() {
    return '<h2>🔑 Admin login</h2><p class="sub">Only the facilitator needs this. ' + (state.mode === 'demo' ? 'Demo mode: use the demo password from config.js.' : 'Use the admin email and password you created in Firebase.') + '</p>' +
      (state.mode === 'live' ? '<label for="a-email">Email</label><input type="email" id="a-email" autocomplete="username">' : '') +
      '<label for="a-pass">Password</label><input type="password" id="a-pass" autocomplete="current-password">' +
      '<div class="modal-actions"><button class="btn secondary" data-act="close-modal">Cancel</button><button class="btn" data-act="admin-login">Log in</button></div>';
  }
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCSV() {
    var head = ['Planted by', 'Stage', 'Journey', 'Title', 'Idea', 'The moment', 'The proof', 'The outside look', 'Fix type', 'No major capex', 'First version in 6 months', 'Size', 'Doable', 'Up votes', 'Down votes', 'Net', 'Down-vote reasons'];
    var rows = state.ideas.slice().sort(function (a, b) { return tally(b).net - tally(a).net; }).map(function (i) {
      var t = tally(i);
      return [i.author, i.stage, journeyLabel(i.journey), i.title, i.idea, i.moment, i.proof, i.outside, i.fixType, i.noCapex ? 'yes' : 'no', i.sixMonths ? 'yes' : 'no', i.effort, i.doable ? 'yes' : 'no', t.ups, t.downs, t.net, t.reasons.join(' | ')];
    });
    var csv = [head].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ideaforest-ideas.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('Exported ' + rows.length + ' ideas.', 'success');
  }

  function clearModalHTML() {
    return '<h2>🗑 Clear all data</h2><p class="sub">This permanently deletes all ' + state.ideas.length + ' ideas, votes and reasons for everyone, and closes voting. It cannot be undone.</p>' +
      '<div class="modal-actions" style="justify-content:flex-start;margin:0 0 16px"><button class="btn small secondary" data-act="export">⬇ Export to CSV first</button></div>' +
      '<label for="clear-confirm">Type CLEAR to confirm</label><input type="text" id="clear-confirm" autocomplete="off">' +
      '<div class="modal-actions"><button class="btn secondary" data-act="close-modal">Cancel</button><button class="btn danger" data-act="clear-confirm">Clear everything</button></div>';
  }

  // ---------- voting ----------
  function ideaById(id) { for (var i = 0; i < state.ideas.length; i++) if (state.ideas[i].id === id) return state.ideas[i]; return null; }
  function blockedReason(idea) {
    if (!state.me) return 'Pick your name first (top right).';
    if (idea.authorKey === keyOf(state.me)) return 'That is your idea. Your colleagues will vote on it.';
    if (!state.settings.votingOpen) return 'Voting is not open yet.';
    return '';
  }
  function castVote(id, vote) {
    return store.setVote(id, keyOf(state.me), vote).catch(function (e) { toast('Could not save your vote: ' + (e && e.message ? e.message : e), 'error'); });
  }
  function onVote(id, type) {
    var idea = ideaById(id); if (!idea) return;
    var why = blockedReason(idea);
    if (why) { toast(why, 'error'); return; }
    var mine = myVote(idea);
    if (type === 'up') {
      if (mine === 'up') castVote(id, null).then(function () { toast('Vote removed.'); });
      else castVote(id, { type: 'up', name: state.me, at: Date.now() }).then(function () { toast('🍃 Leaf added!', 'success'); });
    } else {
      if (mine === 'down') { castVote(id, null).then(function () { toast('Vote removed.'); }); return; }
      state.pendingDown = id;
      openModal('<h2>🍂 Remove a leaf</h2><p class="sub">Tell us why this idea would not work. The author will see your reason (not your name).</p>' +
        '<label for="dv-reason">Your reason (required)</label><textarea id="dv-reason" rows="3" maxlength="300" placeholder="e.g. Needs a system change we cannot get in 6 months; another team already owns this…"></textarea>' +
        '<div class="modal-actions"><button class="btn secondary" data-act="close-modal">Cancel</button><button class="btn danger" data-act="confirm-down">Submit 🍂</button></div>');
    }
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    if (t.tagName === 'A') e.preventDefault();
    var act = t.getAttribute('data-act');
    var card = t.closest('.idea-card'); var id = card ? card.getAttribute('data-id') : null;
    if (act === 'switch-name') openModal(namePickerHTML());
    else if (act === 'choose-name') chooseName(t.getAttribute('data-name'));
    else if (act === 'choose-typed') { var n = ($('#name-input').value || '').trim(); if (n) chooseName(n); }
    else if (act === 'close-modal') closeModal();
    else if (act === 'admin-open') openModal(adminModalHTML());
    else if (act === 'admin-login') {
      var em = $('#a-email'); var pw = $('#a-pass').value;
      store.adminLogin(em ? em.value.trim() : '', pw).then(function () { closeModal(); toast('Logged in as admin.', 'success'); })
        .catch(function (err) { toast(err && err.message ? err.message : 'Login failed', 'error'); });
    }
    else if (act === 'admin-logout') store.adminLogout().then(function () { toast('Logged out.'); });
    else if (act === 'toggle-voting') store.setSetting('votingOpen', !state.settings.votingOpen).catch(function (err) { toast('Could not change: ' + err.message, 'error'); });
    else if (act === 'export') exportCSV();
    else if (act === 'clear-open') openModal(clearModalHTML());
    else if (act === 'clear-confirm') {
      if (($('#clear-confirm').value || '').trim() !== 'CLEAR') { toast('Type CLEAR in capital letters to confirm.', 'error'); return; }
      store.clearAll().then(function () { closeModal(); toast('All data cleared.', 'success'); })
        .catch(function (err) { toast('Could not clear: ' + (err && err.message ? err.message : err), 'error'); });
    }
    else if (act === 'gate-login') gateLogin();
    else if (act === 'set-view') { state.view = t.getAttribute('data-view'); renderFilters(); renderGrid(); }
    else if (act === 'up') onVote(id, 'up');
    else if (act === 'down') onVote(id, 'down');
    else if (act === 'confirm-down') {
      var reason = ($('#dv-reason').value || '').trim();
      if (reason.length < 4) { toast('Please give a short reason.', 'error'); return; }
      var pid = state.pendingDown; closeModal();
      castVote(pid, { type: 'down', name: state.me, reason: reason, at: Date.now() }).then(function () { toast('🍂 Feedback recorded.', 'error'); });
    }
    else if (act === 'delete') {
      var idea = ideaById(id); if (!idea) return;
      if (window.confirm('Delete "' + idea.title + '" for everyone? This cannot be undone.')) {
        store.deleteIdea(id).then(function () { toast('Idea deleted.'); }).catch(function (err) { toast('Could not delete: ' + err.message, 'error'); });
      }
    }
    else if (act === 'plant-open') {
      if (!state.me) { openModal(namePickerHTML()); return; }
      openModal('<h2>🌱 Plant a new idea</h2><p class="sub">Planting as <b>' + esc(state.me) + '</b>. Proof and outside look are optional in the room, but ideas with evidence get more leaves.</p>' + formHTML('live') +
        '<div class="modal-actions"><button class="btn secondary" data-act="close-modal">Cancel</button><button class="btn" data-act="submit-idea">Plant it 🌱</button></div>');
    }
    else if (act === 'submit-idea') {
      var root = t.closest('.modal, .card'); var form = root && root.querySelector('.form'); if (form) submitIdea(form);
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'journey-filter') { state.journey = e.target.value; renderGrid(); }
    if (e.target.name === 'f-capex' || e.target.name === 'f-six') {
      var form = e.target.closest('.form'); if (!form) return;
      var bad = radioVal('f-capex', form) === 'no' || radioVal('f-six', form) === 'no';
      var n = form.querySelector('#f-nudge'); if (n) n.classList.toggle('show', bad);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  // ---------- start ----------
  function buildPage() {
    var main;
    if (PAGE === 'pre') {
      main = '<main class="container">' +
        '<div class="hero"><h2>Plant an idea before we meet</h2><p>You know where customers get let down, whether from years at the airport or from your own frustrating trips. Plant one idea backed by a real example and back it with some background work and research. E.g. a quick look at what others do or what is the customer promise that we are not delivering on. 30 mins should be enough!</p>' +
        '<ul><li>Think of a time you thought: <i>“Operations should be fixing this. Why is it not fixed?”</i></li><li>Back it with one real example and one look at what others do.</li><li>Keep it doable: a smaller first step beats a giant project.</li></ul></div>' +
        '<div id="banners"></div><div id="admin-bar" style="margin-bottom:16px"></div>' +
        '<section class="card" id="form-card"><h2>🌱 Your Evidence Seed</h2><p class="sub">Planting as <b id="plant-as">…</b>. All fields marked 1 to 4 are needed.</p>' + formHTML('pre') +
        '<div class="form-actions"><button class="btn" data-act="submit-idea">Plant it 🌱</button></div></section>' +
        '<div class="section-head"><h2 class="section-title">Ideas planted so far <span id="idea-count"></span></h2></div>' +
        '<div class="filters" id="filters"></div><div class="ideas-grid" id="grid"></div></main>';
    } else {
      main = '<main class="container"><div id="banners"></div><div id="status-bar" class="status-bar closed"></div><div id="top-banner"></div>' +
        '<div class="section-head"><h2 class="section-title">The forest <span id="idea-count"></span></h2></div>' +
        '<div class="filters" id="filters"></div><div class="ideas-grid" id="grid"></div></main>' +
        '<button class="btn fab" data-act="plant-open">🌱 Plant an idea</button>';
    }
    document.getElementById('app').innerHTML = headerHTML() + main + '<div class="toast" id="toast"></div>';
  }

  function updatePlantAs() { var e = $('#plant-as'); if (e) e.textContent = state.me || '(pick your name, top right)'; }

  // ---------- sign-in gate ----------
  function showGate() {
    closeModal();
    var msg = PAGE === 'pre'
      ? 'Enter the team password from your invitation email.'
      : (state.role === 'team' ? 'The live forest opens with the room password, which is shared in the workshop.' : 'Enter the room password shared in the workshop.');
    document.getElementById('app').innerHTML = '<div class="card gate"><h2>🌳 IdeaForest</h2><p class="sub">' + msg + '</p>' +
      '<label for="gate-pw">Password</label><input type="password" id="gate-pw" autocomplete="current-password">' +
      '<div class="form-actions"><button class="btn" data-act="gate-login">Enter</button></div>' +
      '<p class="sub" style="margin:14px 0 0">Facilitator? <a href="#" data-act="admin-open">Log in here</a></p></div><div class="toast" id="toast"></div>';
    var pw = $('#gate-pw');
    if (pw) { pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') gateLogin(); }); pw.focus(); }
  }
  function gateLogin() {
    var el = $('#gate-pw'); var pw = el ? el.value : '';
    if (!pw) { toast('Type the password.', 'error'); return; }
    var email = PAGE === 'pre' ? TEAM_EMAIL : ROOM_EMAIL;
    store.signIn(email, pw).catch(function (err) {
      var txt = ((err && err.code) || '') + ' ' + ((err && err.message) || '');
      toast(/network/i.test(txt) ? 'No connection. Check your internet.' : 'That password does not match.', 'error');
    });
  }

  // ---------- start ----------
  var built = false, unsub = null;
  function allowed() {
    var ok = PAGE === 'pre' ? ['team', 'room', 'admin'] : ['room', 'admin'];
    return ok.indexOf(state.role) >= 0;
  }
  function route() {
    if (!allowed()) {
      if (unsub) { unsub(); unsub = null; }
      built = false; state.loaded = false; state.ideas = []; state.settings = {};
      showGate();
      return;
    }
    if (!built) {
      buildPage();
      unsub = store.subscribe(function (d) { normalize(d); renderAll(); updatePlantAs(); });
      built = true;
      if (!state.me) openModal(namePickerHTML());
    }
    renderAll(); updatePlantAs();
  }

  function start() {
    var app = document.getElementById('app'); if (!app) return;
    app.innerHTML = '<div class="loading">Loading…</div><div class="toast" id="toast"></div>';
    initStore();
    store.onAuth(function (role) { state.role = role; state.isAdmin = role === 'admin'; route(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
