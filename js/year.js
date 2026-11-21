/* صفحة «السنة»: تأثير الإنتاجية اليومية على السنة بالكامل */

const Year = {
  year: null,

  render() {
    const today = D.today(), y = Year.year || (Year.year = D.parse(today).getFullYear());
    const hist = db().history;
    const keys = Object.keys(hist).filter(k => k.startsWith(y + '-')).sort();
    const vals = keys.map(k => hist[k].p);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const best = keys.reduce((b, k) => (!b || hist[k].p > hist[b].p) ? k : b, null);
    const good = vals.filter(v => v >= 80).length;
    const totalMin = keys.reduce((s, k) => s + (hist[k].m || 0), 0);

    /* سلسلة أيام متتالية ≥ 60% */
    let streak = 0, d = today;
    if (!(hist[d] && hist[d].p >= 60)) d = D.add(d, -1);
    while (hist[d] && hist[d].p >= 60) { streak++; d = D.add(d, -1); }

    /* تقدم السنة */
    const startY = y + '-01-01', endY = y + '-12-31';
    const daysInYear = D.diff(endY, startY) + 1, passed = Math.min(daysInYear, Math.max(0, D.diff(today, startY) + 1));

    const root = h('div', { class: 'page' },
      Pages.head('سنتي', 'كل يوم تنجزه يُضاف إلى خريطة سنتك',
        h('div', { class: 'datenav tight' },
          h('button', { class: 'icon-btn', onclick: () => { Year.year++; App.refresh(); } }, icon('chevR')),
          h('div', { class: 'dn-mid' }, h('b', null, String(y))),
          h('button', { class: 'icon-btn', onclick: () => { Year.year--; App.refresh(); } }, icon('chevL')))));

    root.append(h('div', { class: 'kpis' },
      Year.kpi('متوسط الإنجاز', avg + '%', 'target'),
      Year.kpi('أيام متتالية ≥ 60%', streak, 'flame'),
      Year.kpi('أيام ≥ 80%', good, 'star'),
      Year.kpi('أفضل يوم', best ? hist[best].p + '%' : '—', 'bolt', best ? D.short(best) : ''),
      Year.kpi('وقت مسجّل', mins(totalMin), 'clock', Math.round(totalMin / 60) + ' ساعة'),
      Year.kpi('أيام مسجّلة', keys.length, 'calendar', 'من ' + passed + ' يوم مضى')));

    root.append(UI.card('تقدّم السنة', 'calendar', null,
      h('div', { class: 'brk' }, h('span', null, 'مضى من السنة'), h('div', { class: 'bar sm' }, h('div', { class: 'bar-fill', style: { width: Math.round(passed / daysInYear * 100) + '%' } })), h('b', null, Math.round(passed / daysInYear * 100) + '%')),
      h('div', { class: 'hint' }, 'متبقٍّ ' + (daysInYear - passed) + ' يوماً. متوسط إنجازك ' + avg + '% — لو حافظت عليه ستحقق ما يعادل ' + Math.round(avg / 100 * daysInYear) + ' «يوماً كاملاً» هذه السنة.')));

    /* خريطة حرارية */
    const first = D.parse(startY), pad0 = (first.getDay() + 1) % 7;   // السبت أول الأسبوع
    const cells = [];
    for (let i = 0; i < pad0; i++) cells.push(h('i', { class: 'hm empty' }));
    for (let i = 0; i < daysInYear; i++) {
      const k = D.add(startY, i), e = hist[k];
      const lvl = !e ? 0 : e.p >= 100 ? 5 : e.p >= 75 ? 4 : e.p >= 50 ? 3 : e.p >= 25 ? 2 : 1;
      cells.push(h('i', { class: 'hm l' + lvl + (k === today ? ' now' : ''), title: D.dayName(k) + ' ' + D.long(k) + (e ? ' — ' + e.p + '%' : ' — لا بيانات') }));
    }
    root.append(UI.card('خريطة الإنجاز اليومي', 'chart', null,
      h('div', { class: 'heat-wrap' }, h('div', { class: 'heat' }, cells)),
      h('div', { class: 'legend' }, h('span', null, 'أقل'), [0, 1, 2, 3, 4, 5].map(l => h('i', { class: 'hm l' + l })), h('span', null, 'أكثر'))));

    /* متوسط كل شهر */
    const months = MONTHS_AR.map((m, i) => {
      const ks = keys.filter(k => +k.slice(5, 7) === i + 1), v = ks.map(k => hist[k].p);
      return { m, avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null, n: v.length };
    });
    root.append(UI.card('متوسط الإنجاز لكل شهر', 'chart', null,
      h('div', { class: 'chart months' }, months.map(m => h('div', { class: 'cbar', title: m.m + (m.avg != null ? ' — ' + m.avg + '% (' + m.n + ' يوم)' : '') },
        h('div', { class: 'cb-pair' }, h('i', { class: 'inc', style: { height: Math.min(100, m.avg || 0) + '%' } })),
        h('span', null, m.avg != null ? m.avg + '%' : '·'), h('span', { class: 'ml' }, m.m.split(' ')[0]))))));

    /* ملخص النشاط */
    const pre = y + '-';
    let goalsDone = 0, goalsAll = 0, habitDone = 0, lecP = 0, lecA = 0;
    Object.entries(db().goals).forEach(([k, l]) => { if (k.startsWith(pre)) { goalsAll += l.length; goalsDone += l.filter(g => g.done).length; } });
    Object.entries(db().habitLogs).forEach(([k, l]) => { if (k.startsWith(pre)) habitDone += Object.values(l).filter(x => x.done).length; });
    Object.entries(db().lectureLogs).forEach(([k, g]) => { if (k.startsWith(pre)) { if (g.status === 'present') lecP++; else if (g.status === 'absent') lecA++; } });
    const extrasDone = Object.entries(db().extras).reduce((s, [k, l]) => s + (k.startsWith(pre) ? l.filter(e => e.done).length : 0), 0);
    root.append(UI.card('حصاد السنة', 'star', null,
      h('div', { class: 'kpis small' },
        Year.kpi('أهداف مُنجَزة', goalsDone + (goalsAll ? ' / ' + goalsAll : ''), 'target'),
        Year.kpi('عادات مُنجَزة', habitDone, 'repeat'),
        Year.kpi('محاضرات حضرتها', lecP, 'cap', lecA ? lecA + ' غياب' : ''),
        Year.kpi('مهام خارج الخطة', extrasDone, 'bolt'))));
    return root;
  },
  kpi(label, val, ic, sub) {
    return h('div', { class: 'card kpi' }, h('div', { class: 'kpi-ic' }, icon(ic, 20)), h('div', { class: 'kpi-v' }, String(val)), h('div', { class: 'kpi-l' }, label), sub ? h('small', { class: 'muted' }, sub) : null);
  },
};
