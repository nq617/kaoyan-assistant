// 大观园刷题数据同步脚本（GitHub Actions 每日运行）
// 数据源：/math 热力图（每日做题数）+ mastery-map（每题掌握状态）+ retest/schedules（复习记录）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://cxyonly.fans';
const TOKEN = process.env.DAGUAN_TOKEN || '';
if (!TOKEN) { console.error('DAGUAN_TOKEN missing'); process.exit(1); }
const H = { 'Accept': 'application/json', 'Authorization': 'Bearer ' + TOKEN };

function todayCN() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function daysAgoCN(n) {
  const d = new Date(Date.now() + 8 * 3600 * 1000 - n * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}
function last7keys() {
  const keys = [];
  for (let i = 6; i >= 0; i--) keys.push(daysAgoCN(i));
  return keys;
}

async function getJSON(u) {
  const res = await fetch(BASE + u, { headers: H });
  if (!res.ok) throw new Error(u + ' => ' + res.status);
  return res.json();
}

const CHAPTER_NAMES = {
  limit: '函数、极限与连续', diff1: '一元函数微分学', int1: '一元函数积分学',
  multidiff: '多元函数微分学', doubleint: '二重积分', triplesurface: '三重积分与曲线曲面积分',
  series: '无穷级数', ode: '常微分方程',
  'linalg-det': '行列式与矩阵', 'linalg-sys': '向量与线性方程组', 'linalg-eig': '特征值与二次型',
  'prob-event': '随机事件与概率', 'prob-1d': '一维随机变量及其分布', 'prob-2d': '二维随机变量及其分布',
  'prob-moment': '随机变量的数字特征', 'prob-lln': '大数定律与中心极限定理', 'prob-stat': '数理统计与参数估计'
};

async function main() {
  // 1. 热力图（每日做题数）
  const res = await fetch(BASE + '/math', { headers: H });
  const html = await res.text();
  const daily = {};
  for (const m of html.matchAll(/title="(\d{4}-\d{2}-\d{2})：(\d+) 次作答判定"/g)) {
    daily[m[1]] = parseInt(m[2], 10);
  }
  const weekKeys = last7keys();
  const weekTotal = weekKeys.reduce((s, k) => s + (daily[k] || 0), 0);

  // 2. mastery-map：每题掌握状态（全量）
  const mm = await getJSON('/api/questions/mastery-map');
  const items = (mm.data && mm.data.items) || mm.data || [];
  const qmap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'math', 'qid-chapter.json'), 'utf8'));
  const masteryByCh = {};
  let masteredTotal = 0;
  for (const it of items) {
    const st = it.user_state || {};
    if (st.mastery === 'mastered') masteredTotal++;
    const ch = qmap[String(it.id)];
    if (!ch) continue;
    masteryByCh[ch] = masteryByCh[ch] || { mastered: 0, inProgress: 0 };
    if (st.mastery === 'mastered') masteryByCh[ch].mastered++;
    else if (st.mastery && st.mastery !== 'not_started') masteryByCh[ch].inProgress++;
  }

  // 3. retest/schedules：近期复习记录（带时间戳）
  const weekStart = daysAgoCN(6);
  const actByCh = {};
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 100) {
    const j = await getJSON('/api/retest/schedules?page=' + page + '&perPage=100');
    const list = (j.data && j.data.items) || [];
    if (!list.length) break;
    totalPages = (j.data && j.data.total_pages) || 1;
    for (const s of list) {
      const rv = (s.review && s.review.reviewed_at) || s.reviewed_at || null;
      if (!rv) continue;
      const dateStr = String(rv).slice(0, 10);
      if (dateStr < weekStart || dateStr > todayCN()) continue;
      const qid = s.question_id ?? (s.question && s.question.id) ?? s.questionId ?? null;
      const ch = qid != null ? qmap[String(qid)] : null;
      if (!ch) continue;
      const out = (s.review && s.review.outcome) || s.outcome || '';
      const isWrong = /again|fail|wrong|hard/i.test(String(out));
      actByCh[ch] = actByCh[ch] || { done: 0, wrong: 0 };
      actByCh[ch].done++;
      if (isWrong) actByCh[ch].wrong++;
    }
    page++;
  }

  // 4. 汇总各章节
  const chapters = [];
  let totalWrong = 0;
  for (const ch of Object.keys(actByCh)) {
    const name = CHAPTER_NAMES[ch] || ch;
    const a = actByCh[ch];
    const m = masteryByCh[ch] || { mastered: 0, inProgress: 0 };
    totalWrong += a.wrong;
    chapters.push({ id: ch, name: name, done: a.done, wrong: a.wrong, allTimeMastered: m.mastered, allTimeInProgress: m.inProgress });
  }
  chapters.sort((a, b) => b.wrong - a.wrong || b.done - a.done);

  const out = {
    syncedAt: new Date().toISOString(),
    user: null,
    weekly: {
      total: weekTotal,
      wrong: totalWrong,
      chapters: chapters
    },
    daily: daily,
    allTime: { mastered: masteredTotal }
  };

  const outPath = path.join(__dirname, '..', 'math', 'sync-data.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('SYNC OK: weekTotal=' + weekTotal + ' wrong=' + totalWrong + ' chapters=' + chapters.length);
}

main().catch(e => { console.error(e); process.exit(1); });
