/* التخزين (localStorage) + التواريخ + الحسابات */

const Store = {
  KEY: 'yawmi.v1',
  S: null,
  defaults() {
    return {
      v: 1, passHash: null, salt: null,
      settings: { name: '', dayStart: 6, sound: true, notify: true, theme: 'light' },
      open: { SYP: 0, TRY: 0, USD: 0, SCS: 0, SCD: 0 },   // الأرصدة الافتتاحية
      schedule: [],        // جدول المحاضرات الأسبوعي
      lectureLogs: {},     // 'date|id' => {status, reason, topic}
      assignments: [], projects: [], exams: [],
      goals: {},           // date => [{id,name,est,done,pct,notes,spent}]
      habits: [], habitLogs: {},   // date => {habitId: {done, spent}}
      tasks: [],           // مهام عامة
      extras: {},          // date => [...]  مهام خارج الخطة
      shopping: [],
      tx: [], debts: [],
      history: {}, timers: {}, notified: {}, levelSeen: {},
    };
  },
  load() {
    const d = this.defaults();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const p = JSON.parse(raw);
        Object.assign(d, p);
        d.settings = Object.assign(this.defaults().settings, p.settings || {});
        d.open = Object.assign(this.defaults().open, p.open || {});
      }
    } catch (e) { console.warn('load failed', e); }
    this.S = d;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.S)); }
    catch (e) { UI.toast('تعذّر الحفظ: مساحة التخزين ممتلئة (جرّب حذف صور قديمة أو تصدير نسخة احتياطية).', 'err'); }
  },
  /* حفظ + لقطة نسبة اليوم + إعادة رسم */
  commit(refresh = true) {
    this.snapshot();
    this.save();
    if (refresh && typeof App !== 'undefined') App.refresh();
  },
  snapshot() {
    const k = D.today();
    const sc = Calc.score(k);
    if (sc.count > 0 || sc.extraCount > 0) db().history[k] = { p: sc.pct, m: sc.spent };
    else delete db().history[k];
  },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  async hash(pass) {
    const s = this.S;
    if (!s.salt) s.salt = Math.random().toString(36).slice(2) + Date.now();
    const data = s.salt + '|' + pass;
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* احتياطي */ }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < data.length; i++) {
      const ch = data.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'f' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  },
};
const db = () => Store.S;

/* ───────── التواريخ ───────── */
const pad = n => String(n).padStart(2, '0');
const D = {
  fmtKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
  parse(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); },
  /* "اليوم" المنطقي: يبدأ عند ساعة البداية (6 صباحاً) لا عند منتصف الليل */
  today(now = new Date()) { return this.fmtKey(new Date(now.getTime() - db().settings.dayStart * 3600000)); },
  add(k, n) { const d = this.parse(k); d.setDate(d.getDate() + n); return this.fmtKey(d); },
  diff(a, b) { return Math.round((this.parse(a) - this.parse(b)) / 86400000); },   // a - b بالأيام
  dow(k) { return this.parse(k).getDay(); },
  dayName(k) { return DAYS_AR[this.dow(k)]; },
  long(k) { const d = this.parse(k); return d.getDate() + ' ' + MONTHS_AR[d.getMonth()] + ' ' + d.getFullYear(); },
  short(k) { const d = this.parse(k); return d.getDate() + ' ' + MONTHS_AR[d.getMonth()]; },
  weekStart(k) { const i = (this.dow(k) + 1) % 7; return this.add(k, -i); },   // السبت
  monthStart(k) { return k.slice(0, 8) + '01'; },
  monthEnd(k) { const d = this.parse(k); return this.fmtKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)); },
  rel(k, today) {
    const n = this.diff(k, today);
    if (n === 0) return 'اليوم';
    if (n === 1) return 'غداً';
    if (n === -1) return 'أمس';
    if (n > 1) return 'بعد ' + n + ' أيام';
    return 'قبل ' + (-n) + ' يوماً';
  },
};
const fmt = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const mins = m => { m = Math.round(m || 0); return m >= 60 ? Math.floor(m / 60) + 'س ' + (m % 60 ? (m % 60) + 'د' : '') : m + 'د'; };

/* ───────── رصيد الـ24 ساعة ───────── */
const QUARTER = 15 * 60000, DAYMS = 24 * 3600000;
const Clock24 = {
  info(now = new Date()) {
    const key = D.today(now);
    const [y, m, d] = key.split('-').map(Number);
    const start = new Date(y, m - 1, d, db().settings.dayStart, 0, 0);
    const elapsed = Math.min(DAYMS, Math.max(0, now - start));
    const q = Math.floor(elapsed / QUARTER) * QUARTER;          // يتناقص كل ربع ساعة
    const used = q / DAYMS;
    let level = 0;
    if (used >= 0.9) level = 3;            // تبقّى 10%
    else if (used >= 0.75) level = 2;      // تبقّى 25%
    else if (used >= 0.6) level = 1;       // مضى 60%
    return { key, used, remMs: DAYMS - q, level, nextReset: new Date(y, m - 1, d + 1, db().settings.dayStart) };
  },
  hm(ms) { const t = Math.round(ms / 60000); return Math.floor(t / 60) + ':' + pad(t % 60); },
};

/* ───────── المؤقّتات ───────── */
const Timers = {
  elapsed(k) { const t = db().timers[k]; if (!t) return 0; return (t.acc || 0) + (t.start ? Date.now() - t.start : 0); },
  running(k) { const t = db().timers[k]; return !!(t && t.start); },
  toggle(k) {
    const t = db().timers[k] || (db().timers[k] = { acc: 0, start: null });
    if (t.start) { t.acc += Date.now() - t.start; t.start = null; } else t.start = Date.now();
    Store.commit();
  },
  minutes(k) { return Math.round(this.elapsed(k) / 60000); },
  clear(k) { delete db().timers[k]; },
  fmt(ms) { const s = Math.floor(ms / 1000); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); },
};

/* ───────── الحسابات ───────── */
const Calc = {
  lecturesFor(key) {
    return db().schedule.filter(l => l.day === D.dow(key)).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  },
  logFor(key, id) { return db().lectureLogs[key + '|' + id] || null; },
  goalsFor(key) { return db().goals[key] || []; },
  habitLog(key, id) { return (db().habitLogs[key] || {})[id] || null; },
  tasksFor(key) { return db().tasks.filter(t => !t.done || t.doneDate === key); },
  extrasFor(key) { return db().extras[key] || []; },
  shopFor(key) {
    return db().shopping.filter(s => s.status === 'pending' ? (!s.hideUntil || s.hideUntil <= key) : s.doneDate === key);
  },

  score(key) {
    const s = db();
    const parts = { lec: [0, 0], goal: [0, 0], task: [0, 0], habit: [0, 0], shop: [0, 0] };
    let spent = 0;
    this.lecturesFor(key).forEach(l => {
      parts.lec[1] += WEIGHTS.lecture;
      const g = this.logFor(key, l.id);
      if (g && g.status === 'present') parts.lec[0] += WEIGHTS.lecture;
    });
    this.goalsFor(key).forEach(g => {
      parts.goal[1] += WEIGHTS.goal;
      if (g.done) { parts.goal[0] += WEIGHTS.goal * (g.pct ?? 100) / 100; spent += g.spent || 0; }
    });
    s.habits.forEach(hb => {
      parts.habit[1] += WEIGHTS.habit;
      const l = this.habitLog(key, hb.id);
      if (l && l.done) { parts.habit[0] += WEIGHTS.habit; spent += l.spent || 0; }
    });
    this.tasksFor(key).forEach(t => {
      parts.task[1] += WEIGHTS.task;
      if (t.done) { parts.task[0] += WEIGHTS.task * (t.pct ?? 100) / 100; spent += t.spent || 0; }
    });
    this.shopFor(key).forEach(it => {
      parts.shop[1] += WEIGHTS.shop;
      if (it.status !== 'pending') parts.shop[0] += WEIGHTS.shop;
    });
    let extra = 0, extraCount = 0;
    this.extrasFor(key).forEach(e => {
      extraCount++;
      if (e.done) { extra += EXTRA_BONUS * (e.pct ?? 100) / 100; spent += e.spent || 0; }
    });
    let planned = 0, earned = 0, count = 0;
    Object.values(parts).forEach(([e, p]) => { earned += e; planned += p; });
    count = this.lecturesFor(key).length + this.goalsFor(key).length + s.habits.length + this.tasksFor(key).length + this.shopFor(key).length;
    const base = planned ? earned / planned * 100 : 0;
    return { pct: Math.round(base + extra), base, extra, parts, spent, count, extraCount };
  },

  /* رصيد محفظة (حتى تاريخ معيّن غير شامل before، أو حتى upTo شامل) */
  balance(wid, opts = {}) {
    let b = db().open[wid] || 0;
    db().tx.forEach(t => {
      if (t.wallet !== wid) return;
      if (opts.before && !(t.date < opts.before)) return;
      if (opts.upTo && !(t.date <= opts.upTo)) return;
      b += t.type === 'income' ? t.amount : -t.amount;
    });
    return b;
  },

  /* تذكيرات: واجب قبل يوم، مشروع/مذاكرة قبل يومين */
  reminders(key) {
    const out = [];
    db().assignments.forEach(a => {
      if (a.done || !a.due) return;
      const d = D.diff(a.due, key);
      if (d <= 1) out.push({ type: 'assignment', id: a.id, lead: 1, days: d, icon: 'book', title: 'واجب: ' + a.topic, sub: a.lecture, due: a.due });
    });
    db().projects.forEach(p => {
      if (p.done || !p.due) return;
      const d = D.diff(p.due, key);
      if (d <= 2) out.push({ type: 'project', id: p.id, lead: 2, days: d, icon: 'target', title: 'مشروع: ' + p.title, sub: p.lecture, due: p.due });
    });
    db().exams.forEach(e => {
      if (e.mark != null && e.mark !== '') return;
      if (!e.date) return;
      const d = D.diff(e.date, key);
      if (d <= 2 && d >= 0) out.push({ type: 'exam', id: e.id, lead: 2, days: d, icon: 'edit', title: 'مذاكرة: ' + e.title, sub: e.scope ? 'المطلوب: ' + e.scope : e.lecture, due: e.date });
    });
    return out.sort((a, b) => a.days - b.days);
  },
};
