/* الصفحات الفرعية: باشاك شهير، الأهداف، العادات، المهام، الإعدادات */

const Pages = {
  head(title, sub, actions) {
    return h('div', { class: 'page-head' },
      h('div', null, h('h1', null, title), sub ? h('p', { class: 'muted' }, sub) : null),
      actions ? h('div', { class: 'ph-a' }, actions) : null);
  },

  /* نموذج إضافة اسم + وقت متوقع — يحتفظ بحالته عبر إعادة الرسم */
  nameEstForm(st, onAdd, ph, estLabel = 'الوقت المتوقع (د)') {
    const go = () => {
      if (!st.name.trim()) { UI.toast('اكتب الاسم أولاً', 'warn'); return; }
      onAdd({ name: st.name.trim(), est: +st.est || 0 });
      st.name = ''; st.est = ''; UI.refocus = 'addName';
    };
    return h('div', { class: 'addform' },
      h('input', { class: 'in grow', id: 'addName', placeholder: ph, value: st.name, oninput: e => st.name = e.target.value, onkeydown: e => e.key === 'Enter' && go() }),
      h('input', { class: 'in est', type: 'number', min: 0, placeholder: estLabel, value: st.est, oninput: e => st.est = e.target.value, onkeydown: e => e.key === 'Enter' && go() }),
      h('button', { class: 'btn primary', onclick: go }, icon('plus', 16), 'إضافة'));
  },

  /* ═════════ باشاك شهير (المحاضرات) ═════════ */
  lecTab: 'schedule',
  sch: { name: '', day: '6', start: '', end: '', room: '' },
  examForm: { title: '', date: '', lecture: '', scope: '' },

  lectures() {
    const tabs = [['schedule', 'جدول المحاضرات'], ['att', 'الحضور والغياب'], ['hw', 'الواجبات'], ['pr', 'المشاريع'], ['ex', 'المذاكرات والعلامات']];
    const root = h('div', { class: 'page' },
      Pages.head('باشاك شهير', 'كل ما يخص محاضرات الجامعة: الجدول، الحضور، الواجبات، المشاريع، والعلامات'),
      h('div', { class: 'tabs' }, tabs.map(([k, l]) => h('button', { class: 'tab' + (Pages.lecTab === k ? ' on' : ''), onclick: () => { Pages.lecTab = k; App.refresh(); } }, l))));
    root.append(Pages['lec_' + Pages.lecTab]());
    return root;
  },

  schedModal(l) {
    const v = { ...l };
    UI.modal(ctx => h('div', null,
      UI.mhead('تعديل محاضرة', ctx),
      h('div', { class: 'mbody' },
        UI.field('اسم المحاضرة', h('input', { class: 'in', value: v.name, oninput: e => v.name = e.target.value })),
        UI.field('اليوم', h('select', { class: 'in', onchange: e => v.day = +e.target.value }, DAY_ORDER.map(d => h('option', { value: d, selected: d === v.day }, DAYS_AR[d])))),
        h('div', { class: 'grid2' },
          UI.field('من', h('input', { class: 'in', type: 'time', value: v.start, oninput: e => v.start = e.target.value })),
          UI.field('إلى', h('input', { class: 'in', type: 'time', value: v.end, oninput: e => v.end = e.target.value }))),
        UI.field('رقم القاعة', h('input', { class: 'in', value: v.room, oninput: e => v.room = e.target.value }))),
      h('div', { class: 'mfoot' },
        h('button', { class: 'btn primary', onclick: () => { if (!v.name.trim()) return UI.toast('اكتب الاسم', 'warn'); Object.assign(l, v, { name: v.name.trim() }); ctx.close(); Store.commit(); } }, 'حفظ'),
        h('button', { class: 'btn danger', onclick: () => UI.confirm('حذف «' + l.name + '» من الجدول؟', () => { db().schedule = db().schedule.filter(x => x !== l); ctx.close(); Store.commit(); }, { danger: true, yes: 'حذف' }) }, icon('trash', 16), 'حذف'),
        h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء'))));
  },

  lec_schedule() {
    const f = Pages.sch;
    const add = () => {
      if (!f.name.trim()) return UI.toast('اكتب اسم المحاضرة', 'warn');
      db().schedule.push({ id: Store.uid(), name: f.name.trim(), day: +f.day, start: f.start, end: f.end, room: f.room.trim() });
      f.name = ''; f.room = ''; UI.refocus = 'schName'; Snd.pop(); Store.commit();
    };
    const form = UI.card('إضافة محاضرة إلى الجدول', 'plus', null,
      h('div', { class: 'addform wrap' },
        h('input', { class: 'in grow', id: 'schName', placeholder: 'اسم المحاضرة', value: f.name, oninput: e => f.name = e.target.value, onkeydown: e => e.key === 'Enter' && add() }),
        h('select', { class: 'in', onchange: e => f.day = e.target.value }, DAY_ORDER.map(d => h('option', { value: d, selected: String(d) === String(f.day) }, DAYS_AR[d]))),
        h('input', { class: 'in time', type: 'time', title: 'البداية', value: f.start, oninput: e => f.start = e.target.value }),
        h('input', { class: 'in time', type: 'time', title: 'النهاية', value: f.end, oninput: e => f.end = e.target.value }),
        h('input', { class: 'in room', placeholder: 'القاعة', value: f.room, oninput: e => f.room = e.target.value, onkeydown: e => e.key === 'Enter' && add() }),
        h('button', { class: 'btn primary', onclick: add }, icon('plus', 16), 'إضافة')));

    const rows = [...db().schedule].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || (a.start || '').localeCompare(b.start || ''));
    const table = UI.card('الجدول الأسبوعي', 'calendar', { count: rows.length });
    if (!rows.length) table.append(UI.empty('الجدول فارغ — أضف محاضراتك بالأعلى وستظهر في الصفحة الرئيسية في أيامها.'));
    else table.append(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['اليوم', 'الوقت', 'المحاضرة', 'القاعة', ''].map(x => h('th', null, x)))),
      h('tbody', null, rows.map(l => h('tr', null,
        h('td', null, DAYS_AR[l.day]),
        h('td', { class: 'num' }, (l.start || '—') + (l.end ? ' – ' + l.end : '')),
        h('td', null, h('b', null, l.name)),
        h('td', null, l.room || '—'),
        h('td', { class: 'act' }, h('button', { class: 'icon-btn sm', title: 'تعديل', onclick: () => Pages.schedModal(l) }, icon('edit', 14)))))))));
    return h('div', null, form, table);
  },

  lec_att() {
    const stats = {};
    const absents = [];
    Object.entries(db().lectureLogs).forEach(([k, g]) => {
      const [date, id] = k.split('|');
      const l = db().schedule.find(x => x.id === id); if (!l || !g.status) return;
      const s = stats[l.name] || (stats[l.name] = { p: 0, a: 0 });
      if (g.status === 'present') s.p++; else { s.a++; absents.push({ date, name: l.name, reason: g.reason }); }
    });
    const names = Object.keys(stats);
    const c1 = UI.card('نسبة الحضور لكل مادة', 'cap', null);
    if (!names.length) c1.append(UI.empty('لم يُسجَّل حضور بعد.'));
    names.forEach(n => {
      const s = stats[n], t = s.p + s.a, pc = Math.round(s.p / t * 100);
      c1.append(h('div', { class: 'brk' }, h('span', { class: 'w-name' }, n), h('div', { class: 'bar sm' }, h('div', { class: 'bar-fill', style: { width: pc + '%' } })), h('b', null, pc + '%'), h('small', { class: 'muted' }, s.p + ' حضور · ' + s.a + ' غياب')));
    });
    const c2 = UI.card('سجل الغياب وأسبابه', 'x', { count: absents.length });
    if (!absents.length) c2.append(UI.empty('لا غيابات مسجّلة 👏'));
    absents.sort((a, b) => b.date.localeCompare(a.date)).forEach(a => c2.append(h('div', { class: 'linked' }, icon('x', 16), h('div', { class: 'grow' }, h('b', null, a.name), ' — ' + D.dayName(a.date) + ' ' + D.long(a.date), h('div', { class: 'muted small' }, a.reason || 'بدون سبب مسجّل')))));
    return h('div', null, c1, c2);
  },

  lec_hw() {
    const key = D.today();
    const list = [...db().assignments].sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
    const c = UI.card('الواجبات', 'book', { count: list.filter(a => !a.done).length + ' معلّق' });
    if (!list.length) c.append(UI.empty('تُضاف الواجبات من نافذة المحاضرة في الصفحة الرئيسية عند تسجيل الحضور.'));
    list.forEach(a => c.append(h('div', { class: 'item' + (a.done ? ' dim' : '') },
      h('button', { class: 'chk' + (a.done ? ' on' : ''), onclick: () => { a.done = !a.done; if (a.done) Snd.success(); Store.commit(); } }, a.done ? icon('check', 16) : null),
      h('div', { class: 'grow' }, h('b', null, a.topic), h('div', { class: 'muted small' }, a.lecture + ' · تسليم ' + D.dayName(a.due) + ' ' + D.short(a.due) + ' (' + D.rel(a.due, key) + ')')),
      a.img ? h('img', { class: 'thumb', src: a.img, alt: 'صورة الواجب', onclick: () => UI.viewImage(a.img) }) : null,
      h('button', { class: 'icon-btn sm', onclick: () => UI.confirm('حذف هذا الواجب؟', () => { db().assignments = db().assignments.filter(x => x !== a); Store.commit(); }, { danger: true, yes: 'حذف' }) }, icon('trash', 14)))));
    return c;
  },

  lec_pr() {
    const key = D.today();
    const list = [...db().projects].sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
    const c = UI.card('المشاريع', 'target', { count: list.filter(a => !a.done).length + ' معلّق' });
    if (!list.length) c.append(UI.empty('تُضاف المشاريع من نافذة المحاضرة عند تسجيل الحضور.'));
    list.forEach(p => {
      const total = Math.max(1, D.diff(p.due, p.start || key)), passed = Math.min(total, Math.max(0, D.diff(key, p.start || key)));
      c.append(h('div', { class: 'item' + (p.done ? ' dim' : '') },
        h('button', { class: 'chk' + (p.done ? ' on' : ''), onclick: () => { p.done = !p.done; if (p.done) Snd.success(); Store.commit(); } }, p.done ? icon('check', 16) : null),
        h('div', { class: 'grow' }, h('b', null, p.title), h('div', { class: 'muted small' }, p.lecture + ' · من ' + D.short(p.start) + ' إلى ' + D.short(p.due) + ' (' + D.rel(p.due, key) + ')' + (p.notes ? ' · ' + p.notes : '')),
          p.done ? null : h('div', { class: 'bar sm' }, h('div', { class: 'bar-fill', style: { width: Math.round(passed / total * 100) + '%' } }))),
        h('button', { class: 'icon-btn sm', onclick: () => UI.confirm('حذف هذا المشروع؟', () => { db().projects = db().projects.filter(x => x !== p); Store.commit(); }, { danger: true, yes: 'حذف' }) }, icon('trash', 14))));
    });
    return c;
  },

  lec_ex() {
    const key = D.today(), f = Pages.examForm;
    const add = () => {
      if (!f.title.trim() || !f.date) return UI.toast('اكتب اسم المذاكرة وحدّد موعدها', 'warn');
      db().exams.push({ id: Store.uid(), lecture: f.lecture.trim(), title: f.title.trim(), date: f.date, scope: f.scope.trim(), mark: null, max: 100 });
      Object.assign(f, { title: '', date: '', lecture: '', scope: '' }); Store.commit();
    };
    const form = UI.card('إضافة مذاكرة يدوياً', 'plus', null,
      h('div', { class: 'addform wrap' },
        h('input', { class: 'in grow', placeholder: 'اسم المذاكرة', value: f.title, oninput: e => f.title = e.target.value }),
        h('input', { class: 'in', placeholder: 'المادة', value: f.lecture, oninput: e => f.lecture = e.target.value }),
        h('input', { class: 'in time', type: 'date', value: f.date, oninput: e => f.date = e.target.value }),
        h('input', { class: 'in grow', placeholder: 'ما المطلوب؟', value: f.scope, oninput: e => f.scope = e.target.value }),
        h('button', { class: 'btn primary', onclick: add }, icon('plus', 16), 'إضافة')));

    const list = [...db().exams].sort((a, b) => b.date.localeCompare(a.date));
    const marked = list.filter(e => e.mark !== null && e.mark !== '' && e.max > 0);
    const avg = marked.length ? Math.round(marked.reduce((s, e) => s + e.mark / e.max * 100, 0) / marked.length) : null;
    const c = UI.card('المذاكرات والعلامات', 'edit', { count: list.length });
    if (avg != null) c.append(h('div', { class: 'avgbox' }, 'متوسط علاماتك: ', h('b', null, avg + '%'), ' من ' + marked.length + ' مذاكرة'));
    if (!list.length) c.append(UI.empty('لا مذاكرات بعد.'));
    list.forEach(e => {
      const past = e.date <= key;
      c.append(h('div', { class: 'item exam' },
        h('div', { class: 'grow' },
          h('b', null, e.title), h('div', { class: 'muted small' }, (e.lecture ? e.lecture + ' · ' : '') + D.dayName(e.date) + ' ' + D.long(e.date) + ' (' + D.rel(e.date, key) + ')'),
          e.scope ? h('div', { class: 'small' }, 'المطلوب: ' + e.scope) : null),
        h('div', { class: 'markbox' },
          h('input', { class: 'in num', type: 'number', min: 0, step: 'any', placeholder: past ? 'العلامة' : '—', value: e.mark ?? '', disabled: !past && (e.mark == null),
            title: past ? 'سجّل العلامة المستحقة' : 'تُسجَّل العلامة بعد موعد المذاكرة',
            onchange: ev => { e.mark = ev.target.value === '' ? null : +ev.target.value; Store.commit(); } }),
          h('span', null, '/'),
          h('input', { class: 'in num', type: 'number', min: 1, value: e.max, title: 'العلامة العظمى', onchange: ev => { e.max = +ev.target.value || 100; Store.commit(); } })),
        h('button', { class: 'icon-btn sm', onclick: () => UI.confirm('حذف هذه المذاكرة؟', () => { db().exams = db().exams.filter(x => x !== e); Store.commit(); }, { danger: true, yes: 'حذف' }) }, icon('trash', 14))));
    });
    return h('div', null, form, c);
  },

  /* ═════════ الأهداف اليومية ═════════ */
  goalDate: null,
  goalForm: { name: '', est: '' },
  goals() {
    const today = D.today();
    const k = Pages.goalDate || (Pages.goalDate = today);
    const list = db().goals[k] || (db().goals[k] = []);
    const root = h('div', { class: 'page' },
      Pages.head('الأهداف اليومية', 'اكتب أهداف كل يوم والوقت المتوقع لتنفيذ كل هدف — تظهر في الصفحة الرئيسية في يومها'),
      h('div', { class: 'datenav' },
        h('button', { class: 'icon-btn', onclick: () => { Pages.goalDate = D.add(k, 1); App.refresh(); } }, icon('chevR')),
        h('div', { class: 'dn-mid' }, h('b', null, D.dayName(k)), h('span', null, D.long(k)), h('small', { class: 'muted' }, D.rel(k, today))),
        h('button', { class: 'icon-btn', onclick: () => { Pages.goalDate = D.add(k, -1); App.refresh(); } }, icon('chevL')),
        k !== today ? h('button', { class: 'btn sm', onclick: () => { Pages.goalDate = today; App.refresh(); } }, 'اليوم') : null));
    const c = UI.card('أهداف ' + D.dayName(k), 'target', { count: list.length },
      Pages.nameEstForm(Pages.goalForm, r => { list.push({ id: Store.uid(), name: r.name, est: r.est, done: false }); Snd.pop(); Store.commit(); }, 'اسم الهدف…'));
    if (!list.length) c.append(UI.empty('لا أهداف مسجّلة لهذا اليوم.'));
    list.forEach(g => c.append(h('div', { class: 'item' + (g.done ? ' dim' : '') },
      h('div', { class: 'grow' }, h('b', null, g.name),
        h('div', { class: 'muted small' }, (g.est ? '⏱ ' + mins(g.est) : 'بدون وقت متوقع') + (g.done ? ' · ✔ أُنجز ' + g.pct + '% في ' + mins(g.spent) : ''))),
      h('button', { class: 'icon-btn sm', title: 'تعديل', onclick: () => Dlg.nameEst({ title: 'تعديل الهدف', name: g.name, est: g.est || '', onSave: r => { g.name = r.name; g.est = r.est; Store.commit(); }, onDelete: () => { db().goals[k] = list.filter(x => x !== g); Store.commit(); } }) }, icon('edit', 14)),
      h('button', { class: 'icon-btn sm', title: 'حذف', onclick: () => { db().goals[k] = list.filter(x => x !== g); Store.commit(); } }, icon('trash', 14)))));
    const prev = db().goals[D.add(k, -1)] || [];
    const tools = h('div', { class: 'tools' },
      prev.length ? h('button', { class: 'btn sm', onclick: () => { prev.forEach(p => list.push({ id: Store.uid(), name: p.name, est: p.est, done: false })); Store.commit(); UI.toast('تم نسخ أهداف اليوم السابق', 'ok'); } }, 'نسخ أهداف اليوم السابق (' + prev.length + ')') : null);
    c.append(tools);
    root.append(c);
    return root;
  },

  /* ═════════ العادات اليومية ═════════ */
  habitForm: { name: '', est: '' },
  habits() {
    const today = D.today();
    const c = UI.card('عاداتي', 'repeat', { count: db().habits.length },
      Pages.nameEstForm(Pages.habitForm, r => { db().habits.push({ id: Store.uid(), name: r.name, est: r.est }); Snd.pop(); Store.commit(); }, 'اسم العادة…', 'الوقت التقديري (د)'));
    if (!db().habits.length) c.append(UI.empty('أضف عاداتك اليومية (قراءة، رياضة، أذكار…).'));
    db().habits.forEach(x => {
      const days = [...Array(7)].map((_, i) => D.add(today, i - 6));
      const streak = (() => { let s = 0, d = today; if (!(Calc.habitLog(d, x.id) || {}).done) d = D.add(d, -1); while ((Calc.habitLog(d, x.id) || {}).done) { s++; d = D.add(d, -1); } return s; })();
      c.append(h('div', { class: 'item' },
        h('div', { class: 'grow' }, h('b', null, x.name), h('div', { class: 'muted small' }, x.est ? '⏱ ' + mins(x.est) : 'بدون وقت تقديري'),
          h('div', { class: 'dots', title: 'آخر 7 أيام' }, days.map(d => h('i', { class: (Calc.habitLog(d, x.id) || {}).done ? 'on' : '', title: D.dayName(d) })))),
        streak ? h('span', { class: 'chip ok' }, icon('flame', 14), streak + ' يوم متتالٍ') : null,
        h('button', { class: 'icon-btn sm', onclick: () => Dlg.nameEst({ title: 'تعديل العادة', name: x.name, est: x.est || '', estLabel: 'الوقت التقديري (دقائق)', onSave: r => { x.name = r.name; x.est = r.est; Store.commit(); }, onDelete: () => { db().habits = db().habits.filter(z => z !== x); Store.commit(); } }) }, icon('edit', 14)),
        h('button', { class: 'icon-btn sm', onclick: () => UI.confirm('حذف العادة «' + x.name + '»؟', () => { db().habits = db().habits.filter(z => z !== x); Store.commit(); }, { danger: true, yes: 'حذف' }) }, icon('trash', 14))));
    });
    return h('div', { class: 'page' }, Pages.head('العادات اليومية', 'سجّل العادة مع الوقت التقديري لإتمامها — تظهر كل يوم في الصفحة الرئيسية'), c);
  },

  /* ═════════ مهام عامة ═════════ */
  taskForm: { name: '', est: '' },
  tasks() {
    const c = UI.card('المهام العامة', 'list', { count: db().tasks.filter(t => !t.done).length + ' معلّقة' },
      Pages.nameEstForm(Pages.taskForm, r => { db().tasks.push({ id: Store.uid(), name: r.name, est: r.est, done: false }); Snd.pop(); Store.commit(); }, 'اسم المهمة…'));
    if (!db().tasks.length) c.append(UI.empty('لا مهام بعد.'));
    [...db().tasks].sort((a, b) => a.done - b.done).forEach(t => c.append(h('div', { class: 'item' + (t.done ? ' dim' : '') },
      h('div', { class: 'grow' }, h('b', null, t.name), h('div', { class: 'muted small' }, (t.est ? '⏱ ' + mins(t.est) : 'بدون وقت متوقع') + (t.done ? ' · ✔ أُنجزت ' + t.pct + '% في ' + mins(t.spent) : ''))),
      t.done ? h('button', { class: 'btn sm', onclick: () => { t.done = false; t.doneDate = null; Store.commit(); } }, 'إعادة فتح') : null,
      h('button', { class: 'icon-btn sm', onclick: () => Dlg.nameEst({ title: 'تعديل المهمة', name: t.name, est: t.est || '', onSave: r => { t.name = r.name; t.est = r.est; Store.commit(); }, onDelete: () => { db().tasks = db().tasks.filter(z => z !== t); Store.commit(); } }) }, icon('edit', 14)),
      h('button', { class: 'icon-btn sm', onclick: () => { db().tasks = db().tasks.filter(z => z !== t); Store.commit(); } }, icon('trash', 14)))));
    return h('div', { class: 'page' }, Pages.head('مهام عامة', 'مهام مفتوحة تبقى في الصفحة الرئيسية حتى تُنجَز'), c);
  },

  /* ═════════ الإعدادات ═════════ */
  pw: { cur: '', n1: '', n2: '' },
  settings() {
    const s = db().settings;
    const general = UI.card('عام', 'sliders', null,
      UI.field('اسمك (للترحيب)', h('input', { class: 'in', value: s.name, onchange: e => { s.name = e.target.value.trim(); Store.commit(); } })),
      UI.field('ساعة بداية اليوم (يتجدد رصيد الـ24 ساعة عندها)', h('select', { class: 'in', onchange: e => { s.dayStart = +e.target.value; Store.commit(); UI.toast('تم تغيير بداية اليوم', 'ok'); } },
        [...Array(13)].map((_, i) => h('option', { value: i, selected: s.dayStart === i }, i === 0 ? '12:00 منتصف الليل' : (i % 12 || 12) + ':00 ' + (i < 12 ? 'صباحاً' : 'ظهراً'))))),
      h('div', { class: 'switches' },
        Pages.switch('الأصوات', s.sound, v => { s.sound = v; Store.save(); if (v) Snd.success(); }),
        Pages.switch('إشعارات النظام (تعمل والصفحة مفتوحة)', s.notify, async v => { s.notify = v; Store.save(); if (v) { const r = await Notify.request(); UI.toast(r === 'granted' ? 'تم تفعيل إشعارات النظام' : 'لم يُسمح بإشعارات النظام — ستظهر الإشعارات داخل الصفحة فقط', r === 'granted' ? 'ok' : 'warn'); } }),
        Pages.switch('الوضع الليلي', s.theme === 'dark', v => { s.theme = v ? 'dark' : 'light'; Store.save(); App.theme(); })),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', onclick: () => { Snd.success(); setTimeout(() => Snd.buzz(2), 900); } }, 'اختبار الصوت'),
        h('button', { class: 'btn', onclick: async () => { const r = await Notify.request(); Notify.show('إشعار تجريبي', 'هكذا ستصلك التنبيهات', 'info', 'bell'); } }, 'إشعار تجريبي')));

    const f = Pages.pw;
    const sec = UI.card('كلمة المرور', 'lock', null,
      h('p', { class: 'muted small' }, 'تحمي كلمة المرور فتح الصفحة على هذا الجهاز فقط (قفل بسيط وليس تشفيراً للبيانات).'),
      UI.field('كلمة المرور الحالية', h('input', { class: 'in', type: 'password', value: f.cur, oninput: e => f.cur = e.target.value })),
      h('div', { class: 'grid2' },
        UI.field('الجديدة', h('input', { class: 'in', type: 'password', value: f.n1, oninput: e => f.n1 = e.target.value })),
        UI.field('تأكيد الجديدة', h('input', { class: 'in', type: 'password', value: f.n2, oninput: e => f.n2 = e.target.value }))),
      h('button', { class: 'btn primary', onclick: async () => {
        if ((await Store.hash(f.cur)) !== db().passHash) return UI.toast('كلمة المرور الحالية غير صحيحة', 'err');
        if (f.n1.length < 4) return UI.toast('كلمة المرور الجديدة قصيرة (4 أحرف على الأقل)', 'warn');
        if (f.n1 !== f.n2) return UI.toast('التأكيد غير مطابق', 'warn');
        db().passHash = await Store.hash(f.n1); Store.save(); Pages.pw = { cur: '', n1: '', n2: '' }; UI.toast('تم تغيير كلمة المرور', 'ok'); App.refresh();
      } }, 'تغيير كلمة المرور'));

    const fileIn = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: e => {
      const file = e.target.files[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const o = JSON.parse(fr.result); if (!o || typeof o !== 'object' || !o.settings) throw 0;
          UI.confirm('سيتم استبدال كل بياناتك الحالية بالنسخة المستوردة. متابعة؟', () => { localStorage.setItem(Store.KEY, JSON.stringify(o)); location.reload(); }, { danger: true, yes: 'استبدال' });
        } catch (er) { UI.toast('ملف غير صالح', 'err'); }
      };
      fr.readAsText(file);
    } });
    const data = UI.card('النسخ الاحتياطي والبيانات', 'download', null,
      h('p', { class: 'muted small' }, 'البيانات محفوظة في متصفح هذا الجهاز فقط. صدّر نسخة احتياطية بشكل دوري، ويمكنك استيرادها على أي جهاز آخر.'),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', onclick: () => Pages.download('yawmi-backup-' + D.today() + '.json', JSON.stringify(db()), 'application/json') }, icon('download', 16), 'تصدير نسخة'),
        h('button', { class: 'btn', onclick: () => fileIn.click() }, icon('upload', 16), 'استيراد نسخة'), fileIn,
        h('button', { class: 'btn danger', onclick: () => UI.confirm('سيتم حذف كل البيانات نهائياً (بما فيها كلمة المرور). هل أنت متأكد؟', () => { localStorage.removeItem(Store.KEY); sessionStorage.clear(); location.reload(); }, { danger: true, yes: 'حذف كل شيء' }) }, icon('trash', 16), 'مسح كل البيانات')));

    return h('div', { class: 'page' }, Pages.head('الإعدادات'), h('div', { class: 'cols2' }, general, h('div', null, sec, data)));
  },

  switch(label, on, onChange) {
    const b = h('button', { class: 'switch' + (on ? ' on' : ''), role: 'switch', 'aria-checked': String(!!on), onclick: () => { on = !on; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); onChange(on); } }, h('i'));
    return h('div', { class: 'sw-row' }, h('span', null, label), b);
  },
  download(name, text, type = 'text/plain') {
    const blob = new Blob([text], { type: type + ';charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
};
