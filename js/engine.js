/* Тапсырма генераторлары, суреттер (SVG), қазақша дауыс, сақтау. */
(function () {
  const D = window.DATA;
  const rnd = (n) => Math.floor(Math.random() * n);
  const between = (a, b) => a + rnd(b - a + 1);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[rnd(a.length)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function cycle(pool, n) { let out = []; while (out.length < n) out = out.concat(shuffle(pool)); return out.slice(0, n); }
  const pad = D.pad;
  const hm = (h, m) => h + ':' + pad(m);

  // ---------- сандар қазақша ----------
  const ONES = ['нөл', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз'];
  const TENS = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан'];
  function kkNum(n) {
    n = Math.floor(n);
    if (n === 0) return 'нөл';
    const out = [];
    const th = Math.floor(n / 1000), h = Math.floor(n % 1000 / 100), t = Math.floor(n % 100 / 10), o = n % 10;
    if (th) out.push(th === 1 ? 'мың' : kkNum(th) + ' мың');
    if (h) out.push(h === 1 ? 'жүз' : ONES[h] + ' жүз');
    if (t) out.push(TENS[t]);
    if (o) out.push(ONES[o]);
    return out.join(' ');
  }

  // ---------- суреттер ----------
  function clockSvg(h, m, size) {
    const s = size || 140;
    const ma = m * 6, ha = (h % 12) * 30 + m * 0.5;
    const hand = (ang, len, w, col) => { const r = ang * Math.PI / 180; return `<line x1="50" y1="50" x2="${(50 + len * Math.sin(r)).toFixed(1)}" y2="${(50 - len * Math.cos(r)).toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
    let ticks = '';
    for (let i = 1; i <= 12; i++) { const r = i * 30 * Math.PI / 180; ticks += `<text x="${(50 + 36 * Math.sin(r)).toFixed(1)}" y="${(50 - 36 * Math.cos(r) + 4).toFixed(1)}" font-size="10" font-weight="800" text-anchor="middle" fill="#2A2550" font-family="Nunito, Verdana, sans-serif">${i}</text>`; }
    return `<svg width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#3B6FD8" stroke-width="5"/>${ticks}${hand(ha, 22, 5.5, '#2A2550')}${hand(ma, 33, 3.5, '#E8456B')}<circle cx="50" cy="50" r="3.5" fill="#2A2550"/></svg>`;
  }
  function moneySvg(v, size) {
    const s = size || 110;
    const t = `<text x="50" y="58" font-size="${v >= 1000 ? 22 : 26}" font-weight="900" text-anchor="middle" font-family="Nunito, Verdana, sans-serif" fill="#2A2550">${v}</text><text x="50" y="76" font-size="11" font-weight="800" text-anchor="middle" font-family="Nunito, Verdana, sans-serif" fill="#2A2550">теңге</text>`;
    if (v >= 500) {
      const col = { 500: '#9CC9F5', 1000: '#B6E3A8', 2000: '#F7C98B', 5000: '#E9A9C9' }[v] || '#ddd';
      return `<svg width="${Math.round(s * 1.6)}" height="${s}" viewBox="-30 0 160 100" aria-hidden="true"><rect x="-26" y="14" width="152" height="72" rx="8" fill="${col}" stroke="#2A2550" stroke-width="2.5"/><circle cx="104" cy="50" r="13" fill="rgba(255,255,255,.5)"/><text x="-14" y="34" font-size="12" font-weight="900" font-family="Nunito, Verdana, sans-serif" fill="#2A2550">₸</text>${t}</svg>`;
    }
    const bi = v >= 50;
    const outer = v === 200 ? '#E3B341' : bi ? '#C9CED6' : '#E3B341', inner = v === 200 ? '#C9CED6' : bi ? '#E3B341' : '#F2CC5C';
    return `<svg width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="${outer}" stroke="#7A5B12" stroke-width="2.5"/><circle cx="50" cy="50" r="${bi ? 32 : 38}" fill="${inner}"/>${t}</svg>`;
  }
  function lightSvg(on, size) {
    const s = size || 130;
    const lamp = (cy, col, id) => `<circle cx="30" cy="${cy}" r="15" fill="${on === id ? col : '#3d3d46'}" ${on === id ? `stroke="${col}" stroke-width="3" stroke-opacity=".45"` : ''}/>`;
    return `<svg width="${Math.round(s * 0.6)}" height="${s}" viewBox="0 0 60 110" aria-hidden="true"><rect x="8" y="4" width="44" height="102" rx="12" fill="#22232B"/>${lamp(25, '#F04438', 'red')}${lamp(55, '#FDB022', 'yellow')}${lamp(85, '#12B76A', 'green')}</svg>`;
  }

  // ---------- нұсқа көмекшілері ----------
  // Сандық жауап: дұрыс жауап + жақын, бірақ қате нұсқалар (баланың жиі қателесетін жерлері: ±1, ±10)
  function numOpts(ans, deltas, min) {
    const lo = min || 0, set = [ans];
    shuffle(deltas).forEach((d) => { const v = ans + d; if (set.length < 3 && v >= lo && set.indexOf(v) < 0) set.push(v); });
    let k = 1; while (set.length < 3) { const v = ans + k; if (v >= lo && set.indexOf(v) < 0) set.push(v); k = k > 0 ? -k : -k + 1; }
    return set.sort((a, b) => a - b).map((v) => ({ id: String(v), num: v, label: String(v) }));
  }
  const textOpts = (arr) => shuffle(arr).map((t) => ({ id: t, text: t, label: t }));
  function sortTask(q, bins, groups, per) {
    let cards = [];
    bins.forEach((b) => { cards = cards.concat(shuffle(groups[b.id]).slice(0, per).map((c) => ({ emoji: c[0], label: c[1], bin: b.id }))); });
    return { kind: 'sort', prompt: q, bins, cards: shuffle(cards).map((c, i) => Object.assign(c, { id: i })) };
  }
  function seqTask(r) {
    return { kind: 'seq', prompt: r.q, steps: r.steps.map((s, i) => ({ id: i, emoji: s[0], label: s[1] })), cards: shuffle(r.steps.map((s, i) => ({ id: i, emoji: s[0], label: s[1] }))) };
  }
  // Соманы нақты тиын мен банкноттарға бөлу (мысалы, 300 → 200 + 100)
  const DENOMS = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  function toCash(v) { const out = []; DENOMS.forEach((d) => { while (v >= d) { out.push(d); v -= d; } }); return out; }
  const addMin = (h, m, d) => { const t = h * 60 + m + d; return [Math.floor(t / 60), t % 60]; };
  const hmOpts = (list) => shuffle(list).map(([a, b]) => ({ id: hm(a, b), num: hm(a, b), label: hm(a, b) }));

  // ---------- тапсырмалар ----------
  // kind: choice | sort | seq. voice: дауыс бөліктері (жол немесе сан); болмаса prompt оқылады.
  const MAKE = {
    math(level, n) {
      return Array.from({ length: n }, (_, i) => {
        if (level === 1) {
          const k = i % 3;
          if (k === 0) { const a = between(2, 12), b = between(2, 20 - a); return { kind: 'choice', prompt: 'Есепте', heroEq: `${a} + ${b} = ?`, voice: ['Есепте:', a, 'қосу', b], options: numOpts(a + b, [-1, 1, 2, -2, 10]), answer: String(a + b) }; }
          if (k === 1) { const a = between(8, 20), b = between(2, a - 1); return { kind: 'choice', prompt: 'Есепте', heroEq: `${a} − ${b} = ?`, voice: ['Есепте:', a, 'алу', b], options: numOpts(a - b, [-1, 1, 2, -2]), answer: String(a - b) }; }
          let a = between(10, 99), b; do { b = between(10, 99); } while (b === a || Math.abs(a - b) > 40);
          return { kind: 'choice', prompt: 'Қай сан үлкен?', options: shuffle([a, b]).map((v) => ({ id: String(v), num: v, label: String(v) })), answer: String(Math.max(a, b)) };
        }
        if (level === 2) {
          const k = i % 3;
          if (k === 0) { const a = between(2, 7) * 10, b = between(1, 9 - a / 10) * 10; return { kind: 'choice', prompt: 'Есепте', heroEq: `${a} + ${b} = ?`, voice: ['Есепте:', a, 'қосу', b], options: numOpts(a + b, [-10, 10, 1]), answer: String(a + b) }; }
          if (k === 1) { const a = between(21, 68), b = between(11, 30); return { kind: 'choice', prompt: 'Есепте', heroEq: `${a} + ${b} = ?`, voice: ['Есепте:', a, 'қосу', b], options: numOpts(a + b, [-10, 10, -1, 1]), answer: String(a + b) }; }
          const a = between(45, 99), b = between(12, a - 11); return { kind: 'choice', prompt: 'Есепте', heroEq: `${a} − ${b} = ?`, voice: ['Есепте:', a, 'алу', b], options: numOpts(a - b, [-10, 10, -1, 1]), answer: String(a - b) };
        }
        if (level === 3) {
          if (i % 2 === 0) { const w = pick(D.WORD_ADD); const a = between(12, 35), b = between(5, 15); const [txt, v] = w.t(a, b); return { kind: 'choice', prompt: 'Есепті шығар', hero: w.e, heroText: txt, voice: v, options: numOpts(a + b, [-1, 1, -10, 10]), answer: String(a + b) }; }
          const w = pick(D.WORD_SUB); const a = between(20, 40), b = between(5, a - 6); const [txt, v] = w.t(a, b);
          return { kind: 'choice', prompt: 'Есепті шығар', hero: w.e, heroText: txt, voice: v, options: numOpts(a - b, [-1, 1, 10, b]), answer: String(a - b) };
        }
        const k = i % 4;
        if (k === 0) { const a = pick([2, 3, 4, 5, 10]), b = between(2, 9); return { kind: 'choice', prompt: 'Есепте', heroEq: `${a} × ${b} = ?`, voice: ['Есепте:', a, 'көбейту', b], options: numOpts(a * b, [a, -a, 1, -1]), answer: String(a * b) }; }
        if (k === 1) { const b = pick([2, 3, 4, 5]), q = between(2, 9); return { kind: 'choice', prompt: 'Есепте', heroEq: `${b * q} : ${b} = ?`, voice: ['Есепте:', b * q, 'бөлу', b], options: numOpts(q, [1, -1, 2]), answer: String(q) }; }
        if (k === 2) { const w = pick(D.WORD_MUL); const a = pick([2, 3, 4, 5, 6]), b = between(2, 5); const [txt, v] = w.t(a, b); return { kind: 'choice', prompt: 'Есепті шығар', hero: w.e, heroText: txt, voice: v, options: numOpts(a * b, [a, -a, b]), answer: String(a * b) }; }
        const w = pick(D.WORD_DIV); const kk = pick([2, 3, 4, 5]), q = between(2, 6); const [txt, v] = w.t(kk * q, kk);
        return { kind: 'choice', prompt: 'Есепті шығар', hero: w.e, heroText: txt, voice: v, options: numOpts(q, [1, -1, 2]), answer: String(q) };
      });
    },
    time(level, n) {
      let lastH = -1;
      const hour = () => { let h; do { h = between(1, 11); } while (h === lastH); lastH = h; return h; };
      return Array.from({ length: n }, (_, i) => {
        if (level === 1) {
          const h = hour();
          const o = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((x) => x !== h)).slice(0, 2).concat([h]).sort((a, b) => a - b);
          return { kind: 'choice', prompt: 'Сағат нешеде?', heroClock: { h, m: 0 }, options: o.map((x) => ({ id: String(x), num: hm(x, 0), label: hm(x, 0) })), answer: String(h) };
        }
        if (level === 2) {
          const h = hour(), m = pick([30, 15, 45, 30]);
          if (i % 2 === 0) return { kind: 'choice', prompt: 'Сағат нешеде?', heroClock: { h, m }, options: hmOpts([[h, m], [h + 1, m], [h, m === 30 ? 15 : 30]]), answer: hm(h, m) };
          const opts = [[h, m], [h + 1, m], [h, m === 30 ? 0 : 30]];
          return { kind: 'choice', prompt: `Сағат ${hm(h, m)}. Осы уақытты көрсететін сағатты тап`, voice: ['Сағат', h, m, 'Осы уақытты көрсететін сағатты тап'],
            options: shuffle(opts).map(([a, b]) => ({ id: hm(a, b), clock: { h: a, m: b }, label: hm(a, b), hideLabel: true })), answer: hm(h, m) };
        }
        if (level === 3) {
          const k = i % 5;
          if (k === 0 || k === 1) {
            const d = between(0, 6), next = k === 0;
            const ans = D.DAYS[next ? (d + 1) % 7 : (d + 6) % 7];
            const others = shuffle(D.DAYS.filter((x) => x !== ans && x !== D.DAYS[d])).slice(0, 2);
            return { kind: 'choice', prompt: `Бүгін ${D.DAYS[d].toLowerCase()}. ${next ? 'Ертең қай күн?' : 'Кеше қай күн болды?'}`, hero: '📅',
              voice: ['Бүгін', D.DAYS[d], next ? 'Ертең қай күн?' : 'Кеше қай күн болды?'], options: textOpts([ans].concat(others)), answer: ans };
          }
          if (k === 2) {
            const mi = between(0, 11), s = D.SEASONS.find((x) => x.months.indexOf(mi) >= 0);
            return { kind: 'choice', prompt: `${D.MONTHS[mi]} — қай жыл мезгілі?`, voice: [D.MONTHS[mi], 'қай жыл мезгілі?'], options: D.SEASONS.map((x) => ({ id: x.id, emoji: x.emoji, label: x.name })), answer: s.id };
          }
          if (k === 3) {
            const mi = between(0, 10), ans = D.MONTHS[mi + 1];
            const others = shuffle(D.MONTHS.filter((x, j) => j !== mi + 1 && j !== mi)).slice(0, 2);
            return { kind: 'choice', prompt: `${D.MONTHS[mi]} айынан кейін қай ай келеді?`, hero: '🗓️', voice: [D.MONTHS[mi], 'айынан кейін қай ай келеді?'], options: textOpts([ans].concat(others)), answer: ans };
          }
          if (i % 2) { const f = pick(D.TIME_FACTS); return { kind: 'choice', prompt: f.q, hero: '⏳', options: textOpts(f.o), answer: f.a }; }
          const st = between(0, 3);
          return seqTask({ q: 'Апта күндерін ретімен қой', steps: D.DAYS.slice(st, st + 4).map((d) => ['📅', d]) });
        }
        const k = i % 3;
        if (k === 0) {
          const w = pick(D.DURATION), h = between(8, 15), m = pick([0, 15, 30]), d = pick([15, 30, 45]);
          const [eh, em] = addMin(h, m, d); const [txt, v] = w.t(h, m, d);
          return { kind: 'choice', prompt: 'Есепті шығар', hero: w.e, heroText: txt, voice: v, options: hmOpts([[eh, em], addMin(eh, em, 15), addMin(eh, em, -15)]), answer: hm(eh, em) };
        }
        if (k === 1) {
          const h = between(7, 9), m = pick([0, 5, 10]), w = pick([5, 10, 15, 20]);
          const [ah, am] = addMin(h, m, w);
          return { kind: 'choice', prompt: 'Есепті шығар', hero: '🚌', heroText: `Автобус сағат ${hm(ah, am)}-да келеді. Қазір сағат ${hm(h, m)}. Неше минут күтесің?`,
            voice: ['Автобус сағат', ah, am || null, 'келеді.', 'Қазір сағат', h, m || null, 'Неше минут күтесің?'], options: numOpts(w, [5, -5, 10], 1), answer: String(w) };
        }
        const d = between(0, 6), k2 = between(2, 4), ans = D.DAYS[(d + k2) % 7];
        const others = shuffle(D.DAYS.filter((x) => x !== ans && x !== D.DAYS[d])).slice(0, 2);
        return { kind: 'choice', prompt: `Бүгін ${D.DAYS[d].toLowerCase()}. ${k2} күннен кейін қай күн болады?`, hero: '📅',
          voice: ['Бүгін', D.DAYS[d], k2, 'күннен кейін қай күн болады?'], options: textOpts([ans].concat(others)), answer: ans };
      });
    },
    money(level, n) {
      return Array.from({ length: n }, (_, i) => {
        if (level === 1) {
          const vals = shuffle(i % 2 ? D.NOTES : D.COINS.slice(2)).slice(0, 3), v = vals[0];
          return { kind: 'choice', prompt: `${v} теңгені тап`, voice: [v, 'теңгені тап'], options: shuffle(vals).map((x) => ({ id: String(x), money: x, label: x + ' теңге', hideLabel: true })), answer: String(v) };
        }
        if (level === 2) {
          let vals;
          if (i % 3 === 2) vals = [pick([500, 1000]), pick([100, 200, 500])];
          else { const k = between(2, 3); do { vals = Array.from({ length: k }, () => pick([10, 20, 50, 100, 200])); } while (vals.reduce((a, b) => a + b, 0) > 500); }
          const s = vals.reduce((a, b) => a + b, 0);
          return { kind: 'choice', prompt: 'Барлығы неше теңге?', heroMoney: vals.sort((a, b) => b - a), options: numOpts(s, [10, -10, 50, -50, 100]), answer: String(s) };
        }
        if (level === 3) {
          if (i % 2 === 0) {
            const B = pick([100, 200, 300, 400]);
            const cheap = pick(D.GOODS.filter((g) => g.p <= B)), dear = shuffle(D.GOODS.filter((g) => g.p > B)).slice(0, 2);
            return { kind: 'choice', prompt: `Сенде ${B} теңге бар. Қайсысын сатып ала аласың?`, heroMoney: toCash(B), voice: ['Сенде', B, 'теңге бар.', 'Қайсысын сатып ала аласың?'],
              options: shuffle([cheap].concat(dear)).map((g) => ({ id: g.n, emoji: g.e, label: g.n, price: g.p })), answer: cheap.n };
          }
          const [a, b] = shuffle(D.GOODS).slice(0, 2), s = a.p + b.p;
          return { kind: 'choice', prompt: 'Барлығы неше теңге?', hero: a.e + ' ' + b.e, heroText: `${a.n} — ${a.p} теңге, ${b.n.toLowerCase()} — ${b.p} теңге.`,
            voice: [a.n, a.p, 'теңге,', b.n, b.p, 'теңге.', 'Барлығы неше теңге?'], options: numOpts(s, [10, -10, 100, -100]), answer: String(s) };
        }
        if (i % 2 === 0) {
          const g = pick(D.GOODS), pay = g.p < 450 ? pick([500, 1000]) : 1000, ch = pay - g.p;
          return { kind: 'choice', prompt: 'Қанша қайтарым аласың?', hero: g.e, heroMoney: [pay], heroText: `Сен ${pay} теңге бердің. ${g.n} ${g.p} теңге тұрады.`,
            voice: ['Сен', pay, 'теңге бердің.', g.n, g.p, 'теңге тұрады.', 'Қанша қайтарым аласың?'], options: numOpts(ch, [10, -10, 100, -100], 10), answer: String(ch) };
        }
        const g = pick(D.GOODS.filter((x) => x.p <= 300)), k = between(2, 3), s = g.p * k;
        return { kind: 'choice', prompt: 'Барлығы неше теңге?', hero: g.e, heroText: `Бір ${g.n.toLowerCase()} ${g.p} теңге. Сен ${k} ${g.n.toLowerCase()} аласың.`,
          voice: ['Бір', g.n, g.p, 'теңге.', 'Сен', k, g.n, 'аласың.', 'Барлығы неше теңге?'], options: numOpts(s, [g.p, -g.p, 10]), answer: String(s) };
      });
    },
    read(level, n) {
      if (level === 1) {
        return cycle(D.WORDS, n).map((w) => {
          const others = shuffle(D.WORDS.filter((x) => x[1] !== w[1])).slice(0, 2);
          return { kind: 'choice', prompt: 'Суретке сәйкес сөзді тап', hero: w[0], options: textOpts([w[1]].concat(others.map((x) => x[1]))), answer: w[1] };
        });
      }
      if (level === 2) {
        return cycle(D.WORDS.filter((w) => w[1].length >= 3), n).map((w) => {
          const up = w[1].toUpperCase(), idx = between(1, up.length - 1), L = up[idx];
          const others = shuffle(D.LETTERS.split('').filter((c) => up.indexOf(c) < 0)).slice(0, 2);
          return { kind: 'choice', prompt: 'Жетпейтін әріпті тап', hero: w[0], heroEq: up.slice(0, idx) + '_' + up.slice(idx + 1),
            options: shuffle([L].concat(others)).map((c) => ({ id: c, num: c, label: c })), answer: L };
        });
      }
      if (level === 3) {
        return cycle(D.FILL, n).map((f) => {
          const [p1, p2] = f.s.split('___').map((x) => x.trim());
          return { kind: 'choice', prompt: 'Сөйлемді аяқта', hero: f.e, heroText: f.s.replace('___', '…'), voice: ['Сөйлемді аяқта.', p1, p2], options: textOpts(f.o), answer: f.a };
        });
      }
      return cycle(D.READ, n).map((r) => ({ kind: 'choice', prompt: r.q, heroText: r.text, voice: [r.text, r.q], options: textOpts(r.o), answer: r.a }));
    },
    world(level, n) {
      if (level === 1) {
        const SC = { winter: ['☃️', 'Қар жауады. Балалар аққала жасайды.'], spring: ['🌷', 'Қар ериді. Алғашқы гүлдер шығады.'], summer: ['🏖️', 'Күн ыстық. Балалар суға шомылады.'], autumn: ['🍂', 'Жапырақтар сарғайып, жерге түседі.'] };
        const order = cycle(D.SEASONS, n);
        return Array.from({ length: n }, (_, i) => {
          if (i % 2 === 0) {
            const s = order[i], sc = SC[s.id];
            return { kind: 'choice', prompt: 'Бұл қай жыл мезгілі?', hero: sc[0], heroText: sc[1], voice: [sc[1], 'Бұл қай жыл мезгілі?'], options: D.SEASONS.map((x) => ({ id: x.id, text: x.name, label: x.name })), answer: s.id };
          }
          const mi = between(0, 11), s = D.SEASONS.find((x) => x.months.indexOf(mi) >= 0);
          return { kind: 'choice', prompt: `${D.MONTHS[mi]} — қай жыл мезгілі?`, voice: [D.MONTHS[mi], 'қай жыл мезгілі?'], options: D.SEASONS.map((x) => ({ id: x.id, emoji: x.emoji, label: x.name })), answer: s.id };
        });
      }
      if (level === 2) return cycle(D.NATURE_SORTS, n).map((s) => sortTask(s.q, s.bins, { a: s.a, b: s.b }, 3));
      if (level === 3) return cycle(D.CYCLES, n).map(seqTask);
      return cycle(D.KZ, n).map((q) => ({ kind: 'choice', prompt: q.q, hero: q.e, options: textOpts(q.o), answer: q.a }));
    },
    life(level, n) {
      if (level === 1) {
        const lights = cycle(D.LIGHTS, n), signs = cycle(D.SIGNS, n);
        return Array.from({ length: n }, (_, i) => {
          if (i % 2 === 0) { const l = lights[i]; return { kind: 'choice', prompt: l.q, options: shuffle(['red', 'yellow', 'green']).map((c) => ({ id: c, light: c, label: { red: 'Қызыл', yellow: 'Сары', green: 'Жасыл' }[c], hideLabel: true })), answer: l.a }; }
          const s = signs[i];
          return { kind: 'choice', prompt: s.q, options: shuffle([s.a].concat(s.o)).map((x) => ({ id: x[1], emoji: x[0], label: x[1] })), answer: s.a[1] };
        });
      }
      if (level === 2) {
        return cycle(D.PHONES, n).map((p) => {
          const others = shuffle(D.PHONES.filter((x) => x.a !== p.a)).slice(0, 2).map((x) => x.a);
          return { kind: 'choice', prompt: p.q, hero: p.e, options: shuffle([p.a].concat(others)).map((x) => ({ id: x, num: x, label: x })), answer: p.a };
        });
      }
      if (level === 3) return Array.from({ length: n }, () => sortTask(D.SAFE_SORT.q, D.SAFE_SORT.bins, { a: D.SAFE_SORT.a, b: D.SAFE_SORT.b }, 3));
      const sit = shuffle(D.SITUATIONS), seqs = shuffle(D.ROAD_SEQ);
      return Array.from({ length: n }, (_, i) => {
        if (i % 3 === 2) return seqTask(seqs[(i / 3 | 0) % seqs.length]);
        const s = sit[i % sit.length];
        return { kind: 'choice', prompt: s.q, hero: s.e, options: textOpts(s.o), answer: s.a };
      });
    }
  };

  // ---------- дыбыс белгілері ----------
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
    good: () => tone([660, 880, 1320], 0.16, 'sine', 0.1),
    soft: () => tone([330, 294], 0.18, 'triangle', 0.06),
    tap: () => tone([520], 0.06, 'sine', 0.05),
    pop: () => tone([900 + rnd(400)], 0.08, 'sine', 0.1),
    beat: () => tone([440], 0.09, 'triangle', 0.08),
    flip: () => tone([700], 0.05, 'square', 0.03),
    win: () => tone([523, 659, 784, 1047, 1319], 0.18, 'sine', 0.1)
  };

  // ---------- қазақша дауыс (алдын ала жазылған нейрондық дауыс, ISSAI KazakhTTS) ----------
  // Әр сөйлем assets/voice/ ішінде mp3 ретінде тұр; кілт — «стиль|мәтін». Сандар «num» стилінде бөлек жазылған.
  const VOICE = { map: null, token: 0, audio: null, missing: new Set(), rate: 1 }; // rate: педагог баптайтын жылдамдық
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const voiceKey = (style, text) => style + '|' + norm(text);
  function voiceLoad() {
    if (VOICE.loading) return VOICE.loading;
    VOICE.loading = fetch('assets/voice/manifest.json').then((r) => r.ok ? r.json() : {}).then((m) => { VOICE.map = m || {}; }).catch(() => { VOICE.map = {}; });
    return VOICE.loading;
  }
  function partsToClips(parts, style) {
    const out = [];
    (Array.isArray(parts) ? parts : [parts]).forEach((p) => {
      if (p === null || p === undefined || p === '') return;
      const isNum = typeof p === 'number';
      const text = isNum ? kkNum(p) : norm(p);
      if (!text || /^[.,!?:;]+$/.test(text)) return;
      out.push({ k: voiceKey(isNum ? 'num' : style, text), text, style: isNum ? 'num' : style });
    });
    return out;
  }
  function stop() {
    VOICE.token++;
    if (VOICE.audio) { try { VOICE.audio.pause(); } catch (e) {} }
  }
  // parts: жол, сан немесе олардың тізімі; style: say (нұсқау) | cheer (қуаныш) | calm (жұмсақ қолдау)
  function say(parts, style) {
    stop();
    const my = VOICE.token;
    const run = () => {
      if (my !== VOICE.token) return;
      const files = [];
      partsToClips(parts, style || 'say').forEach((c) => { const f = VOICE.map[c.k]; if (f) files.push(f); else VOICE.missing.add(c.k); });
      let i = 0;
      const a = VOICE.audio || (VOICE.audio = new Audio());
      const next = () => {
        if (my !== VOICE.token || i >= files.length) return;
        a.src = 'assets/voice/' + files[i++];
        a.preservesPitch = true; a.playbackRate = VOICE.rate || 1;
        a.onended = () => setTimeout(next, 260); // бөліктер арасында асықпай, анық үзіліс
        a.onerror = () => setTimeout(next, 10);
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      };
      next();
    };
    if (VOICE.map) run(); else voiceLoad().then(run);
  }
  voiceLoad();

  // Тұрақты сөйлемдер (дауыс файлдарын жасау скрипті де осыларды жинайды)
  const LINES = {
    hello: ['Сәлем! Ойын таңда.', 'cheer'],
    breakAsk: ['Біраз ойнадық! Сергіту сәтін жасайық па?', 'cheer'],
    breaks: ['Сергіту сәті! Біреуін таңда.', 'cheer'],
    breakDone: ['Жарайсың! Енді ойынға оралайық.', 'cheer'],
    end3: ['Керемет! Сен үш жұлдыз алдың!', 'cheer'],
    end: ['Жарайсың! Сен ойынды аяқтадың!', 'cheer'],
    endBreak: ['Енді аздап сергиік!', 'cheer'],
    levelUp: ['Жаңа деңгей ашылды!', 'cheer'],
    seqOk: ['Дұрыс! Ал енді келесісі қайсы?', 'cheer'],
    sortOk: ['Дұрыс! Келесісін сал.', 'cheer'],
    moveIntro: ['Орныңнан тұр! Ақботамен бірге сергиік.', 'cheer'],
    breathIntro: ['Ыңғайлы отыр. Шармен бірге баяу дем аламыз.', 'calm'],
    breathIn: ['Мұрныңмен дем ал.', 'calm'],
    breathHold: ['Ұста.', 'calm'],
    breathOut: ['Ақырын үрле.', 'calm'],
    bubblesIntro: ['Көпіршіктерді басып жар! Он бес көпіршік жарсаң болды.', 'cheer'],
    eyesIntro: ['Басыңды қозғалтпа. Көбелекті тек көзіңмен бақыла.', 'calm'],
    eyes1: ['Солға, оңға.', 'calm'], eyes2: ['Жоғары, төмен.', 'calm'], eyes3: ['Шеңбер бойымен.', 'calm'], eyes4: ['Сегіз сызамыз.', 'calm'],
    memoryIntro: ['Карталарды ашып, бірдей суреттерді тап.', 'say']
  };

  // ---------- сақтау ----------
  const KEY = 'oina-uiren.v3';
  const DEFAULTS = { voice: true, sound: true, labels: true, big: false, calm: false, contrast: false, perRound: 5, hintAfter: 1, auto: true, breakEvery: 2, voiceRate: 1,
    levels: { math: 1, time: 1, money: 1, read: 1, world: 1, life: 1 } };
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

  window.ENGINE = { MAKE, SFX, say, stopVoice: stop, VOICE, voiceKey, partsToClips, kkNum, LINES, store, shuffle, pick, uid, rnd, DEFAULTS, clockSvg, moneySvg, lightSvg };
})();
