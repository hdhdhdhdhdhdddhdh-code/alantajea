/* الأصوات والإشعارات (صوت مُولَّد بـ WebAudio — لا يحتاج ملفات صوت) */

const Snd = {
  ctx: null,
  ensure() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { return null; }
    return this.ctx;
  },
  on() { return db().settings.sound; },
  tone(freq, at, dur, type = 'sine', vol = 0.18) {
    const c = this.ensure(); if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  /* صوت تحفيزي عند إنجاز مهمة */
  success() {
    if (!this.on()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, i * 0.09, 0.28, 'triangle', 0.2));
  },
  /* نغمة إتمام كبيرة (بلوغ 100%) */
  fanfare() {
    if (!this.on()) return;
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, i * 0.12, 0.3, 'triangle', 0.22));
  },
  /* طنين تنبيه مرور الوقت — يشتد مع المستوى */
  buzz(level = 1) {
    if (!this.on()) return;
    const n = level === 1 ? 2 : level === 2 ? 3 : 5;
    for (let i = 0; i < n; i++) this.tone(level === 3 ? 330 : 440, i * 0.32, 0.22, 'square', 0.12);
    if (level === 3) this.tone(220, n * 0.32, 0.7, 'sawtooth', 0.12);
  },
  /* تذكير بالمواعيد */
  bell() {
    if (!this.on()) return;
    this.tone(880, 0, 0.25, 'sine', 0.2); this.tone(660, 0.28, 0.45, 'sine', 0.2);
  },
  newDay() {
    if (!this.on()) return;
    [392, 523.25, 659.25].forEach((f, i) => this.tone(f, i * 0.15, 0.4, 'sine', 0.2));
  },
  pop() { if (this.on()) this.tone(600, 0, 0.08, 'sine', 0.1); },
};

const Notify = {
  supported() { return 'Notification' in window; },
  async request() {
    if (!this.supported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
  },
  /* إشعار داخل الصفحة + صوت + إشعار نظام (إن سُمح) */
  show(title, body, kind = 'info', sound = 'bell', level = 1) {
    UI.toast('<b>' + title + '</b>' + (body ? '<br>' + body : ''), kind, 9000, true);
    if (sound === 'buzz') Snd.buzz(level); else if (sound === 'bell') Snd.bell(); else if (sound === 'newDay') Snd.newDay();
    if (db().settings.notify && this.supported() && Notification.permission === 'granted') {
      try { new Notification(title, { body: body || '', icon: undefined, lang: 'ar', dir: 'rtl' }); } catch (e) { /* ignore */ }
    }
  },
};
