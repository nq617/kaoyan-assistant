'use strict';

/* ================================================================
   我的 AI 助手 - 手机版（基于 DeepSeek 官方 API）
   - 密钥、设置、对话历史全部保存在本机浏览器 localStorage
   - 流式输出 / 深度思考 / Markdown / 角色预设 / PWA
================================================================ */

var API_BASE = 'https://api.deepseek.com';
var LS_KEY = 'ds_chat_key';
var LS_SETTINGS = 'ds_chat_settings';
var LS_MESSAGES = 'ds_chat_messages';

var PERSONAS = {
  general: '你是 DeepSeek 助手。请用中文回答（除非用户要求其他语言），回答清晰、简洁、结构良好，适当使用列表和表格。',
  kaoyan: '你是「考研陪跑助手」，帮助用户备考全国硕士研究生入学考试（数学一、英语一、专业课）。你擅长：\n1) 解答数学、英语、专业课题目，数学解答要写清楚步骤；\n2) 根据用户剩余天数和基础，制定每日/每周学习计划（各科题量、时长分配）；\n3) 分析考研政策、院校信息、报录情况（重要信息提醒用户以研招网和院校官网为准）；\n4) 鼓励陪伴、调整心态，说话温暖但务实。\n回答一律使用中文、结构化输出（分点/表格），数学题给出完整推导。'
};

var DEFAULT_SETTINGS = {
  model: 'deepseek-chat',
  customModel: '',
  temperature: 1.0,
  persona: 'general',
  customPrompt: '',
  theme: 'auto'
};

/* ============ 状态 ============ */
var messages = [];
var settings = null;
var streaming = false;
var abortCtrl = null;
var pendingRender = false;
var nearBottom = true;

function loadJSON(k) {
  try {
    var raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function saveJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
}
function getKey() {
  try { return localStorage.getItem(LS_KEY) || ''; } catch (e) { return ''; }
}
function setKey(v) {
  try { localStorage.setItem(LS_KEY, v); } catch (e) { /* 忽略 */ }
}

function loadState() {
  settings = loadJSON(LS_SETTINGS);
  if (!settings || typeof settings !== 'object') settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  else {
    for (var k in DEFAULT_SETTINGS) if (settings[k] === undefined) settings[k] = DEFAULT_SETTINGS[k];
  }
  messages = loadJSON(LS_MESSAGES) || [];
  if (!Array.isArray(messages)) messages = [];
  messages = messages.filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant'); });
}
function saveSettings() { saveJSON(LS_SETTINGS, settings); }
function saveMessages() { saveJSON(LS_MESSAGES, messages); }

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
function nowTime() {
  var d = new Date();
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}
function effectiveModel() {
  return settings.model === 'custom' ? (settings.customModel.trim() || 'deepseek-chat') : settings.model;
}
function systemPrompt() {
  if (settings.persona === 'custom') return settings.customPrompt.trim() || PERSONAS.general;
  return PERSONAS[settings.persona] || PERSONAS.general;
}

/* ============ Markdown 渲染 ============ */
function renderMarkdown(text) {
  try {
    if (typeof marked !== 'undefined') {
      var html = marked.parse(text, { breaks: true, gfm: true });
      if (typeof DOMPurify !== 'undefined') html = DOMPurify.sanitize(html);
      return html;
    }
  } catch (e) { /* 回退纯文本 */ }
  return '<p>' + esc(text).replace(/\n/g, '<br>') + '</p>';
}

/* ============ 渲染消息 ============ */
function renderAll() {
  var box = $('messages');
  if (!messages.length) {
    box.innerHTML = welcomeHTML();
    nearBottom = true;
    return;
  }
  var html = messages.map(function (m, i) { return messageHTML(m, i); }).join('');
  box.innerHTML = html;
  scrollToBottom(true);
}

function welcomeHTML() {
  var hasKey = !!getKey();
  return '<div class="welcome">' +
    '<div class="w-icon">🤖</div>' +
    '<div class="w-title">你好，我是你的 AI 助手</div>' +
    '<div class="w-desc">' + (hasKey
      ? '直接在下方向我提问吧～支持深度思考、Markdown 排版，对话保存在本机。'
      : '首次使用需要先配置 DeepSeek API 密钥（密钥只保存在你的手机上）。') + '</div>' +
    (hasKey ? '' : '<button class="btn btn-primary" id="btnGoSettings">🔑 去设置密钥</button>') +
    '</div>';
}

function messageHTML(m, i) {
  if (m.role === 'user') {
    return '<div class="msg user" data-idx="' + i + '">' +
      '<div class="bubble">' + esc(m.content) + '</div>' +
      '<div class="msg-meta"><span>' + esc(m.time || '') + '</span></div>' +
      '</div>';
  }
  var isErr = m.error === true;
  var think = m.reasoning ?
    '<details class="thinking"' + (m.streaming ? ' open' : '') + '><summary>🧠 思考过程</summary><div class="think-body">' + esc(m.reasoning) + '</div></details>' : '';
  var cls = 'msg ai' + (isErr ? ' error' : '');
  var body = isErr ? '<div class="bubble">' + esc(m.content) + '</div>'
    : '<div class="bubble">' + think + renderMarkdown(m.content) + (m.streaming ? '<span class="cursor"></span>' : '') + '</div>';
  var actions = m.streaming ? '' :
    '<div class="msg-actions">' +
      '<button class="mini-btn" data-act="copy" data-idx="' + i + '">📋 复制</button>' +
      (m.error ? '' : '<button class="mini-btn" data-act="regen" data-idx="' + i + '">🔄 重新生成</button>') +
      '<button class="mini-btn" data-act="del" data-idx="' + i + '">🗑 删除</button>' +
    '</div>';
  return '<div class="msg ' + cls + '" data-idx="' + i + '">' + body + actions +
    '<div class="msg-meta"><span>' + esc(m.model || '') + '</span><span>' + esc(m.time || '') + '</span></div>' +
    '</div>';
}

function scrollToBottom(force) {
  var box = $('messages');
  if (force || nearBottom) box.scrollTop = box.scrollHeight;
}

function trackScroll() {
  var box = $('messages');
  nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
}

function updateLastMessage() {
  var box = $('messages');
  var nodes = box.querySelectorAll('.msg.ai');
  var last = nodes[nodes.length - 1];
  if (!last) { renderAll(); return; }
  var idx = parseInt(last.dataset.idx, 10);
  var m = messages[idx];
  if (!m) { renderAll(); return; }
  var tmp = document.createElement('div');
  tmp.innerHTML = messageHTML(m, idx);
  last.outerHTML = tmp.firstChild.outerHTML;
  scrollToBottom(false);
}

/* 流式更新时节流渲染 */
function scheduleUpdate() {
  if (pendingRender) return;
  pendingRender = true;
  setTimeout(function () {
    pendingRender = false;
    updateLastMessage();
  }, 60);
}

/* ============ 发送 & 流式接收 ============ */
function send() {
  if (streaming) return;
  var input = $('input');
  var text = input.value.trim();
  if (!text) return;
  var key = getKey();
  if (!key) {
    openSettings();
    toast('请先填写 API 密钥');
    return;
  }

  input.value = '';
  autoSize(input);

  messages.push({ role: 'user', content: text, time: nowTime() });
  messages.push({ role: 'assistant', content: '', reasoning: '', model: effectiveModel(), time: nowTime(), streaming: true });
  renderAll();
  saveMessages();

  setStreaming(true);
  streamChat(key, text);
}

function streamChat(key, userText) {
  abortCtrl = new AbortController();
  var apiMessages = [{ role: 'system', content: systemPrompt() }];
  var hist = messages.slice(0, -1).filter(function (m) { return !m.streaming && m.role !== 'system'; }).slice(-30);
  hist.forEach(function (m) { apiMessages.push({ role: m.role, content: m.content }); });

  var body = {
    model: effectiveModel(),
    messages: apiMessages,
    stream: true,
    temperature: parseFloat(settings.temperature) || 1.0
  };

  fetch(API_BASE + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify(body),
    signal: abortCtrl.signal
  }).then(function (resp) {
    if (!resp.ok) return handleHTTPError(resp);
    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var buf = '';
    var last = messages[messages.length - 1];

    function pump() {
      return reader.read().then(function (r) {
        if (r.done) { finish(); return; }
        buf += decoder.decode(r.value, { stream: true });
        var idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          var line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (line.indexOf('data:') !== 0) continue;
          var payload = line.slice(5).trim();
          if (payload === '[DONE]') { finish(); return; }
          var json;
          try { json = JSON.parse(payload); } catch (e) { continue; }
          var choice = json.choices && json.choices[0];
          if (choice && choice.delta) {
            if (choice.delta.reasoning_content) {
              last.reasoning += choice.delta.reasoning_content;
              scheduleUpdate();
            }
            if (choice.delta.content) {
              last.content += choice.delta.content;
              scheduleUpdate();
            }
          }
        }
        return pump();
      });
    }
    function finish() {
      last.streaming = false;
      if (!last.content && last.reasoning) last.content = '（思考结束，无正文输出）';
      if (!last.content) last.content = '（无输出，请重试）';
      saveMessages();
      setStreaming(false);
      updateLastMessage();
      try { reader.cancel(); } catch (e) { /* 忽略 */ }
    }
    return pump();
  }).catch(function (err) {
    if (err && err.name === 'AbortError') return;
    var last = messages[messages.length - 1];
    last.streaming = false;
    last.error = true;
    last.content = '❌ 网络连接失败。请检查网络后再试（若持续失败，可能是当前网络无法访问 api.deepseek.com）。';
    saveMessages();
    setStreaming(false);
    updateLastMessage();
  });
}

function handleHTTPError(resp) {
  var last = messages[messages.length - 1];
  var hints = {
    401: 'API Key 无效或已过期。请到「设置」检查密钥是否正确（sk- 开头）。',
    402: '账户余额不足。请到 platform.deepseek.com 充值。',
    429: '请求太频繁，请稍等几秒再试。',
    500: '服务器开小差了，请稍后重试。',
    503: '服务器繁忙，请稍后重试。'
  };
  last.streaming = false;
  last.error = true;
  last.content = '❌ 请求失败（HTTP ' + resp.status + '）' + (hints[resp.status] ? '：' + hints[resp.status] : '');
  saveMessages();
  setStreaming(false);
  updateLastMessage();
  return null;
}

function stopStream() {
  if (!streaming) return;
  if (abortCtrl) { try { abortCtrl.abort(); } catch (e) { /* 忽略 */ } }
  var last = messages[messages.length - 1];
  last.streaming = false;
  if (!last.content) last.content = '（已停止生成）';
  saveMessages();
  setStreaming(false);
  updateLastMessage();
}

function setStreaming(v) {
  streaming = v;
  $('sendBtn').textContent = v ? '■' : '➤';
  $('sendBtn').classList.toggle('stop', v);
}

/* ============ 消息操作 ============ */
function copyMessage(idx) {
  var m = messages[idx];
  if (!m) return;
  var text = m.content;
  var done = function () { toast('✅ 已复制'); };
  var fail = function () {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('✅ 已复制'); } catch (e) { toast('复制失败'); }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, fail);
  } else fail();
}

function regenerate(idx) {
  if (streaming) return;
  // 找到该助手消息对应的上一条用户消息
  var userIdx = -1;
  for (var i = idx - 1; i >= 0; i--) {
    if (messages[i].role === 'user') { userIdx = i; break; }
  }
  if (userIdx < 0) return;
  var text = messages[userIdx].content;
  messages = messages.slice(0, userIdx);
  saveMessages();
  $('input').value = '';
  messages.push({ role: 'user', content: text, time: nowTime() });
  messages.push({ role: 'assistant', content: '', reasoning: '', model: effectiveModel(), time: nowTime(), streaming: true });
  renderAll();
  saveMessages();
  setStreaming(true);
  var key = getKey();
  if (!key) { setStreaming(false); openSettings(); return; }
  streamChat(key, text);
}

function deleteMessage(idx) {
  if (streaming) return;
  messages.splice(idx, 1);
  saveMessages();
  renderAll();
}

function newChat() {
  if (streaming) { toast('请先停止生成'); return; }
  if (!messages.length) { toast('已经是新对话了'); return; }
  if (!confirm('确定开始新对话吗？当前对话记录将被清空（可先导出备份）。')) return;
  messages = [];
  saveMessages();
  renderAll();
  toast('已开启新对话');
}

/* ============ 设置面板 ============ */
function openSettings() {
  fillSettingsForm();
  $('settingsPanel').classList.remove('hidden');
}
function closeSettings() {
  $('settingsPanel').classList.add('hidden');
}
function fillSettingsForm() {
  $('setKey').value = getKey();
  $('setModel').value = settings.model;
  $('setCustomModel').value = settings.customModel;
  $('customModelField').classList.toggle('hidden', settings.model !== 'custom');
  $('setPersona').value = settings.persona;
  $('setCustomPrompt').value = settings.customPrompt;
  $('customPromptField').classList.toggle('hidden', settings.persona !== 'custom');
  $('setTemp').value = settings.temperature;
  $('tempVal').textContent = parseFloat(settings.temperature).toFixed(1);
  $('setTheme').value = settings.theme;
}

/* ============ 主题 ============ */
function applyTheme() {
  var t = settings.theme || 'auto';
  var root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (t === 'light') root.classList.add('light');
  if (t === 'dark') root.classList.add('dark');
}

/* ============ 导入导出 ============ */
function exportChat() {
  if (!messages.length) { toast('还没有对话可导出'); return; }
  var blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'AI助手对话-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  toast('✅ 已导出');
}
function importChat(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var arr = JSON.parse(reader.result);
      if (!Array.isArray(arr)) throw new Error('bad');
      messages = arr.filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant'); });
      saveMessages();
      renderAll();
      toast('✅ 导入成功');
    } catch (e) {
      toast('❌ 文件格式不正确');
    }
  };
  reader.readAsText(file);
}

/* ============ 输入框 ============ */
function autoSize(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
}

/* ============ 徽标 ============ */
function updateBadge() {
  var hasKey = !!getKey();
  var b = $('modelBadge');
  b.textContent = hasKey ? effectiveModel() : '未连接';
  b.classList.toggle('connected', hasKey);
}

/* ============ 事件绑定 ============ */
function bindEvents() {
  $('sendBtn').addEventListener('click', function () { streaming ? stopStream() : send(); });

  var input = $('input');
  input.addEventListener('input', function () { autoSize(input); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send();
    }
  });

  $('messages').addEventListener('scroll', trackScroll);

  $('messages').addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var idx = parseInt(el.dataset.idx, 10);
    var act = el.dataset.act;
    if (act === 'copy') copyMessage(idx);
    else if (act === 'regen') regenerate(idx);
    else if (act === 'del') deleteMessage(idx);
  });

  $('messages').addEventListener('click', function (e) {
    if (e.target && e.target.id === 'btnGoSettings') openSettings();
  });

  $('btnNewChat').addEventListener('click', newChat);
  $('btnSettings').addEventListener('click', openSettings);
  $('modelBadge').addEventListener('click', openSettings);
  $('btnCloseSettings').addEventListener('click', closeSettings);

  $('setKey').addEventListener('change', function () {
    setKey(this.value.trim());
    updateBadge();
    toast(getKey() ? '✅ 密钥已保存（仅存本机）' : '已清除密钥');
  });
  $('btnToggleKey').addEventListener('click', function () {
    var el = $('setKey');
    el.type = el.type === 'password' ? 'text' : 'password';
  });
  $('setModel').addEventListener('change', function () {
    settings.model = this.value;
    $('customModelField').classList.toggle('hidden', this.value !== 'custom');
    saveSettings();
    updateBadge();
  });
  $('setCustomModel').addEventListener('change', function () {
    settings.customModel = this.value.trim();
    saveSettings();
    updateBadge();
  });
  $('setPersona').addEventListener('change', function () {
    settings.persona = this.value;
    $('customPromptField').classList.toggle('hidden', this.value !== 'custom');
    saveSettings();
  });
  $('setCustomPrompt').addEventListener('change', function () {
    settings.customPrompt = this.value;
    saveSettings();
  });
  $('setTemp').addEventListener('input', function () {
    settings.temperature = parseFloat(this.value);
    $('tempVal').textContent = settings.temperature.toFixed(1);
    saveSettings();
  });
  $('setTheme').addEventListener('change', function () {
    settings.theme = this.value;
    saveSettings();
    applyTheme();
  });
  $('btnExportChat').addEventListener('click', exportChat);
  $('btnImportChat').addEventListener('click', function () { $('fileImport').click(); });
  $('fileImport').addEventListener('change', function () {
    if (this.files && this.files[0]) importChat(this.files[0]);
    this.value = '';
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      saveMessages();
      if (streaming) stopStream();
    }
  });
  window.addEventListener('beforeunload', function () {
    saveMessages();
  });
}

/* ============ 初始化 ============ */
function init() {
  loadState();
  applyTheme();
  renderAll();
  updateBadge();
  bindEvents();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* 静默 */ });
  }
  if (!getKey()) {
    setTimeout(function () { openSettings(); }, 600);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
