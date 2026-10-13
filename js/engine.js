/* Тапсырма генераторлары, дыбыс, сақтау. */
(function () {
  const D = window.DATA;
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[rnd(a.length)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- тапсырмалар ----------
  // Әр тапсырма: { kind: 'choice' | 'match' | 'seq', prompt, options, answer, ... }
  // Қатарынан бірдей тапсырма келмеуі үшін нысандарды кезекпен аламыз.
  function cycle(pool, n) { let out = []; while (out.length < n) out = out.concat(shuffle(pool)); return out.slice(0, n); }

  const MAKE = {
    colors(level, n) {
      const pool = level === 1 ? D.COLORS.slice(0, 3) : D.COLORS;
      const k = level === 1 ? 2 : level === 2 ? 3 : 4;
      return cycle(pool, n).map((c) => {
        const others = shuffle(pool.filter((x) => x.id !== c.id)).slice(0, k - 1);
        if (level < 3) {
          return { kind: 'choice', prompt: c.name + ' түсті тап', word: c.name, wordColor: c.hex,
            options: shuffle([c].concat(others)).map((x) => ({ id: x.id, swatch: x.hex, label: x.name })), answer: c.id };
        }
        const o = pick(c.objs);
        return { kind: 'choice', prompt: c.name + ' түсті затты тап', word: c.name, wordColor: c.hex,
          options: shuffle([{ id: c.id, emoji: o[0], label: o[1] }].concat(others.map((x) => { const p = pick(x.objs); return { id: x.id, emoji: p[0], label: p[1] }; }))), answer: c.id };
      });
    },
    animals(level, n) {
      if (level === 3) {
        return Array.from({ length: n }, () => {
          const set = shuffle(D.ANIMALS).slice(0, 3);
          return { kind: 'match', prompt: 'Әр жануарды өз мекенімен жұпта',
            left: set.map((a) => ({ id: a.home, emoji: a.emoji, label: a.name })),
            right: shuffle(set.map((a) => ({ id: a.home, emoji: D.HOMES[a.home].emoji, label: D.HOMES[a.home].label }))) };
        });
      }
      const k = level === 1 ? 2 : 3;
      return cycle(D.ANIMALS, n).map((a) => {
        const others = shuffle(Object.keys(D.HOMES).filter((h) => h !== a.home)).slice(0, k - 1);
        return { kind: 'choice', prompt: a.q, hero: a.emoji, heroLabel: a.name,
          options: shuffle([a.home].concat(others)).map((h) => ({ id: h, emoji: D.HOMES[h].emoji, label: D.HOMES[h].label })), answer: a.home };
      });
    },
    routine(level, n) {
      if (level === 3) {
        return cycle(D.ROUTINES, n).map((r) => ({ kind: 'seq', prompt: r.q,
          steps: r.steps.map((s, i) => ({ id: i, emoji: s[0], label: s[1] })), cards: shuffle(r.steps.map((s, i) => ({ id: i, emoji: s[0], label: s[1] }))) }));
      }
      const k = level === 1 ? 2 : 3;
      const pool = level === 1 ? D.ACTIONS.slice(0, 4) : D.ACTIONS;
      return cycle(pool, n).map((a) => {
        const others = shuffle(pool.filter((x) => x.id !== a.id)).slice(0, k - 1);
        return { kind: 'choice', prompt: a.q, options: shuffle([a].concat(others)).map((x) => ({ id: x.id, emoji: x.emoji, label: x.label })), answer: a.id };
      });
    },
    items(level, n) {
      if (level === 3) {
        return cycle(D.ODD, n).map((o) => ({ kind: 'choice', prompt: o.q,
          options: shuffle(o.set.map((s, i) => ({ id: 's' + i, emoji: s[0], label: s[1] })).concat([{ id: 'odd', emoji: o.odd[0], label: o.odd[1] }])), answer: 'odd' }));
      }
      const k = level === 1 ? 2 : 3;
      const pool = level === 1 ? D.USES.slice(0, 5) : D.USES;
      return cycle(pool, n).map((u) => {
        const others = shuffle(Object.keys(D.ITEMS).filter((x) => x !== u.a)).slice(0, k - 1);
        return { kind: 'choice', prompt: u.q, options: shuffle([u.a].concat(others)).map((x) => ({ id: x, emoji: D.ITEMS[x].emoji, label: D.ITEMS[x].label })), answer: u.a };
      });
    }
  };

  // ---------- дыбыс ----------
  let ctx = null;
  function tone(freqs, dur, type, vol) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ctx.currentTime;
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        const s = t0 + i * dur * 0.8;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol || 0.18, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + dur + 0.05);
      });
    } catch (e) {}
  }
  const SFX = {
    good: () => tone([660, 880, 1320], 0.16, 'sine', 0.16),
    soft: () => tone([330, 294], 0.18, 'triangle', 0.08), // жұмсақ, қорқытпайтын дыбыс
    tap: () => tone([520], 0.06, 'sine', 0.06),
    win: () => tone([523, 659, 784, 1047, 1319], 0.18, 'sine', 0.15)
  };

  let voice = null;
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices();
      voice = vs.find((v) => /^kk/i.test(v.lang)) || vs.find((v) => /^ru/i.test(v.lang)) || null;
    } catch (e) {}
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, rate) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice ? voice.lang : 'kk-KK'; if (voice) u.voice = voice;
      u.rate = rate || 0.85; u.pitch = 1.1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  const hasKkVoice = () => { try { return speechSynthesis.getVoices().some((v) => /^kk/i.test(v.lang)); } catch (e) { return false; } };

  // ---------- сақтау ----------
  const KEY = 'oina-uiren.v1';
  const DEFAULTS = { voice: true, sound: true, labels: true, big: false, calm: false, contrast: false, perRound: 5, hintAfter: 1, auto: true,
    levels: { colors: 1, animals: 1, routine: 1, items: 1 } };
  const store = {
    load() {
      let d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
      d = d && typeof d === 'object' ? d : {};
      d.children = Array.isArray(d.children) ? d.children : [];
      d.results = Array.isArray(d.results) ? d.results : [];
      d.children.forEach((c) => { c.settings = Object.assign({}, DEFAULTS, c.settings || {}); c.settings.levels = Object.assign({}, DEFAULTS.levels, (c.settings || {}).levels || {}); c.stickers = c.stickers || []; });
      return d;
    },
    save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} },
    newChild(name, avatar) { return { id: uid(), name, avatar, created: Date.now(), stickers: [], settings: JSON.parse(JSON.stringify(DEFAULTS)) }; }
  };

  window.ENGINE = { MAKE, SFX, say, hasKkVoice, store, shuffle, pick, uid, DEFAULTS };
})();
