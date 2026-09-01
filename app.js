'use strict';

/* ================================================================
   考研学习计划助手 v1.0
   科目：数学一 / 英语一 / 专业课
   功能：每日任务、单科计时、番茄钟、统计图表、打卡日历、
         错题本、智能规划、每日提醒、数据导入导出
   数据全部保存在本机浏览器 localStorage，不上传任何服务器。
================================================================ */

/* ============ 常量 ============ */
var STORAGE_KEY = 'kaoyan_assistant_v1';
var SUBJECT_KEYS = ['math', 'english', 'major'];
var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

var QUOTES = [
  '路虽远，行则将至；事虽难，做则必成。',
  '你今天的每一道题，都是考场上的分数。',
  '考研是一场马拉松，拼的不是速度，是坚持。',
  '所有的努力都不会被辜负，只是时间早晚的问题。',
  '把目标写在题里，把坚持写在每一天。',
  '当你觉得为时已晚的时候，恰恰是最早的时候。',
  '你只管努力，剩下的交给时间。',
  '山顶的风景，属于坚持到最后的人。',
  '刷题百遍，其义自见。',
  '别怕慢，怕的是停。'
];

var DEFAULT_SETTINGS = {
  examDate: '2025-12-20',
  subjects: {
    math:    { name: '数学一', emoji: '📐', color: '#6366f1', problems: 25, minutes: 180 },
    english: { name: '英语一', emoji: '🔤', color: '#0ea5e9', problems: 10, minutes: 90 },
    major:   { name: '专业课', emoji: '📚', color: '#f59e0b', problems: 10, minutes: 120 }
  },
  pomodoro: { focus: 25, short: 5, long: 15, longEvery: 4, autoBreak: true },
  reminder: { enabled: false, time: '21:30' },
  theme: 'auto'
};

/* ============ 专业课 811 资源库（西安电子科技大学） ============ */
var MAJOR_DATA = {
  title: '西电 811 信号与系统、电路',
  exam: '信号与系统 75 分 + 电路 75 分，总分 150，闭卷 180 分钟',
  syllabus: {
    url: 'https://gr.xidian.edu.cn/info/1074/17314.htm',
    note: '官方大纲：西电研究生院官网「2026年自命题科目考试大纲」；本地：D:\\ai\\811信号与系统、电路.pdf（与官网逐字一致）'
  },
  zhenti: {
    intro: '只做最近 8 年（2019–2026），优先做带答案的年份，掐 180 分钟全真模拟，做完对照答案并听视频讲解。',
    years: [
      { y: '2024', note: '✅ 题目+答案齐全，必做', where: '研/811/西电821 811 25 在这里/电子材料/西电821、811真题/811.821真题（分年份）/24 真题加答案/' },
      { y: '2023', note: '✅ 必做', where: '研/811/西电821 811 25 在这里/电子材料/西电821、811真题/811.821真题（分年份）/真题23/' },
      { y: '2022', note: '✅ 必做', where: '研/811/西电/811真题与答案/（含 2022年811真题参考答案.pdf）' },
      { y: '2019–2021', note: '🟡 网盘文件夹里有就做', where: '研/811/西电/811真题与答案/ 与 研/811/26考研西安电子科大811，821信号与系统、电路真题（待更新）/西电811821/真题/' }
    ],
    recent: [
      { y: '2026', note: '✅ 网上有逐题精讲（含回忆版题目），必看', links: [
        { t: '水木观畴：2026 西电811真题逐题精讲（信号+电路）', url: 'https://www.bilibili.com/video/BV1iFrMBSEL4/' },
        { t: '西电研梦：西电26年通信工程学院811真题讲解', url: 'https://www.bilibili.com/video/BV1JMVN6JERj/' },
        { t: '西电电子通信考研：26西电811/821对答案', url: 'https://www.bilibili.com/video/BV1iwqSBREx7/' }
      ] },
      { y: '2025', note: '🟡 811 完整版暂无公开；用 821 真题练习（信号部分与 811 同大纲）', links: [
        { t: '通信考研小马哥：25西电821信号部分真题及解析', url: 'https://www.sohu.com/a/961329601_120179046' },
        { t: 'B站：2025西电821电路+信号真题讲解', url: 'https://www.bilibili.com/video/BV1RMkQYmErn/' }
      ] }
    ],
    extra: [
      { t: '真题视频逐题讲解（西电811）', where: '研/811/西电（多个机构）/821和811真题加解析加讲解/811,821真题讲解/西电811视频详细讲解/' },
      { t: '晋城考研 811 定向班：真题与答案 + 真题讲解', where: '研/811/晋城考研西电 811821/A全程班/' }
    ]
  },
  keti: [
    { subject: '信号', t: '吴大正《信号与线性系统分析》第4版课后题（811 指定教材）', note: '一轮/二轮主刷', where: '本地 D:\\BaiduNetdiskDownload：信号与线性系统分析习题全解(吴大正第4版).pdf、信号书后题打印.pdf' },
    { subject: '信号', t: '风中醉风 章末习题及答案（第1–7章）', note: '跟课配套', where: '研/澄潇宇数学大观/26风中醉风/章末习题及答案/' },
    { subject: '信号', t: '信号与系统本科题库（含答案详解）', where: '研/811/西电821 811 25 在这里/西安电子科技大学811，821信号与系统，电路/西电811821/题库/' },
    { subject: '信号', t: '西电本科信号习题册', where: '研/811/西电821 811 25 在这里/电子材料/821、811参考课本/西电本科信号习题册/' },
    { subject: '电路', t: '电路书后题打印版', note: '配合李小平课刷', where: '本地 D:\\BaiduNetdiskDownload\\电路书后题打印.pdf' },
    { subject: '电路', t: '电路重点课后题整理（西电划重点版）', note: '时间紧优先刷这个', where: '研/811/26考研西安电子科大811，821信号与系统、电路真题（待更新）/西电811821/参考书/电路重点课后题整理/' },
    { subject: '电路', t: '西电《电路基础》习题册与答案（三册均带详解）', where: '研/811/西电（多个机构）/其它习题推荐/电路/3．西电通院考研之《电路》资料/②西电《电路基础》习题册与答案/' },
    { subject: '电路', t: '《电路》经典题库', where: '研/811/西电821 811 25 在这里/电子材料/821、811参考课本/西电本科电路期末试题及答案/《电路》经典题库/' },
    { subject: '检测', t: '期末题做阶段检测：电路（2000-2010）、信号（2002-2010）', where: '研/811/西电821 811 25 在这里/电子材料/821、811参考课本/张永瑞 电路信号与系统考试辅导书等多个文件/2、电路ppt、视频、课本、课后答案、习题集/' }
  ],
  videos: [
    { t: '电路：李小平《电路分析基础》B站 103 讲', link: 'https://www.bilibili.com/video/BV1J741157zD', note: '必看 86 讲清单：D:\\ai\\811电路-李小平103讲-观看清单.md' },
    { t: '信号：风中醉风 课程【基础+强化】', note: '强化必看 22 集清单：D:\\ai\\811信号-风中醉风强化课-观看清单.md（网盘：研/澄潇宇数学大观/26风中醉风/）' }
  ],
  books: [
    '信号：吴大正《信号与线性系统分析》（官方目录：四版或五版，高等教育出版社）',
    '电路：王松林《电路基础》（官方目录：第三版，西电科大出版社；第四版为其修订新版，内容一致可用）',
    '辅导书：张永瑞《电路信号与系统考试辅导书》（网盘「电子材料」文件夹）'
  ]
};

/* ============ 数据层 ============ */
var memoryData = null;

function defaultData() {
  return { settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), days: {}, mistakes: [] };
}

function numOr(v, def, min, max) {
  var n = parseInt(v, 10);
  if (!isFinite(n)) return def;
  return clamp(n, min, max);
}

function sanitizeDays(days) {
  var out = {};
  Object.keys(days).forEach(function (k) {
    var d = days[k];
    if (!d || typeof d !== 'object') return;
    var day = {};
    SUBJECT_KEYS.forEach(function (sk) {
      var s = d[sk];
      if (s && typeof s === 'object') {
        day[sk] = {
          done: clamp(parseInt(s.done, 10) || 0, 0, 999999),
          seconds: clamp(parseInt(s.seconds, 10) || 0, 0, 99999999)
        };
      }
    });
    if (typeof d.note === 'string') day.note = d.note;
    var pm = parseInt(d.pomos, 10);
    if (isFinite(pm) && pm >= 0) day.pomos = pm;
    out[k] = day;
  });
  return out;
}

function migrate(raw) {
  var d = defaultData();
  if (raw && typeof raw === 'object') {
    if (raw.settings && typeof raw.settings === 'object') {
      d.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      var s = raw.settings;
      if (s.examDate) d.settings.examDate = String(s.examDate);
      if (s.pomodoro) d.settings.pomodoro = Object.assign({}, DEFAULT_SETTINGS.pomodoro, s.pomodoro);
      if (s.reminder) d.settings.reminder = Object.assign({}, DEFAULT_SETTINGS.reminder, s.reminder);
      if (s.theme) d.settings.theme = s.theme;
      if (s.subjects && typeof s.subjects === 'object') {
        SUBJECT_KEYS.forEach(function (k) {
          var cfg0 = s.subjects[k] || {};
          var def = DEFAULT_SETTINGS.subjects[k];
          d.settings.subjects[k] = {
            name: String(cfg0.name || def.name),
            emoji: String(cfg0.emoji || def.emoji),
            color: /^#[0-9a-fA-F]{3,8}$/.test(cfg0.color || '') ? cfg0.color : def.color,
            problems: numOr(cfg0.problems, def.problems, 0, 999),
            minutes: numOr(cfg0.minutes, def.minutes, 0, 1440)
          };
        });
      }
      // 默认考试日期过期时，自动顺延到下一个考研季
      if (d.settings.examDate === DEFAULT_SETTINGS.examDate) {
        var pd = parseKey(d.settings.examDate);
        var now = new Date();
        if (pd < now) {
          var cand = new Date(now.getFullYear(), 11, 20);
          if (cand < now) cand = new Date(now.getFullYear() + 1, 11, 20);
          d.settings.examDate = keyOf(cand);
        }
      }
    }
    if (raw.days && typeof raw.days === 'object') d.days = sanitizeDays(raw.days);
    if (Array.isArray(raw.mistakes)) d.mistakes = raw.mistakes.filter(function (m) { return m && typeof m === 'object'; });
    if (raw.pomo && typeof raw.pomo === 'object') {
      d.pomo = {
        mode: raw.pomo.mode === 'short' || raw.pomo.mode === 'long' ? raw.pomo.mode : 'focus',
        running: !!raw.pomo.running,
        endAt: isFinite(+raw.pomo.endAt) ? +raw.pomo.endAt : 0,
        remainMs: isFinite(+raw.pomo.remainMs) ? +raw.pomo.remainMs : 25 * 60000,
        subject: SUBJECT_KEYS.indexOf(raw.pomo.subject) >= 0 ? raw.pomo.subject : 'math'
      };
    }
  }
  return d;
}

function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* 无痕模式等 */ }
  return memoryData || defaultData();
}

var data = loadData();

function saveData() {
  memoryData = data;
  // 番茄钟运行状态随数据一起持久化（刷新/杀进程后可恢复）
  data.pomo = { mode: pomo.mode, running: pomo.running, endAt: pomo.endAt, remainMs: pomo.remainMs, subject: pomo.subject };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    showToast('⚠️ 无法保存到本地存储（可能处于无痕模式）');
  }
}

/* ============ 工具函数 ============ */
function pad(n) { return String(n).padStart(2, '0'); }
function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayKey() { return keyOf(new Date()); }
function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
}
function fmtDurMin(min) {
  min = Math.max(0, Math.round(min));
  var h = Math.floor(min / 60), m = min % 60;
  if (h > 0 && m > 0) return h + '小时' + m + '分';
  if (h > 0) return h + '小时';
  return m + '分';
}
function fmtExamDate(k) {
  var p = (k || '').split('-');
  if (p.length !== 3) return '未设置';
  return +p[0] + '年' + (+p[1]) + '月' + (+p[2]) + '日';
}

function ensureDay(k) {
  if (!data.days[k]) data.days[k] = {};
  return data.days[k];
}
function ensureSub(k, sub) {
  var d = ensureDay(k);
  if (!d[sub]) d[sub] = { done: 0, seconds: 0 };
  if (d[sub].done == null) d[sub].done = 0;
  if (d[sub].seconds == null) d[sub].seconds = 0;
  return d[sub];
}
function cfg(k) { return data.settings.subjects[k]; }
function subName(k) { return cfg(k).name; }

function daysUntilExam() {
  var k = data.settings.examDate;
  if (!k) return 0;
  var p = k.split('-');
  if (p.length !== 3) return 0;
  var exam = new Date(+p[0], +p[1] - 1, +p[2]);
  var today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((exam - today) / 86400000));
}

function phaseOf(d) {
  if (d > 200) return { name: '基础阶段', desc: '打牢基础，全面过知识点' };
  if (d > 120) return { name: '强化阶段', desc: '刷题强化，突破重点难点' };
  if (d > 60)  return { name: '冲刺阶段', desc: '真题模拟，查漏补缺' };
  return { name: '临考阶段', desc: '保持手感，稳住心态' };
}

function smartPlan(d) {
  if (d > 200) return {
    math: { problems: 20, minutes: 200 }, english: { problems: 8, minutes: 90 }, major: { problems: 6, minutes: 100 },
    note: '基础阶段：数学以讲义例题 + 基础题为主；英语主攻单词和长难句；专业课通读教材。'
  };
  if (d > 120) return {
    math: { problems: 25, minutes: 240 }, english: { problems: 10, minutes: 100 }, major: { problems: 8, minutes: 150 },
    note: '强化阶段：数学上 660/880/1000 题；英语精读真题阅读；专业课二轮复习 + 习题。'
  };
  if (d > 60) return {
    math: { problems: 20, minutes: 270 }, english: { problems: 12, minutes: 100 }, major: { problems: 10, minutes: 180 },
    note: '冲刺阶段：数学以真题套卷为主；英语真题 + 作文；专业课真题 + 背诵。'
  };
  return {
    math: { problems: 15, minutes: 240 }, english: { problems: 10, minutes: 80 }, major: { problems: 10, minutes: 180 },
    note: '临考阶段：全真模拟、错题回顾，保持题感，调整作息。'
  };
}

function dayActive(k) {
  var d = data.days[k];
  if (!d) return false;
  for (var i = 0; i < SUBJECT_KEYS.length; i++) {
    var s = d[SUBJECT_KEYS[i]];
    if (s && ((s.done || 0) > 0 || (s.seconds || 0) > 0)) return true;
  }
  return !!(d.note && d.note.trim());
}

function currentStreak() {
  var n = 0;
  var d = new Date();
  if (!dayActive(keyOf(d))) d.setDate(d.getDate() - 1);
  while (dayActive(keyOf(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function bestStreak() {
  var ks = Object.keys(data.days).sort();
  var cur = 0, best = 0, prev = null;
  for (var i = 0; i < ks.length; i++) {
    var k = ks[i];
    if (!dayActive(k)) { cur = 0; prev = null; continue; }
    var d = parseKey(k);
    if (prev) {
      var diff = Math.round((d - prev) / 86400000);
      if (diff === 1) cur++;
      else if (diff === 0) continue;
      else cur = 1;
    } else cur = 1;
    prev = d;
    if (cur > best) best = cur;
  }
  return best;
}

function totalCheckinDays() {
  return Object.keys(data.days).filter(dayActive).length;
}

function overallPercent() {
  var t = todayKey();
  var sum = 0, cnt = 0;
  SUBJECT_KEYS.forEach(function (k) {
    var s = ensureSub(t, k);
    var c = cfg(k);
    if (c.problems > 0) { sum += clamp((s.done || 0) / c.problems, 0, 1); cnt++; }
    if (c.minutes > 0) { sum += clamp((s.seconds || 0) / (c.minutes * 60), 0, 1); cnt++; }
  });
  return cnt > 0 ? Math.round(sum / cnt * 100) : 0;
}

function activityOf(k) {
  var d = data.days[k];
  if (!d) return 0;
  var sum = 0, cnt = 0;
  SUBJECT_KEYS.forEach(function (sk) {
    var c = cfg(sk);
    if (c.problems > 0) {
      var s = d[sk];
      sum += clamp((s ? s.done || 0 : 0) / c.problems, 0, 1.2);
      cnt++;
    }
  });
  return cnt > 0 ? sum / cnt : 0;
}

/* ============ 弹窗 & Toast ============ */
var modal = null, modalTitle = null, modalBody = null, modalOk = null, modalCancel = null, toast = null;
var modalOkCb = null;

function showModal(title, bodyHTML, opts) {
  opts = opts || {};
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalOk.textContent = opts.okLabel || '确定';
  modalCancel.style.display = opts.hideCancel ? 'none' : '';
  modalOkCb = opts.onOk || null;
  modal.classList.remove('hidden');
}
function closeModal() { modal.classList.add('hidden'); modalOkCb = null; }

var toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
}

function askNumber(title, label, current, cb) {
  showModal(title,
    '<label class="field">' + esc(label) + '<input type="number" id="modalInput" inputmode="numeric" value="' + current + '"></label>',
    {
      okLabel: '保存',
      onOk: function () {
        var el = document.getElementById('modalInput');
        if (!el) return;
        var n = parseInt(el.value, 10);
        if (!isNaN(n)) cb(Math.max(0, n));
      }
    });
  setTimeout(function () {
    var el = document.getElementById('modalInput');
    if (el) { el.focus(); el.select(); }
  }, 80);
}

/* ============ 音效 ============ */
var audioCtx = null;
function unlockAudio() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 忽略 */ }
}
function beep() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(playBeep).catch(function () { /* 忽略 */ });
    return;
  }
  playBeep();
}
function playBeep() {
  if (!audioCtx) return;
  try {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.18, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    o.start(); o.stop(audioCtx.currentTime + 0.6);
  } catch (e) { /* 忽略 */ }
}

/* ============ 单科计时（秒表） ============ */
var sw = { key: null, startedAt: 0, accum: 0, lastSave: 0 };

function swElapsedMs() { return sw.accum + (Date.now() - sw.startedAt); }

function startStopwatch(key) {
  stopStopwatch(true);
  sw.key = key;
  sw.startedAt = Date.now();
  sw.accum = (ensureSub(todayKey(), key).seconds || 0) * 1000;
  sw.lastSave = 0;
  unlockAudio();
  renderSubjects();
  updateDocTitle();
  showToast('开始计时「' + subName(key) + '」，离开页面也会继续累计');
}

function stopStopwatch(persist) {
  if (!sw.key) return;
  if (persist) {
    var s = ensureSub(todayKey(), sw.key);
    s.seconds = Math.floor(swElapsedMs() / 1000);
    saveData();
  }
  sw.key = null; sw.startedAt = 0; sw.accum = 0;
  updateDocTitle();
}

/* 把当前已计时长写入存储，但计时继续（用于切后台前的落盘） */
function flushStopwatch() {
  if (!sw.key) return;
  var s = ensureSub(todayKey(), sw.key);
  s.seconds = Math.floor(swElapsedMs() / 1000);
  sw.accum = s.seconds * 1000;
  sw.startedAt = Date.now();
}

/* 立即保存正在输入的今日小结 */
function flushNote() {
  clearTimeout(noteTimer);
  var el = document.getElementById('noteInput');
  if (el) ensureDay(todayKey()).note = el.value || '';
}

function swTick() {
  if (!sw.key) return;
  var now = Date.now();
  if (now - sw.lastSave > 2000) {
    var s = ensureSub(todayKey(), sw.key);
    s.seconds = Math.floor(swElapsedMs() / 1000);
    saveData();
    sw.lastSave = now;
  }
  renderSubjectCardInto(sw.key);
  updateDocTitle();
}

/* ============ 番茄钟 ============ */
var pomo = { mode: 'focus', running: false, endAt: 0, remainMs: 25 * 60000, subject: 'math' };

function pomoDuration() {
  var p = data.settings.pomodoro;
  var min = pomo.mode === 'focus' ? p.focus : (pomo.mode === 'short' ? p.short : p.long);
  return Math.max(1, min) * 60000;
}

function startPomo() {
  if (pomo.running) return;
  if (pomo.remainMs <= 0) pomo.remainMs = pomoDuration();
  pomo.endAt = Date.now() + pomo.remainMs;
  pomo.running = true;
  unlockAudio();
  updatePomoUI();
}

function pausePomo() {
  if (!pomo.running) return;
  pomo.remainMs = Math.max(0, pomo.endAt - Date.now());
  pomo.running = false;
  saveData();
  updatePomoUI();
}

function togglePomo() { if (pomo.running) pausePomo(); else startPomo(); }

function resetPomo() {
  pomo.running = false;
  pomo.remainMs = pomoDuration();
  pomo.endAt = 0;
  saveData();
  updatePomoUI();
}

function skipPomo() {
  if (pomo.mode === 'focus') {
    showToast('已跳过本次专注（不计入时长）');
    pomo.mode = 'short';
  } else {
    pomo.mode = 'focus';
  }
  pomo.running = false;
  pomo.remainMs = pomoDuration();
  saveData();
  updatePomoUI();
}

function completePomo() {
  pomo.running = false;
  var t = todayKey();
  if (pomo.mode === 'focus') {
    var secs = data.settings.pomodoro.focus * 60;
    var s = ensureSub(t, pomo.subject);
    s.seconds = (s.seconds || 0) + secs;
    var day = ensureDay(t);
    day.pomos = (day.pomos || 0) + 1;
    saveData();
    beep();
    showToast('🍅 番茄完成！「' + subName(pomo.subject) + '」+ ' + data.settings.pomodoro.focus + ' 分钟');
    renderSubjects();
  }
  if (pomo.mode === 'focus') {
    var total = ensureDay(t).pomos || 0;
    pomo.mode = (total % data.settings.pomodoro.longEvery === 0) ? 'long' : 'short';
  } else {
    pomo.mode = 'focus';
    beep();
  }
  pomo.remainMs = pomoDuration();
  if (pomo.mode !== 'focus' && data.settings.pomodoro.autoBreak) {
    pomo.running = true;
    pomo.endAt = Date.now() + pomo.remainMs;
    showToast(pomo.mode === 'long' ? '☕ 长休息开始' : '☕ 短休息开始');
  }
  saveData();
  updatePomoUI();
}

/* 恢复持久化的番茄状态，并结算后台期间已错过的阶段 */
function restorePomoState() {
  var p = data.pomo;
  if (p) {
    pomo.mode = p.mode;
    pomo.running = !!p.running;
    pomo.endAt = p.endAt || 0;
    pomo.remainMs = p.remainMs || pomoDuration();
    pomo.subject = p.subject;
  }
  settlePomo();
}

function settlePomo() {
  if (!pomo.running || pomo.endAt > Date.now()) return;
  var loops = 0;
  while (pomo.running && pomo.endAt <= Date.now() && loops < 12) {
    completePomo();
    loops++;
  }
  saveData();
}

function pomoTick() {
  if (!pomo.running) return;
  var left = pomo.endAt - Date.now();
  if (left <= 0) { completePomo(); return; }
  pomo.remainMs = left;
  updatePomoUI();
}

/* ============ 渲染：顶栏 & Hero ============ */
function renderTop() {
  var d = new Date();
  document.getElementById('todayText').textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + WEEK[d.getDay()];
}

function renderHero() {
  var d = daysUntilExam();
  document.getElementById('countdownNum').textContent = d;
  document.getElementById('examDateText').textContent = fmtExamDate(data.settings.examDate);
  var ph = phaseOf(d);
  document.getElementById('phaseBadge').textContent = ph.name + ' · ' + ph.desc;
  var pct = overallPercent();
  document.getElementById('overallPct').textContent = pct + '%';
  document.getElementById('overallFill').style.width = pct + '%';
  document.getElementById('streakDays').textContent = currentStreak();
  document.getElementById('totalCheckins').textContent = totalCheckinDays();
}

/* ============ 渲染：科目卡片 ============ */
var CARD_C = 263.9; // 2πr, r=42

function subjectCardHTML(key) {
  var c = cfg(key);
  var t = todayKey();
  var sub = ensureSub(t, key);
  var running = sw.key === key;
  var secs = running ? Math.floor(swElapsedMs() / 1000) : (sub.seconds || 0);
  var done = sub.done || 0;
  var pct = Math.min(100, Math.round(done / Math.max(1, c.problems) * 100));
  var tpct = Math.min(100, Math.round(secs / Math.max(1, c.minutes * 60) * 100));
  var off = (CARD_C * (1 - pct / 100)).toFixed(1);
  var over = done >= c.problems && c.problems > 0;
  var status;
  if (done >= c.problems && secs >= c.minutes * 60 && (c.problems > 0 || c.minutes > 0)) status = '✅ 今日已达标';
  else if (done > 0 || secs > 0) status = '🔥 进行中';
  else status = '😴 未开始';
  return '' +
  '<div class="card subject-card" id="card-' + key + '" style="--sc:' + c.color + '">' +
    '<div class="sc-head">' +
      '<span class="sc-icon">' + c.emoji + '</span>' +
      '<div class="sc-titles"><div class="sc-title">' + esc(c.name) + '</div><div class="sc-status">' + status + '</div></div>' +
      '<button class="btn btn-ghost sc-timer' + (running ? ' running' : '') + '" data-action="toggleTimer" data-key="' + key + '">' + (running ? '⏸ 暂停' : '▶ 计时') + '</button>' +
    '</div>' +
    '<div class="sc-body">' +
      '<div class="ring-block" data-action="setProblems" data-key="' + key + '" title="点击修改今日题数">' +
        '<svg viewBox="0 0 100 100" class="ring">' +
          '<circle class="ring-bg" cx="50" cy="50" r="42"></circle>' +
          '<circle class="ring-fill" cx="50" cy="50" r="42" style="stroke:var(--sc);stroke-dasharray:' + CARD_C + ';stroke-dashoffset:' + off + '"></circle>' +
        '</svg>' +
        '<div class="ring-center"><div class="ring-num' + (over ? ' ring-over' : '') + '">' + done + '</div><div class="ring-cap">/ ' + c.problems + ' 题</div></div>' +
      '</div>' +
      '<div class="sc-side">' +
        '<div class="sc-btns">' +
          '<button class="step-btn" data-action="incProblems" data-key="' + key + '" data-delta="-5">−5</button>' +
          '<button class="step-btn" data-action="incProblems" data-key="' + key + '" data-delta="-1">−1</button>' +
          '<button class="step-btn" data-action="incProblems" data-key="' + key + '" data-delta="1">＋1</button>' +
          '<button class="step-btn" data-action="incProblems" data-key="' + key + '" data-delta="5">＋5</button>' +
          '<button class="step-btn" data-action="incProblems" data-key="' + key + '" data-delta="10">＋10</button>' +
        '</div>' +
        '<div class="sc-time" data-action="setTime" data-key="' + key + '" title="点击修改今日学习时长">⏱ ' + fmtClock(secs) + ' <small>/ 目标 ' + fmtDurMin(c.minutes) + '</small></div>' +
        '<div class="sc-time-btns">' +
          '<button class="step-btn" data-action="adjTime" data-key="' + key + '" data-delta="-600">−10分</button>' +
          '<button class="step-btn" data-action="adjTime" data-key="' + key + '" data-delta="600">＋10分</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="sc-bars">' +
      '<div class="mini-row"><span>做题</span><div class="progressbar"><div class="progressbar-fill" style="width:' + pct + '%;background:var(--sc)"></div></div><span>' + pct + '%</span></div>' +
      '<div class="mini-row"><span>时长</span><div class="progressbar"><div class="progressbar-fill" style="width:' + tpct + '%;background:var(--sc)"></div></div><span>' + tpct + '%</span></div>' +
    '</div>' +
  '</div>';
}

function renderSubjects() {
  document.getElementById('subjectCards').innerHTML = SUBJECT_KEYS.map(subjectCardHTML).join('');
}

/* 只更新某一科的卡片（计时每秒刷新时避免整块重建） */
function renderSubjectCardInto(key) {
  var el = document.getElementById('card-' + key);
  if (el && el.parentNode) el.outerHTML = subjectCardHTML(key);
}

function renderNote() {
  var el = document.getElementById('noteInput');
  if (document.activeElement !== el) {
    el.value = ensureDay(todayKey()).note || '';
  }
}

function renderQuote() {
  var now = new Date();
  var start = new Date(now.getFullYear(), 0, 0);
  var doy = Math.floor((now - start) / 86400000);
  document.getElementById('quoteText').textContent = QUOTES[doy % QUOTES.length];
}

/* ============ 渲染：番茄钟页 ============ */
function renderPomoChips() {
  document.getElementById('pomoSubjectChips').innerHTML = SUBJECT_KEYS.map(function (k) {
    var c = cfg(k);
    var active = pomo.subject === k;
    return '<button class="chip" data-action="pomoSubject" data-key="' + k + '"' +
      (active ? ' style="background:' + c.color + ';color:#fff;border-color:' + c.color + '"' : '') + '>' +
      c.emoji + ' ' + esc(c.name) + '</button>';
  }).join('');
}

var POMO_C = 2 * Math.PI * 118;
var POMO_COLORS = { focus: '#6366f1', short: '#10b981', long: '#0ea5e9' };
var POMO_NAMES = { focus: '专注', short: '短休息', long: '长休息' };

function updatePomoUI() {
  var ring = document.getElementById('pomoRing');
  var total = pomoDuration();
  var remain = Math.max(0, pomo.running ? pomo.endAt - Date.now() : pomo.remainMs);
  var frac = total > 0 ? remain / total : 0;
  ring.style.strokeDasharray = POMO_C;
  ring.style.strokeDashoffset = (POMO_C * (1 - frac)).toFixed(1);
  ring.style.stroke = POMO_COLORS[pomo.mode];
  document.getElementById('pomoTime').textContent = fmtClock(remain / 1000);
  document.getElementById('pomoModeText').textContent = POMO_NAMES[pomo.mode];
  document.getElementById('pomoToggle').textContent = pomo.running ? '⏸ 暂停' : '▶ 开始';
  document.getElementById('pomoFocusToday').textContent = ensureDay(todayKey()).pomos || 0;
  document.getElementById('pomoHint').textContent =
    '每 ' + data.settings.pomodoro.longEvery + ' 个番茄进入长休息 · 完成时间自动计入「' + subName(pomo.subject) + '」';
  updateDocTitle();
}

function renderFocus() {
  renderPomoChips();
  updatePomoUI();
}

/* ============ 渲染：统计页 ============ */
var statsRange = 7;

function rangeKeys(n) {
  var arr = [];
  var d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (var i = 0; i < n; i++) { arr.push(keyOf(d)); d.setDate(d.getDate() + 1); }
  return arr;
}

function shortLabel(k) {
  var p = k.split('-');
  return (+p[1]) + '/' + (+p[2]);
}

function niceMax(v) {
  if (v <= 1) return 1;
  var mag = Math.pow(10, Math.floor(Math.log10(v)));
  var u = v / mag;
  var n = u <= 1 ? 1 : u <= 2 ? 2 : u <= 5 ? 5 : 10;
  return n * mag;
}

function isDarkTheme() {
  var root = document.documentElement;
  if (root.classList.contains('dark')) return true;
  if (root.classList.contains('light')) return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function drawBars(canvas, labels, series, stacked) {
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.clientWidth;
  var h = 220;
  if (!w) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  var dark = isDarkTheme();
  var axisColor = dark ? '#8e95bd' : '#7d84a6';
  var gridColor = dark ? 'rgba(255,255,255,.10)' : 'rgba(128,132,170,.16)';

  var padL = 38, padR = 8, padT = 12, padB = 24;
  var pw = w - padL - padR, ph = h - padT - padB;

  var maxV = 0;
  if (stacked) {
    for (var i = 0; i < labels.length; i++) {
      var sum = 0;
      for (var si = 0; si < series.length; si++) sum += series[si].data[i] || 0;
      if (sum > maxV) maxV = sum;
    }
  } else {
    for (var si2 = 0; si2 < series.length; si2++) {
      for (var i2 = 0; i2 < series[si2].data.length; i2++) {
        if (series[si2].data[i2] > maxV) maxV = series[si2].data[i2];
      }
    }
  }
  var gridMax = niceMax(Math.max(1, maxV));

  ctx.font = '11px -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  for (var g = 0; g <= 4; g++) {
    var val = gridMax * g / 4;
    var y = padT + ph - ph * g / 4;
    ctx.strokeStyle = gridColor;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = axisColor;
    ctx.textAlign = 'right';
    ctx.fillText(stacked ? (Math.round(val / 60 * 10) / 10) + 'h' : String(Math.round(val)), padL - 6, y);
  }

  var n = labels.length;
  var groupW = pw / n;
  var barArea = groupW * 0.8;
  var labelEvery = n > 15 ? 5 : (n > 7 ? 2 : 1);

  for (var i3 = 0; i3 < n; i3++) {
    var x0 = padL + i3 * groupW + (groupW - barArea) / 2;
    if (stacked) {
      var acc = 0;
      for (var si3 = 0; si3 < series.length; si3++) {
        var v = series[si3].data[i3] || 0;
        var bh = ph * v / gridMax;
        ctx.fillStyle = series[si3].color;
        ctx.fillRect(x0, padT + ph - acc - bh, barArea, bh);
        acc += bh;
      }
    } else {
      var per = barArea / series.length;
      for (var si4 = 0; si4 < series.length; si4++) {
        var v2 = series[si4].data[i3] || 0;
        var bh2 = ph * v2 / gridMax;
        ctx.fillStyle = series[si4].color;
        ctx.fillRect(x0 + si4 * per + per * 0.12, padT + ph - bh2, per * 0.76, bh2);
      }
    }
    if (i3 % labelEvery === 0) {
      ctx.fillStyle = axisColor;
      ctx.textAlign = 'center';
      ctx.fillText(labels[i3], padL + i3 * groupW + groupW / 2, h - 9);
    }
  }
}

function renderLegend(elId, series) {
  document.getElementById(elId).innerHTML = series.map(function (s) {
    return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>';
  }).join('');
}

function renderStats() {
  var n = statsRange;
  var keys = rangeKeys(n);
  var labels = keys.map(shortLabel);

  var sums = {};
  SUBJECT_KEYS.forEach(function (k) { sums[k] = { p: 0, s: 0 }; });
  var tp = 0, ts = 0, active = 0;
  keys.forEach(function (k) {
    var d = data.days[k];
    if (!d) return;
    if (dayActive(k)) active++;
    SUBJECT_KEYS.forEach(function (sk) {
      var s = d[sk];
      if (s) { sums[sk].p += s.done || 0; sums[sk].s += s.seconds || 0; }
    });
  });
  SUBJECT_KEYS.forEach(function (k) { tp += sums[k].p; ts += sums[k].s; });

  document.getElementById('statTotalProblems').textContent = tp;
  document.getElementById('statTotalTime').textContent = (ts / 3600).toFixed(1);
  document.getElementById('statAvgTime').textContent = active ? (ts / active / 3600).toFixed(1) : '0';
  document.getElementById('statBestStreak').textContent = bestStreak();

  document.getElementById('statSubjectRows').innerHTML = SUBJECT_KEYS.map(function (k) {
    var c = cfg(k);
    return '<div class="subj-stat-row">' +
      '<span class="mi-badge" style="background:' + c.color + '22;color:' + c.color + '">' + c.emoji + ' ' + esc(c.name) + '</span>' +
      '<span>日均 ' + (Math.round(sums[k].p / n * 10) / 10) + ' 题 · ' + (Math.round(sums[k].s / n / 3600 * 10) / 10) + ' 小时</span>' +
      '</div>';
  }).join('');

  var probSeries = SUBJECT_KEYS.map(function (k) {
    var c = cfg(k);
    return {
      name: c.name, color: c.color,
      data: keys.map(function (dk) {
        var s = (data.days[dk] || {})[k];
        return s ? s.done || 0 : 0;
      })
    };
  });
  var timeSeries = SUBJECT_KEYS.map(function (k) {
    var c = cfg(k);
    return {
      name: c.name, color: c.color,
      data: keys.map(function (dk) {
        var s = (data.days[dk] || {})[k];
        return s ? Math.round((s.seconds || 0) / 60) : 0;
      })
    };
  });

  drawBars(document.getElementById('chartProblems'), labels, probSeries, false);
  drawBars(document.getElementById('chartTime'), labels, timeSeries, true);
  renderLegend('legendProblems', probSeries);
  renderLegend('legendTime', timeSeries);
}

/* ============ 渲染：打卡日历 ============ */
var calY, calM;

function renderCalendar() {
  var now = new Date();
  if (calY == null) { calY = now.getFullYear(); calM = now.getMonth(); }
  document.getElementById('calTitle').textContent = calY + '年' + (calM + 1) + '月';

  var first = new Date(calY, calM, 1);
  var startIdx = (first.getDay() + 6) % 7;
  var daysInMonth = new Date(calY, calM + 1, 0).getDate();
  var todayK = keyOf(now);
  var curY = now.getFullYear(), curM = now.getMonth(), curD = now.getDate();

  var nextBtn = document.querySelector('[data-action="calNext"]');
  if (nextBtn) nextBtn.disabled = (calY > curY) || (calY === curY && calM >= curM);

  var html = '';
  for (var i = 0; i < startIdx; i++) html += '<span></span>';
  for (var d = 1; d <= daysInMonth; d++) {
    var dk = calY + '-' + pad(calM + 1) + '-' + pad(d);
    var future = calY > curY || (calY === curY && (calM > curM || (calM === curM && d > curD)));
    var r = activityOf(dk);
    var style = '';
    if (r <= 0) style = 'background:var(--card2)';
    else if (r < 1) style = 'background:rgba(99,102,241,' + (0.18 + 0.62 * r).toFixed(2) + ');color:' + (r > 0.65 ? '#fff' : 'var(--text)');
    else style = 'background:#4f46e5;color:#fff';
    var cls = 'cal-cell';
    if (dk === todayK) cls += ' today';
    if (future) cls += ' future';
    html += '<button class="' + cls + '" style="' + style + '" data-action="dayDetail" data-day="' + dk + '">' + d + '</button>';
  }
  document.getElementById('calGrid').innerHTML = html;
}

function calNav(delta) {
  calM += delta;
  if (calM < 0) { calM = 11; calY--; }
  if (calM > 11) { calM = 0; calY++; }
  renderCalendar();
}

function showDayDetail(k) {
  var d = data.days[k];
  var rows = SUBJECT_KEYS.map(function (sk) {
    var c = cfg(sk);
    var s = (d && d[sk]) || { done: 0, seconds: 0 };
    return '<div class="day-row"><span>' + c.emoji + ' ' + esc(c.name) + '</span>' +
      '<span>' + (s.done || 0) + '/' + c.problems + ' 题 · ' + fmtDurMin((s.seconds || 0) / 60) + '</span></div>';
  }).join('');
  var pomos = d && d.pomos ? d.pomos : 0;
  var note = d && d.note ? '<p style="margin-top:10px;font-size:13px;color:var(--muted)">📝 ' + esc(d.note) + '</p>' : '';
  var empty = !d || !dayActive(k);
  showModal(
    '📅 ' + fmtExamDate(k) + (k === todayKey() ? '（今天）' : ''),
    (empty ? '<p style="color:var(--muted)">这天没有学习记录。</p>' : rows + '<div class="day-row"><span>🍅 番茄</span><span>' + pomos + ' 个</span></div>' + note),
    { hideCancel: true, okLabel: '关闭' }
  );
}

/* ============ 渲染：错题本 ============ */
var mistakeFilter = 'all';

function renderMistakes() {
  var sel = document.getElementById('mistakeSubject');
  if (sel) {
    sel.innerHTML = SUBJECT_KEYS.map(function (k) {
      return '<option value="' + k + '">' + esc(cfg(k).name) + '</option>';
    }).join('');
  }

  var items = data.mistakes;
  var filters = [
    { f: 'all', label: '全部 ' + items.length },
    { f: 'todo', label: '待复习 ' + items.filter(function (m) { return !m.mastered; }).length }
  ];
  SUBJECT_KEYS.forEach(function (k) {
    filters.push({ f: k, label: cfg(k).emoji + ' ' + esc(cfg(k).name) + ' ' + items.filter(function (m) { return m.subject === k; }).length });
  });
  document.getElementById('mistakeFilters').innerHTML = filters.map(function (f) {
    return '<button class="chip' + (mistakeFilter === f.f ? '" style="background:var(--primary);color:#fff;border-color:var(--primary)' : '') + '" data-action="mistakeFilter" data-f="' + f.f + '">' + f.label + '</button>';
  }).join('');

  var list = items.filter(function (m) {
    if (mistakeFilter === 'all') return true;
    if (mistakeFilter === 'todo') return !m.mastered;
    return m.subject === mistakeFilter;
  });

  if (!list.length) {
    document.getElementById('mistakeList').innerHTML = '<div class="mistake-empty">📭 还没有错题记录，做题时遇到错题记得记下来～</div>';
    return;
  }

  document.getElementById('mistakeList').innerHTML = list.map(function (m) {
    var k = SUBJECT_KEYS.indexOf(m.subject) >= 0 ? m.subject : 'math';
    var c = cfg(k);
    return '<div class="card mistake-item' + (m.mastered ? ' mastered' : '') + '">' +
      '<div class="mi-head">' +
        '<span class="mi-badge" style="background:' + c.color + '22;color:' + c.color + '">' + c.emoji + ' ' + esc(c.name) + '</span>' +
        '<span class="mi-meta">' + esc(m.date) + ' · ' + esc(m.source || '未填来源') + ' · ' + esc(m.tag || '其他') + '</span>' +
        '<span class="mi-actions">' +
          '<button class="icon-btn" data-action="mistakeToggle" data-id="' + m.id + '" title="' + (m.mastered ? '标记为未掌握' : '标记为已掌握') + '">' + (m.mastered ? '↩️' : '✅') + '</button>' +
          '<button class="icon-btn" data-action="mistakeDelete" data-id="' + m.id + '" title="删除">🗑</button>' +
        '</span>' +
      '</div>' +
      '<div class="mi-content' + (m.mastered ? ' mastered-text' : '') + '">' + esc(m.content) + '</div>' +
    '</div>';
  }).join('');
}

function addMistake(e) {
  e.preventDefault();
  var content = document.getElementById('mistakeContent').value.trim();
  if (!content) { showToast('请先填写题目要点或错误原因'); return; }
  data.mistakes.unshift({
    id: Date.now() + '' + Math.floor(Math.random() * 1000),
    date: todayKey(),
    subject: document.getElementById('mistakeSubject').value,
    source: document.getElementById('mistakeSource').value.trim(),
    tag: document.getElementById('mistakeTag').value,
    content: content,
    mastered: false
  });
  saveData();
  document.getElementById('mistakeContent').value = '';
  document.getElementById('mistakeSource').value = '';
  renderMistakes();
  showToast('✅ 已加入错题本');
}

function toggleMistake(id) {
  for (var i = 0; i < data.mistakes.length; i++) {
    if (data.mistakes[i].id === id) { data.mistakes[i].mastered = !data.mistakes[i].mastered; break; }
  }
  saveData();
  renderMistakes();
}

function deleteMistake(id) {
  showModal('删除错题', '<p>确定删除这条错题记录吗？删除后无法恢复。</p>', {
    okLabel: '删除',
    onOk: function () {
      data.mistakes = data.mistakes.filter(function (m) { return m.id !== id; });
      saveData();
      renderMistakes();
      showToast('已删除');
    }
  });
}

/* ============ 渲染：设置页 ============ */
function renderSettings() {
  document.getElementById('set-exam-date').value = data.settings.examDate;

  document.getElementById('subjectSettings').innerHTML = SUBJECT_KEYS.map(function (k) {
    var c = cfg(k);
    return '<div class="subj-set" style="--sc:' + c.color + '">' +
      '<div class="subj-set-head"><span>' + c.emoji + '</span>' +
      '<input type="text" value="' + esc(c.name) + '" data-set data-key="' + k + '" data-field="name" placeholder="科目名称"></div>' +
      '<div class="form-grid">' +
        '<label class="field">每天目标题数<input type="number" min="0" max="500" value="' + c.problems + '" data-set data-key="' + k + '" data-field="problems" inputmode="numeric"></label>' +
        '<label class="field">每天目标时长(分钟)<input type="number" min="0" max="1440" step="5" value="' + c.minutes + '" data-set data-key="' + k + '" data-field="minutes" inputmode="numeric"></label>' +
      '</div>' +
    '</div>';
  }).join('');

  var p = data.settings.pomodoro;
  document.getElementById('set-pomo-focus').value = p.focus;
  document.getElementById('set-pomo-short').value = p.short;
  document.getElementById('set-pomo-long').value = p.long;
  document.getElementById('set-pomo-longevery').value = p.longEvery;
  document.getElementById('set-pomo-auto').checked = p.autoBreak;

  document.getElementById('set-remind-on').checked = data.settings.reminder.enabled;
  document.getElementById('set-remind-time').value = data.settings.reminder.time;
  document.getElementById('set-theme').value = data.settings.theme;

  var d = daysUntilExam();
  var ph = phaseOf(d);
  var plan = smartPlan(d);
  document.getElementById('smartHint').textContent =
    '当前：' + ph.name + '（距考试 ' + d + ' 天）。参考建议：数学 ' + plan.math.problems + ' 题/' + fmtDurMin(plan.math.minutes) +
    '，英语 ' + plan.english.problems + ' 题/' + fmtDurMin(plan.english.minutes) +
    '，专业课 ' + plan.major.problems + ' 题/' + fmtDurMin(plan.major.minutes) + '。点击上方按钮可一键套用。';
}

function applySmartPlan() {
  var d = daysUntilExam();
  var ph = phaseOf(d);
  var plan = smartPlan(d);
  SUBJECT_KEYS.forEach(function (k) {
    cfg(k).problems = plan[k].problems;
    cfg(k).minutes = plan[k].minutes;
  });
  saveData();
  renderSettings();
  renderHero();
  renderSubjects();
  var rows = SUBJECT_KEYS.map(function (k) {
    return '<div class="day-row"><span>' + cfg(k).emoji + ' ' + esc(cfg(k).name) + '</span><span>每天 ' + plan[k].problems + ' 题 · ' + fmtDurMin(plan[k].minutes) + '</span></div>';
  }).join('');
  showModal('✨ 智能规划建议',
    '<p>当前处于<b>' + ph.name + '</b>，' + ph.desc + '。</p>' + rows +
    '<p class="hint-text">' + plan.note + '</p>' +
    '<p class="hint-text">以上数值已填入「计划设置」，你可以按自己的节奏微调。</p>',
    { hideCancel: true, okLabel: '好的' });
}

/* ============ 每日提醒 ============ */
function requestNotificationPermission() {
  if (!('Notification' in window)) { showToast('此浏览器不支持系统通知'); return; }
  Notification.requestPermission().then(function (p) {
    if (p === 'granted') {
      showToast('✅ 通知权限已开启');
      scheduleReminder();
    } else {
      showToast('未获得通知权限（可在系统设置里手动开启）');
    }
  });
}

function scheduleReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !data.settings.reminder.enabled) return;
  // 定时系统通知需要 TimestampTrigger（Chrome/Android）；iOS 不支持，走应用内到点提醒
  if (!('serviceWorker' in navigator) || typeof window.TimestampTrigger !== 'function') return;
  try {
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg || !reg.showNotification) return;
      var parts = (data.settings.reminder.time || '21:30').split(':');
      var h = parseInt(parts[0], 10) || 21, m = parseInt(parts[1], 10) || 30;
      var t = new Date();
      t.setHours(h, m, 0, 0);
      if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
      reg.showNotification('考研学习计划助手', {
        body: '📚 今天数学、英语、专业课的题目都完成了吗？记得打卡！',
        tag: 'kaoyan-daily',
        icon: 'icons/icon-192.png',
        renotify: true,
        showTrigger: new window.TimestampTrigger(t.getTime())
      }).catch(function () { /* 不支持时静默 */ });
    });
  } catch (e) { /* 静默 */ }
}

var lastReminderDay = '';
function checkReminderNow() {
  if (!data.settings.reminder.enabled) return;
  var now = new Date();
  var cur = pad(now.getHours()) + ':' + pad(now.getMinutes());
  if (cur === (data.settings.reminder.time || '21:30') && lastReminderDay !== todayKey()) {
    lastReminderDay = todayKey();
    showToast('⏰ ' + cur + ' 啦！今天数学、英语、专业课都完成了吗？');
    beep();
  }
}

/* ============ 院校信息 ============ */
var schoolRegion = 'all';

function baiduSearchURL(q) { return 'https://www.baidu.com/s?wd=' + encodeURIComponent(q); }
function bingSearchURL(q) { return 'https://www.bing.com/search?q=' + encodeURIComponent(q); }

function renderOfficialLinks() {
  var links = [
    { icon: '🏛️', name: '研招网（报名/成绩/调剂）', desc: '中国研究生招生信息网', url: 'https://yz.chsi.com.cn' },
    { icon: '📚', name: '研招网·院校库', desc: '全国所有招生单位一览', url: 'https://yz.chsi.com.cn/sch/' },
    { icon: '📰', name: '研招网·考研资讯', desc: '政策 / 大纲 / 简章汇总', url: 'https://yz.chsi.com.cn/kyzx/' },
    { icon: '🎓', name: '学信网', desc: '学籍学历信息查询', url: 'https://www.chsi.com.cn' },
    { icon: '💻', name: '中国教育在线·考研', desc: '院校专业库、分数线', url: 'https://kaoyan.eol.cn' },
    { icon: '🏢', name: '教育部官网', desc: '官方政策文件', url: 'https://www.moe.gov.cn' }
  ];
  document.getElementById('officialLinks').innerHTML = links.map(function (l) {
    return '<a class="link-card" href="' + l.url + '" target="_blank" rel="noopener">' +
      '<div class="link-icon">' + l.icon + '</div>' +
      '<div><div class="link-name">' + l.name + '</div><div class="link-desc">' + l.desc + '</div></div>' +
      '</a>';
  }).join('');

  var provinces = (window.SCHOOLS_DATA && window.SCHOOLS_DATA.provinces) || [];
  document.getElementById('provinceLinks').innerHTML = provinces.map(function (l) {
    return '<a class="link-card" href="' + l.url + '" target="_blank" rel="noopener">' +
      '<div class="link-icon">🗺️</div>' +
      '<div><div class="link-name">' + esc(l.name) + '</div><div class="link-desc">报考 · 确认 · 查分</div></div>' +
      '</a>';
  }).join('');
}

function renderExamTimeline() {
  var k = data.settings.examDate;
  var p = (k || '').split('-');
  var items;
  if (p.length === 3) {
    var y = +p[0];
    items = [
      { date: y + '-09-15', icon: '📄', title: '招生简章 / 专业目录 / 考试大纲', desc: '8月底-9月底陆续发布，去目标院校研招网查看' },
      { date: y + '-09-24', icon: '✍️', title: '预报名', desc: '研招网（应届生为主，9月下旬）' },
      { date: y + '-10-10', icon: '📝', title: '正式报名', desc: '研招网（10月中下旬截止，逾期不补报）' },
      { date: y + '-11-05', icon: '🖼️', title: '网上确认', desc: '省级教育考试院 / 报考点（11月上旬）' },
      { date: k, icon: '📖', title: '初试（笔试）', desc: '准考证考前10天左右在研招网下载' },
      { date: (y + 1) + '-02-20', icon: '🔢', title: '初试成绩公布', desc: '院校研招网 + 研招网（2月中下旬）' },
      { date: (y + 1) + '-03-15', icon: '📊', title: '国家线 / 院校复试线', desc: '3月中旬前后，紧盯目标院校官网' },
      { date: (y + 1) + '-03-25', icon: '🎤', title: '复试 & 调剂系统', desc: '3月下旬-4月，以院校官网通知为准' },
      { date: (y + 1) + '-04-30', icon: '🎉', title: '拟录取名单公示', desc: '院校研究生院官网（4-5月）' }
    ];
  } else {
    items = [{ date: '—', icon: '📄', title: '请先在「设置」里填写考研初试日期', desc: '填写后这里会自动推算各关键时间节点' }];
  }
  document.getElementById('examTimeline').innerHTML = items.map(function (it) {
    return '<div class="tl-row">' +
      '<div class="tl-date">' + it.date + '</div>' +
      '<div class="tl-body"><div class="tl-title">' + it.icon + ' ' + it.title + '</div><div class="tl-desc">' + it.desc + '</div></div>' +
      '</div>';
  }).join('') + '<p class="hint-text">以上为历年大致时间节点，具体安排以研招网和报考院校官网发布为准。</p>';
}

function renderSchoolFilters() {
  var D = window.SCHOOLS_DATA || { regions: [], schools: [] };
  var chips = [{ id: 'all', label: '全部 ' + D.schools.length }].concat(D.regions.map(function (r) {
    return { id: r, label: r };
  }));
  document.getElementById('schoolFilters').innerHTML = chips.map(function (c) {
    return '<button class="chip' + (schoolRegion === c.id ? '" style="background:var(--primary);color:#fff;border-color:var(--primary)' : '') + '" data-action="schoolRegion" data-id="' + c.id + '">' + esc(c.label) + '</button>';
  }).join('');
}

function renderSchoolList() {
  var D = window.SCHOOLS_DATA || { regions: [], schools: [] };
  var input = document.getElementById('schoolFilterInput');
  var q = input ? input.value.trim() : '';
  var list = D.schools.filter(function (s) {
    if (schoolRegion !== 'all' && s.region !== schoolRegion) return false;
    if (q && (s.name + s.city).indexOf(q) < 0) return false;
    return true;
  });
  if (!list.length) {
    document.getElementById('schoolList').innerHTML = '<div class="mistake-empty">没有匹配的院校，换个关键词试试</div>';
    return;
  }
  document.getElementById('schoolList').innerHTML = list.map(function (s) {
    var tags = (s.tags || []).map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('');
    return '<div class="school-row">' +
      '<div class="school-info">' +
        '<div class="school-name">' + esc(s.name) + ' <span class="school-tags">' + tags + '</span></div>' +
        '<div class="school-meta">' + esc(s.city) + ' · ' + esc(s.url.replace(/^https?:\/\//, '')) + '</div>' +
      '</div>' +
      '<div class="school-actions">' +
        '<a class="btn btn-primary" href="' + s.url + '" target="_blank" rel="noopener">官网</a>' +
        '<a class="btn btn-ghost" href="' + baiduSearchURL(s.name + ' 研究生招生简章 官网') + '" target="_blank" rel="noopener">搜索</a>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderSchools() {
  renderOfficialLinks();
  renderExamTimeline();
  renderSchoolFilters();
  renderSchoolList();
}

function renderMajor() {
  var el = document.getElementById('majorContent');
  if (!el) return;
  var m = MAJOR_DATA, h = '';
  h += '<div class="card"><div class="card-title">📚 ' + esc(m.title) + '</div>'
    + '<p class="hint-text">' + esc(m.exam) + '</p>'
    + '<p class="hint-text">📄 大纲：<a href="' + m.syllabus.url + '" target="_blank" rel="noopener">西电研究生院官网（2026 自命题考试大纲）</a><br>' + esc(m.syllabus.note) + '</p></div>';

  h += '<div class="card"><div class="card-title">🎯 真题（最近 8 年）</div>'
    + '<p class="hint-text">' + esc(m.zhenti.intro) + '</p><div class="major-list">';
  m.zhenti.years.forEach(function (y) {
    h += '<div class="major-item"><b>' + esc(y.y) + '</b> <span class="tag">' + esc(y.note) + '</span>'
      + '<div class="major-where">📁 ' + esc(y.where) + '</div></div>';
  });
  m.zhenti.recent.forEach(function (r) {
    h += '<div class="major-item"><b>🌐 ' + esc(r.y) + ' 年真题（线上来源）</b> <span class="tag">' + esc(r.note) + '</span>';
    r.links.forEach(function (l) {
      h += '<div class="major-where">🔗 <a href="' + l.url + '" target="_blank" rel="noopener">' + esc(l.t) + '</a></div>';
    });
    h += '</div>';
  });
  m.zhenti.extra.forEach(function (e) {
    h += '<div class="major-item"><b>▶ ' + esc(e.t) + '</b>'
      + '<div class="major-where">📁 ' + esc(e.where) + '</div></div>';
  });
  h += '</div></div>';

  h += '<div class="card"><div class="card-title">📝 课后题（精选）</div><div class="major-list">';
  m.keti.forEach(function (k) {
    h += '<div class="major-item"><b>[' + esc(k.subject) + '] ' + esc(k.t) + '</b>'
      + (k.note ? ' <span class="tag">' + esc(k.note) + '</span>' : '')
      + '<div class="major-where">📁 ' + esc(k.where) + '</div></div>';
  });
  h += '</div></div>';

  h += '<div class="card"><div class="card-title">🎬 课程观看清单</div><div class="major-list">';
  m.videos.forEach(function (v) {
    h += '<div class="major-item"><b>' + (v.link ? '<a href="' + v.link + '" target="_blank" rel="noopener">' + esc(v.t) + '</a>' : esc(v.t)) + '</b>'
      + (v.note ? '<div class="major-where">📄 ' + esc(v.note) + '</div>' : '') + '</div>';
  });
  h += '</div></div>';

  h += '<div class="card"><div class="card-title">📖 参考教材</div><div class="major-list">';
  m.books.forEach(function (b) { h += '<div class="major-item">· ' + esc(b) + '</div>'; });
  h += '</div></div>';

  el.innerHTML = h;
}

function schoolWebSearch(engine) {
  var input = document.getElementById('schoolSearch');
  var q = input ? input.value.trim() : '';
  if (!q) { showToast('请先输入院校或专业名称'); if (input) input.focus(); return; }
  var base = engine === 'bing' ? bingSearchURL(q + ' 研究生招生简章 专业目录 官网') : baiduSearchURL(q + ' 研究生招生简章 官网');
  window.open(base, '_blank');
}

/* ============ 导入导出 ============ */
function downloadFile(name, blob) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}

function exportJSON() {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadFile('考研助手备份-' + todayKey() + '.json', blob);
  showToast('✅ 备份已导出（在 Safari 中会保存到「文件」App）');
}

function exportCSV() {
  function q(s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
  var lines = ['\ufeff日期,科目,做题数,学习时长(分钟),番茄数,备注'];
  Object.keys(data.days).sort().forEach(function (k) {
    var d = data.days[k];
    var note = d.note || '';
    var rows = 0;
    SUBJECT_KEYS.forEach(function (sk) {
      var s = d[sk];
      if (!s) return;
      rows++;
      lines.push([k, q(cfg(sk).name), s.done || 0, Math.round((s.seconds || 0) / 60), d.pomos || 0, q(rows === 1 ? note : '')].join(','));
    });
    if (rows === 0) {
      lines.push([k, q('未分科'), 0, 0, d.pomos || 0, q(note)].join(','));
    }
  });
  var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadFile('考研助手报表-' + todayKey() + '.csv', blob);
  showToast('✅ 报表已导出');
}

function importJSONFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var obj = JSON.parse(reader.result);
      if (!obj || typeof obj !== 'object' || !obj.days || !obj.settings) {
        showToast('❌ 文件格式不正确');
        return;
      }
      showModal('导入备份', '<p>导入将<b>覆盖</b>当前所有数据，确定继续吗？</p>', {
        okLabel: '导入',
        onOk: function () {
          data = migrate(obj);
          resetRuntimeState();
          saveData();
          renderAll();
          showToast('✅ 导入成功');
        }
      });
    } catch (e) {
      showToast('❌ 文件解析失败');
    }
  };
  reader.readAsText(file);
}

function clearAll() {
  showModal('清空数据', '<p style="color:var(--danger)">将删除全部打卡记录、错题和设置，且无法恢复！建议先导出备份。</p>', {
    okLabel: '确认清空',
    onOk: function () {
      data = defaultData();
      resetRuntimeState();
      saveData();
      renderAll();
      showToast('已清空');
    }
  });
}

/* 统一复位运行状态（清空/导入数据后调用） */
function resetRuntimeState() {
  stopStopwatch(false);
  pomo.mode = 'focus';
  pomo.running = false;
  pomo.endAt = 0;
  pomo.remainMs = Math.max(1, data.settings.pomodoro.focus) * 60000;
  pomo.subject = 'math';
  mistakeFilter = 'all';
  statsRange = 7;
  schoolRegion = 'all';
  calY = null; calM = null;
  lastReminderDay = '';
  document.querySelectorAll('.range-toggle button').forEach(function (b) {
    b.classList.toggle('active', b.dataset.range === '7');
  });
  updatePomoUI();
}

/* ============ 主题 ============ */
function applyTheme() {
  var t = data.settings.theme || 'auto';
  var root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (t === 'light') root.classList.add('light');
  if (t === 'dark') root.classList.add('dark');
  document.getElementById('btnTheme').textContent = t === 'dark' ? '🌙' : (t === 'light' ? '☀️' : '🌓');
  if (activeTab === 'stats') renderStats();
}

function cycleTheme() {
  var order = ['auto', 'light', 'dark'];
  var t = data.settings.theme || 'auto';
  var next = order[(order.indexOf(t) + 1) % order.length];
  data.settings.theme = next;
  saveData();
  applyTheme();
  document.getElementById('set-theme').value = next;
}

/* ============ 页面切换 ============ */
var activeTab = 'today';

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('page-' + tab).classList.add('active');
  document.querySelectorAll('.tabbar .tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  if (tab === 'stats') renderStats();
  if (tab === 'mistakes') renderMistakes();
  if (tab === 'settings') renderSettings();
  if (tab === 'schools') renderSchools();
  if (tab === 'major') {
    try { renderMajor(); }
    catch (err) {
      var mc = document.getElementById('majorContent');
      if (mc) mc.innerHTML = '<div class="card"><div class="card-title">⚠️ 页面渲染出错</div>'
        + '<p class="hint-text">错误信息：' + esc(String((err && err.message) || err)) + '<br>请截图反馈，或改用最新版本（顶部应显示 v4）。</p></div>';
    }
  }
  if (tab === 'today') renderSubjects();
  if (tab === 'focus') renderFocus();
  window.scrollTo({ top: 0 });
}

/* ============ 标题栏倒计时显示 ============ */
function updateDocTitle() {
  var base = '考研学习计划助手';
  if (sw.key) {
    document.title = '⏱ ' + fmtClock(swElapsedMs() / 1000) + ' ' + subName(sw.key) + ' · ' + base;
  } else if (pomo.running) {
    document.title = '🍅 ' + fmtClock(Math.max(0, pomo.endAt - Date.now()) / 1000) + ' ' + POMO_NAMES[pomo.mode] + ' · ' + base;
  } else {
    document.title = base;
  }
}

/* ============ 动作分发 ============ */
function changeProblems(key, delta) {
  var s = ensureSub(todayKey(), key);
  s.done = Math.max(0, (s.done || 0) + delta);
  saveData();
  renderHero();
  renderSubjects();
}

function setProblems(key) {
  var s = ensureSub(todayKey(), key);
  askNumber('设置今日题数', '今天「' + subName(key) + '」完成了多少题？', s.done || 0, function (n) {
    ensureSub(todayKey(), key).done = n;
    saveData();
    renderHero();
    renderSubjects();
  });
}

function setTime(key) {
  if (sw.key === key) stopStopwatch(true);
  var s = ensureSub(todayKey(), key);
  askNumber('设置今日时长', '今天「' + subName(key) + '」学习了多少分钟？', Math.floor((s.seconds || 0) / 60), function (n) {
    ensureSub(todayKey(), key).seconds = n * 60;
    saveData();
    renderHero();
    renderSubjects();
  });
}

function adjustTime(key, delta) {
  if (sw.key === key) stopStopwatch(true);
  var s = ensureSub(todayKey(), key);
  s.seconds = Math.max(0, (s.seconds || 0) + delta);
  saveData();
  renderHero();
  renderSubjects();
}

function handleClick(e) {
  var el = e.target && e.target.closest ? e.target.closest('[data-action],[data-tab]') : null;
  if (!el) return;
  var tab = el.dataset.tab;
  if (tab) { switchTab(tab); return; }
  var act = el.dataset.action;
  switch (act) {
    case 'toggleTimer':
      var k = el.dataset.key;
      if (sw.key === k) { stopStopwatch(true); showToast('已暂停，用时已保存'); }
      else startStopwatch(k);
      renderSubjects();
      break;
    case 'incProblems': changeProblems(el.dataset.key, parseInt(el.dataset.delta, 10)); break;
    case 'setProblems': setProblems(el.dataset.key); break;
    case 'setTime': setTime(el.dataset.key); break;
    case 'adjTime': adjustTime(el.dataset.key, parseInt(el.dataset.delta, 10)); break;
    case 'pomoSubject': pomo.subject = el.dataset.key; renderPomoChips(); updatePomoUI(); break;
    case 'pomoToggle': togglePomo(); break;
    case 'pomoReset': resetPomo(); break;
    case 'pomoSkip': skipPomo(); break;
    case 'calPrev': calNav(-1); break;
    case 'calNext': calNav(1); break;
    case 'dayDetail': showDayDetail(el.dataset.day); break;
    case 'mistakeToggle': toggleMistake(el.dataset.id); break;
    case 'mistakeDelete': deleteMistake(el.dataset.id); break;
    case 'mistakeFilter': mistakeFilter = el.dataset.f; renderMistakes(); break;
    case 'schoolRegion': schoolRegion = el.dataset.id; renderSchoolFilters(); renderSchoolList(); break;
  }
}

/* ============ 设置输入监听 ============ */
function onSettingChange(el) {
  var k = el.dataset.key, f = el.dataset.field;
  if (!k || !f) return;
  var c = cfg(k);
  if (f === 'name') {
    c.name = el.value.trim() || DEFAULT_SETTINGS.subjects[k].name;
  } else if (f === 'problems') {
    c.problems = clamp(parseInt(el.value, 10) || 0, 0, 999);
  } else if (f === 'minutes') {
    c.minutes = clamp(parseInt(el.value, 10) || 0, 0, 1440);
  }
  saveData();
  renderHero();
  renderSubjects();
  // 不整体重渲染设置页，避免输入焦点丢失
}

function onPomoSettingChange() {
  var p = data.settings.pomodoro;
  p.focus = clamp(parseInt(document.getElementById('set-pomo-focus').value, 10) || 25, 5, 120);
  p.short = clamp(parseInt(document.getElementById('set-pomo-short').value, 10) || 5, 1, 60);
  p.long = clamp(parseInt(document.getElementById('set-pomo-long').value, 10) || 15, 5, 90);
  p.longEvery = clamp(parseInt(document.getElementById('set-pomo-longevery').value, 10) || 4, 1, 10);
  p.autoBreak = document.getElementById('set-pomo-auto').checked;
  saveData();
  if (!pomo.running) { pomo.remainMs = pomoDuration(); }
  updatePomoUI();
}

/* ============ 事件绑定 ============ */
var noteTimer = null;

function bindEvents() {
  document.addEventListener('click', handleClick);
  document.addEventListener('pointerdown', unlockAudio);

  document.getElementById('btnTheme').addEventListener('click', cycleTheme);

  document.getElementById('modalOk').addEventListener('click', function () {
    if (modalOkCb) { var cb = modalOkCb; closeModal(); cb(); }
    else closeModal();
  });
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  document.getElementById('noteInput').addEventListener('input', function () {
    var el = this;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      ensureDay(todayKey()).note = el.value;
      saveData();
    }, 500);
  });

  document.getElementById('mistakeForm').addEventListener('submit', addMistake);

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-set]')) { onSettingChange(t); return; }
    switch (t.id) {
      case 'set-exam-date':
        if (t.value) { data.settings.examDate = t.value; saveData(); renderHero(); }
        break;
      case 'set-pomo-focus': case 'set-pomo-short': case 'set-pomo-long': case 'set-pomo-longevery':
        onPomoSettingChange(); break;
      case 'set-pomo-auto':
        onPomoSettingChange(); break;
      case 'set-remind-on':
        data.settings.reminder.enabled = t.checked;
        saveData();
        if (t.checked) scheduleReminder();
        break;
      case 'set-remind-time':
        data.settings.reminder.time = t.value || '21:30';
        saveData();
        scheduleReminder();
        break;
      case 'set-theme':
        data.settings.theme = t.value;
        saveData();
        applyTheme();
        break;
    }
  });

  document.querySelectorAll('.range-toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      statsRange = parseInt(b.dataset.range, 10);
      document.querySelectorAll('.range-toggle button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      renderStats();
    });
  });

  document.getElementById('btn-smart').addEventListener('click', applySmartPlan);
  document.getElementById('btn-notif-perm').addEventListener('click', requestNotificationPermission);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-import').addEventListener('click', function () {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', function () {
    if (this.files && this.files[0]) importJSONFile(this.files[0]);
    this.value = '';
  });
  document.getElementById('btn-clear').addEventListener('click', clearAll);

  // 院校信息
  document.getElementById('btnSchoolBaidu').addEventListener('click', function () { schoolWebSearch('baidu'); });
  document.getElementById('btnSchoolBing').addEventListener('click', function () { schoolWebSearch('bing'); });
  document.getElementById('schoolSearch').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { schoolWebSearch('baidu'); }
  });
  document.getElementById('schoolFilterInput').addEventListener('input', function () {
    renderSchoolList();
  });

  window.addEventListener('resize', function () {
    if (activeTab === 'stats') renderStats();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      // 切后台：立即落盘当前进度，但计时基于时间戳、返回后继续累计
      flushNote();
      flushStopwatch();
      saveData();
    } else {
      settlePomo();
    }
  });
  window.addEventListener('beforeunload', function () {
    flushNote();
    flushStopwatch();
    saveData();
  });
}

/* ============ 总渲染 ============ */
function renderAll() {
  renderTop();
  renderHero();
  renderSubjects();
  renderNote();
  renderQuote();
  renderFocus();
  renderCalendar();
  renderStats();
  renderMistakes();
  renderSettings();
  renderSchools();
  updateDocTitle();
}

/* ============ 初始化 ============ */
function init() {
  modal = document.getElementById('modal');
  modalTitle = document.getElementById('modalTitle');
  modalBody = document.getElementById('modalBody');
  modalOk = document.getElementById('modalOk');
  modalCancel = document.getElementById('modalCancel');
  toast = document.getElementById('toast');

  applyTheme();
  restorePomoState();
  renderAll();
  bindEvents();

  setInterval(function () {
    swTick();
    pomoTick();
    checkReminderNow();
  }, 1000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* file:// 等场景静默 */ });
  }
  scheduleReminder();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
