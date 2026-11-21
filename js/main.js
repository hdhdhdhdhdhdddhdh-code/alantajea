/* التشغيل: الدخول، التوجيه، المؤقّتات، الإشعارات */

const App = {
  routes: {
    home:     { t: 'الرئيسية',        i: 'home',     r: () => Home.render() },
    lectures: { t: 'باشاك شهير',      i: 'cap',      r: () => Pages.lectures() },
    goals:    { t: 'الأهداف اليومية', i: 'target',   r: () => Pages.goals() },
    habits:   { t: 'العادات اليومية', i: 'repeat',   r: () => Pages.habits() },
    tasks:    { t: 'مهام عامة',       i: 'list',     r: () => Pages.tasks() },
    finance:  { t: 'المالية',         i: 'wallet',   r: () => Fin.render() },
    year:     { t: 'سنتي',            i: 'chart',    r: () => Year.render() },
    settings: { t: 'الإعدادات',       i: 'sliders',  r: () => Pages.settings() },
  },
  dayKey: null,

  theme() { document.documentElement.dataset.theme = db().settings.theme === 'dark' ? 'dark' : 'light'; },
  current() { const k = location.hash.replace(/^#\/?/, '') || 'home'; return App.routes[k] ? k : 'home'; },

  nav() {
    const cur = App.current(), nav = $('#nav');
    nav.replaceChildren(...Object.entries(App.routes).map(([k, r]) =>
      h('a', { href: '#/' + k, class: 'nav-a' + (k === cur ? ' on' : '') }, icon(r.i, 16), h('span', null, r.t))),
      h('button', { class: 'nav-a out', onclick: () => { sessionStorage.removeItem('yawmi.auth'); location.reload(); }, title: 'تسجيل الخروج' }, icon('logout', 16), h('span', null, 'خروج')));
    const on = nav.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  },

  refresh() {
    const view = $('#view'), y = window.scrollY, cur = App.current();
    let node;
    try { node = App.routes[cur].r(); }
    catch (e) { console.error(e); node = h('div', { class: 'card' }, 'حدث خطأ في عرض الصفحة: ' + e.message); }
    view.replaceChildren(node);
    App.nav();
    Home.renderRing();
    if (cur === 'home') Home.updateClock();
    window.scrollTo(0, y);
    if (UI.refocus) { const el = document.getElementById(UI.refocus); if (el) el.focus(); UI.refocus = null; }
  },

  /* ── تحديث كل ثانية: المؤقّتات ── */
  tick() {
    $$('[data-timer]').forEach(el => {
      const ms = Timers.elapsed(el.dataset.timer);
      el.textContent = ms ? Timers.fmt(ms) : '';
    });
    const now = Date.now();
    if (!App.lastSlow || now - App.lastSlow > 15000) { App.lastSlow = now; App.slowTick(); }
  },
  slowTick() {
    const c = Clock24.info();
    if (c.key !== App.dayKey) {              // يوم جديد: إعادة شحن الـ24 ساعة
      App.dayKey = c.key;
      Notify.show('🌅 يوم جديد!', 'تم شحن رصيد 24 ساعة جديد. ابدأ يومك بقوة!', 'ok', 'newDay');
      App.refresh();
    }
    Home.updateClock();
    const seen = db().levelSeen[c.key] || 0;
    if (c.level > seen) {                    // تغيّر لون الـ24 ساعة → إشعار + صوت
      db().levelSeen[c.key] = c.level; Store.save();
      const rem = Clock24.hm(c.remMs);
      const msg = [null,
        ['⏳ مضى 60% من يومك', 'تبقّى ' + rem + ' ساعة. راجع أهدافك الآن!', 'warn'],
        ['⚠️ تبقّى 25% فقط من يومك', 'تبقّى ' + rem + ' ساعة. ركّز على الأهم.', 'warn'],
        ['🚨 تبقّى 10% فقط!', 'تبقّى ' + rem + ' ساعة. أنهِ ما لا يحتمل التأجيل.', 'err']][c.level];
      Notify.show(msg[0], msg[1], msg[2], 'buzz', c.level);
    }
    App.checkReminders();
  },
  checkReminders() {
    const key = D.today(); let changed = false;
    Calc.reminders(key).forEach(r => {
      const stage = r.days < 0 ? 'late' : r.days === 0 ? 'today' : 'lead';
      const fk = r.type + ':' + r.id + ':' + stage;
      if (db().notified[fk]) return;
      db().notified[fk] = 1; changed = true;
      Notify.show('⏰ تذكير — ' + r.title, (r.days < 0 ? 'تجاوزت الموعد' : 'الموعد: ' + D.rel(r.due, key) + ' (' + D.dayName(r.due) + ' ' + D.short(r.due) + ')') + (r.sub ? '<br>' + r.sub : ''), 'warn', 'bell');
    });
    if (changed) Store.save();
  },

  start() {
    App.theme();
    $('#app').hidden = false;
    App.dayKey = D.today();
    window.addEventListener('hashchange', () => { window.scrollTo(0, 0); App.refresh(); });
    $('#ring').addEventListener('click', Home.ringDetails);
    App.refresh();
    Dlg.checkFull = Dlg.checkFull.bind(Dlg);
    setInterval(App.tick, 1000);
    setTimeout(App.slowTick, 600);
  },
};

/* ── بوابة الدخول ── */
const Gate = {
  quote() {
    let i = Math.floor(Math.random() * QUOTES.length);
    try {
      const last = +localStorage.getItem('yawmi.lastq');
      if (i === last) i = (i + 1) % QUOTES.length;
      localStorage.setItem('yawmi.lastq', i);
    } catch (e) { /* ignore */ }
    return QUOTES[i];
  },
  greet() {
    const hr = new Date().getHours();
    return hr < 5 ? 'أهلاً بك في ليلتك' : hr < 12 ? 'صباح الخير' : hr < 18 ? 'طاب يومك' : 'مساء الخير';
  },
  show() {
    const g = $('#gate'), s = db();
    const authed = sessionStorage.getItem('yawmi.auth') === '1' && s.passHash;
    const first = !s.passHash;
    const q = h('p', { class: 'g-quote' });
    const setQ = () => { q.textContent = '“' + (Home.quote = Gate.quote()) + '”'; q.classList.remove('fade'); void q.offsetWidth; q.classList.add('fade'); };
    setQ();
    const st = { name: '', p1: '', p2: '' };
    const err = h('div', { class: 'g-err', role: 'alert' });

    const enter = async () => {
      Snd.ensure();
      err.textContent = '';
      if (first) {
        if (st.p1.length < 4) { err.textContent = 'كلمة المرور قصيرة (4 أحرف على الأقل)'; return; }
        if (st.p1 !== st.p2) { err.textContent = 'كلمتا المرور غير متطابقتين'; return; }
        s.passHash = await Store.hash(st.p1); s.settings.name = st.name.trim(); Store.save();
        Notify.request();
      } else if (!authed) {
        if ((await Store.hash(st.p1)) !== s.passHash) {
          err.textContent = 'كلمة المرور غير صحيحة'; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); return;
        }
      }
      sessionStorage.setItem('yawmi.auth', '1');
      g.classList.add('leave'); Snd.newDay();
      setTimeout(() => { g.hidden = true; App.start(); }, 350);
    };
    const key = e => e.key === 'Enter' && enter();

    const fields = first
      ? [h('p', { class: 'g-hint' }, 'هذه أول مرة — أنشئ كلمة مرور لحماية صفحتك.'),
         h('input', { class: 'in', placeholder: 'اسمك (اختياري)', oninput: e => st.name = e.target.value, onkeydown: key }),
         h('input', { class: 'in', type: 'password', placeholder: 'كلمة المرور', autocomplete: 'new-password', oninput: e => st.p1 = e.target.value, onkeydown: key }),
         h('input', { class: 'in', type: 'password', placeholder: 'تأكيد كلمة المرور', autocomplete: 'new-password', oninput: e => st.p2 = e.target.value, onkeydown: key })]
      : authed ? []
      : [h('input', { class: 'in', type: 'password', placeholder: 'كلمة المرور', autocomplete: 'current-password', autofocus: true, oninput: e => st.p1 = e.target.value, onkeydown: key })];

    const box = h('div', { class: 'g-box' },
      h('div', { class: 'g-logo' }, icon(first || !authed ? 'lock' : 'star', 26)),
      h('h1', null, Gate.greet() + (s.settings.name ? '، ' + s.settings.name : '') + ' 👋'),
      h('p', { class: 'g-sub' }, first ? 'مرحباً بك في «يومي»' : authed ? 'أهلاً بعودتك إلى «يومي»' : 'أهلاً بك في «يومي» — أدخل كلمة المرور للمتابعة'),
      q,
      h('button', { class: 'g-more', onclick: setQ }, 'رسالة أخرى'),
      h('div', { class: 'g-form' }, ...fields, err,
        h('button', { class: 'btn primary lg', onclick: enter }, first ? 'إنشاء وبدء' : 'دخول')));
    g.replaceChildren(box);
    setTimeout(() => { const f = g.querySelector('input'); if (f) f.focus(); }, 80);
  },
};

Store.load();
App.theme();
Gate.show();
