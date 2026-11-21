/* مساعدات الواجهة: عناصر DOM، أيقونات، نوافذ، إشعارات داخلية */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (['value', 'checked', 'disabled', 'selected'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = kid => {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) kid.forEach(add);
    else el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  };
  kids.forEach(add);
  return el;
}

const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  repeat: '<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  chart: '<path d="M3 3v18h18M7 14l4-4 4 4 5-6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.4 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.8 6.9-1z"/>',
  user: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
};
function icon(name, size = 18) {
  return h('span', { class: 'ic', html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>` });
}

const UI = {
  refocus: null,
  stack: [],

  toast(msg, kind = 'info', ms = 5000, rich = false) {
    const t = h('div', { class: 'toast ' + kind },
      h('div', { class: 'toast-msg', html: rich ? msg : null }, rich ? null : msg),
      h('button', { class: 'toast-x', 'aria-label': 'إغلاق', onclick: () => t.remove() }, '×'));
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), ms - 300);
    setTimeout(() => t.remove(), ms);
    return t;
  },

  /* نافذة منبثقة: build(ctx) يعيد عنصراً، ctx.redraw() يعيد الرسم */
  modal(build) {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    back.appendChild(box);
    const ctx = {
      close() {
        back.remove();
        UI.stack = UI.stack.filter(c => c !== ctx);
        if (!UI.stack.length) document.body.classList.remove('noscroll');
        if (ctx.onClose) ctx.onClose();
      },
      redraw() { const y = box.scrollTop; box.replaceChildren(build(ctx)); box.scrollTop = y; },
    };
    back.addEventListener('mousedown', e => { if (e.target === back) ctx.close(); });
    ctx.redraw();
    document.body.appendChild(back);
    document.body.classList.add('noscroll');
    UI.stack.push(ctx);
    const first = box.querySelector('[autofocus]');
    if (first) setTimeout(() => first.focus(), 30);
    return ctx;
  },
  mhead(title, ctx, sub) {
    return h('div', { class: 'mhead' },
      h('div', null, h('h3', null, title), sub ? h('div', { class: 'muted small' }, sub) : null),
      h('button', { class: 'icon-btn', 'aria-label': 'إغلاق', onclick: ctx.close }, icon('x')));
  },
  confirm(msg, onYes, opts = {}) {
    UI.modal(ctx => h('div', null,
      UI.mhead(opts.title || 'تأكيد', ctx),
      h('p', { class: 'mtext' }, msg),
      h('div', { class: 'mfoot' },
        h('button', { class: 'btn ' + (opts.danger ? 'danger' : 'primary'), onclick: () => { ctx.close(); onYes(); } }, opts.yes || 'تأكيد'),
        h('button', { class: 'btn ghost', onclick: ctx.close }, 'إلغاء'))));
  },
  field(label, control, hint) {
    return h('label', { class: 'field' }, h('span', { class: 'flabel' }, label), control, hint ? h('span', { class: 'hint' }, hint) : null);
  },
  seg(opts, val, on) {
    return h('div', { class: 'seg' }, opts.map(([v, l]) =>
      h('button', { type: 'button', class: 'seg-b' + (v === val ? ' on' : ''), onclick: () => on(v) }, l)));
  },
  walletSelect(val, onChange, { showBal = true, none = null } = {}) {
    const sel = h('select', { class: 'in', onchange: e => onChange(e.target.value) },
      none ? h('option', { value: '' }, none) : null,
      WALLETS.map(w => h('option', { value: w.id, selected: w.id === val },
        w.name + (showBal ? '  (' + fmt(Calc.balance(w.id)) + ' ' + w.code + ')' : ''))));
    return sel;
  },

  /* صورة مضغوطة (لتوفير مساحة التخزين) */
  readImage(file, max = 900, q = 0.6) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const img = new Image();
        img.onerror = rej;
        img.onload = () => {
          const r = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', q));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  },
  /* حقل صورة: التقاط بالكاميرا / من المعرض / سحب وإفلات */
  imageField(get, set) {
    const wrap = h('div', { class: 'imgf' });
    const take = async file => {
      if (!file || !file.type.startsWith('image/')) return;
      try { set(await UI.readImage(file)); draw(); } catch (e) { UI.toast('تعذّر قراءة الصورة', 'err'); }
    };
    function draw() {
      wrap.replaceChildren();
      const v = get();
      if (v) {
        wrap.append(h('div', { class: 'imgf-prev' },
          h('img', { src: v, alt: 'صورة الواجب' }),
          h('button', { type: 'button', class: 'btn sm danger', onclick: () => { set(null); draw(); } }, icon('trash', 14), 'إزالة')));
        return;
      }
      const cam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: e => take(e.target.files[0]) });
      const gal = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: e => take(e.target.files[0]) });
      const zone = h('div', { class: 'dropzone' },
        h('div', { class: 'dz-text' }, 'اسحب صورة الواجب إلى هنا'),
        h('div', { class: 'dz-btns' },
          h('button', { type: 'button', class: 'btn sm', onclick: () => cam.click() }, icon('camera', 16), 'التقاط صورة'),
          h('button', { type: 'button', class: 'btn sm', onclick: () => gal.click() }, icon('image', 16), 'من المعرض')),
        cam, gal);
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('over'));
      zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('over'); take(e.dataTransfer.files[0]); });
      wrap.append(zone);
    }
    draw();
    return wrap;
  },
  viewImage(src) {
    UI.modal(ctx => h('div', null, UI.mhead('صورة', ctx), h('img', { class: 'bigimg', src, alt: '' })));
  },

  /* مكوّنات صغيرة مشتركة */
  card(title, ic, opts, ...kids) {
    opts = opts || {};
    return h('section', { class: 'card ' + (opts.cls || '') },
      h('header', { class: 'card-h' },
        h('div', { class: 'card-t' }, ic ? icon(ic, 18) : null, h('h2', null, title), opts.count != null ? h('span', { class: 'pill' }, opts.count) : null),
        opts.actions ? h('div', { class: 'card-a' }, opts.actions) : null),
      ...kids);
  },
  empty(text) { return h('div', { class: 'empty' }, text); },
  timerBtn(k) {
    const run = Timers.running(k);
    return h('button', { class: 'tbtn' + (run ? ' run' : ''), title: run ? 'إيقاف مؤقت' : 'ابدأ مؤقّت الوقت', onclick: e => { e.stopPropagation(); Snd.ensure(); Timers.toggle(k); } },
      icon(run ? 'pause' : 'play', 14),
      h('span', { 'data-timer': k }, Timers.elapsed(k) ? Timers.fmt(Timers.elapsed(k)) : ''));
  },
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && UI.stack.length) UI.stack[UI.stack.length - 1].close();
});
