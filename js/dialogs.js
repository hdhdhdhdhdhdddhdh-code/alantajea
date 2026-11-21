/* النوافذ: إنجاز المهمة، المحاضرة، التسوق، إضافة عنصر */

const Dlg = {
  praise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; },

  /* ── نافذة إتمام (هدف / مهمة / عادة / مهمة خارج الخطة) ── */
  complete({ title, sub, withPct = true, withNotes = true, est, timerKey, initial = {}, onSave }) {
    const timerMin = timerKey ? Timers.minutes(timerKey) : 0;
    const v = {
      pct: initial.pct ?? 100,
      notes: initial.notes || '',
      spent: initial.spent ?? (timerMin || est || 0),
    };
    UI.modal(ctx => {
      const pctOut = h('b', { class: 'pct-out' }, v.pct + '%');
      const range = h('input', { type: 'range', min: 0, max: 100, step: 5, value: v.pct, class: 'range', oninput: e => { v.pct = +e.target.value; pctOut.textContent = v.pct + '%'; num.value = v.pct; } });
      const num = h('input', { type: 'number', min: 0, max: 100, value: v.pct, class: 'in num', oninput: e => { v.pct = Math.max(0, Math.min(100, +e.target.value || 0)); pctOut.textContent = v.pct + '%'; range.value = v.pct; } });
      return h('div', null,
        UI.mhead(title, ctx, sub),
        h('div', { class: 'mbody' },
          withPct ? h('div', { class: 'field' },
            h('span', { class: 'flabel' }, 'نسبة إتمامه من 100'),
            h('div', { class: 'pct-row' }, range, num, pctOut)) : null,
          withNotes ? UI.field('المواضيع أو الخطوات التي تمّت',
            h('textarea', { class: 'in', rows: 3, placeholder: 'اكتب ما أنجزته…', oninput: e => v.notes = e.target.value }, v.notes)) : null,
          UI.field('الوقت المستغرق (بالدقائق)',
            h('input', { type: 'number', min: 0, class: 'in', value: v.spent, oninput: e => v.spent = Math.max(0, +e.target.value || 0) }),
            [est ? 'المتوقع: ' + est + ' د' : '', timerMin ? ' · المؤقّت: ' + timerMin + ' د' : ''].join(''))),
        h('div', { class: 'mfoot' },
          h('button', { class: 'btn primary', onclick: () => { ctx.close(); onSave({ pct: v.pct, notes: v.notes.trim(), spent: v.spent }); } }, icon('check', 16), 'تأكيد الإنجاز'),
          h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء')));
    });
  },

  /* إتمام عنصر عام (له الحقول done/pct/notes/spent) */
  completeItem(item, { title, timerKey, est, sub, withPct = true }) {
    Dlg.complete({
      title, sub, est: est ?? item.est, timerKey, withPct,
      initial: item.done ? { pct: item.pct, notes: item.notes, spent: item.spent } : {},
      onSave: r => {
        item.done = true; item.pct = r.pct; item.notes = r.notes; item.spent = r.spent; item.doneAt = Date.now();
        if (item.hasOwnProperty('doneDate') || item.doneDate === undefined) item.doneDate = D.today();
        if (timerKey) Timers.clear(timerKey);
        Snd.success(); UI.toast(Dlg.praise() + ' — ' + item.name, 'ok');
        Store.commit(); Dlg.checkFull();
      },
    });
  },
  undoItem(item, timerKey) {
    UI.confirm('إلغاء إنجاز «' + item.name + '»؟', () => {
      item.done = false; item.pct = null; item.notes = ''; item.spent = 0; item.doneDate = null;
      Store.commit();
    }, { yes: 'نعم، ألغِ الإنجاز' });
  },
  /* نغمة احتفال عند بلوغ 100% لأول مرة في اليوم */
  checkFull() {
    const k = D.today(), sc = Calc.score(k);
    const seen = db().levelSeen['full|' + k];
    if (sc.pct >= 100 && sc.count > 0 && !seen) {
      db().levelSeen['full|' + k] = 1; Store.save();
      setTimeout(() => { Snd.fanfare(); UI.toast('🏆 <b>أتممت 100% من خطة اليوم!</b>', 'ok', 8000, true); }, 500);
    }
  },

  /* ── إضافة / تعديل عنصر باسم ووقت متوقع ── */
  nameEst({ title, name = '', est = '', estLabel = 'الوقت المتوقع للتنفيذ (دقائق)', namePh = 'الاسم', onSave, onDelete }) {
    const v = { name, est };
    UI.modal(ctx => {
      const save = () => {
        if (!v.name.trim()) { UI.toast('اكتب الاسم أولاً', 'warn'); return; }
        ctx.close(); onSave({ name: v.name.trim(), est: +v.est || 0 });
      };
      return h('div', null,
        UI.mhead(title, ctx),
        h('div', { class: 'mbody' },
          UI.field('الاسم', h('input', { class: 'in', placeholder: namePh, value: v.name, autofocus: true, oninput: e => v.name = e.target.value, onkeydown: e => e.key === 'Enter' && save() })),
          UI.field(estLabel, h('input', { class: 'in', type: 'number', min: 0, value: v.est, oninput: e => v.est = e.target.value, onkeydown: e => e.key === 'Enter' && save() }))),
        h('div', { class: 'mfoot' },
          h('button', { class: 'btn primary', onclick: save }, 'حفظ'),
          onDelete ? h('button', { class: 'btn danger', onclick: () => { ctx.close(); onDelete(); } }, icon('trash', 16), 'حذف') : null,
          h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء')));
    });
  },

  /* ── مهمة خارج الخطة ── */
  addExtra() {
    Dlg.nameEst({
      title: 'مهمة خارج الخطة', namePh: 'ماذا أنجزت أو ستنجز خارج البرنامج؟', estLabel: 'الوقت المتوقع (اختياري)',
      onSave: r => {
        const k = D.today();
        (db().extras[k] = db().extras[k] || []).push({ id: Store.uid(), name: r.name, est: r.est, done: false });
        Snd.pop(); Store.commit();
        UI.toast('أُضيفت المهمة — أكّد إنجازها لتحصل على مكافأة +' + EXTRA_BONUS + '%', 'ok');
      },
    });
  },

  /* ── لائحة التسوق: تأكيد شراء / بدون شراء / تأجيل ── */
  shopDone(item) {
    const v = { mode: 'buy', price: '', wallet: db().settings.lastWallet || 'SYP', reason: '' };
    UI.modal(ctx => {
      const body = [];
      if (v.mode === 'buy') {
        const w = WALLET[v.wallet];
        body.push(
          UI.field('سعر الشراء (' + w.code + ')', h('input', { class: 'in', type: 'number', min: 0, step: 'any', value: v.price, autofocus: true, oninput: e => v.price = e.target.value })),
          UI.field('الدفع من محفظة', UI.walletSelect(v.wallet, val => { v.wallet = val; ctx.redraw(); })),
          h('div', { class: 'hint' }, 'سيُخصم المبلغ من المحفظة ويُسجَّل كمصروف تلقائياً.'));
      } else if (v.mode === 'skip') {
        body.push(UI.field('سبب إتمام المهمة دون شراء', h('textarea', { class: 'in', rows: 3, autofocus: true, placeholder: 'مثلاً: وُجد عندي، أو لم يعد مطلوباً…', oninput: e => v.reason = e.target.value }, v.reason)),
          h('div', { class: 'hint' }, 'تُعتبر المهمة منجَزة وتدخل في نسبة الإنجاز.'));
      } else {
        body.push(UI.field('سبب التأجيل (اختياري)', h('textarea', { class: 'in', rows: 2, oninput: e => v.reason = e.target.value }, v.reason)),
          h('div', { class: 'hint' }, 'ستختفي من قائمة اليوم وتعود غداً.'));
      }
      const submit = () => {
        if (v.mode === 'buy') {
          const price = +v.price;
          if (!(price > 0)) { UI.toast('أدخل سعر الشراء', 'warn'); return; }
          const tx = { id: Store.uid(), ts: Date.now(), date: D.today(), type: 'expense', amount: price, wallet: v.wallet, desc: 'تسوق: ' + item.name, src: 'shop', srcId: item.id };
          db().tx.push(tx);
          Object.assign(item, { status: 'bought', price, wallet: v.wallet, doneDate: D.today(), txId: tx.id });
          db().settings.lastWallet = v.wallet;
          Snd.success(); UI.toast(Dlg.praise() + ' تم شراء ' + item.name, 'ok');
        } else if (v.mode === 'skip') {
          if (!v.reason.trim()) { UI.toast('اكتب السبب', 'warn'); return; }
          Object.assign(item, { status: 'skipped', reason: v.reason.trim(), doneDate: D.today() });
          Snd.success();
        } else {
          item.hideUntil = D.add(D.today(), 1); item.reason = v.reason.trim();
          UI.toast('تم تأجيل «' + item.name + '» إلى الغد', 'info');
        }
        ctx.close(); Store.commit(); Dlg.checkFull();
      };
      return h('div', null,
        UI.mhead(item.name, ctx, 'لائحة التسوق'),
        h('div', { class: 'mbody' },
          UI.seg([['buy', 'تم الشراء'], ['skip', 'تمّت بدون شراء'], ['later', 'تأجيل']], v.mode, m => { v.mode = m; ctx.redraw(); }),
          ...body),
        h('div', { class: 'mfoot' },
          h('button', { class: 'btn primary', onclick: submit }, 'تأكيد'),
          h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء')));
    });
  },
  shopUndo(item) {
    UI.confirm('إرجاع «' + item.name + '» إلى القائمة؟' + (item.txId ? ' سيُعاد المبلغ إلى المحفظة.' : ''), () => {
      if (item.txId) db().tx = db().tx.filter(t => t.id !== item.txId);
      Object.assign(item, { status: 'pending', price: null, wallet: null, doneDate: null, txId: null, reason: '', hideUntil: null });
      Store.commit();
    }, { yes: 'نعم، أرجعها' });
  },

  /* ── المحاضرة: حضور / غياب / واجب / مشروع / مذاكرة ── */
  lecture(l, key) {
    const lk = key + '|' + l.id;
    const st = {
      form: null,
      hw: { topic: '', due: D.add(key, 7), img: null },
      pr: { title: '', start: key, due: '', notes: '' },
      ex: { title: 'مذاكرة ' + l.name, date: '', scope: '' },
    };
    UI.modal(ctx => {
      const log = db().lectureLogs[lk] || {};
      const setStatus = s => {
        const cur = db().lectureLogs[lk] || (db().lectureLogs[lk] = {});
        cur.status = s; st.form = null; Snd.pop(); Store.commit(); ctx.redraw();
      };
      const keepLog = () => db().lectureLogs[lk] || (db().lectureLogs[lk] = {});

      const parts = [
        h('div', { class: 'seg big' },
          h('button', { class: 'seg-b ok' + (log.status === 'present' ? ' on' : ''), onclick: () => setStatus('present') }, icon('check', 18), 'حضور'),
          h('button', { class: 'seg-b bad' + (log.status === 'absent' ? ' on' : ''), onclick: () => setStatus('absent') }, icon('x', 18), 'غياب')),
      ];

      if (log.status === 'absent') {
        parts.push(UI.field('سبب الغياب',
          h('textarea', { class: 'in', rows: 3, placeholder: 'اكتب سبب الغياب عن المحاضرة…', oninput: e => { keepLog().reason = e.target.value; Store.save(); } }, log.reason || '')));
      }

      if (log.status === 'present') {
        parts.push(UI.field('موضوع المحاضرة',
          h('textarea', { class: 'in', rows: 2, placeholder: 'ما موضوع محاضرة اليوم؟', oninput: e => { keepLog().topic = e.target.value; Store.save(); } }, log.topic || '')));

        parts.push(h('div', { class: 'addrow' },
          h('button', { class: 'btn sm' + (st.form === 'hw' ? ' primary' : ''), onclick: () => { st.form = st.form === 'hw' ? null : 'hw'; ctx.redraw(); } }, icon('book', 16), 'واجب'),
          h('button', { class: 'btn sm' + (st.form === 'pr' ? ' primary' : ''), onclick: () => { st.form = st.form === 'pr' ? null : 'pr'; ctx.redraw(); } }, icon('target', 16), 'مشروع'),
          h('button', { class: 'btn sm' + (st.form === 'ex' ? ' primary' : ''), onclick: () => { st.form = st.form === 'ex' ? null : 'ex'; ctx.redraw(); } }, icon('edit', 16), 'مذاكرة')));

        if (st.form === 'hw') {
          const f = st.hw;
          parts.push(h('div', { class: 'subform' },
            UI.field('موضوع الواجب', h('input', { class: 'in', value: f.topic, placeholder: 'ما المطلوب؟', oninput: e => f.topic = e.target.value })),
            UI.field('يوم التسليم', h('input', { class: 'in', type: 'date', value: f.due, oninput: e => f.due = e.target.value }), 'سيصلك تذكير قبل يوم من التسليم'),
            h('div', { class: 'field' }, h('span', { class: 'flabel' }, 'صورة الواجب (اختياري)'), UI.imageField(() => f.img, v => f.img = v)),
            h('button', { class: 'btn primary', onclick: () => {
              if (!f.topic.trim() || !f.due) { UI.toast('اكتب موضوع الواجب وحدّد يوم التسليم', 'warn'); return; }
              db().assignments.push({ id: Store.uid(), logKey: lk, lecture: l.name, topic: f.topic.trim(), due: f.due, img: f.img, done: false, created: key });
              st.hw = { topic: '', due: D.add(key, 7), img: null }; st.form = null;
              Snd.pop(); Store.commit(); UI.toast('تم حفظ الواجب — سيصلك تذكير قبل يوم من التسليم', 'ok'); ctx.redraw();
            } }, 'حفظ الواجب')));
        }
        if (st.form === 'pr') {
          const f = st.pr;
          parts.push(h('div', { class: 'subform' },
            UI.field('اسم المشروع', h('input', { class: 'in', value: f.title, oninput: e => f.title = e.target.value })),
            h('div', { class: 'grid2' },
              UI.field('تاريخ البدء', h('input', { class: 'in', type: 'date', value: f.start, oninput: e => f.start = e.target.value })),
              UI.field('يوم التسليم', h('input', { class: 'in', type: 'date', value: f.due, oninput: e => f.due = e.target.value }))),
            UI.field('ملاحظات', h('textarea', { class: 'in', rows: 2, oninput: e => f.notes = e.target.value }, f.notes), 'سيصلك تذكير قبل يومين من التسليم'),
            h('button', { class: 'btn primary', onclick: () => {
              if (!f.title.trim() || !f.due) { UI.toast('اكتب اسم المشروع وحدّد يوم التسليم', 'warn'); return; }
              db().projects.push({ id: Store.uid(), logKey: lk, lecture: l.name, title: f.title.trim(), start: f.start, due: f.due, notes: f.notes.trim(), done: false });
              st.pr = { title: '', start: key, due: '', notes: '' }; st.form = null;
              Snd.pop(); Store.commit(); UI.toast('تم حفظ المشروع — تذكير قبل يومين من التسليم', 'ok'); ctx.redraw();
            } }, 'حفظ المشروع')));
        }
        if (st.form === 'ex') {
          const f = st.ex;
          parts.push(h('div', { class: 'subform' },
            UI.field('اسم المذاكرة', h('input', { class: 'in', value: f.title, oninput: e => f.title = e.target.value })),
            UI.field('موعد المذاكرة (اليوم والتاريخ)', h('input', { class: 'in', type: 'date', value: f.date, oninput: e => f.date = e.target.value })),
            UI.field('ما المطلوب؟ (ما الداخل)', h('textarea', { class: 'in', rows: 2, placeholder: 'الفصول / الدروس…', oninput: e => f.scope = e.target.value }, f.scope), 'سيصلك تذكير قبل يومين — وتُسجَّل العلامة لاحقاً في صفحة «باشاك شهير»'),
            h('button', { class: 'btn primary', onclick: () => {
              if (!f.title.trim() || !f.date) { UI.toast('اكتب اسم المذاكرة وحدّد موعدها', 'warn'); return; }
              db().exams.push({ id: Store.uid(), logKey: lk, lecture: l.name, title: f.title.trim(), date: f.date, scope: f.scope.trim(), mark: null, max: 100 });
              st.ex = { title: 'مذاكرة ' + l.name, date: '', scope: '' }; st.form = null;
              Snd.pop(); Store.commit(); UI.toast('تم حفظ المذاكرة — تذكير قبل يومين', 'ok'); ctx.redraw();
            } }, 'حفظ المذاكرة')));
        }

        /* العناصر المرتبطة بهذه المحاضرة */
        const as = db().assignments.filter(a => a.logKey === lk), ps = db().projects.filter(a => a.logKey === lk), es = db().exams.filter(a => a.logKey === lk);
        const mk = (ic, label, txt, onDel) => h('div', { class: 'linked' }, icon(ic, 16), h('div', { class: 'grow' }, h('b', null, label), ' ', txt), h('button', { class: 'icon-btn sm', title: 'حذف', onclick: onDel }, icon('trash', 14)));
        if (as.length + ps.length + es.length) {
          parts.push(h('div', { class: 'linked-list' },
            as.map(a => mk('book', 'واجب:', a.topic + ' — تسليم ' + D.short(a.due), () => { db().assignments = db().assignments.filter(x => x !== a); Store.commit(); ctx.redraw(); })),
            ps.map(a => mk('target', 'مشروع:', a.title + ' — تسليم ' + D.short(a.due), () => { db().projects = db().projects.filter(x => x !== a); Store.commit(); ctx.redraw(); })),
            es.map(a => mk('edit', 'مذاكرة:', a.title + ' — ' + D.short(a.date), () => { db().exams = db().exams.filter(x => x !== a); Store.commit(); ctx.redraw(); }))));
        }
      }

      return h('div', null,
        UI.mhead(l.name, ctx, (l.start ? l.start + (l.end ? ' – ' + l.end : '') : '') + (l.room ? ' · قاعة ' + l.room : '')),
        h('div', { class: 'mbody' }, parts),
        h('div', { class: 'mfoot' }, h('button', { class: 'btn primary', onclick: ctx.close }, 'تم')));
    });
  },
};
