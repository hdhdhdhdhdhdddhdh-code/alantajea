/* الصفحة الرئيسية */

const Home = {
  /* صف مهمة عام */
  row({ name, meta, done, fade = 0.4, onCheck, onOpen, timerKey }) {
    return h('div', { class: 'row' + (done ? ' done' : ''), style: done ? { '--fade': fade } : null },
      h('button', { class: 'chk' + (done ? ' on' : ''), 'aria-label': done ? 'إلغاء الإنجاز' : 'تأكيد الإنجاز', onclick: onCheck }, done ? icon('check', 16) : null),
      h('div', { class: 'row-main', onclick: onOpen },
        h('div', { class: 'row-name' }, name),
        meta ? h('div', { class: 'row-meta' }, meta) : null),
      timerKey && !done ? UI.timerBtn(timerKey) : null);
  },

  render() {
    const key = D.today();
    const root = h('div', { class: 'home' });
    root.append(Home.hero(key));

    const bar = h('div', { class: 'statbar' }, Home.walletsCard(), Home.clockCard());
    root.append(bar);

    const rem = Calc.reminders(key);
    if (rem.length) root.append(Home.remindersCard(rem, key));

    const grid = h('div', { class: 'grid' });
    const lec = Home.lecturesCard(key);
    if (lec) grid.append(lec);
    grid.append(Home.goalsCard(key), Home.habitsCard(key), Home.tasksCard(key), Home.extrasCard(key), Home.shopCard(key), Home.moneyCard(key));
    root.append(grid);
    return root;
  },

  hero(key) {
    const hr = new Date().getHours();
    const g = hr < 5 ? 'مساء الخير' : hr < 12 ? 'صباح الخير' : hr < 18 ? 'مساء الخير' : 'مساء النور';
    const name = db().settings.name;
    return h('div', { class: 'hero' },
      h('div', null,
        h('div', { class: 'hero-day' }, D.dayName(key)),
        h('div', { class: 'hero-date' }, D.long(key) + ' م')),
      h('div', { class: 'hero-greet' }, g + (name ? '، ' + name : '') + ' 👋',
        h('div', { class: 'hero-quote' }, '“' + (Home.quote ||= QUOTES[Math.floor(Math.random() * QUOTES.length)]) + '”')));
  },

  /* ── رصيد المحافظ ── */
  walletsCard() {
    return h('section', { class: 'card wallets', onclick: () => { location.hash = '#/finance'; }, title: 'فتح صفحة المالية' },
      h('header', { class: 'card-h' }, h('div', { class: 'card-t' }, icon('wallet', 18), h('h2', null, 'المحافظ'))),
      h('div', { class: 'wchips' }, WALLETS.map(w =>
        h('div', { class: 'wchip', title: w.name, style: { '--c': w.color } },
          h('span', { class: 'wcode' }, w.code),
          h('span', { class: 'wbal' }, fmt(Calc.balance(w.id)))))));
  },

  /* ── رصيد 24 ساعة ── */
  clockCard() {
    return h('section', { class: 'card clock lvl0', id: 'clockCard' },
      h('header', { class: 'card-h' }, h('div', { class: 'card-t' }, icon('clock', 18), h('h2', null, 'رصيد اليوم — 24 ساعة')),
        h('span', { class: 'pill', id: 'clkLvl' })),
      h('div', { class: 'clock-main' },
        h('div', { class: 'clock-num' }, h('span', { id: 'clkNum' }, '--:--'), h('small', null, 'ساعة متبقية')),
        h('div', { class: 'clock-side', id: 'clkSide' })),
      h('div', { class: 'bar' }, h('div', { class: 'bar-fill', id: 'clkBar' }),
        h('i', { class: 'mark', style: { left: '60%' } }), h('i', { class: 'mark', style: { left: '75%' } }), h('i', { class: 'mark', style: { left: '90%' } })));
  },
  updateClock() {
    const card = $('#clockCard'); if (!card) return;
    const c = Clock24.info();
    card.className = 'card clock lvl' + c.level;
    $('#clkNum').textContent = Clock24.hm(c.remMs);
    const remPct = Math.round(c.remMs / DAYMS * 100);
    $('#clkBar').style.width = remPct + '%';
    const ds = db().settings.dayStart;
    $('#clkSide').textContent = 'مضى ' + Math.round(c.used * 100) + '% · يتجدد ' + ((ds % 12) || 12) + ':00 ' + (ds < 12 ? 'ص' : 'م');
    $('#clkLvl').textContent = ['وقت وفير', 'مضى 60%', 'تبقّى 25%', 'تبقّى 10%'][c.level];
  },

  /* ── تذكيرات ── */
  remindersCard(rem, key) {
    return UI.card('تذكيرات قريبة', 'bell', { count: rem.length, cls: 'reminders' },
      h('div', { class: 'rem-list' }, rem.map(r =>
        h('div', { class: 'rem ' + (r.days < 0 ? 'late' : r.days === 0 ? 'today' : '') },
          icon(r.icon, 18),
          h('div', { class: 'grow' }, h('b', null, r.title), r.sub ? h('div', { class: 'muted small' }, r.sub) : null),
          h('span', { class: 'rem-when' }, r.days < 0 ? 'متأخر ' + (-r.days) + ' يوم' : D.rel(r.due, key))))));
  },

  /* ── المحاضرات (تختفي إن لم يكن هناك محاضرات) ── */
  lecturesCard(key) {
    const list = Calc.lecturesFor(key);
    if (!list.length) return null;
    const c = UI.card('محاضرات اليوم', 'cap', { count: list.length, cls: 'wide' },
      h('div', { class: 'lec-list' }, list.map(l => {
        const g = Calc.logFor(key, l.id), st = g && g.status;
        return h('button', { class: 'lec ' + (st || ''), onclick: () => Dlg.lecture(l, key) },
          h('div', { class: 'lec-time' }, h('b', null, l.start || '—'), l.end ? h('small', null, l.end) : null),
          h('div', { class: 'lec-main' }, h('div', { class: 'lec-name' }, l.name), h('div', { class: 'muted small' }, l.room ? 'القاعة ' + l.room : 'بدون قاعة')),
          h('span', { class: 'chip ' + (st === 'present' ? 'ok' : st === 'absent' ? 'bad' : '') }, st === 'present' ? 'حضور' : st === 'absent' ? 'غياب' : 'سجّل الحضور'));
      })));
    return c;
  },

  /* ── أهداف اليوم ── */
  goalsCard(key) {
    const goals = Calc.goalsFor(key);
    const c = UI.card('أهداف اليوم', 'target', { count: goals.filter(g => g.done).length + '/' + goals.length, actions: h('a', { class: 'link', href: '#/goals' }, 'إدارة') });
    if (!goals.length) c.append(UI.empty('لا أهداف لهذا اليوم — أضفها من «الأهداف اليومية».'));
    goals.forEach(g => c.append(Home.row({
      name: g.name, done: g.done, fade: 0.4, timerKey: 'g:' + g.id,
      meta: g.done ? '✔ ' + g.pct + '% · ' + mins(g.spent) + (g.notes ? ' · ' + g.notes : '') : (g.est ? '⏱ ' + mins(g.est) : ''),
      onCheck: () => g.done ? Dlg.undoItem(g) : Dlg.completeItem(g, { title: g.name, sub: 'هدف اليوم', timerKey: 'g:' + g.id }),
      onOpen: () => g.done ? Dlg.completeItem(g, { title: g.name, sub: 'تعديل بيانات الإنجاز', timerKey: 'g:' + g.id }) : Dlg.completeItem(g, { title: g.name, sub: 'هدف اليوم', timerKey: 'g:' + g.id }),
    })));
    return c;
  },

  /* ── العادات اليومية ── */
  habitsCard(key) {
    const hs = db().habits;
    const done = hs.filter(x => (Calc.habitLog(key, x.id) || {}).done).length;
    const c = UI.card('العادات اليومية', 'repeat', { count: done + '/' + hs.length, actions: h('a', { class: 'link', href: '#/habits' }, 'إدارة') });
    if (!hs.length) c.append(UI.empty('أضف عاداتك من «العادات اليومية».'));
    hs.forEach(x => {
      const lg = Calc.habitLog(key, x.id), d = lg && lg.done;
      const complete = () => Dlg.complete({
        title: x.name, sub: 'عادة يومية', withPct: false, withNotes: false, est: x.est, timerKey: 'h:' + x.id,
        initial: lg ? { spent: lg.spent } : {},
        onSave: r => {
          (db().habitLogs[key] = db().habitLogs[key] || {})[x.id] = { done: true, spent: r.spent };
          Timers.clear('h:' + x.id); Snd.success(); UI.toast(Dlg.praise() + ' — ' + x.name, 'ok');
          Store.commit(); Dlg.checkFull();
        },
      });
      c.append(Home.row({
        name: x.name, done: d, fade: 0.2, timerKey: 'h:' + x.id,
        meta: d ? mins(lg.spent) : (x.est ? '⏱ ' + mins(x.est) : ''),
        onCheck: () => d ? UI.confirm('إلغاء إنجاز العادة «' + x.name + '»؟', () => { delete db().habitLogs[key][x.id]; Store.commit(); }) : complete(),
        onOpen: () => d ? complete() : complete(),
      }));
    });
    return c;
  },

  /* ── مهام عامة ── */
  tasksCard(key) {
    const ts = Calc.tasksFor(key);
    const c = UI.card('مهام عامة', 'list', { count: ts.filter(t => t.done).length + '/' + ts.length, actions: h('a', { class: 'link', href: '#/tasks' }, 'إدارة') });
    if (!ts.length) c.append(UI.empty('لا مهام عامة — أضفها من «مهام عامة».'));
    ts.forEach(t => c.append(Home.row({
      name: t.name, done: t.done, fade: 0.4, timerKey: 't:' + t.id,
      meta: t.done ? '✔ ' + t.pct + '% · ' + mins(t.spent) + (t.notes ? ' · ' + t.notes : '') : (t.est ? '⏱ ' + mins(t.est) : ''),
      onCheck: () => t.done ? Dlg.undoItem(t) : Dlg.completeItem(t, { title: t.name, sub: 'مهمة عامة', timerKey: 't:' + t.id }),
      onOpen: () => Dlg.completeItem(t, { title: t.name, sub: t.done ? 'تعديل بيانات الإنجاز' : 'مهمة عامة', timerKey: 't:' + t.id }),
    })));
    return c;
  },

  /* ── مهام خارج الخطة ── */
  extrasCard(key) {
    const es = Calc.extrasFor(key);
    const c = UI.card('مهام خارج الخطة', 'bolt', { count: es.filter(e => e.done).length + '/' + es.length, cls: 'extra' },
      h('button', { class: 'addbox', onclick: Dlg.addExtra }, h('span', { class: 'plus' }, icon('plus', 20)), h('span', null, 'إضافة مهمة خارج الخطة'), h('small', null, 'تمنحك +' + EXTRA_BONUS + '% فوق 100%')));
    es.forEach(e => c.append(Home.row({
      name: e.name, done: e.done, fade: 0.4, timerKey: 'x:' + e.id,
      meta: e.done ? '✔ ' + e.pct + '% · ' + mins(e.spent) + (e.notes ? ' · ' + e.notes : '') : (e.est ? '⏱ ' + mins(e.est) : 'بانتظار التأكيد'),
      onCheck: () => e.done ? Dlg.undoItem(e) : Dlg.completeItem(e, { title: e.name, sub: 'مهمة خارج الخطة', timerKey: 'x:' + e.id }),
      onOpen: () => Dlg.completeItem(e, { title: e.name, sub: e.done ? 'تعديل بيانات الإنجاز' : 'مهمة خارج الخطة', timerKey: 'x:' + e.id }),
    })));
    return c;
  },

  /* ── لائحة التسوق ── */
  shopCard(key) {
    const items = Calc.shopFor(key);
    const add = () => {
      const inp = $('#shopAdd'); const v = inp.value.trim(); if (!v) return;
      db().shopping.push({ id: Store.uid(), name: v, status: 'pending', created: key });
      UI.refocus = 'shopAdd'; Snd.pop(); Store.commit();
    };
    const c = UI.card('لائحة التسوق', 'cart', { count: items.filter(i => i.status !== 'pending').length + '/' + items.length });
    if (!items.length) c.append(UI.empty('القائمة فارغة.'));
    items.forEach(it => {
      const done = it.status !== 'pending';
      const r = Home.row({
        name: it.name, done, fade: 0.22,
        meta: it.status === 'bought' ? fmt(it.price) + ' ' + WALLET[it.wallet].code + ' · ' + WALLET[it.wallet].name : it.status === 'skipped' ? 'دون شراء: ' + it.reason : (it.reason ? 'مؤجَّلة: ' + it.reason : ''),
        onCheck: () => done ? Dlg.shopUndo(it) : Dlg.shopDone(it),
        onOpen: () => done ? null : Dlg.shopDone(it),
      });
      if (!done) r.append(h('button', { class: 'icon-btn sm', title: 'حذف', onclick: e => { e.stopPropagation(); db().shopping = db().shopping.filter(x => x !== it); Store.commit(); } }, icon('trash', 14)));
      c.append(r);
    });
    c.append(h('div', { class: 'addline' },
      h('input', { class: 'in', id: 'shopAdd', placeholder: 'أضف شيئاً للشراء…', onkeydown: e => e.key === 'Enter' && add() }),
      h('button', { class: 'btn sm primary', onclick: add }, icon('plus', 16))));
    return c;
  },

  /* ── إضافة مصروف / دخل ── */
  moneyCard(key) {
    const today = db().tx.filter(t => t.date === key && !t.transfer).sort((a, b) => b.ts - a.ts);
    const c = UI.card('الحركة المالية', 'swap', { actions: h('a', { class: 'link', href: '#/finance' }, 'التقارير') },
      h('button', { class: 'addbox', onclick: () => Fin.txModal() }, h('span', { class: 'plus' }, icon('plus', 20)), h('span', null, 'إضافة حركة مالية'), h('small', null, 'مصروف أو دخل')));
    today.slice(0, 4).forEach(t => c.append(h('div', { class: 'txline' },
      h('span', { class: 'tx-ic ' + t.type }, icon(t.type === 'income' ? 'down' : 'up', 14)),
      h('div', { class: 'grow' }, t.desc || (t.type === 'income' ? 'دخل' : 'مصروف'), h('small', { class: 'muted' }, ' · ', WALLET[t.wallet].code)),
      h('b', { class: t.type }, (t.type === 'income' ? '+' : '−') + fmt(t.amount)))));
    return c;
  },

  /* ── المؤشر العائم ── */
  renderRing() {
    const ring = $('#ring'); if (!ring) return;
    const sc = Calc.score(D.today());
    const pct = sc.pct, over = pct > 100;
    const R = 34, C = 2 * Math.PI * R, fill = Math.min(100, Math.max(0, pct)) / 100;
    ring.className = 'ring' + (over ? ' over' : pct >= 100 ? ' full' : '');
    ring.innerHTML = `<svg viewBox="0 0 84 84"><circle class="rg-bg" cx="42" cy="42" r="${R}"/><circle class="rg-fg" cx="42" cy="42" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - fill)}" transform="rotate(-90 42 42)"/></svg><div class="rg-txt"><b>${pct}</b><small>%</small></div>`;
    ring.title = 'نسبة إنجاز اليوم — اضغط للتفاصيل';
  },
  ringDetails() {
    const key = D.today(), sc = Calc.score(key);
    const names = { lec: 'المحاضرات', goal: 'الأهداف', task: 'المهام العامة', habit: 'العادات', shop: 'التسوق' };
    UI.modal(ctx => h('div', null,
      UI.mhead('إنجاز اليوم: ' + sc.pct + '%', ctx, D.dayName(key) + ' ' + D.long(key)),
      h('div', { class: 'mbody' },
        Object.entries(sc.parts).filter(([, [, p]]) => p > 0).map(([k, [e, p]]) =>
          h('div', { class: 'brk' }, h('span', null, names[k]), h('div', { class: 'bar sm' }, h('div', { class: 'bar-fill', style: { width: Math.round(e / p * 100) + '%' } })), h('b', null, Math.round(e / p * 100) + '%'))),
        sc.extraCount ? h('div', { class: 'brk' }, h('span', null, 'مهام خارج الخطة'), h('span', { class: 'grow' }), h('b', null, '+' + Math.round(sc.extra) + '%')) : null,
        h('div', { class: 'hint' }, 'الهدف اليومي والمحاضرة أثقل وزناً من المهمة العادية، وكل مهمة خارج الخطة تضيف +' + EXTRA_BONUS + '% فوق المجموع.'),
        h('div', { class: 'hint' }, 'الوقت المسجَّل اليوم: ' + mins(sc.spent))),
      h('div', { class: 'mfoot' }, h('button', { class: 'btn primary', onclick: ctx.close }, 'حسناً'))));
  },
};
