/* Тапсырма генераторлары, суреттер, дыбыс, сақтау. */
(function () {
  const D = window.DATA;
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[rnd(a.length)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  // Қатарынан бірдей тапсырма келмеуі үшін нысандарды кезекпен аламыз
  function cycle(pool, n) { let out = []; while (out.length < n) out = out.concat(shuffle(pool)); return out.slice(0, n); }
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  // ---------- пішін суреттері (SVG) ----------
  function shapeSvg(type, color, size) {
    const s = size || 96, st = 'stroke="rgba(0,0,0,.18)" stroke-width="3"';
    const body = {
      circle: `<circle cx="50" cy="50" r="40" fill="${color}" ${st}/>`,
      square: `<rect x="13" y="13" width="74" height="74" rx="8" fill="${color}" ${st}/>`,
      triangle: `<path d="M50 10 L91 86 H9 Z" fill="${color}" stroke-linejoin="round" ${st}/>`,
      star: `<path d="M50 7l12.6 25.6 28.2 4.1-20.4 19.9 4.8 28.1L50 71.4 24.8 84.7l4.8-28.1L9.2 36.7l28.2-4.1z" fill="${color}" stroke-linejoin="round" ${st}/>`,
      heart: `<path d="M50 86S10 62 10 35a20 20 0 0 1 40-6 20 20 0 0 1 40 6c0 27-40 51-40 51z" fill="${color}" ${st}/>`,
      rect: `<rect x="6" y="27" width="88" height="46" rx="7" fill="${color}" ${st}/>`
    }[type];
    return `<svg width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
  }

  // ---------- тапсырмалар ----------
  // kind: choice | multi | match | seq | sort
  const MAKE = {
    colors(level, n) {
      if (level === 4) {
        return cycle(D.COLORS, n).map((c) => {
          const k = 2 + rnd(2);
          const good = shuffle(c.objs).slice(0, k).map((o, i) => ({ id: 'g' + i, emoji: o[0], label: o[1] }));
          const bad = shuffle(D.COLORS.filter((x) => x.id !== c.id)).slice(0, 6 - k).map((x, i) => { const o = pick(x.objs); return { id: 'b' + i, emoji: o[0], label: o[1] }; });
          return { kind: 'multi', prompt: c.name + ' түсті барлық заттарды тап', word: c.name, wordColor: c.hex, options: shuffle(good.concat(bad)), answers: good.map((g) => g.id) };
        });
      }
      const pool = level === 1 ? D.COLORS.slice(0, 3) : D.COLORS;
      const k = level === 1 ? 2 : level === 2 ? 3 : 4;
      return cycle(pool, n).map((c) => {
        const others = shuffle(pool.filter((x) => x.id !== c.id)).slice(0, k - 1);
        if (level < 3) {
          return { kind: 'choice', prompt: c.name + ' түсті тап', word: c.name, wordColor: c.hex,
            options: shuffle([c].concat(others)).map((x) => ({ id: x.id, swatch: x.hex, label: x.name, hideLabel: true })), answer: c.id };
        }
        const o = pick(c.objs);
        return { kind: 'choice', prompt: c.name + ' түсті затты тап', word: c.name, wordColor: c.hex,
          options: shuffle([{ id: c.id, emoji: o[0], label: o[1] }].concat(others.map((x) => { const p = pick(x.objs); return { id: x.id, emoji: p[0], label: p[1] }; }))), answer: c.id };
      });
    },
    animals(level, n) {
      if (level === 4) {
        return Array.from({ length: n }, () => sortTask(D.DOMESTIC_WILD.q, D.DOMESTIC_WILD.bins, { home: D.DOMESTIC_WILD.home, wild: D.DOMESTIC_WILD.wild }, 3));
      }
      if (level === 3) {
        return Array.from({ length: n }, () => {
          const set = [];
          shuffle(D.ANIMALS).forEach((a) => {
            const clash = set.some((s) => s.home === a.home || (s.ex || []).indexOf(a.home) >= 0 || (a.ex || []).indexOf(s.home) >= 0);
            if (set.length < 3 && !clash) set.push(a);
          });
          return { kind: 'match', prompt: 'Әр жануарды өз мекенімен жұпта',
            left: set.map((a) => ({ id: a.home, emoji: a.emoji, label: a.name })),
            right: shuffle(set.map((a) => ({ id: a.home, emoji: D.HOMES[a.home].emoji, label: D.HOMES[a.home].label }))) };
        });
      }
      const k = level === 1 ? 2 : 3;
      const pool = level === 1 ? D.ANIMALS.slice(0, 8) : D.ANIMALS;
      return cycle(pool, n).map((a) => {
        const others = shuffle(Object.keys(D.HOMES).filter((h) => h !== a.home && (a.ex || []).indexOf(h) < 0)).slice(0, k - 1);
        return { kind: 'choice', prompt: a.q, hero: a.emoji, heroLabel: a.name,
          options: shuffle([a.home].concat(others)).map((h) => ({ id: h, emoji: D.HOMES[h].emoji, label: D.HOMES[h].label })), answer: a.home };
      });
    },
    routine(level, n) {
      if (level === 4) {
        const longs = shuffle(D.LONG_ROUTINES);
        return Array.from({ length: n }, (_, i) => i % 2 === 0
          ? seqTask(longs[(i / 2) % longs.length])
          : sortTask(D.DAYTIME.q, D.DAYTIME.bins, { morning: D.DAYTIME.morning, evening: D.DAYTIME.evening }, 2));
      }
      if (level === 3) return cycle(D.ROUTINES, n).map(seqTask);
      const k = level === 1 ? 2 : 3;
      const pool = level === 1 ? D.ACTIONS.slice(0, 5) : D.ACTIONS;
      return cycle(pool, n).map((a) => {
        const others = shuffle(pool.filter((x) => x.id !== a.id)).slice(0, k - 1);
        return { kind: 'choice', prompt: a.q, options: shuffle([a].concat(others)).map((x) => ({ id: x.id, emoji: x.emoji, label: x.label, hideLabel: true })), answer: a.id };
      });
    },
    items(level, n) {
      if (level === 4) {
        return cycle(D.ITEM_SORTS, n).map((s) => sortTask(s.q, s.bins, { a: s.a, b: s.b }, 3));
      }
      if (level === 3) {
        return cycle(D.ODD, n).map((o) => ({ kind: 'choice', prompt: o.q,
          options: shuffle(o.set.map((s, i) => ({ id: 's' + i, emoji: s[0], label: s[1] })).concat([{ id: 'odd', emoji: o.odd[0], label: o.odd[1] }])), answer: 'odd' }));
      }
      const k = level === 1 ? 2 : 3;
      const pool = level === 1 ? D.USES.slice(0, 8) : D.USES;
      return cycle(pool, n).map((u) => {
        const others = shuffle(Object.keys(D.ITEMS).filter((x) => x !== u.a && (u.ex || []).indexOf(x) < 0)).slice(0, k - 1);
        return { kind: 'choice', prompt: u.q, options: shuffle([u.a].concat(others)).map((x) => ({ id: x, emoji: D.ITEMS[x].emoji, label: D.ITEMS[x].label })), answer: u.a };
      });
    },
    numbers(level, n) {
      let last = 0;
      const nextNum = (max) => { let v; do { v = 1 + rnd(max); } while (v === last && max > 1); last = v; return v; };
      return Array.from({ length: n }, () => {
        const e = pick(D.COUNT_EMOJI);
        if (level <= 2) {
          const max = level === 1 ? 3 : 5, k = level === 1 ? 2 : 3;
          const v = nextNum(max);
          const others = shuffle(range(1, max).filter((x) => x !== v)).slice(0, k - 1);
          return { kind: 'choice', prompt: 'Неше ' + e[1] + ' бар? Санап көр', heroGroup: { emoji: e[0], n: v },
            options: [v].concat(others).sort((a, b) => a - b).map((x) => ({ id: String(x), num: x, label: D.NUM_WORDS[x] })), answer: String(v) };
        }
        if (level === 3) {
          let a = 1 + rnd(5), b; do { b = 1 + rnd(5); } while (b === a);
          return { kind: 'choice', prompt: 'Қай топта ' + e[1] + ' көп?',
            options: [{ id: 'a', group: { emoji: e[0], n: a }, label: 'Бірінші топ', hideLabel: true }, { id: 'b', group: { emoji: e[0], n: b }, label: 'Екінші топ', hideLabel: true }], answer: a > b ? 'a' : 'b' };
        }
        // 4-деңгей: суретпен қосу немесе 10-ға дейін санау
        if (Math.random() < 0.6) {
          const a = 1 + rnd(3), b = 1 + rnd(3), s = a + b;
          const opts = shuffle(range(Math.max(1, s - 2), s + 2).filter((x) => x !== s)).slice(0, 2).concat([s]).sort((x, y) => x - y);
          return { kind: 'choice', prompt: a + ' мен ' + b + ' қосылса, неше болады?', heroSum: { emoji: e[0], a, b },
            options: opts.map((x) => ({ id: String(x), num: x, label: D.NUM_WORDS[x] })), answer: String(s) };
        }
        const v = 6 + rnd(5);
        const opts = shuffle(range(5, 10).filter((x) => x !== v)).slice(0, 2).concat([v]).sort((x, y) => x - y);
        return { kind: 'choice', prompt: 'Неше ' + e[1] + ' бар? Санап көр', heroGroup: { emoji: e[0], n: v },
          options: opts.map((x) => ({ id: String(x), num: x, label: D.NUM_WORDS[x] })), answer: String(v) };
      });
    },
    shapes(level, n) {
      const S = D.SHAPES, C = D.SHAPE_COLORS;
      const order = cycle(level === 1 ? S.slice(0, 3) : S, n);
      return Array.from({ length: n }, (_, i) => {
        if (level <= 2) {
          const pool = level === 1 ? S.slice(0, 3) : S;
          const t = order[i], k = level === 1 ? 2 : 3;
          const col = pick(C).hex;
          const others = shuffle(pool.filter((x) => x.id !== t.id)).slice(0, k - 1);
          return { kind: 'choice', prompt: t.name + ' пішінін тап',
            options: shuffle([t].concat(others)).map((x) => ({ id: x.id, shape: x.id, color: level === 1 ? col : pick(C).hex, label: x.name, hideLabel: true })), answer: t.id };
        }
        if (level === 3) return patternTask(['AB', 'AB', 'ABB', 'AAB'][rnd(4)], 3);
        // 4-деңгей: күрделі заңдылық немесе түс + пішін
        if (i % 2 === 0) return patternTask(['ABC', 'AABB', 'ABBC', 'ABAC'][rnd(4)], 4);
        const ts = pick(S), tc = pick(C);
        const os = pick(S.filter((x) => x.id !== ts.id)), oc = pick(C.filter((x) => x.id !== tc.id));
        const opts = [{ id: 'ok', shape: ts.id, color: tc.hex, label: tc.name + ' ' + ts.name.toLowerCase(), hideLabel: true },
          { id: 'x1', shape: ts.id, color: oc.hex, label: oc.name + ' ' + ts.name.toLowerCase(), hideLabel: true },
          { id: 'x2', shape: os.id, color: tc.hex, label: tc.name + ' ' + os.name.toLowerCase(), hideLabel: true },
          { id: 'x3', shape: os.id, color: oc.hex, label: oc.name + ' ' + os.name.toLowerCase(), hideLabel: true }];
        return { kind: 'choice', prompt: tc.name + ' ' + ts.acc + ' тап', options: shuffle(opts), answer: 'ok' };
      });
    }
  };

  function seqTask(r) {
    return { kind: 'seq', prompt: r.q, steps: r.steps.map((s, i) => ({ id: i, emoji: s[0], label: s[1] })), cards: shuffle(r.steps.map((s, i) => ({ id: i, emoji: s[0], label: s[1] }))) };
  }
  function sortTask(q, bins, groups, per) {
    let cards = [];
    bins.forEach((b) => { cards = cards.concat(shuffle(groups[b.id]).slice(0, per).map((c) => ({ emoji: c[0], label: c[1], bin: b.id }))); });
    return { kind: 'sort', prompt: q, bins, cards: shuffle(cards).map((c, i) => Object.assign(c, { id: i })) };
  }
  // Заңдылық: үлгі (мысалы, ABB) қайталанады, соңғысы — «?»
  function patternTask(pat, nOpts) {
    const letters = Array.from(new Set(pat.split('')));
    const shapes = shuffle(D.SHAPES.slice(0, 5)), cols = shuffle(D.SHAPE_COLORS);
    const useColor = Math.random() < 0.5;
    const map = {}; letters.forEach((l, i) => { map[l] = { shape: shapes[i].id, color: useColor ? cols[i].hex : cols[0].hex, name: shapes[i].name }; });
    const full = (pat + pat + pat).split('');
    // Жауап заңдылықтың әр орнына түсуі үшін ұзындықты кездейсоқ таңдаймыз (кемінде бір толық қайталау көрінеді)
    const len = Math.min(full.length, 9, pat.length + 2 + rnd(pat.length));
    const seq = full.slice(0, len - 1), ans = full[len - 1];
    const opts = letters.map((l) => ({ id: l, shape: map[l].shape, color: map[l].color, label: map[l].name, hideLabel: true }));
    if (opts.length < nOpts) {
      shapes.slice(letters.length).slice(0, nOpts - opts.length).forEach((s, i) => opts.push({ id: 'z' + i, shape: s.id, color: useColor ? cols[(letters.length + i) % cols.length].hex : cols[0].hex, label: s.name, hideLabel: true }));
    }
    return { kind: 'choice', prompt: 'Келесісі қайсы? Заңдылықты жалғастыр', pattern: seq.map((l) => map[l]), options: shuffle(opts), answer: ans };
  }

  // ---------- дыбыс ----------
  let ctx = null;
  function tone(freqs, dur, type, vol, gap) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        const s = t0 + i * (gap || dur * 0.8);
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol || 0.18, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + dur + 0.05);
      });
    } catch (e) {}
  }
  const SFX = {
    good: () => tone([660, 880, 1320], 0.16, 'sine', 0.16),
    soft: () => tone([330, 294], 0.18, 'triangle', 0.08), // жұмсақ, қорқытпайтын дыбыс
    tap: () => tone([520], 0.06, 'sine', 0.06),
    pop: () => tone([900 + rnd(400)], 0.08, 'sine', 0.12),
    beat: () => tone([440], 0.09, 'triangle', 0.1),
    flip: () => tone([700], 0.05, 'square', 0.03),
    win: () => tone([523, 659, 784, 1047, 1319], 0.18, 'sine', 0.15)
  };

  let voice = null;
  function pickVoice() {
    try { const vs = speechSynthesis.getVoices(); voice = vs.find((v) => /^kk/i.test(v.lang)) || vs.find((v) => /^ru/i.test(v.lang)) || null; } catch (e) {}
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
  const DEFAULTS = { voice: true, sound: true, labels: true, big: false, calm: false, contrast: false, perRound: 5, hintAfter: 1, auto: true, breakEvery: 2,
    levels: { colors: 1, animals: 1, routine: 1, items: 1, numbers: 1, shapes: 1 } };
  const store = {
    load() {
      let d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
      d = d && typeof d === 'object' ? d : {};
      d.children = Array.isArray(d.children) ? d.children : [];
      d.results = Array.isArray(d.results) ? d.results : [];
      d.breaks = Array.isArray(d.breaks) ? d.breaks : [];
      d.children.forEach((c) => {
        const s = c.settings || {};
        c.settings = Object.assign({}, DEFAULTS, s);
        c.settings.levels = Object.assign({}, DEFAULTS.levels, s.levels || {});
        c.stickers = c.stickers || [];
        c.sinceBreak = c.sinceBreak || 0;
      });
      return d;
    },
    save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} },
    newChild(name, avatar) { return { id: uid(), name, avatar, created: Date.now(), stickers: [], sinceBreak: 0, settings: JSON.parse(JSON.stringify(DEFAULTS)) }; }
  };

  window.ENGINE = { MAKE, SFX, say, hasKkVoice, store, shuffle, pick, uid, rnd, DEFAULTS, shapeSvg };
})();
