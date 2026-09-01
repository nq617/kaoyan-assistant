'use strict';

/* ================================================================
   考研数学一 · 刷题助手 v2
   题库来源：大观园 cxyonly.fans（数一真题 + 高价值模拟题）
   规则：微分方程前 100% 真题；之后+线代+概率 ≈8成真题2成模拟
   分值权重：高数上40.3 / 高数下45.7 / 线代32 / 概率32（2021-2026平均）
   功能：每日卷子、全卷150分、章节刷题、错题本、AI思路提示
================================================================ */

var LS_PROGRESS = 's1_progress';
var LS_HISTORY = 's1_history';
var LS_HINTS = 's1_hints';
var API_BASE = 'https://api.deepseek.com';

/* ============ 章节 ============ */
var CHAPTERS = window.MATH_CHAPTERS || [];
function chapterById(id) {
  for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return CHAPTERS[i];
  return null;
}
function activeChapters() { return CHAPTERS.filter(function (c) { return !c.ref; }); }

/* ============ 题库懒加载 ============ */
function dataKey(ch) { return 'MATH_DATA_' + ch.toUpperCase().replace(/-/g, '_'); }
function isLoaded(ch) { return !!window[dataKey(ch)]; }
function byCh(ch) { return window[dataKey(ch)] || []; }
function loadChapterFiles(ids) {
  var todo = ids.filter(function (id) { return !isLoaded(id); });
  return Promise.all(todo.map(function (id) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'data/' + id + '.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('题库加载失败: ' + id)); };
      document.head.appendChild(s);
    });
  }));
}

/* ============ 数据 ============ */
function loadLS(k, def) {
  try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : def; } catch (e) { return def; }
}
function saveLS(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
}
function apiKey() {
  try { return localStorage.getItem('ds_chat_key') || ''; } catch (e) { return ''; }
}
function hintModel() {
  try { return localStorage.getItem('ds_hint_model') || 'deepseek-chat'; } catch (e) { return 'deepseek-chat'; }
}

/* ============ 错题本记忆周期（艾宾浩斯式间隔复习） ============ */
var SRS_INTERVALS = [1, 2, 4, 7, 15, 30]; // 天
function pad2(n) { return String(n).padStart(2, '0'); }
function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function addDaysStr(dateStr, n) {
  var p = dateStr.split('-');
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function srsStageLabel(srs) {
  if (!srs) return '';
  if (srs.done) return '已掌握';
  if (srs.stage === 0) return '新错题 · 明天复习';
  var labels = ['', '第1次复习', '第2次复习', '第3次复习', '第4次复习', '第5次复习'];
  var idx = Math.min(srs.stage, 5);
  return labels[idx] + ' · ' + srs.next + ' 复习';
}
function srsDue(qid) {
  var p = loadLS(LS_PROGRESS, {});
  var r = p[qid];
  if (!r || !r.srs || r.srs.done) return false;
  return r.srs.next <= todayStr();
}
function dueCount() {
  var p = loadLS(LS_PROGRESS, {});
  var n = 0;
  Object.keys(p).forEach(function (k) { if (srsDue(k)) n++; });
  return n;
}
function advanceSrsRecord(r) {
  if (!r.srs || r.srs.done) return;
  var stage = r.srs.stage + 1;
  if (stage > 5) {
    r.srs.done = true;
  } else {
    r.srs.stage = stage;
    r.srs.next = addDaysStr(todayStr(), SRS_INTERVALS[stage]);
  }
}
function resetSrsRecord(r) {
  r.srs = { stage: 0, next: addDaysStr(todayStr(), 1), done: false };
}

/* ============ 随机 ============ */
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
function todaySeed() {
  var d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/* ============ 工具 ============ */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
var toastTimer = null;
function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
}
/* markdown-lite：**加粗** + 换行（LaTeX 由 KaTeX 处理） */
function fmtText(s) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
}
function renderMath() {
  if (window.renderMathInElement) {
    try {
      renderMathInElement($('view'), {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (e) { /* 忽略 */ }
  }
}

/* ============ 视图状态 ============ */
var view = { name: 'home', param: null };
var currentPaper = null;
var practice = null;

function tagHTML(q) {
  var src = q.t === '真题' ? ('真题' + (q.y || '')) : '模拟';
  var cls = q.t === '真题' ? 'tag-real' : (q.ch === 'doubleint' ? 'tag-ref' : 'tag-mock');
  return '<span class="tag ' + cls + '">' + esc(src) + '</span>';
}
function srcLabel(q) {
  return q.src ? ' · ' + esc(q.src) : '';
}
function questionBodyHTML(q, revealed) {
  var opts = '';
  if (q.o && q.o.length) {
    opts = '<div class="opts">' + q.o.map(function (o) {
      var l = String(o).charAt(0);
      return '<div class="opt"><b>' + esc(l) + '.</b> ' + fmtText(String(o).slice(2)) + '</div>';
    }).join('') + '</div>';
  }
  var ans = '';
  if (revealed) {
    ans = '<div class="answer"><div class="ans-label">✅ 答案：' + fmtText(q.a) + '</div>' +
      (q.s ? '<div class="ans-s">📖 解析：' + fmtText(q.s) + '</div>' : '') + '</div>';
  }
  return opts + ans;
}
function hintBoxHTML(qid) {
  var cache = loadLS(LS_HINTS, {});
  var cached = cache[qid];
  var body = cached
    ? '<div class="hint-body">' + fmtText(cached) + '</div>'
    : '<div class="hint-body hint-loading">💭 正在生成思路提示…</div>';
  return '<div class="hint-box" id="hintbox-' + qid + '">' +
    '<div class="hint-head">💡 思路提示 <span class="hint-tag">' + (cached ? '已缓存' : '') + '</span></div>' +
    body + '</div>';
}

/* ============ 主渲染 ============ */
function render() {
  var v = $('view');
  if (view.name === 'home') renderHome(v);
  else if (view.name === 'paper') renderPaper(v);
  else if (view.name === 'chapter') renderChapterPractice(v);
  else if (view.name === 'wrong') renderWrong(v);
  else if (view.name === 'ref') renderRef(v);
  else if (view.name === 'placeholder') renderPlaceholder(v);
  else if (view.name === 'review') renderReview(v);
  else if (view.name === 'quiz') renderQuiz(v);
  updateTabs();
  updateHeader();
  updateBadges();
  renderMath();
  window.scrollTo(0, 0);
}

function updateTabs() {
  var map = { home: 'math', wrong: 'wrong', review: 'review', quiz: 'review' };
  var active = map[view.name] || (view.name === 'placeholder' ? view.param : 'math');
  document.querySelectorAll('.tabbar .tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === active);
  });
}
function updateHeader() {
  var p = loadLS(LS_PROGRESS, {});
  var total = 0, right = 0;
  Object.keys(p).forEach(function (k) {
    var r = p[k];
    total += (r.r || 0) + (r.w || 0);
    right += (r.r || 0);
  });
  $('statTotal').textContent = total;
  $('statRate').textContent = total ? Math.round(right / total * 100) + '%' : '—';
  var due = dueCount();
  var chip = $('statDue');
  if (chip) {
    chip.textContent = '🔔 待复习 ' + due;
    chip.style.display = due > 0 ? '' : 'none';
  }
}
function updateBadges() {
  var due = dueCount();
  var b = $('wrongBadge');
  if (b) {
    b.textContent = due > 0 ? due : '';
    b.style.display = due > 0 ? '' : 'none';
  }
}

/* ============ 首页 ============ */
function renderHome(v) {
  var p = loadLS(LS_PROGRESS, {});
  var hist = loadLS(LS_HISTORY, []);

  var chips = activeChapters().map(function (c) {
    return '<button class="chip' + (view.param === c.id ? ' chip-on' : '') + '" data-act="pickCh" data-id="' + c.id + '">' +
      esc(c.short) + ' <i>' + c.weight + '分</i></button>';
  }).join('');

  var rows = activeChapters().map(function (c) {
    var done = 0, right = 0;
    var qids = byCh(c.id);
    for (var i = 0; i < qids.length; i++) {
      var pr = p[qids[i].id];
      if (pr) { done += pr.r + pr.w; right += pr.r; }
    }
    var pct = Math.round(done / Math.max(1, c.count) * 100);
    var rule = c.rule === 'mixed' ? '真题80%+模拟20%' : '纯真题';
    var metaRight = c.count ? ('真题' + c.real + ' / 模拟' + c.mock) : '题目待收录';
    return '<div class="ch-row" data-act="openCh" data-id="' + c.id + '">' +
      '<div class="ch-left"><div class="ch-name">' + esc(c.name) + '</div>' +
      '<div class="ch-meta">' + esc(c.area) + ' · ' + c.weight + ' 分 · ' + rule + ' · ' + metaRight + '</div></div>' +
      '<div class="ch-right"><div class="ch-done">已练 ' + done + '/' + c.count + '</div>' +
      '<div class="pbar"><div class="pbar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="ch-rate">' + (done ? Math.round(right / done * 100) + '%' : '') + '</div></div>' +
      '</div>';
  }).join('');

  var histRows = hist.slice(0, 5).map(function (h) {
    return '<div class="hist-row"><span>' + esc(h.title) + '</span><span class="hist-date">' + esc(h.date) + '</span><span class="hist-score">' + h.score + ' / ' + h.sum + '</span></div>';
  }).join('') || '<div class="hint-text">还没有试卷记录，出第一张卷子吧～</div>';

  v.innerHTML =
    '<div class="card">' +
      '<div class="card-title row-between"><span>📝 今日卷子</span><button class="icon-btn" id="btnOpenSettings" title="设置">⚙️</button></div>' +
      '<p class="hint-text">选一个章节（或全卷 150 分）→ 按「数学一出题分值表（2021-2026）」权重出卷。题目来自大观园题库（真题·模拟）。</p>' +
      '<div class="chips">' + chips + '<button class="chip chip-full" data-act="pickCh" data-id="__full__">🎯 全卷 150 分</button></div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-primary btn-flex" data-act="genToday">🎲 生成今日卷子</button>' +
        '<button class="btn btn-ghost btn-flex" data-act="genNew">🔄 重新出卷</button>' +
      '</div>' +
      '<p class="hint-text rule-hint">出卷规则：微分方程之前 100% 真题；微分方程及之后、线代、概率 ≈ 8 成真题 + 2 成模拟；二重积分不进卷子（保留 ' + (chapterById('doubleint') ? chapterById('doubleint').count : 10) + ' 道参考题）。做题卡住时点「💡 思路提示」。</p>' +
    '</div>' +
    '<div class="card"><div class="card-title">📚 章节题库</div>' + rows + '</div>' +
    '<div class="card ref-card" data-act="openRef">' +
      '<div class="card-title row-between"><span>🔬 二重积分 · 参考题</span><span class="hint-text">' + (chapterById('doubleint') ? chapterById('doubleint').count : 10) + ' 道</span></div>' +
      '<p class="hint-text">按要求二重积分不出现在卷子里，只保留最有参考价值的真题供查阅。</p>' +
    '</div>' +
    '<div class="card"><div class="card-title">📜 最近试卷</div>' + histRows + '</div>';
  var st = $('btnOpenSettings');
  if (st) st.onclick = openSettings;
}

/* ============ 出卷引擎 ============ */
function chapterTarget(ch) { return Math.max(5, Math.round(ch.weight / 5) * 5); }

function genChapterPaper(chId, seed, done) {
  loadChapterFiles([chId]).then(function () {
    var ch = chapterById(chId);
    var rnd = mulberry32(seed);
    var pool = byCh(chId);
    if (!pool.length) {
      toast('「' + ch.name + '」暂无题目（大观园题库待收录该章节）');
      return;
    }
    var real = shuffle(pool.filter(function (q) { return q.t !== '模拟'; }), rnd);
    var mock = shuffle(pool.filter(function (q) { return q.t === '模拟'; }), rnd);
    var target = chapterTarget(ch);
    var picks = [], sum = 0, ri = 0, mi = 0, count = 0;
    while (sum < target && count < 12) {
      var q = null;
      if (ch.rule === 'mixed' && mi < mock.length && rnd() < 0.2) q = mock[mi++];
      else if (ri < real.length) q = real[ri++];
      else if (mi < mock.length) q = mock[mi++];
      if (!q) break;
      picks.push(q); sum += q.pts; count++;
    }
    done({ kind: 'chapter', ch: ch, questions: shuffle(picks, rnd), sum: sum });
  }).catch(function (e) { toast(String(e)); });
}

function genFullPaper(seed, done) {
  var acts = activeChapters();
  loadChapterFiles(acts.map(function (c) { return c.id; })).then(function () {
    var rnd = mulberry32(seed);
    var totalW = 0;
    acts.forEach(function (c) { totalW += c.weight; });
    function weightedChapter() {
      var r = rnd() * totalW;
      for (var i = 0; i < acts.length; i++) { r -= acts[i].weight; if (r <= 0) return acts[i]; }
      return acts[acts.length - 1];
    }
    function pickOne(ch, qt) {
      var pool = byCh(ch.id).filter(function (q) { return q.qt === qt; });
      if (!pool.length) return null;
      var real = pool.filter(function (q) { return q.t !== '模拟'; });
      var mock = pool.filter(function (q) { return q.t === '模拟'; });
      if (ch.rule === 'mixed' && mock.length && rnd() < 0.2) return mock[Math.floor(rnd() * mock.length)];
      if (real.length) return real[Math.floor(rnd() * real.length)];
      return pool[Math.floor(rnd() * pool.length)];
    }
    function pickAny(qt) {
      var pool = [];
      acts.forEach(function (c) { byCh(c.id).forEach(function (q) { if (q.qt === qt) pool.push(q); }); });
      if (!pool.length) return null;
      return pool[Math.floor(rnd() * pool.length)];
    }
    var structure = [];
    // 题库无填空题，全卷结构：10 选择(50分) + 10 解答(100分) = 150 分
    for (var i = 0; i < 10; i++) structure.push({ qt: '选择', pts: 5 });
    for (var k = 0; k < 10; k++) structure.push({ qt: '解答', pts: 10 });
    var picks = [];
    structure.forEach(function (slot) {
      var ch = weightedChapter();
      var q = pickOne(ch, slot.qt) || pickAny(slot.qt);
      if (q) picks.push(q);
    });
    done({ kind: 'full', ch: null, questions: picks, sum: picks.reduce(function (s, q) { return s + q.pts; }, 0) });
  }).catch(function (e) { toast(String(e)); });
}

/* ============ 试卷视图 ============ */
function renderPaper(v) {
  var paper = currentPaper;
  if (!paper) { view.name = 'home'; render(); return; }
  var title = paper.kind === 'full' ? '全卷模拟（150 分制）' : paper.ch.name;
  var list = paper.questions.map(function (q, i) {
    var st = paper.answers[q.id];
    var mark = st === undefined ? '' : (st ? '<span class="mark mark-ok">✓ 对</span>' : '<span class="mark mark-no">✗ 错</span>');
    return '<div class="q-item">' +
      '<div class="q-head"><span class="q-no">' + (i + 1) + '</span>' +
        '<span class="tag tag-qt">' + q.qt + '</span>' +
        '<span class="q-pts">' + q.pts + ' 分</span>' + tagHTML(q) + mark +
        '<span class="q-src">' + srcLabel(q) + '</span></div>' +
      '<div class="q-text">' + fmtText(q.q) + '</div>' +
      '<div class="q-answer" id="qans-' + i + '">' + questionBodyHTML(q, paper.revealed[q.id] === true) + '</div>' +
      '<div class="q-actions">' +
        (paper.revealed[q.id] ? '' : '<button class="mini-btn" data-act="reveal" data-i="' + i + '">👁 查看答案</button>') +
        '<button class="mini-btn" data-act="hint" data-qid="' + q.id + '">💡 思路提示</button>' +
        '<button class="mini-btn' + (paper.answers[q.id] === true ? ' on' : '') + '" data-act="markOk" data-i="' + i + '">✓ 做对了</button>' +
        '<button class="mini-btn' + (paper.answers[q.id] === false ? ' on-no' : '') + '" data-act="markNo" data-i="' + i + '">✗ 做错了</button>' +
      '</div>' +
      '<div id="hintslot-' + i + '"></div>' +
    '</div>';
  }).join('');
  var answered = Object.keys(paper.answers).length;
  v.innerHTML =
    '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button><div class="sh-title">' + esc(title) + '</div><div class="sh-sub">满分 ' + paper.sum + ' 分</div></div>' +
    '<div class="card"><div class="card-title">本卷 ' + paper.questions.length + ' 题 · 已作答 ' + answered + ' 题</div>' +
    '<p class="hint-text">做法：先自己做 → 卡住点「💡 思路提示」→ 核对「查看答案」→ 记录对错 → 交卷算分。</p></div>' +
    list +
    '<div class="submit-bar"><button class="btn btn-primary btn-flex" data-act="submitPaper">📊 交卷算分</button></div>';
}

/* ============ 章节刷题 ============ */
function renderChapterPractice(v) {
  var ch = chapterById(view.param);
  if (!ch) { view.name = 'home'; render(); return; }
  if (!practice || practice.ch !== view.param) {
    practice = { ch: view.param, list: [], idx: 0, revealed: {} };
    loadChapterFiles([view.param]).then(function () {
      practice.list = shuffle(byCh(view.param), mulberry32(Date.now() % 2147483647));
      render();
    }).catch(function (e) { toast(String(e)); });
    v.innerHTML = '<div class="card"><div class="empty">📚 题库加载中…</div></div>';
    return;
  }
  var total = practice.list.length;
  if (!total) {
    v.innerHTML =
      '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button><div class="sh-title">' + esc(ch.name) + '</div></div>' +
      '<div class="card"><div class="empty">📭 该章节题目暂未收录（大观园题库建设中）。<br>等站点更新后告诉我，我会同步进 App。</div></div>';
    return;
  }
  var q = practice.list[practice.idx];
  var revealed = practice.revealed[q.id] === true;
  var p = loadLS(LS_PROGRESS, {});
  var pr = p[q.id] || { r: 0, w: 0 };
  v.innerHTML =
    '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button>' +
    '<div class="sh-title">' + esc(ch.name) + '</div><div class="sh-sub">' + (practice.idx + 1) + '/' + total + '</div></div>' +
    '<div class="pbar big"><div class="pbar-fill" style="width:' + Math.round((practice.idx) / total * 100) + '%"></div></div>' +
    '<div class="card">' +
      '<div class="q-head"><span class="tag tag-qt">' + q.qt + '</span><span class="q-pts">' + q.pts + ' 分</span>' + tagHTML(q) + '<span class="q-src">' + srcLabel(q) + '</span></div>' +
      '<div class="q-text big">' + fmtText(q.q) + '</div>' +
      '<div id="qans">' + questionBodyHTML(q, revealed) + '</div>' +
      '<div class="q-actions big-actions">' +
        (revealed ? '' : '<button class="btn btn-ghost btn-flex" data-act="revealP">👁 查看答案</button>') +
        '<button class="btn btn-ghost btn-flex" data-act="hintP">💡 思路提示</button>' +
        '<button class="btn btn-ghost btn-flex" data-act="pOk">✓ 做对了</button>' +
        '<button class="btn btn-ghost btn-flex" data-act="pNo">✗ 做错了</button>' +
      '</div>' +
      '<div id="hintslot"></div>' +
      '<div class="hint-text">本题已记录：对 ' + pr.r + ' 次 · 错 ' + pr.w + ' 次</div>' +
      '<button class="btn btn-primary btn-block" data-act="nextP">下一题 →</button>' +
    '</div>';
}

/* ============ 错题本（自动归纳 + 记忆周期） ============ */
var wrongFilter = 'all'; // all | due | done

function renderWrong(v) {
  var p = loadLS(LS_PROGRESS, {});
  var wrongIds = Object.keys(p).filter(function (k) { return p[k].w > 0; });
  if (!wrongIds.length) {
    v.innerHTML = '<div class="card"><div class="empty">🎉 太棒了，错题本是空的！</div></div>';
    return;
  }
  var acts = activeChapters().map(function (c) { return c.id; });
  loadChapterFiles(acts).then(function () {
    // 解析错题
    var list = [];
    wrongIds.forEach(function (qid) {
      for (var i = 0; i < acts.length; i++) {
        var found = byCh(acts[i]).filter(function (x) { return x.id === qid; });
        if (found.length) { list.push(found[0]); return; }
      }
    });
    var due = list.filter(function (q) { return srsDue(q.id); });
    var done = list.filter(function (q) { return p[q.id].srs && p[q.id].srs.done; });
    // 过滤
    var filtered = list.filter(function (q) {
      if (wrongFilter === 'due') return srsDue(q.id);
      if (wrongFilter === 'done') return p[q.id].srs && p[q.id].srs.done;
      return true;
    });
    // 按章节归纳
    var groups = {};
    filtered.forEach(function (q) {
      var ch = chapterById(q.ch);
      var key = ch.area + ' · ' + ch.name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });

    var chips =
      '<button class="chip' + (wrongFilter === 'all' ? ' chip-on' : '') + '" data-act="wrongFilter" data-f="all">全部 ' + list.length + '</button>' +
      '<button class="chip' + (wrongFilter === 'due' ? ' chip-on' : '') + '" data-act="wrongFilter" data-f="due">🔔 待复习 ' + due.length + '</button>' +
      '<button class="chip' + (wrongFilter === 'done' ? ' chip-on' : '') + '" data-act="wrongFilter" data-f="done">已掌握 ' + done.length + '</button>';

    var stats = '<div class="wrong-stats">' +
      '<div class="ws-item"><b>' + list.length + '</b><span>错题总数</span></div>' +
      '<div class="ws-item ws-due"><b>' + due.length + '</b><span>今日待复习</span></div>' +
      '<div class="ws-item"><b>' + done.length + '</b><span>已掌握</span></div>' +
      '</div>';

    var sections = Object.keys(groups).map(function (key) {
      var qs = groups[key];
      var cards = qs.map(function (q) {
        var pr = p[q.id];
        var srs = pr.srs;
        var isDue = srsDue(q.id);
        var isDone = srs && srs.done;
        var stageCls = isDone ? 'srs-done' : (isDue ? 'srs-due' : 'srs-wait');
        var stageText = srsStageLabel(srs) || '待复习';
        var ch = chapterById(q.ch);
        return '<div class="card wrong-item' + (isDue ? ' due-card' : '') + '">' +
          '<div class="q-head"><span class="ch-badge">' + esc(ch.short) + '</span>' + tagHTML(q) +
            '<span class="wrong-count">错 ' + pr.w + ' 次</span>' +
            '<span class="srs-stage ' + stageCls + '">' + esc(stageText) + '</span></div>' +
          '<div class="q-text">' + fmtText(q.q) + '</div>' +
          '<div class="q-answer">' + questionBodyHTML(q, true) + '</div>' +
          '<div class="q-actions">' +
            '<button class="mini-btn" data-act="hint" data-qid="' + q.id + '">💡 思路提示</button>' +
            '<button class="mini-btn on" data-act="srsOk" data-id="' + q.id + '">✅ 我会了</button>' +
            '<button class="mini-btn on-no" data-act="srsAgain" data-id="' + q.id + '">❌ 又忘了</button>' +
            '<button class="mini-btn" data-act="removeWrong" data-id="' + q.id + '">🗑 移除</button>' +
          '</div>' +
          '<div id="hintslot-' + q.id + '"></div>' +
        '</div>';
      }).join('');
      return '<div class="section-hdr">' + esc(key) + ' <span>' + qs.length + ' 题</span></div>' + cards;
    }).join('');

    v.innerHTML =
      '<div class="sub-header"><div class="sh-title">⭐ 错题本</div><div class="sh-sub">艾宾浩斯式记忆周期</div></div>' +
      '<div class="card">' + stats + '<div class="chips" style="margin-top:10px">' + chips + '</div>' +
      '<p class="hint-text">记忆周期：错题次日复习 → 2天 → 4天 → 7天 → 15天 → 30天，全部通过即掌握。到期未复习的题会标红并在 App 打开时提醒你。</p></div>' +
      (sections || '<div class="card"><div class="empty">没有符合条件的错题。</div></div>');
    renderMath();
  }).catch(function (e) { toast(String(e)); });
}

/* ============ 二重积分参考题 ============ */
function renderRef(v) {
  loadChapterFiles(['doubleint']).then(function () {
    var qs = byCh('doubleint');
    var list = qs.map(function (q) {
      return '<div class="card"><div class="q-head">' + tagHTML(q) + '<span class="q-pts">' + q.pts + ' 分</span><span class="q-src">' + srcLabel(q) + '</span></div>' +
        '<div class="q-text">' + fmtText(q.q) + '</div>' +
        '<div class="q-answer">' + questionBodyHTML(q, true) + '</div></div>';
    }).join('');
    v.innerHTML =
      '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button><div class="sh-title">二重积分 · 参考题</div><div class="sh-sub">' + qs.length + ' 道</div></div>' +
      '<div class="card"><p class="hint-text">二重积分按要求不出现在每日试卷中，仅保留最有参考价值的真题。方法上与三重积分、线面积分同源。</p></div>' + list;
    renderMath();
  }).catch(function (e) { toast(String(e)); });
}

/* ============ 英语/专业课预留 ============ */
function renderPlaceholder(v) {
  var isEng = view.param === 'english';
  v.innerHTML = '<div class="card placeholder-card">' +
    '<div class="ph-icon">' + (isEng ? '🇬🇧' : '📚') + '</div>' +
    '<div class="ph-title">' + (isEng ? '英语一 · 模块预留中' : '专业课 · 模块预留中') + '</div>' +
    '<p class="hint-text ph-desc">' + (isEng
      ? '这里将放置英语一真题/模拟题库：阅读理解、完形、翻译、作文，按年份与题型刷题。'
      : '这里将放置你的专业课题库：按章节出题、真题+模拟混合，与数学模块相同的刷题体验。') + '</p>' +
    '<p class="hint-text">需要启用时告诉我目标院校与专业，我帮你把题库和规则配好。</p>' +
    '</div>';
}

/* ============ 思路提示 ============ */
var CHAPTER_HINTS = {
  'limit': '① 先判断极限类型：0/0、∞/∞、0·∞、1^∞ 等；② 优先等价无穷小替换（sinx~x、1−cosx~x²/2、eˣ−1~x、ln(1+x)~x）；③ 高阶用泰勒展开或洛必达；④ 数列极限考虑夹逼、单调有界、定积分定义。',
  'diff1': '① 求导问题：熟记基本求导公式与链式法则；② 可导判定：用导数定义（左导=右导）；③ 极值/单调：一阶导符号，拐点看二阶导；④ 证明题联想中值定理（罗尔/拉格朗日/柯西）。',
  'int1': '① 不定积分先看换元还是分部；② 分部积分口诀"反对幂指三"；③ 定积分优先考虑奇偶性、区间再现；④ 面积/体积题先画图定上下限。',
  'multidiff': '① 偏导计算：对谁求导就把其他变量当常数；② 全微分 dz=zₓdx+z_ydy；③ 极值：先求驻点，再用 AC−B² 判别；④ 隐函数求导：方程两边对 x 求导解出 zₓ。',
  'doubleint': '① 先画积分区域，判断用直角坐标还是极坐标；② 含 x²+y² 或圆形区域优先极坐标，别忘 r 因子；③ 对称性：奇函数关于对称区域积分为 0；④ 交换积分次序先改画区域。',
  'triplesurface': '① 三重积分：球/柱坐标转换，注意雅可比（球坐标 r²sinφ）；② 曲线积分：格林公式把闭曲线转二重积分（∂Q/∂x−∂P/∂y）；③ 曲面积分：高斯公式转三重积分（散度）；④ 补面/挖洞技巧处理奇点。',
  'series': '① 判敛：正项级数用比较/比值/根值判别，p 级数 ∑1/nᵖ 记住分界 p=1；② 交错级数用莱布尼茨；③ 幂级数求和：先求收敛域，再逐项求导/积分凑已知级数；④ 展开题记熟 eˣ、sinx、cosx、ln(1+x)、1/(1−x) 的展开式。',
  'ode': '① 一阶：可分离变量 / 一阶线性 y′+P(x)y=Q(x) 用积分因子 e^(∫Pdx)；② 二阶常系数齐次：特征方程 r²+pr+q=0，按实根/重根/共轭复根三种情况写通解；③ 非齐次：待定系数法按右端类型设解；④ 注意初始条件定常数。',
  'linalg-det': '① 行列式计算：按行列展开、化为上三角、利用行列式性质（倍加不变、互换变号）；② 矩阵求逆：伴随矩阵法 A⁻¹=A*/|A| 或初等行变换；③ 记住 |AB|=|A||B|、|kA|=kⁿ|A|；④ 抽象矩阵优先找特征值或利用 A²=E 等关系。',
  'linalg-sys': '① 齐次方程组 Ax=0 有非零解 ⟺ r(A)<n；② 非齐次有解 ⟺ r(A)=r(A|b)；③ 基础解系个数 = n−r(A)；④ 向量相关性：看秩是否小于向量个数，n 个 n 维向量看行列式。',
  'linalg-eig': '① 特征值：解 |λE−A|=0；② 特征向量：代入 (λE−A)x=0 求基础解系；③ 实对称矩阵不同特征值的特征向量正交，必可正交对角化；④ 二次型化标准形：配方法或正交变换法，正负惯性指数看标准形系数符号。',
  'prob-event': '① 先翻译事件关系（和、积、对立、互斥、独立）；② 加法公式 P(A∪B)=P(A)+P(B)−P(AB)；③ 条件概率 P(A|B)=P(AB)/P(B)；④ 独立：P(AB)=P(A)P(B)，全概率/贝叶斯用于"分层"问题。',
  'prob-1d': '① 先写出分布（分布列/密度/分布函数）；② 密度函数归一化 ∫f=1 求参数；③ P(a<X<b)=∫_a^b f dx；④ 熟记常见分布：二项、泊松、均匀、指数、正态的数字特征。',
  'prob-2d': '① 联合密度归一化 ∬f=1；② 边缘密度：对另一个变量积分；③ 独立 ⟺ f(x,y)=f_X(x)f_Y(y)；④ 条件密度 f(x|y)=f(x,y)/f_Y(y)，求概率先在区域上积分。',
  'prob-moment': '① 期望 E(X)=Σxᵢpᵢ 或 ∫xf dx；② 方差 D(X)=E(X²)−(EX)²；③ 协方差 Cov=E(XY)−EX·EY，相关系数 ρ=Cov/√(DX·DY)；④ 独立/不相关关系：独立⇒不相关，反之不成立（正态除外）。',
  'prob-lln': '① 切比雪夫不等式 P(|X−EX|≥ε)≤DX/ε²；② 中心极限定理：独立同分布的和标准化后近似 N(0,1)；③ 二项分布近似正态：X~B(n,p) 当 n 大时 X≈N(np,npq)。',
  'prob-stat': '① 矩估计：令样本矩=总体矩；② 最大似然：写似然函数 L，取对数求导=0；③ 无偏性：验证 E(θ̂)=θ；④ 置信区间/假设检验记住正态总体常用统计量及其分布。'
};
var hintBusy = {};

function showHintBox(slotId, qid, q, ch) {
  var slot = $(slotId);
  if (!slot) return;
  slot.innerHTML = hintBoxHTML(qid);
  renderMath();
  var cache = loadLS(LS_HINTS, {});
  if (cache[qid]) return;
  if (hintBusy[qid]) return;
  hintBusy[qid] = true;
  if (apiKey()) {
    askAIHint(qid, q, ch, slot);
  } else {
    setTimeout(function () {
      var box = $('hintbox-' + qid);
      if (box) {
        box.innerHTML = '<div class="hint-head">💡 思路提示 <span class="hint-tag">章节通用</span></div>' +
          '<div class="hint-body">' + fmtText(CHAPTER_HINTS[ch] || '暂无通用思路。') + '</div>' +
          '<div class="hint-ai-note">💬 配置 DeepSeek API Key 后可获得针对本题的 AI 个性化思路（右上角 ⚙️ 设置）。</div>';
        renderMath();
      }
      hintBusy[qid] = false;
    }, 400);
  }
}

function askAIHint(qid, q, ch, slot) {
  var sys = '你是考研数学一资深辅导老师。学生做题卡住了，需要"思路提示"，而不是答案。请给出：1) 本题考察的知识点；2) 切入角度与可用的关键公式；3) 一句关键提醒。禁止给出最终答案、禁止完整解题过程。中文，120字以内，用短横线分点。';
  var user = '题型：' + q.qt + '（考研数学一）\n章节：' + (chapterById(ch) ? chapterById(ch).name : '') + '\n题目：' + (q.q || '') + (q.o ? '\n选项：' + q.o.join('；') : '');
  fetch(API_BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey() },
    body: JSON.stringify({ model: hintModel(), messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 300, temperature: 0.6 })
  }).then(function (r) {
    if (!r.ok) {
      var hints = { 401: 'API Key 无效，请在 ⚙️ 设置里检查', 402: '余额不足，请到 platform.deepseek.com 充值' };
      throw new Error(hints[r.status] || ('请求失败 HTTP ' + r.status));
    }
    return r.json();
  }).then(function (j) {
    var text = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
    if (!text) throw new Error('空响应');
    var cache = loadLS(LS_HINTS, {});
    cache[qid] = text;
    saveLS(LS_HINTS, cache);
    var box = $('hintbox-' + qid);
    if (box) {
      box.innerHTML = '<div class="hint-head">💡 思路提示 <span class="hint-tag">AI 生成</span></div><div class="hint-body">' + fmtText(text) + '</div>';
      renderMath();
    }
    hintBusy[qid] = false;
  }).catch(function (e) {
    var box = $('hintbox-' + qid);
    if (box) {
      box.innerHTML = '<div class="hint-head">💡 思路提示 <span class="hint-tag">章节通用</span></div>' +
        '<div class="hint-body">' + fmtText(CHAPTER_HINTS[ch] || '暂无通用思路。') + '</div>' +
        '<div class="hint-ai-note">AI 提示生成失败（' + esc(String(e && e.message || e)) + '），已显示章节通用思路。</div>';
      renderMath();
    }
    hintBusy[qid] = false;
  });
}

/* ============ 每周复习回顾 ============ */
var syncData = null;
function loadSyncData(cb) {
  if (syncData) { cb(syncData); return; }
  fetch('sync-data.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { syncData = j || null; cb(syncData); })
    .catch(function () { syncData = null; cb(syncData); });
}
function syncAnalysisRows() {
  var rows = [];
  var chs = (syncData && syncData.weekly && syncData.weekly.chapters) || [];
  chs.forEach(function (c) {
    if (c.wrong > 0 || (c.done >= 10 && (c.done - c.wrong) < c.done * 0.6)) {
      var rate = c.done ? Math.round((c.done - c.wrong) / c.done * 100) : 0;
      var ch = null;
      for (var i = 0; i < CHAPTERS.length; i++) {
        if (CHAPTERS[i].name === c.name || CHAPTERS[i].id === c.id || CHAPTERS[i].short === c.name) { ch = CHAPTERS[i]; break; }
      }
      rows.push({ ch: ch ? ch.id : null, name: c.name, reason: '大观园本周做 ' + c.done + ' 题错 ' + c.wrong + ' 题（正确率 ' + rate + '%）', advice: '先回看错题解析总结方法，再针对性刷题巩固' });
    }
  });
  return rows;
}
var CONCEPT_QUESTIONS = {
  'limit': { q: '洛必达法则的使用条件是什么？哪些情况不能直接用？', a: '条件：0/0 或 ∞/∞ 型；分子分母在去心邻域内可导；分母导数不为 0；求导后的极限存在（或为 ∞）。注意 0·∞、∞−∞、1^∞ 等未定式要先变形，且不能对非未定式滥用。' },
  'diff1': { q: '可导、可微、连续三者之间是什么关系？', a: '可导 ⟺ 可微 ⇒ 连续；连续不一定可导（如 |x| 在 0 点）。一元函数中可导与可微等价。' },
  'int1': { q: '定积分换元法与不定积分换元法有什么不同？', a: '定积分换元必须同时换上下限，且不必回代原变量；要求变换函数单调有连续导数。' },
  'multidiff': { q: '偏导数存在、偏导数连续、可微之间是什么关系？', a: '偏导连续 ⇒ 可微 ⇒ 偏导存在（且方向导数存在）；偏导存在推不出可微。' },
  'doubleint': { q: '什么时候二重积分优先用极坐标计算？', a: '积分区域为圆、扇形、圆环，或被积函数含 x²+y² 结构时优先极坐标；换元时别忘了多乘一个 r。' },
  'triplesurface': { q: '格林公式的适用条件是什么？', a: '曲线为正向闭曲线、区域单连通、P、Q 在区域内有一阶连续偏导数；有奇点时要挖洞处理。' },
  'series': { q: '幂级数在收敛区间端点处一定收敛吗？', a: '不一定。端点处收敛性要代入具体值单独判断（阿贝尔定理只保证收敛区间内部绝对收敛）。' },
  'ode': { q: '二阶常系数齐次线性方程特征根为共轭复根时，通解形式是什么？', a: '若 r=α±iβ，则通解 y = e^(αx)(C₁cosβx + C₂sinβx)。' },
  'linalg-det': { q: '方阵可逆的充要条件有哪些？（说出三个）', a: '|A|≠0；r(A)=n；特征值全不为 0；行（列）向量组线性无关；齐次方程组只有零解。' },
  'linalg-sys': { q: '齐次线性方程组解空间的维数与系数矩阵秩的关系？', a: '解空间维数 = n − r(A)，其中 n 为未知数个数。基础解系含 n−r(A) 个解向量。' },
  'linalg-eig': { q: '实对称矩阵的特征值与特征向量有什么特殊性质？', a: '特征值全为实数；不同特征值对应的特征向量相互正交；实对称矩阵必可正交对角化。' },
  'prob-event': { q: '事件互斥与相互独立有什么区别？', a: '互斥：P(AB)=0，不能同时发生；独立：P(AB)=P(A)P(B)，一个发生不影响另一个的概率。两个正概率事件互斥则必不独立。' },
  'prob-1d': { q: '分布函数 F(x) 有哪些基本性质？', a: '非降；右连续；F(−∞)=0，F(+∞)=1；P(a<X≤b)=F(b)−F(a)。' },
  'prob-2d': { q: '如何由二维联合密度求边缘密度？', a: '对另一变量在整个取值范围内积分：f_X(x)=∫f(x,y)dy，f_Y(y)=∫f(x,y)dx。' },
  'prob-moment': { q: '随机变量独立与不相关是什么关系？', a: '独立 ⇒ 不相关（Cov=0）；不相关一般推不出独立，只有二维正态分布例外（不相关⟺独立）。' },
  'prob-lln': { q: '中心极限定理（林德伯格-莱维）说的是什么？', a: '独立同分布、方差有限的随机变量序列，其和的标准化变量近似服从标准正态分布，即 (ΣXᵢ−nμ)/(√n σ) → N(0,1)。' },
  'prob-stat': { q: '什么是无偏估计？', a: '若估计量 θ̂ 满足 E(θ̂)=θ，则称 θ̂ 为 θ 的无偏估计。样本均值是总体均值的无偏估计。' }
};

function weekStartStr() { return addDaysStr(todayStr(), -6); }

/* 本周做题统计（需章节数据已加载） */
function weeklyStats() {
  var p = loadLS(LS_PROGRESS, {});
  var ws = weekStartStr();
  var done = 0, wrong = 0;
  var byCh = {};
  Object.keys(p).forEach(function (qid) {
    var r = p[qid];
    if (r.last && r.last >= ws) {
      done++;
      var q = findQuestion(qid);
      var cid = q ? q.ch : null;
      if (cid) {
        byCh[cid] = byCh[cid] || { done: 0, wrong: 0, right: 0 };
        byCh[cid].done++;
        if (r.w > 0 && r.lastW && r.lastW >= ws) byCh[cid].wrong++;
        else if (r.lastW && r.lastW >= ws) byCh[cid].wrong++;
      }
    }
    if (r.lastW && r.lastW >= ws) wrong++;
  });
  return { done: done, wrong: wrong, byCh: byCh };
}

var reviewState = { rows: null, mode: null, loading: false };

function renderReview(v) {
  var ws = weekStartStr();
  var acts = activeChapters().map(function (c) { return c.id; });
  v.innerHTML = '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button><div class="sh-title">📆 每周复习回顾</div><div class="sh-sub">' + ws + ' 起</div></div>' +
    '<div class="card"><div class="card-title">📝 本周学习内容</div>' +
    '<textarea id="weekText" class="week-input" placeholder="写下本周学了哪些内容，例如：&#10;极限：洛必达、泰勒展开、等价无穷小&#10;一元积分：换元、分部积分&#10;线代：矩阵求逆、特征值"></textarea>' +
    '<p class="hint-text" id="weekStatsLine">正在统计本周做题数据…</p>' +
    '<div class="btn-row"><button class="btn btn-primary btn-flex" data-act="analyzeWeek">🔍 分析需要回顾的知识点</button></div></div>' +
    '<div id="reviewResult"></div>' +
    '<div class="card"><p class="hint-text">💡 用法：写下本周学的内容 → 点分析 → 对建议的薄弱知识点「📝 出题练」刷几道题，或「💬 考我理解」让 AI 测验你的概念掌握程度（配 DeepSeek Key 效果最佳）。</p></div>';

  var ta = $('weekText');
  ta.value = loadLS('s1_week_text', '');
  ta.addEventListener('input', function () {
    saveLS('s1_week_text', ta.value);
    reviewState.rows = null;
  });

  loadChapterFiles(acts).then(function () {
    loadSyncData(function (sd) {
      var el = $('weekStatsLine');
      if (!el) return;
      if (sd && sd.weekly && sd.weekly.total != null) {
        var line = '大观园同步：本周做题 <b>' + sd.weekly.total + '</b> 道 · 做错 <b>' + sd.weekly.wrong + '</b> 道';
        var chs = (sd.weekly.chapters || []).map(function (c) { return c.name; });
        if (chs.length) line += ' · 涉及：' + chs.join('、');
        if (sd.syncedAt) line += ' <span style="font-size:11px">（' + esc(String(sd.syncedAt).slice(0, 16).replace('T', ' ')) + ' 同步）</span>';
        el.innerHTML = line;
      } else {
        var st = weeklyStats();
        var line2 = '本周做题 <b>' + st.done + '</b> 道 · 做错 <b>' + st.wrong + '</b> 道';
        var chNames = [];
        Object.keys(st.byCh).forEach(function (cid) {
          var c = chapterById(cid);
          if (c) chNames.push(c.short);
        });
        if (chNames.length) line2 += ' · 涉及：' + chNames.join('、');
        el.innerHTML = line2;
      }
      if (reviewState.rows) renderReviewResult();
    });
  }).catch(function () { /* 忽略 */ });
}

function localAnalysisRows() {
  var st = weeklyStats();
  var rows = [];
  Object.keys(st.byCh).forEach(function (cid) {
    var c = chapterById(cid);
    var s = st.byCh[cid];
    var rate = s.done ? Math.round((s.done - s.wrong) / s.done * 100) : 0;
    var weak = s.wrong >= 1 || (s.done >= 10 && rate < 60);
    if (weak) {
      rows.push({ ch: cid, name: c.name, _w: s.wrong, _rate: rate, reason: '本周做 ' + s.done + ' 题错 ' + s.wrong + ' 题（正确率 ' + rate + '%）', advice: '先回看错题解析总结方法，再针对性刷题巩固' });
    }
  });
  rows.sort(function (a, b) { return (b._w - a._w) || (a._rate - b._rate); });
  rows = rows.slice(0, 6);
  // 补充：到期未复习的错题所在章节
  var p = loadLS(LS_PROGRESS, {});
  var seen = {};
  Object.keys(p).forEach(function (qid) {
    var r = p[qid];
    if (r.w > 0 && r.srs && !r.srs.done && r.srs.next <= todayStr()) {
      var q = findQuestion(qid);
      if (q && !seen[q.ch]) {
        seen[q.ch] = true;
        if (!rows.some(function (x) { return x.ch === q.ch; })) {
          var c2 = chapterById(q.ch);
          rows.push({ ch: q.ch, name: c2.name, reason: '错题已到复习周期但尚未复习', advice: '去错题本完成到期复习' });
        }
      }
    }
  });
  return rows;
}

function analyzeWeek() {
  if (reviewState.loading) return;
  var text = ($('weekText') ? $('weekText').value : '').trim();
  var st = weeklyStats();
  var hasSync = !!(syncData && syncData.weekly && syncData.weekly.total != null);
  var statText;
  if (hasSync) {
    var w = syncData.weekly;
    statText = '共' + w.total + '题，错' + w.wrong + '题。各章节：' + (w.chapters || []).map(function (c) {
      var rate = c.done ? Math.round((c.done - c.wrong) / c.done * 100) : 0;
      return c.name + '：做' + c.done + '错' + c.wrong + '（' + rate + '%）';
    }).join('；');
  } else {
    var chStats = Object.keys(st.byCh).map(function (cid) {
      var c = chapterById(cid); var s = st.byCh[cid];
      var rate = s.done ? Math.round((s.done - s.wrong) / s.done * 100) : 0;
      return c.name + '：做' + s.done + '错' + s.wrong + '（' + rate + '%）';
    }).join('；');
    statText = '共' + st.done + '题，错' + st.wrong + '题。各章节：' + chStats;
  }
  if (apiKey() && (text || st.done > 0 || hasSync)) {
    reviewState.loading = true;
    $('reviewResult').innerHTML = '<div class="card"><div class="empty">🧠 AI 分析中…</div></div>';
    var sys = '你是考研数学一辅导老师。根据学生本周学习内容和做题数据，输出"需要回顾的知识点"清单。严格按此格式每行一个，共 3~6 行：章节名 | 原因 | 建议动作（不超过15字）。章节名必须从以下选取：' + activeChapters().map(function (c) { return c.name; }).join('、') + '。不要输出其他内容。';
    var user = '本周学习内容：' + (text || '（未填写）') + '\n本周做题数据：' + statText;
    fetch(API_BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey() },
      body: JSON.stringify({ model: hintModel(), messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 600, temperature: 0.5 })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var out = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
      reviewState.rows = parseAIRows(out);
      reviewState.mode = 'ai';
      reviewState.raw = out;
      reviewState.loading = false;
      renderReviewResult();
    }).catch(function (e) {
      reviewState.rows = hasSync ? syncAnalysisRows() : localAnalysisRows();
      reviewState.mode = 'local';
      reviewState.loading = false;
      $('reviewResult').innerHTML = '';
      renderReviewResult();
      toast('AI 分析失败（' + String(e && e.message || e) + '），已用' + (hasSync ? '大观园同步' : '本地') + '数据生成回顾建议');
    });
  } else {
    reviewState.rows = hasSync ? syncAnalysisRows() : localAnalysisRows();
    reviewState.mode = hasSync ? 'sync' : 'local';
    renderReviewResult();
  }
}

function parseAIRows(out) {
  var rows = [];
  String(out || '').split('\n').forEach(function (line) {
    var parts = line.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    if (parts.length < 2) return;
    var chName = parts[0];
    var ch = null;
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (chName.indexOf(CHAPTERS[i].name) >= 0 || chName.indexOf(CHAPTERS[i].short) >= 0 || CHAPTERS[i].name.indexOf(chName) >= 0) { ch = CHAPTERS[i]; break; }
    }
    rows.push({ ch: ch ? ch.id : null, name: ch ? ch.name : chName, reason: parts[1] || '', advice: parts[2] || '' });
  });
  return rows;
}

function renderReviewResult() {
  var box = $('reviewResult');
  if (!box) return;
  var rows = reviewState.rows;
  if (!rows || !rows.length) {
    box.innerHTML = '<div class="card"><div class="empty">' + (reviewState.mode === 'ai' ? 'AI 未识别出明确的知识点。' : '暂无分析结果：写下本周内容或先刷几道题，再点「分析」。') + '</div></div>';
    return;
  }
  var html = '<div class="card"><div class="card-title">🎯 建议回顾的知识点 ' +
    '<span class="hint-text">' + (reviewState.mode === 'ai' ? 'AI 分析' : (reviewState.mode === 'sync' ? '大观园数据' : '本地数据分析')) + '</span></div>';
  rows.forEach(function (row, i) {
    html += '<div class="rev-row"><div class="rev-head"><b>' + (i + 1) + '. ' + esc(row.name) + '</b></div>' +
      '<div class="rev-reason">📌 ' + esc(row.reason) + '</div>' +
      '<div class="rev-advice">💡 ' + esc(row.advice) + '</div>' +
      '<div class="q-actions">' +
      (row.ch ? '<button class="mini-btn" data-act="reviewPaper" data-ch="' + row.ch + '">📝 出题练</button>' : '') +
      '<button class="mini-btn" data-act="quizStart" data-ch="' + (row.ch || '') + '" data-topic="' + esc(row.name) + '">💬 考我理解</button>' +
      '</div></div>';
  });
  html += '</div>';
  box.innerHTML = html;
  renderMath();
}

/* ============ 理解测验 ============ */
var quiz = null;

function startQuiz(chId, topic) {
  quiz = { ch: chId, topic: topic, msgs: [], round: 0, done: false, local: !apiKey() };
  view.name = 'quiz';
  render();
  if (!apiKey()) {
    var cq = chId && CONCEPT_QUESTIONS[chId];
    if (!cq) {
      quiz.msgs.push({ role: 'ai', text: '该知识点暂无离线概念题，配置 DeepSeek API Key 后可让 AI 出题并评判你的回答（右上角 ⚙️）。' });
      quiz.done = true;
      render();
      return;
    }
    quiz.msgs.push({ role: 'ai', text: '「' + topic + '」概念题：' + cq.q + '（先自己组织语言回答，再点「看参考答案」对照）' });
    render();
  } else {
    quiz.msgs.push({ role: 'ai', text: '正在为你出第一道理解题…' });
    render();
    quizTurn(null, true);
  }
}

function renderQuiz(v) {
  if (!quiz) { view.name = 'review'; render(); return; }
  var msgs = quiz.msgs.map(function (m) {
    return '<div class="qz-msg ' + m.role + '"><div class="qz-bubble">' + fmtText(m.text) + '</div></div>';
  }).join('');
  var inputArea = '';
  if (quiz.done) {
    inputArea = '<button class="btn btn-primary btn-block" data-act="backReview">← 返回复盘</button>';
  } else if (quiz.local) {
    var cq = quiz.ch ? CONCEPT_QUESTIONS[quiz.ch] : null;
    if (cq) {
      inputArea = '<div class="btn-row">' +
        '<button class="btn btn-ghost btn-flex" data-act="quizReveal">👁 看参考答案</button>' +
        '<button class="btn btn-primary btn-flex" data-act="quizLocalDone">✅ 我理解了</button>' +
        '</div>';
    }
  } else {
    inputArea = '<div class="qz-input"><textarea id="quizAnswer" rows="2" placeholder="写下你的理解…"></textarea>' +
      '<button class="btn btn-primary" data-act="quizSend">发送</button></div>';
  }
  v.innerHTML =
    '<div class="sub-header"><button class="icon-btn" data-act="backReview">←</button><div class="sh-title">💬 考我理解</div><div class="sh-sub">' + esc(quiz.topic) + '</div></div>' +
    '<div class="card qz-card">' + msgs + '</div>' + inputArea;
  renderMath();
  var ta = $('quizAnswer');
  if (ta) {
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); quizSend(); }
    });
  }
}

function quizTurn(userText, first) {
  var sys = '你是考研数学一老师，正在测验学生对一个知识点的理解。规则：先提一个概念理解题（不要计算题）；收到学生回答后：先简短评价理解程度（完全掌握/基本掌握/存在偏差），指出偏差，再给出正确解释，然后提下一道相关问题。共考 3 道题，第 3 次评价后给出该知识点的掌握总结（50字内）和学习建议。回答用中文，分"评价/讲解/下一题"结构。第一轮请直接提第一道题。';
  var msgs = [{ role: 'system', content: sys }];
  if (first) {
    msgs.push({ role: 'user', content: '我要复习的知识点：' + quiz.topic + '。请出第一道理解题。' });
  } else {
    quiz.msgs.forEach(function (m) { msgs.push({ role: m.role, content: m.text }); });
  }
  fetch(API_BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey() },
    body: JSON.stringify({ model: hintModel(), messages: msgs, max_tokens: 600, temperature: 0.6 })
  }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (j) {
    var out = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
    if (!out) throw new Error('空响应');
    if (!first) quiz.msgs.push({ role: 'user', text: userText });
    quiz.msgs.push({ role: 'ai', text: out });
    if (!first) {
      quiz.round++;
      if (quiz.round >= 3) quiz.done = true;
    }
    render();
  }).catch(function (e) {
    quiz.msgs.push({ role: 'ai', text: '⚠️ AI 测验失败（' + String(e && e.message || e) + '）。请检查网络或密钥后重试。' });
    quiz.done = true;
    render();
  });
}

function quizSend() {
  var ta = $('quizAnswer');
  var text = ta ? ta.value.trim() : '';
  if (!text) { toast('先写下你的理解再发送'); return; }
  if (ta) ta.value = '';
  quiz.msgs.push({ role: 'user', text: text });
  quiz.msgs.push({ role: 'ai', text: '正在评价你的回答…' });
  render();
  quizTurn(text, false);
}

/* ============ 设置 ============ */
function openSettings() {
  $('setKey').value = apiKey();
  $('setHintModel').value = hintModel();
  $('settingsModal').classList.remove('hidden');
}
function closeSettings() {
  $('settingsModal').classList.add('hidden');
}
function saveSettings() {
  try { localStorage.setItem('ds_chat_key', $('setKey').value.trim()); } catch (e) { /* 忽略 */ }
  try { localStorage.setItem('ds_hint_model', $('setHintModel').value); } catch (e) { /* 忽略 */ }
  toast('✅ 设置已保存（密钥仅存本机）');
  closeSettings();
}

/* ============ 动作 ============ */
function genPaper(seed) {
  var done = function (paper) {
    paper.answers = {};
    paper.revealed = {};
    currentPaper = paper;
    view.name = 'paper';
    render();
  };
  toast('📚 题库加载中…');
  if (view.param === '__full__' || !view.param) genFullPaper(seed, done);
  else genChapterPaper(view.param, seed, done);
}

function submitPaper() {
  var paper = currentPaper;
  var score = 0;
  var p = loadLS(LS_PROGRESS, {});
  paper.questions.forEach(function (q) {
    var st = paper.answers[q.id];
    if (st === undefined) return;
    var r = p[q.id] || { r: 0, w: 0 };
    if (st) { score += q.pts; r.r++; r.last = todayStr(); advanceSrsRecord(r); } else { r.w++; r.last = todayStr(); r.lastW = todayStr(); resetSrsRecord(r); }
    p[q.id] = r;
  });
  saveLS(LS_PROGRESS, p);
  var hist = loadLS(LS_HISTORY, []);
  hist.unshift({ date: new Date().toISOString().slice(0, 10), title: paper.kind === 'full' ? '全卷模拟' : paper.ch.name, score: score, sum: paper.sum, total: paper.questions.length });
  saveLS(LS_HISTORY, hist.slice(0, 20));
  toast('📊 得分 ' + score + '/' + paper.sum + '（' + Math.round(score / Math.max(1, paper.sum) * 100) + '%）');
  view.name = 'home';
  view.param = null;
  render();
}

function nextPractice() {
  practice.idx++;
  if (practice.idx >= practice.list.length) {
    practice.idx = 0;
    practice.revealed = {};
    toast('🎉 本章节一轮刷完，从头开始再来一轮');
  }
  render();
}

function practiceAnswer(ok) {
  var p = loadLS(LS_PROGRESS, {});
  var q = practice.list[practice.idx];
  var r = p[q.id] || { r: 0, w: 0 };
  if (ok) { r.r++; r.last = todayStr(); advanceSrsRecord(r); } else { r.w++; r.last = todayStr(); r.lastW = todayStr(); resetSrsRecord(r); }
  p[q.id] = r;
  saveLS(LS_PROGRESS, p);
  practice.revealed[q.id] = true;
  nextPractice();
  toast(ok ? '✅ 已记录' : '已加入错题本（明天安排第一次复习）');
}

function findQuestion(qid) {
  for (var i = 0; i < CHAPTERS.length; i++) {
    var qs = byCh(CHAPTERS[i].id);
    for (var j = 0; j < qs.length; j++) if (qs[j].id === qid) return qs[j];
  }
  return null;
}

function handleClick(e) {
  var el = e.target && e.target.closest ? e.target.closest('[data-act],[data-tab]') : null;
  if (!el) return;
  var tab = el.dataset.tab;
  if (tab) {
    if (tab === 'math') { view = { name: 'home', param: null }; render(); }
    else if (tab === 'review') { view = { name: 'review', param: null }; reviewState.rows = null; render(); }
    else if (tab === 'english') { view = { name: 'placeholder', param: 'english' }; render(); }
    else if (tab === 'major') { view = { name: 'placeholder', param: 'major' }; render(); }
    else if (tab === 'wrong') { view = { name: 'wrong', param: null }; render(); }
    return;
  }
  var act = el.dataset.act;
  switch (act) {
    case 'pickCh': view.param = el.dataset.id; render(); break;
    case 'genToday': genPaper(todaySeed()); break;
    case 'genNew': genPaper(Math.floor(Math.random() * 2147483647)); break;
    case 'openCh': practice = null; view = { name: 'chapter', param: el.dataset.id }; render(); break;
    case 'openRef': view = { name: 'ref', param: null }; render(); break;
    case 'backHome': view = { name: 'home', param: null }; currentPaper = null; practice = null; render(); break;
    case 'reveal':
      currentPaper.revealed[currentPaper.questions[parseInt(el.dataset.i, 10)].id] = true;
      render();
      break;
    case 'markOk': currentPaper.answers[currentPaper.questions[parseInt(el.dataset.i, 10)].id] = true; render(); break;
    case 'markNo': currentPaper.answers[currentPaper.questions[parseInt(el.dataset.i, 10)].id] = false; render(); break;
    case 'submitPaper': submitPaper(); break;
    case 'revealP':
      practice.revealed[practice.list[practice.idx].id] = true;
      render();
      break;
    case 'pOk': practiceAnswer(true); break;
    case 'pNo': practiceAnswer(false); break;
    case 'nextP':
      practice.revealed[practice.list[practice.idx].id] = true;
      nextPractice();
      break;
    case 'wrongFilter': wrongFilter = el.dataset.f; render(); break;
    case 'srsOk':
      var p4 = loadLS(LS_PROGRESS, {});
      var r4 = p4[el.dataset.id] || { r: 0, w: 0 };
      r4.r++;
      r4.last = todayStr();
      advanceSrsRecord(r4);
      p4[el.dataset.id] = r4;
      saveLS(LS_PROGRESS, p4);
      toast('✅ 复习通过，下次 ' + (function () {
        var r5 = loadLS(LS_PROGRESS, {})[el.dataset.id];
        return r5 && r5.srs && !r5.srs.done ? r5.srs.next : '已掌握';
      })());
      render();
      break;
    case 'srsAgain':
      var p5 = loadLS(LS_PROGRESS, {});
      var r6 = p5[el.dataset.id] || { r: 0, w: 0 };
      r6.w++;
      r6.last = todayStr();
      r6.lastW = todayStr();
      resetSrsRecord(r6);
      p5[el.dataset.id] = r6;
      saveLS(LS_PROGRESS, p5);
      toast('已重置记忆周期，明天重新复习');
      render();
      break;
    case 'removeWrong':
      var p6 = loadLS(LS_PROGRESS, {});
      if (p6[el.dataset.id]) { p6[el.dataset.id].w = 0; p6[el.dataset.id].srs = null; }
      saveLS(LS_PROGRESS, p6);
      render();
      toast('已从错题本移除');
      break;
    case 'hint':
      var card = el.closest('.q-item') || el.closest('.card');
      var slotEl = card ? card.querySelector('[id^="hintslot"]') : null;
      if (!slotEl) break;
      var qi = findQuestion(el.dataset.qid);
      showHintBox(slotEl.id, el.dataset.qid, qi || {}, qi ? qi.ch : 'limit');
      break;
    case 'hintP':
      var qp = practice.list[practice.idx];
      showHintBox('hintslot', qp.id, qp, qp.ch);
      break;
    case 'analyzeWeek': analyzeWeek(); break;
    case 'reviewPaper':
      view.param = el.dataset.ch;
      genPaper(Math.floor(Math.random() * 2147483647));
      break;
    case 'quizStart': startQuiz(el.dataset.ch || null, el.dataset.topic || ''); break;
    case 'quizSend': quizSend(); break;
    case 'quizReveal':
      var cq = quiz.ch ? CONCEPT_QUESTIONS[quiz.ch] : null;
      if (cq) {
        quiz.msgs.push({ role: 'ai', text: '参考答案：' + cq.a });
        quiz.done = true;
        render();
      }
      break;
    case 'quizLocalDone':
      quiz.msgs.push({ role: 'ai', text: '✅ 很好！如果表述与参考答案有出入，说明这个点还需要再巩固，建议明天再来考一次（去错题本或章节里再练几题）。' });
      quiz.done = true;
      render();
      break;
    case 'backReview':
      view = { name: 'review', param: null };
      quiz = null;
      render();
      break;
  }
}

/* ============ 初始化 ============ */
function init() {
  document.addEventListener('click', handleClick);
  var sc = $('btnSaveSettings');
  if (sc) sc.addEventListener('click', saveSettings);
  var cc = $('btnCloseSettings');
  if (cc) cc.addEventListener('click', closeSettings);
  $('settingsModal').addEventListener('click', function (e) { if (e.target === $('settingsModal')) closeSettings(); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* 静默 */ });
  }
  render();
  // 打开 App 时提醒到期错题
  setTimeout(function () {
    var due = dueCount();
    if (due > 0) toast('🔔 今天有 ' + due + ' 道错题到期，去「错题」页复习吧');
  }, 1200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
