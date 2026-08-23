'use strict';

/* ================================================================
   考研数学一 · 刷题助手
   出卷规则（按用户要求 + D:\ai 分值表）：
   - 微分方程之前的章节：100% 真题
   - 微分方程及之后 + 线代 + 概率：约 8 成真题 + 2 成模拟（只取最有价值的模拟题）
   - 二重积分：不出现在卷子里，仅保留 ≤10 道参考题
   - 分值权重参考 2021-2026 历年平均：高数上 40.3 / 高数下 45.7 / 线代 32 / 概率 32
================================================================ */

var LS_PROGRESS = 's1_progress';
var LS_HISTORY = 's1_history';

/* ============ 题库合并 ============ */
var CHAPTERS = [];
var QUESTIONS = [];
var REF_CHAPTER = null;

function loadBank() {
  CHAPTERS = [];
  QUESTIONS = [];
  [window.MATH_GAOSHU, window.MATH_XIANDAI, window.MATH_GAILV].forEach(function (bank) {
    if (!bank) return;
    bank.chapters.forEach(function (c) {
      if (c.ref) REF_CHAPTER = c;
      CHAPTERS.push(c);
    });
    bank.questions.forEach(function (q) { QUESTIONS.push(q); });
  });
}
function chapterById(id) {
  for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return CHAPTERS[i];
  return null;
}
function byCh(id) {
  return QUESTIONS.filter(function (q) { return q.ch === id; });
}
function activeChapters() {
  return CHAPTERS.filter(function (c) { return !c.ref; });
}

/* ============ 数据 ============ */
function loadProgress() {
  try {
    var raw = localStorage.getItem(LS_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); } catch (e) { /* 忽略 */ }
}
function loadHistory() {
  try {
    var raw = localStorage.getItem(LS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(h)); } catch (e) { /* 忽略 */ }
}

/* ============ 随机（可指定种子） ============ */
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

/* ============ 出卷引擎 ============ */
function chapterTarget(ch) {
  return Math.max(5, Math.round(ch.weight / 5) * 5);
}

/* 章节卷：按分值表权重出题，应用真题/模拟规则 */
function genChapterPaper(chId, seed) {
  var ch = chapterById(chId);
  var rnd = mulberry32(seed);
  var pool = byCh(chId);
  var real = shuffle(pool.filter(function (q) { return q.t !== '模拟'; }), rnd);
  var mock = shuffle(pool.filter(function (q) { return q.t === '模拟'; }), rnd);
  var target = chapterTarget(ch);
  var picks = [];
  var sum = 0;
  var ri = 0, mi = 0, count = 0;
  while (sum < target && count < 12) {
    var q = null;
    // 混合章节：每题 20% 概率抽模拟题（长期统计 ≈ 8 成真题 2 成模拟）
    if (ch.rule === 'mixed' && mi < mock.length && rnd() < 0.2) {
      q = mock[mi++];
    } else if (ri < real.length) {
      q = real[ri++];
    } else if (mi < mock.length) {
      q = mock[mi++];
    }
    if (!q) break;
    picks.push(q);
    sum += q.pts;
    count++;
  }
  return { kind: 'chapter', ch: ch, questions: shuffle(picks, rnd), sum: sum };
}

/* 全卷：150 分，选择 10×5 + 填空 6×5 + 解答 7×10，按章节权重抽样 */
function genFullPaper(seed) {
  var rnd = mulberry32(seed);
  var acts = activeChapters();
  var totalW = 0;
  acts.forEach(function (c) { totalW += c.weight; });

  function weightedChapter() {
    var r = rnd() * totalW;
    for (var i = 0; i < acts.length; i++) {
      r -= acts[i].weight;
      if (r <= 0) return acts[i];
    }
    return acts[acts.length - 1];
  }
  function pickOne(ch, qt) {
    var pool = byCh(ch.id).filter(function (q) { return q.qt === qt; });
    if (!pool.length) return null;
    var real = pool.filter(function (q) { return q.t !== '模拟'; });
    var mock = pool.filter(function (q) { return q.t === '模拟'; });
    if (ch.rule === 'mixed' && mock.length && rnd() < 0.2) {
      return mock[Math.floor(rnd() * mock.length)];
    }
    if (real.length) return real[Math.floor(rnd() * real.length)];
    return pool[Math.floor(rnd() * pool.length)];
  }
  function pickAny(qt) {
    var pool = QUESTIONS.filter(function (q) { return q.qt === qt && !chapterById(q.ch).ref; });
    if (!pool.length) return null;
    return pool[Math.floor(rnd() * pool.length)];
  }

  var structure = [];
  for (var i = 0; i < 10; i++) structure.push({ qt: '选择', pts: 5 });
  for (var j = 0; j < 6; j++) structure.push({ qt: '填空', pts: 5 });
  for (var k = 0; k < 7; k++) structure.push({ qt: '解答', pts: 10 });

  var picks = [];
  structure.forEach(function (slot) {
    var ch = weightedChapter();
    var q = pickOne(ch, slot.qt) || pickAny(slot.qt);
    if (q) picks.push(q);
  });
  return { kind: 'full', ch: null, questions: picks, sum: picks.reduce(function (s, q) { return s + q.pts; }, 0) };
}

/* ============ 视图状态 ============ */
var view = { name: 'home', param: null };
var currentPaper = null;      // { kind, ch, questions, sum, answers: {qid: true/false} }
var practice = null;          // { ch, list, idx, revealed }
var wrongFilter = null;

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
}
function tagHTML(q) {
  var src = q.t;
  if (q.t === '真题' && q.y) src = '真题' + (q.y || '');
  var cls = q.t === '真题' ? 'tag-real' : (q.t === '模拟' ? 'tag-mock' : 'tag-ref');
  return '<span class="tag ' + cls + '">' + esc(src) + '</span>';
}
function questionBodyHTML(q, revealed) {
  var opts = '';
  if (q.o && q.o.length) {
    opts = '<div class="opts">' + q.o.map(function (o, i) {
      var l = o.charAt(0);
      return '<div class="opt">' + l + '.</span> ' + esc(o.slice(2)) + '</div>';
    }).join('') + '</div>';
  }
  var ans = '';
  if (revealed) {
    ans = '<div class="answer"><div class="ans-label">✅ 答案：' + esc(q.a) + '</div>' +
      '<div class="ans-s">📖 解析：' + esc(q.s) + '</div></div>';
  }
  return opts + ans;
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
  updateTabs();
  updateHeader();
  window.scrollTo(0, 0);
}

function updateTabs() {
  var map = { home: 'math', wrong: 'wrong', placeholder: view.param === 'english' ? 'english' : 'major' };
  var active = map[view.name] || 'math';
  document.querySelectorAll('.tabbar .tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === active);
  });
}

function updateHeader() {
  var p = loadProgress();
  var total = 0, right = 0;
  Object.keys(p).forEach(function (k) {
    var r = p[k];
    total += (r.r || 0) + (r.w || 0);
    right += (r.r || 0);
  });
  $('statTotal').textContent = total;
  $('statRate').textContent = total ? Math.round(right / total * 100) + '%' : '—';
}

/* ============ 首页 ============ */
function renderHome(v) {
  var p = loadProgress();
  var hist = loadHistory();

  var chips = activeChapters().map(function (c) {
    return '<button class="chip' + (view.param === c.id ? ' chip-on' : '') + '" data-act="pickCh" data-id="' + c.id + '">' +
      esc(c.short) + ' <i>' + c.weight + '分</i></button>';
  }).join('');

  var rows = activeChapters().map(function (c) {
    var qs = byCh(c.id);
    var done = 0, right = 0;
    qs.forEach(function (q) {
      var r = p[q.id];
      if (r) { done += r.r + r.w; right += r.r; }
    });
    var pct = qs.length ? Math.round(done / qs.length * 100) : 0;
    var rule = c.rule === 'mixed' ? '真题80%+模拟20%' : '纯真题';
    return '<div class="ch-row" data-act="openCh" data-id="' + c.id + '">' +
      '<div class="ch-left"><div class="ch-name">' + esc(c.name) + '</div>' +
      '<div class="ch-meta">' + esc(c.area) + ' · ' + c.weight + ' 分 · ' + rule + ' · 题库 ' + qs.length + ' 题</div></div>' +
      '<div class="ch-right"><div class="ch-done">' + done + '/' + qs.length + '</div>' +
      '<div class="pbar"><div class="pbar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="ch-rate">' + (done ? Math.round(right / done * 100) + '%' : '') + '</div></div>' +
      '</div>';
  }).join('');

  var histRows = hist.slice(0, 5).map(function (h) {
    return '<div class="hist-row"><span>' + esc(h.title) + '</span><span class="hist-date">' + esc(h.date) + '</span><span class="hist-score">' + h.score + ' / ' + h.sum + '</span></div>';
  }).join('') || '<div class="hint-text">还没有试卷记录，出第一张卷子吧～</div>';

  v.innerHTML =
    '<div class="card">' +
      '<div class="card-title">📝 今日卷子</div>' +
      '<p class="hint-text">选一个章节（或全卷 150 分）→ 按「数学一出题分值表（2021-2026）」权重出卷。今日卷子每天固定，可随时重新出卷。</p>' +
      '<div class="chips">' + chips + '<button class="chip chip-full" data-act="pickCh" data-id="__full__">🎯 全卷 150 分</button></div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-primary btn-flex" data-act="genToday">🎲 生成今日卷子</button>' +
        '<button class="btn btn-ghost btn-flex" data-act="genNew">🔄 重新出卷</button>' +
      '</div>' +
      '<p class="hint-text rule-hint">出卷规则：微分方程之前 100% 真题；微分方程及之后、线代、概率 ≈ 8 成真题 + 2 成高价值模拟题；二重积分不进卷子（保留 ' + (byCh(REF_CHAPTER.id).length) + ' 道参考题）。</p>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-title">📚 章节题库</div>' + rows +
    '</div>' +
    '<div class="card ref-card" data-act="openRef">' +
      '<div class="card-title row-between"><span>🔬 二重积分 · 参考题</span><span class="hint-text">' + byCh(REF_CHAPTER.id).length + ' 道</span></div>' +
      '<p class="hint-text">按要求二重积分不出现在卷子里，只保留最有参考价值的 ' + byCh(REF_CHAPTER.id).length + ' 道题供查阅。</p>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-title">📜 最近试卷</div>' + histRows +
    '</div>';
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
        '<span class="q-pts">' + q.pts + ' 分</span>' + tagHTML(q) + mark + '</div>' +
      '<div class="q-text">' + esc(q.q) + '</div>' +
      '<div class="q-answer" id="qans-' + i + '">' + questionBodyHTML(q, paper.revealed[q.id] === true) + '</div>' +
      '<div class="q-actions">' +
        (paper.revealed[q.id] ? '' : '<button class="mini-btn" data-act="reveal" data-i="' + i + '">👁 查看答案</button>') +
        '<button class="mini-btn' + (paper.answers[q.id] === true ? ' on' : '') + '" data-act="markOk" data-i="' + i + '">✓ 做对了</button>' +
        '<button class="mini-btn' + (paper.answers[q.id] === false ? ' on-no' : '') + '" data-act="markNo" data-i="' + i + '">✗ 做错了</button>' +
      '</div>' +
    '</div>';
  }).join('');
  var answered = Object.keys(paper.answers).length;
  v.innerHTML =
    '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button><div class="sh-title">' + esc(title) + '</div><div class="sh-sub">满分 ' + paper.sum + ' 分</div></div>' +
    '<div class="card"><div class="card-title">本卷 ' + paper.questions.length + ' 题 · 已作答 ' + answered + ' 题</div>' +
    '<p class="hint-text">做法：先自己做 → 点「查看答案」核对 → 点「做对了/做错了」记录 → 最后交卷算分。</p></div>' +
    list +
    '<div class="submit-bar"><button class="btn btn-primary btn-flex" data-act="submitPaper">📊 交卷算分</button></div>';
}

/* ============ 章节刷题视图 ============ */
function renderChapterPractice(v) {
  var ch = chapterById(v.param);
  if (!ch) { view.name = 'home'; render(); return; }
  if (!practice || practice.ch !== v.param) {
    var list = shuffle(byCh(ch.id), mulberry32(Date.now() % 2147483647));
    practice = { ch: v.param, list: list, idx: 0, revealed: {} };
  }
  var total = practice.list.length;
  if (!total) { view.name = 'home'; render(); return; }
  var q = practice.list[practice.idx];
  var revealed = practice.revealed[q.id] === true;
  var p = loadProgress();
  var pr = p[q.id] || { r: 0, w: 0 };
  v.innerHTML =
    '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button>' +
    '<div class="sh-title">' + esc(ch.name) + '</div><div class="sh-sub">' + (practice.idx + 1) + '/' + total + '</div></div>' +
    '<div class="pbar big"><div class="pbar-fill" style="width:' + Math.round((practice.idx) / total * 100) + '%"></div></div>' +
    '<div class="card">' +
      '<div class="q-head"><span class="tag tag-qt">' + q.qt + '</span><span class="q-pts">' + q.pts + ' 分</span>' + tagHTML(q) + '</div>' +
      '<div class="q-text big">' + esc(q.q) + '</div>' +
      '<div id="qans">' + questionBodyHTML(q, revealed) + '</div>' +
      '<div class="q-actions big-actions">' +
        (revealed ? '' : '<button class="btn btn-ghost btn-flex" data-act="revealP">👁 查看答案</button>') +
        '<button class="btn btn-ghost btn-flex" data-act="pOk">✓ 做对了</button>' +
        '<button class="btn btn-ghost btn-flex" data-act="pNo">✗ 做错了</button>' +
      '</div>' +
      '<div class="hint-text">本题已记录：对 ' + pr.r + ' 次 · 错 ' + pr.w + ' 次</div>' +
      '<button class="btn btn-primary btn-block" data-act="nextP">下一题 →</button>' +
    '</div>';
}

/* ============ 错题本 ============ */
function renderWrong(v) {
  var p = loadProgress();
  var wrong = QUESTIONS.filter(function (q) {
    var r = p[q.id];
    return r && r.w > 0;
  });
  if (!wrong.length) {
    v.innerHTML = '<div class="card"><div class="empty">🎉 太棒了，错题本是空的！</div></div>';
    return;
  }
  var list = wrong.map(function (q) {
    var ch = chapterById(q.ch);
    return '<div class="card wrong-item">' +
      '<div class="q-head"><span class="ch-badge">' + esc(ch.short) + '</span>' + tagHTML(q) + '<span class="wrong-count">错 ' + p[q.id].w + ' 次</span></div>' +
      '<div class="q-text">' + esc(q.q) + '</div>' +
      '<div class="q-answer">' + questionBodyHTML(q, true) + '</div>' +
      '<div class="q-actions"><button class="mini-btn" data-act="clearWrong" data-id="' + q.id + '">✅ 已掌握，移出错题本</button></div>' +
    '</div>';
  }).join('');
  v.innerHTML = '<div class="sub-header"><div class="sh-title">⭐ 错题本</div><div class="sh-sub">' + wrong.length + ' 题</div></div>' + list;
}

/* ============ 二重积分参考题 ============ */
function renderRef(v) {
  var qs = byCh(REF_CHAPTER.id);
  var list = qs.map(function (q) {
    return '<div class="card"><div class="q-head">' + tagHTML(q) + '<span class="q-pts">' + q.pts + ' 分</span></div>' +
      '<div class="q-text">' + esc(q.q) + '</div>' +
      '<div class="q-answer">' + questionBodyHTML(q, true) + '</div></div>';
  }).join('');
  v.innerHTML =
    '<div class="sub-header"><button class="icon-btn" data-act="backHome">←</button><div class="sh-title">二重积分 · 参考题</div><div class="sh-sub">' + qs.length + ' 道</div></div>' +
    '<div class="card"><p class="hint-text">二重积分按要求不出现在每日试卷中，仅保留以下最有参考价值的题。这些题与三重积分、曲线曲面积分同属「多元积分」考点体系，掌握方法后做线面积分更顺。</p></div>' +
    list;
}

/* ============ 英语/专业课预留 ============ */
function renderPlaceholder(v) {
  var isEng = v.param === 'english';
  v.innerHTML = '<div class="card placeholder-card">' +
    '<div class="ph-icon">' + (isEng ? '🇬🇧' : '📚') + '</div>' +
    '<div class="ph-title">' + (isEng ? '英语一 · 模块预留中' : '专业课 · 模块预留中') + '</div>' +
    '<p class="hint-text ph-desc">' + (isEng
      ? '这里将放置英语一真题/模拟题库：阅读理解、完形、翻译、作文，按年份与题型刷题。'
      : '这里将放置你的专业课题库：按章节出题、真题+模拟混合，与数学模块相同的刷题体验。') + '</p>' +
    '<p class="hint-text">需要启用时告诉我你的目标院校与专业（比如「408 计算机统考」或某校自命题），我帮你把题库和规则配好。</p>' +
    '</div>';
}

/* ============ 动作 ============ */
function genPaper(seed) {
  if (view.param === '__full__' || !view.param) {
    currentPaper = genFullPaper(seed);
  } else {
    currentPaper = genChapterPaper(view.param, seed);
  }
  currentPaper.answers = {};
  currentPaper.revealed = {};
  view.name = 'paper';
  render();
}

function submitPaper() {
  var paper = currentPaper;
  var score = 0;
  var done = 0;
  var p = loadProgress();
  paper.questions.forEach(function (q) {
    var st = paper.answers[q.id];
    if (st === undefined) return;
    done++;
    var r = p[q.id] || { r: 0, w: 0 };
    if (st) { score += q.pts; r.r++; } else { r.w++; }
    p[q.id] = r;
  });
  saveProgress(p);
  var hist = loadHistory();
  var title = paper.kind === 'full' ? '全卷模拟' : paper.ch.name;
  hist.unshift({ date: new Date().toISOString().slice(0, 10), title: title, score: score, sum: paper.sum, total: paper.questions.length });
  saveHistory(hist.slice(0, 20));
  var rate = done ? Math.round(score / (paper.questions.filter(function (q) { return paper.answers[q.id] !== undefined; }).reduce(function (s, q) { return s + q.pts; }, 0) || 1) * 100) : 0;
  showResult(score, paper, done);
  view.name = 'home';
  view.param = null;
  render();
}

function showResult(score, paper, done) {
  var total = paper.sum;
  var pct = Math.round(score / Math.max(1, total) * 100);
  toast('📊 得分 ' + score + '/' + total + '（' + pct + '%）· 已作答 ' + done + ' 题');
}

function markAnswer(qid, ok) {
  if (!currentPaper) return;
  currentPaper.answers[qid] = ok;
  currentPaper.revealed[qid] = true;
  render();
}

function nextPractice() {
  var p = loadProgress();
  var q = practice.list[practice.idx];
  var st = practice.answered || null;
  practice.idx++;
  practice.answered = null;
  if (practice.idx >= practice.list.length) {
    practice.idx = 0;
    practice.revealed = {};
    toast('🎉 本章节一轮刷完，从头开始再来一轮');
  }
  render();
}

function practiceAnswer(ok) {
  var p = loadProgress();
  var q = practice.list[practice.idx];
  var r = p[q.id] || { r: 0, w: 0 };
  if (ok) r.r++; else r.w++;
  p[q.id] = r;
  saveProgress(p);
  practice.revealed[q.id] = true;
  nextPractice();
  toast(ok ? '✅ 已记录' : '已加入错题本');
}

function handleClick(e) {
  var el = e.target && e.target.closest ? e.target.closest('[data-act],[data-tab]') : null;
  if (!el) return;
  var tab = el.dataset.tab;
  if (tab) {
    if (tab === 'math') { view = { name: 'home', param: null }; render(); }
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
      var q1 = currentPaper.questions[parseInt(el.dataset.i, 10)];
      currentPaper.revealed[q1.id] = true;
      render();
      break;
    case 'markOk': markAnswer(currentPaper.questions[parseInt(el.dataset.i, 10)].id, true); break;
    case 'markNo': markAnswer(currentPaper.questions[parseInt(el.dataset.i, 10)].id, false); break;
    case 'submitPaper': submitPaper(); break;
    case 'revealP':
      var q2 = practice.list[practice.idx];
      practice.revealed[q2.id] = true;
      render();
      break;
    case 'pOk': practiceAnswer(true); break;
    case 'pNo': practiceAnswer(false); break;
    case 'nextP':
      practice.revealed[practice.list[practice.idx].id] = true;
      nextPractice();
      render();
      break;
    case 'clearWrong':
      var p3 = loadProgress();
      var r3 = p3[el.dataset.id];
      if (r3) r3.w = 0;
      saveProgress(p3);
      render();
      toast('已移出错题本');
      break;
  }
}

/* ============ 初始化 ============ */
function init() {
  loadBank();
  document.addEventListener('click', handleClick);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* 静默 */ });
  }
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
