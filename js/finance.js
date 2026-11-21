/* صفحة المالية: الحركة، المحافظ، الدائنون والمدينون، التقارير */

const Fin = {
  period: 'week', anchor: null, chartCur: 'SYP',

  /* ── الفترات ── */
  range() {
    const a = this.anchor || D.today(), d = D.parse(a);
    if (this.period === 'day') return { from: a, to: a, label: D.dayName(a) + ' ' + D.long(a) };
    if (this.period === 'week') { const f = D.weekStart(a), t = D.add(f, 6); return { from: f, to: t, label: 'من ' + D.short(f) + ' إلى ' + D.short(t) + ' ' + D.parse(t).getFullYear() }; }
    if (this.period === 'month') return { from: D.monthStart(a), to: D.monthEnd(a), label: MONTHS_AR[d.getMonth()] + ' ' + d.getFullYear() };
    const y = d.getFullYear();
    return { from: y + '-01-01', to: y + '-12-31', label: 'سنة ' + y };
  },
  shift(n) {
    const a = this.anchor || D.today(), d = D.parse(a);
    if (this.period === 'day') this.anchor = D.add(a, n);
    else if (this.period === 'week') this.anchor = D.add(a, 7 * n);
    else if (this.period === 'month') this.anchor = D.fmtKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
    else this.anchor = (d.getFullYear() + n) + '-01-01';
    App.refresh();
  },
  txIn(from, to) { return db().tx.filter(t => t.date >= from && t.date <= to).sort((a, b) => a.date === b.date ? a.ts - b.ts : a.date.localeCompare(b.date)); },
  totals(list) {
    const o = {}; CURRENCIES.forEach(c => o[c.id] = { inc: 0, exp: 0 });
    list.forEach(t => { if (t.transfer) return; o[WALLET[t.wallet].cur][t.type === 'income' ? 'inc' : 'exp'] += t.amount; });
    return o;
  },

  /* ── حركة مالية جديدة / تعديل ── */
  txModal(tx) {
    const linked = tx && tx.src && tx.src !== 'manual';
    const v = tx ? { ...tx } : { type: 'expense', amount: '', wallet: db().settings.lastWallet || 'SYP', desc: '', date: D.today() };
    UI.modal(ctx => {
      const del = () => UI.confirm('حذف هذه الحركة؟ سيُعاد حساب رصيد المحفظة.' + (tx.grp ? ' (يشمل طرفَي التحويل)' : ''), () => {
        db().tx = db().tx.filter(t => tx.grp ? t.grp !== tx.grp : t.id !== tx.id); ctx.close(); Store.commit();
      }, { danger: true, yes: 'حذف' });
      if (linked) return h('div', null, UI.mhead('حركة مرتبطة', ctx),
        h('div', { class: 'mbody' }, h('p', null, (tx.type === 'income' ? 'دخل ' : 'مصروف ') + fmt(tx.amount) + ' ' + WALLET[tx.wallet].code + ' — ' + tx.desc), h('p', { class: 'muted small' }, 'هذه الحركة أُنشئت تلقائياً من ' + ({ shop: 'لائحة التسوق', debt: 'الدائنين والمدينين', transfer: 'تحويل بين المحافظ' }[tx.src] || 'مصدر آخر') + '.')),
        h('div', { class: 'mfoot' }, h('button', { class: 'btn danger', onclick: del }, icon('trash', 16), 'حذف'), h('button', { class: 'btn ghost', onclick: ctx.close }, 'إغلاق')));
      const save = () => {
        const amount = +v.amount;
        if (!(amount > 0)) return UI.toast('أدخل مبلغاً صحيحاً', 'warn');
        if (tx) Object.assign(tx, { type: v.type, amount, wallet: v.wallet, desc: v.desc.trim(), date: v.date });
        else db().tx.push({ id: Store.uid(), ts: Date.now(), date: v.date, type: v.type, amount, wallet: v.wallet, desc: v.desc.trim(), src: 'manual' });
        db().settings.lastWallet = v.wallet;
        Snd.pop(); ctx.close(); Store.commit();
        UI.toast(v.type === 'income' ? 'تم تسجيل الدخل' : 'تم تسجيل المصروف', 'ok');
      };
      return h('div', null,
        UI.mhead(tx ? 'تعديل الحركة' : 'حركة مالية جديدة', ctx),
        h('div', { class: 'mbody' },
          h('div', { class: 'seg big' },
            h('button', { class: 'seg-b bad' + (v.type === 'expense' ? ' on' : ''), onclick: () => { v.type = 'expense'; ctx.redraw(); } }, icon('up', 18), 'مصروف'),
            h('button', { class: 'seg-b ok' + (v.type === 'income' ? ' on' : ''), onclick: () => { v.type = 'income'; ctx.redraw(); } }, icon('down', 18), 'دخل')),
          UI.field('المبلغ (' + WALLET[v.wallet].code + ')', h('input', { class: 'in big', type: 'number', min: 0, step: 'any', value: v.amount, autofocus: true, oninput: e => v.amount = e.target.value, onkeydown: e => e.key === 'Enter' && save() })),
          UI.field(v.type === 'income' ? 'دخل إلى محفظة' : 'مصروف من محفظة', UI.walletSelect(v.wallet, val => { v.wallet = val; ctx.redraw(); })),
          UI.field('شرح الحركة', h('input', { class: 'in', value: v.desc, placeholder: 'مثلاً: فاتورة إنترنت، راتب، بيع منتج…', oninput: e => v.desc = e.target.value, onkeydown: e => e.key === 'Enter' && save() })),
          UI.field('التاريخ', h('input', { class: 'in', type: 'date', value: v.date, oninput: e => v.date = e.target.value }))),
        h('div', { class: 'mfoot' },
          h('button', { class: 'btn primary', onclick: save }, 'حفظ'),
          tx ? h('button', { class: 'btn danger', onclick: del }, icon('trash', 16), 'حذف') : null,
          h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء')));
    });
  },

  /* ── تحويل بين محافظ ── */
  transferModal() {
    const v = { from: 'SYP', to: 'SCS', out: '', inn: '', date: D.today() };
    UI.modal(ctx => {
      const same = WALLET[v.from].cur === WALLET[v.to].cur;
      const save = () => {
        const out = +v.out, inn = same ? out : +v.inn;
        if (v.from === v.to) return UI.toast('اختر محفظتين مختلفتين', 'warn');
        if (!(out > 0) || !(inn > 0)) return UI.toast('أدخل المبالغ', 'warn');
        const grp = Store.uid(), ts = Date.now();
        db().tx.push({ id: Store.uid(), ts, date: v.date, type: 'expense', amount: out, wallet: v.from, desc: 'تحويل إلى ' + WALLET[v.to].name, src: 'transfer', transfer: true, grp });
        db().tx.push({ id: Store.uid(), ts: ts + 1, date: v.date, type: 'income', amount: inn, wallet: v.to, desc: 'تحويل من ' + WALLET[v.from].name, src: 'transfer', transfer: true, grp });
        ctx.close(); Snd.success(); Store.commit(); UI.toast('تم التحويل', 'ok');
      };
      return h('div', null, UI.mhead('تحويل بين المحافظ', ctx),
        h('div', { class: 'mbody' },
          UI.field('من محفظة', UI.walletSelect(v.from, x => { v.from = x; ctx.redraw(); })),
          UI.field('المبلغ المُرسَل (' + WALLET[v.from].code + ')', h('input', { class: 'in', type: 'number', min: 0, step: 'any', value: v.out, oninput: e => v.out = e.target.value })),
          UI.field('إلى محفظة', UI.walletSelect(v.to, x => { v.to = x; ctx.redraw(); })),
          same ? h('div', { class: 'hint' }, 'نفس العملة — يُستلم نفس المبلغ.') : UI.field('المبلغ المُستلَم (' + WALLET[v.to].code + ')', h('input', { class: 'in', type: 'number', min: 0, step: 'any', value: v.inn, oninput: e => v.inn = e.target.value }), 'اختلاف العملة: اكتب المبلغ الذي وصل فعلياً'),
          UI.field('التاريخ', h('input', { class: 'in', type: 'date', value: v.date, oninput: e => v.date = e.target.value })),
          h('div', { class: 'hint' }, 'التحويلات لا تدخل في إجمالي الدخل والمصاريف، لكنها تظهر في حركة المحافظ.')),
        h('div', { class: 'mfoot' }, h('button', { class: 'btn primary', onclick: save }, 'تحويل'), h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء')));
    });
  },

  /* ── ضبط رصيد محفظة ── */
  balanceModal(w) {
    const cur = Calc.balance(w.id); let val = cur;
    UI.modal(ctx => h('div', null, UI.mhead('ضبط رصيد: ' + w.name, ctx),
      h('div', { class: 'mbody' },
        UI.field('الرصيد الحالي الفعلي (' + w.code + ')', h('input', { class: 'in big', type: 'number', step: 'any', value: val, autofocus: true, oninput: e => val = e.target.value })),
        h('div', { class: 'hint' }, 'يُستخدم لإدخال الرصيد الافتتاحي أو تصحيح الفرق. لا يُسجَّل كحركة دخل/مصروف.')),
      h('div', { class: 'mfoot' },
        h('button', { class: 'btn primary', onclick: () => { const n = +val; if (isNaN(n)) return; db().open[w.id] = (db().open[w.id] || 0) + (n - cur); ctx.close(); Store.commit(); } }, 'حفظ'),
        h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء'))));
  },

  /* ── الدائنون والمدينون ── */
  remaining(d) { return d.amount - d.payments.reduce((s, p) => s + p.amount, 0); },
  debtModal() {
    const v = { kind: 'debtor', person: '', amount: '', wallet: 'SYP', affect: false, note: '', due: '' };
    UI.modal(ctx => {
      const save = () => {
        const amount = +v.amount;
        if (!v.person.trim() || !(amount > 0)) return UI.toast('اكتب الاسم والمبلغ', 'warn');
        const d = { id: Store.uid(), kind: v.kind, person: v.person.trim(), amount, wallet: v.wallet, note: v.note.trim(), date: D.today(), due: v.due, payments: [] };
        if (v.affect) {
          db().tx.push({ id: Store.uid(), ts: Date.now(), date: D.today(), type: v.kind === 'debtor' ? 'expense' : 'income', amount, wallet: v.wallet, desc: (v.kind === 'debtor' ? 'إقراض ' : 'اقتراض من ') + d.person, src: 'debt', srcId: d.id });
        }
        db().debts.push(d); ctx.close(); Store.commit();
      };
      return h('div', null, UI.mhead('إضافة دين', ctx),
        h('div', { class: 'mbody' },
          UI.seg([['debtor', 'مدين — لي عنده'], ['creditor', 'دائن — عليّ له']], v.kind, k => { v.kind = k; ctx.redraw(); }),
          h('div', { class: 'hint' }, v.kind === 'debtor' ? 'المدين: شخص يدين لك بمال (أقرضته).' : 'الدائن: شخص تدين له بمال (اقترضت منه).'),
          UI.field('اسم الشخص', h('input', { class: 'in', value: v.person, autofocus: true, oninput: e => v.person = e.target.value })),
          UI.field('المبلغ (' + WALLET[v.wallet].code + ')', h('input', { class: 'in', type: 'number', min: 0, step: 'any', value: v.amount, oninput: e => v.amount = e.target.value })),
          UI.field('المحفظة (تحدد العملة)', UI.walletSelect(v.wallet, x => { v.wallet = x; ctx.redraw(); })),
          h('label', { class: 'chkline' }, h('input', { type: 'checkbox', checked: v.affect, onchange: e => v.affect = e.target.checked }),
            v.kind === 'debtor' ? 'خصم المبلغ من المحفظة الآن (سلّفته فعلاً)' : 'إضافة المبلغ إلى المحفظة الآن (استلمته فعلاً)'),
          UI.field('تاريخ الاستحقاق (اختياري)', h('input', { class: 'in', type: 'date', value: v.due, oninput: e => v.due = e.target.value })),
          UI.field('ملاحظة', h('input', { class: 'in', value: v.note, oninput: e => v.note = e.target.value }))),
        h('div', { class: 'mfoot' }, h('button', { class: 'btn primary', onclick: save }, 'حفظ'), h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء')));
    });
  },
  payModal(d) {
    const rem = Fin.remaining(d);
    const v = { amount: rem, wallet: d.wallet, affect: true };
    UI.modal(ctx => {
      const save = () => {
        const amount = +v.amount;
        if (!(amount > 0) || amount > rem + 1e-9) return UI.toast('المبلغ غير صحيح (المتبقي ' + fmt(rem) + ')', 'warn');
        const p = { id: Store.uid(), amount, date: D.today() };
        if (v.affect) {
          const tx = { id: Store.uid(), ts: Date.now(), date: D.today(), type: d.kind === 'debtor' ? 'income' : 'expense', amount, wallet: v.wallet, desc: (d.kind === 'debtor' ? 'سداد من ' : 'سداد إلى ') + d.person, src: 'debt', srcId: d.id };
          db().tx.push(tx); p.txId = tx.id;
        }
        d.payments.push(p); ctx.close(); Snd.success(); Store.commit();
      };
      const cur = WALLET[d.wallet].cur;
      return h('div', null, UI.mhead(d.kind === 'debtor' ? 'استلام دفعة من ' + d.person : 'سداد دفعة إلى ' + d.person, ctx, 'المتبقي: ' + fmt(rem) + ' ' + WALLET[d.wallet].code),
        h('div', { class: 'mbody' },
          UI.field('المبلغ', h('input', { class: 'in big', type: 'number', min: 0, step: 'any', value: v.amount, autofocus: true, oninput: e => v.amount = e.target.value })),
          h('label', { class: 'chkline' }, h('input', { type: 'checkbox', checked: v.affect, onchange: e => { v.affect = e.target.checked; ctx.redraw(); } }), d.kind === 'debtor' ? 'إضافة المبلغ إلى محفظة' : 'خصم المبلغ من محفظة'),
          v.affect ? UI.field('المحفظة', h('select', { class: 'in', onchange: e => v.wallet = e.target.value },
            WALLETS.filter(w => w.cur === cur).map(w => h('option', { value: w.id, selected: w.id === v.wallet }, w.name + ' (' + fmt(Calc.balance(w.id)) + ')')))) : null),
        h('div', { class: 'mfoot' }, h('button', { class: 'btn primary', onclick: save }, 'تأكيد'), h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء')));
    });
  },
  debtCard(kind) {
    const list = db().debts.filter(d => d.kind === kind);
    const sums = {}; list.forEach(d => { const c = WALLET[d.wallet].cur; sums[c] = (sums[c] || 0) + Fin.remaining(d); });
    const sumTxt = CURRENCIES.filter(c => sums[c.id]).map(c => fmt(sums[c.id]) + ' ' + c.code).join(' + ');
    const card = UI.card(kind === 'debtor' ? 'المدينون (لي عندهم)' : 'الدائنون (عليّ لهم)', 'user', { count: list.filter(d => Fin.remaining(d) > 0).length, cls: 'debt ' + kind });
    card.append(h('div', { class: 'debt-sum' }, 'الإجمالي المتبقي: ', h('b', null, sumTxt || '0')));
    if (!list.length) card.append(UI.empty('لا سجلات.'));
    list.forEach(d => {
      const rem = Fin.remaining(d), code = WALLET[d.wallet].code, paid = rem <= 0;
      card.append(h('div', { class: 'item' + (paid ? ' dim' : '') },
        h('div', { class: 'grow' }, h('b', null, d.person), h('div', { class: 'muted small' }, 'الأصل ' + fmt(d.amount) + ' ' + code + ' · ' + D.short(d.date) + (d.due ? ' · يستحق ' + D.short(d.due) : '') + (d.note ? ' · ' + d.note : '')),
          d.payments.length ? h('div', { class: 'muted small' }, 'دفعات: ' + d.payments.map(p => fmt(p.amount)).join('، ')) : null),
        h('div', { class: 'debt-rem' }, paid ? h('span', { class: 'chip ok' }, 'مسدَّد') : h('b', null, fmt(rem) + ' ' + code)),
        paid ? null : h('button', { class: 'btn sm', onclick: () => Fin.payModal(d) }, kind === 'debtor' ? 'استلام دفعة' : 'سداد دفعة'),
        h('button', { class: 'icon-btn sm', onclick: () => UI.confirm('حذف سجل «' + d.person + '»؟ (الحركات المالية المرتبطة تبقى)', () => { db().debts = db().debts.filter(x => x !== d); Store.commit(); }, { danger: true, yes: 'حذف' }) }, icon('trash', 14))));
    });
    return card;
  },

  /* ── الرسم ── */
  chart(from, to) {
    const cur = CURRENCIES.find(c => c.id === Fin.chartCur);
    let buckets = [];
    if (Fin.period === 'year') {
      const y = from.slice(0, 4);
      buckets = MONTHS_AR.map((m, i) => ({ label: m.split(' ')[0].slice(0, 6), from: y + '-' + pad(i + 1) + '-01', to: y + '-' + pad(i + 1) + '-31' }));
    } else {
      for (let d = from; d <= to; d = D.add(d, 1)) buckets.push({ label: Fin.period === 'week' ? DAYS_AR[D.dow(d)].slice(0, 4) : String(D.parse(d).getDate()), from: d, to: d });
    }
    const data = buckets.map(b => { const t = Fin.totals(Fin.txIn(b.from, b.to))[cur.id]; return { ...b, inc: t.inc, exp: t.exp }; });
    const max = Math.max(1, ...data.map(d => Math.max(d.inc, d.exp)));
    return h('div', { class: 'chart' + (Fin.period === 'month' ? ' dense' : '') },
      data.map(d => h('div', { class: 'cbar', title: d.label + ' — دخل ' + fmt(d.inc) + ' / مصروف ' + fmt(d.exp) },
        h('div', { class: 'cb-pair' },
          h('i', { class: 'inc', style: { height: (d.inc / max * 100) + '%' } }),
          h('i', { class: 'exp', style: { height: (d.exp / max * 100) + '%' } })),
        h('span', null, d.label))));
  },

  /* ── الصفحة ── */
  render() {
    const { from, to, label } = Fin.range();
    const list = Fin.txIn(from, to), tot = Fin.totals(list), today = D.today();
    const root = h('div', { class: 'page fin' });

    root.append(Pages.head('المالية', 'حركة المال والمحافظ والدائنون والمدينون',
      [h('button', { class: 'btn primary', onclick: () => Fin.txModal() }, icon('plus', 16), 'حركة مالية'),
       h('button', { class: 'btn', onclick: Fin.transferModal }, icon('swap', 16), 'تحويل'),
       h('button', { class: 'btn', onclick: () => window.print() }, icon('print', 16), 'طباعة'),
       h('button', { class: 'btn', onclick: Fin.csv }, icon('download', 16), 'CSV')]));

    root.append(h('div', { class: 'period' },
      UI.seg([['day', 'يومي'], ['week', 'أسبوعي'], ['month', 'شهري'], ['year', 'سنوي']], Fin.period, p => { Fin.period = p; Fin.anchor = null; App.refresh(); }),
      h('div', { class: 'datenav tight' },
        h('button', { class: 'icon-btn', onclick: () => Fin.shift(1) }, icon('chevR')),
        h('div', { class: 'dn-mid' }, h('b', null, label)),
        h('button', { class: 'icon-btn', onclick: () => Fin.shift(-1) }, icon('chevL')),
        Fin.anchor ? h('button', { class: 'btn sm', onclick: () => { Fin.anchor = null; App.refresh(); } }, 'الحالي') : null)));

    /* إجمالي الدخل والمصاريف لكل عملة */
    root.append(h('div', { class: 'sumgrid' }, CURRENCIES.map(c => {
      const t = tot[c.id], net = t.inc - t.exp;
      return h('div', { class: 'card sum' },
        h('div', { class: 'sum-h' }, c.name, h('small', null, c.code)),
        h('div', { class: 'sum-r' }, h('span', null, icon('down', 14), 'إجمالي الدخل'), h('b', { class: 'income' }, fmt(t.inc))),
        h('div', { class: 'sum-r' }, h('span', null, icon('up', 14), 'إجمالي المصاريف'), h('b', { class: 'expense' }, fmt(t.exp))),
        h('div', { class: 'sum-r net' }, h('span', null, 'الصافي'), h('b', { class: net >= 0 ? 'income' : 'expense' }, (net > 0 ? '+' : '') + fmt(net))));
    })));

    /* حركة المحافظ */
    const wt = UI.card('حركة المحافظ ورصيدها', 'wallet', null,
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['المحفظة', 'بداية الفترة', 'وارد', 'صادر', 'نهاية الفترة', 'الرصيد الحالي', ''].map(x => h('th', null, x)))),
        h('tbody', null, WALLETS.map(w => {
          const mv = list.filter(t => t.wallet === w.id);
          const inc = mv.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), exp = mv.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          return h('tr', null,
            h('td', null, h('span', { class: 'dot', style: { background: w.color } }), h('b', null, w.code), ' ', h('small', { class: 'muted' }, w.name)),
            h('td', { class: 'num' }, fmt(Calc.balance(w.id, { before: from }))),
            h('td', { class: 'num income' }, fmt(inc)), h('td', { class: 'num expense' }, fmt(exp)),
            h('td', { class: 'num' }, fmt(Calc.balance(w.id, { upTo: to }))),
            h('td', { class: 'num' }, h('b', null, fmt(Calc.balance(w.id)))),
            h('td', { class: 'act' }, h('button', { class: 'icon-btn sm', title: 'ضبط الرصيد', onclick: () => Fin.balanceModal(w) }, icon('edit', 14))));
        })))),
      h('div', { class: 'muted small' }, 'الوارد والصادر هنا يشمل التحويلات بين المحافظ.'));
    root.append(wt);

    if (Fin.period !== 'day') {
      root.append(UI.card('الدخل مقابل المصاريف', 'chart', { actions: UI.seg(CURRENCIES.map(c => [c.id, c.code]), Fin.chartCur, c => { Fin.chartCur = c; App.refresh(); }) },
        Fin.chart(from, to), h('div', { class: 'legend' }, h('span', null, h('i', { class: 'inc' }), 'دخل'), h('span', null, h('i', { class: 'exp' }), 'مصروف'))));
    }

    root.append(h('div', { class: 'cols2' }, Fin.debtCard('debtor'), Fin.debtCard('creditor')));
    root.append(h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', onclick: Fin.debtModal }, icon('plus', 16), 'إضافة دائن / مدين')));

    /* التقرير التفصيلي */
    const rep = UI.card('التقرير التفصيلي — ' + label, 'list', { count: list.length });
    if (!list.length) rep.append(UI.empty('لا حركات في هذه الفترة.'));
    else {
      const byDay = {}; list.forEach(t => (byDay[t.date] = byDay[t.date] || []).push(t));
      Object.keys(byDay).sort().reverse().forEach(day => {
        const items = byDay[day], dt = Fin.totals(items);
        const sum = CURRENCIES.map(c => dt[c.id]).some(x => x.inc || x.exp) ? CURRENCIES.filter(c => dt[c.id].inc || dt[c.id].exp).map(c => c.code + ' +' + fmt(dt[c.id].inc) + ' / −' + fmt(dt[c.id].exp)).join('  ·  ') : '';
        rep.append(h('div', { class: 'day-h' }, h('b', null, D.dayName(day) + ' ' + D.short(day)), h('small', { class: 'muted' }, sum)));
        items.slice().reverse().forEach(t => rep.append(h('button', { class: 'txrow', onclick: () => Fin.txModal(t) },
          h('span', { class: 'tx-ic ' + t.type }, icon(t.type === 'income' ? 'down' : 'up', 14)),
          h('span', { class: 'grow' }, t.desc || (t.type === 'income' ? 'دخل' : 'مصروف'), t.transfer ? h('span', { class: 'chip' }, 'تحويل') : null),
          h('small', { class: 'muted' }, WALLET[t.wallet].code),
          h('b', { class: t.type }, (t.type === 'income' ? '+' : '−') + fmt(t.amount)))));
      });
    }
    root.append(rep);
    return root;
  },

  csv() {
    const { from, to } = Fin.range();
    const rows = [['التاريخ', 'النوع', 'المبلغ', 'المحفظة', 'العملة', 'الشرح']];
    Fin.txIn(from, to).forEach(t => rows.push([t.date, t.type === 'income' ? 'دخل' : 'مصروف', t.amount, WALLET[t.wallet].name, WALLET[t.wallet].cur, (t.desc || '').replace(/"/g, '""')]));
    Pages.download('yawmi-finance-' + from + '_' + to + '.csv', '﻿' + rows.map(r => r.map(c => '"' + c + '"').join(',')).join('\r\n'), 'text/csv');
  },
};
