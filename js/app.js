/* «Ойна да үйрен!» — экрандар мен ойын барысы. */
(function () {
  const D = window.DATA, E = window.ENGINE;
  const root = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LEVEL_NAMES = ['', '1-деңгей', '2-деңгей', '3-деңгей', '4-деңгей'];
  const LEVEL_DESC = ['', 'Бастапқы: үлкендердің көмегімен орындайды', 'Орта: ішінара өз бетімен орындайды', 'Жоғары: өз бетімен орындайды', 'Күрделі: мәтінді есептер мен өмірлік жағдаяттарды өз бетімен шешеді'];
  const MAXL = 4;

  let db = E.store.load();
  const S = { screen: 'home', childId: null, game: null, run: null, gate: null, tchild: null, busy: false, mood: 'happy' };

  const child = () => db.children.find((c) => c.id === S.childId) || null;
  const set = () => child() ? child().settings : E.DEFAULTS;
  const save = () => E.store.save(db);
  const game = (k) => D.GAMES.find((g) => g.key === k);

  function applyBodyClasses() {
    const s = set();
    document.body.classList.toggle('big', !!s.big);
    document.body.classList.toggle('calm', !!s.calm);
    document.body.classList.toggle('contrast', !!s.contrast);
    document.body.classList.toggle('nolabels', !s.labels);
    E.VOICE.rate = s.voiceRate || 1;
  }
  const speak = (parts, style) => { if (set().voice) E.say(parts, style); };
  const line = (k) => speak(E.LINES[k][0], E.LINES[k][1]);
  const sfx = (k) => { if (set().sound) E.SFX[k](); };

  // ---------- Ақбота (кейіпкер) ----------
  function mascot(mood, size) {
    const s = size || 120;
    const mouth = {
      happy: '<path d="M44 78 Q60 92 76 78" fill="none" stroke="#5B3A1E" stroke-width="4" stroke-linecap="round"/>',
      cheer: '<path d="M42 75 Q60 100 78 75 Z" fill="#7A2E2E"/><path d="M50 84 Q60 92 70 84" fill="#FF8FA3"/>',
      think: '<ellipse cx="62" cy="82" rx="6" ry="5" fill="#5B3A1E"/>',
      calm: '<path d="M48 80 Q60 86 72 80" fill="none" stroke="#5B3A1E" stroke-width="4" stroke-linecap="round"/>'
    }[mood] || '';
    const eyes = mood === 'calm'
      ? '<path d="M38 56 Q45 50 52 56" fill="none" stroke="#2B1A0E" stroke-width="4" stroke-linecap="round"/><path d="M68 56 Q75 50 82 56" fill="none" stroke="#2B1A0E" stroke-width="4" stroke-linecap="round"/>'
      : '<circle cx="45" cy="56" r="8" fill="#2B1A0E"/><circle cx="75" cy="56" r="8" fill="#2B1A0E"/><circle cx="48" cy="53" r="3" fill="#fff"/><circle cx="78" cy="53" r="3" fill="#fff"/>';
    const brows = mood === 'think' ? '<path d="M36 42 L52 46" stroke="#8A5A2B" stroke-width="3.5" stroke-linecap="round"/><path d="M68 44 L84 40" stroke="#8A5A2B" stroke-width="3.5" stroke-linecap="round"/>' : '';
    return `<svg class="mascot m-${mood}" width="${s}" height="${s}" viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="22" cy="40" rx="10" ry="15" fill="#E9C496" transform="rotate(-25 22 40)"/><ellipse cx="98" cy="40" rx="10" ry="15" fill="#E9C496" transform="rotate(25 98 40)"/>
      <ellipse cx="22" cy="42" rx="5" ry="9" fill="#F7B7A3" transform="rotate(-25 22 42)"/><ellipse cx="98" cy="42" rx="5" ry="9" fill="#F7B7A3" transform="rotate(25 98 42)"/>
      <ellipse cx="60" cy="64" rx="42" ry="44" fill="#F3D9B1"/>
      <path d="M46 24 Q52 8 60 20 Q66 6 72 22 Q80 12 78 28 Z" fill="#C98F55"/>
      <ellipse cx="60" cy="84" rx="25" ry="18" fill="#FBEBD3"/>
      ${eyes}${brows}
      <circle cx="30" cy="74" r="7" fill="#FFB3B3" opacity=".7"/><circle cx="90" cy="74" r="7" fill="#FFB3B3" opacity=".7"/>
      <ellipse cx="52" cy="74" rx="2.5" ry="2" fill="#8A5A2B"/><ellipse cx="68" cy="74" rx="2.5" ry="2" fill="#8A5A2B"/>
      ${mouth}
      <path d="M30 104 Q60 118 90 104 L86 112 Q60 124 34 112 Z" fill="#2F80ED"/><path d="M48 110 l4 -4 4 4 4 -4 4 4 4 -4 4 4" fill="none" stroke="#FFD34E" stroke-width="2.5"/>
    </svg>`;
  }
  const bubble = (html, mood, size) => `<div class="buddy"><div class="buddy-m">${mascot(mood || 'happy', size)}</div><div class="say">${html}</div></div>`;

  // ---------- навигация ----------
  function go(screen, extra) {
    stopBreak();
    Object.assign(S, { screen }, extra || {});
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    const h = '#/' + screen;
    if (location.hash !== h) { try { history.pushState(null, '', h); } catch (e) {} }
    render(); window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', () => {
    stopBreak();
    const s = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'home';
    S.screen = ['game', 'end', 'brk'].indexOf(s) >= 0 ? 'menu' : s;
    if (['menu', 'settings', 'breaks'].indexOf(S.screen) >= 0 && !child()) S.screen = 'players';
    if (S.screen === 'teacher' && !S.teacherOk) S.screen = 'home';
    render();
  });

  // ---------- ойын барысы ----------
  function startGame(key) {
    const c = child(); const lvl = Math.min(MAXL, c.settings.levels[key] || 1);
    const tasks = E.MAKE[key](lvl, c.settings.perRound);
    S.game = key;
    S.run = { key, level: lvl, tasks, i: 0, t0: Date.now(), correct: 0, errors: 0, hints: 0, taskErr: 0, done: false,
      sel: null, matched: {}, seq: [], found: [], si: 0, placed: {}, wrong: {}, hint: false, feedback: null, typed: '' };
    S.mood = 'happy';
    go('game');
    setTimeout(() => speakTask(), 350);
  }
  function task() { return S.run && S.run.tasks[S.run.i]; }
  function speakTask() {
    const t = task(); if (!t) return;
    const v = t.voice || [t.prompt];
    speak(t.kind === 'sort' ? v.concat([t.cards[S.run.si].label]) : v, 'say');
  }
  const praise = () => E.pick(D.PRAISE);

  function wrong(id) {
    const r = S.run;
    r.errors++; r.taskErr++; r.wrong[id] = true;
    sfx('soft'); S.mood = 'think';
    r.feedback = { ok: false, text: E.pick(D.TRY) };
    if (r.taskErr >= set().hintAfter && !r.hint) { r.hint = true; r.hints++; }
    render(); shake(id); speak(r.feedback.text, 'calm');
  }
  function shake(id) {
    const el = root.querySelector('[data-id="' + id + '"]');
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  }
  function partOk(text) { const r = S.run; r.hint = false; if (task().kind !== 'multi') r.wrong = {}; S.mood = 'happy'; r.feedback = { ok: true, text: text || praise() }; sfx('good'); render(); }
  function taskDone() {
    const r = S.run;
    if (r.taskErr === 0) r.correct++;
    r.feedback = { ok: true, text: praise() };
    r.done = true; S.busy = true; S.mood = 'cheer';
    sfx('good'); speak(r.feedback.text, 'cheer');
    render(); burst();
    setTimeout(() => {
      S.busy = false;
      if (r !== S.run || S.screen !== 'game') return;
      if (r.i < r.tasks.length - 1) {
        Object.assign(r, { i: r.i + 1, taskErr: 0, done: false, sel: null, matched: {}, seq: [], found: [], si: 0, placed: {}, wrong: {}, hint: false, feedback: null, typed: '' });
        S.mood = 'happy'; render(); speakTask();
      } else finish();
    }, set().calm ? 1700 : 1300);
  }

  function choose(id) {
    const r = S.run, t = task();
    if (!r || r.done || S.busy || r.wrong[id]) return;
    if (t.kind === 'choice') { if (id === t.answer) taskDone(); else wrong(id); }
    else if (t.kind === 'multi') {
      if (r.found.indexOf(id) >= 0) return;
      if (t.answers.indexOf(id) >= 0) {
        r.found.push(id);
        if (r.found.length === t.answers.length) taskDone();
        else partOk('Дұрыс! Тағы ' + (t.answers.length - r.found.length) + ' зат қалды');
      } else wrong(id);
    }
  }
  function matchClick(side, idx) {
    const r = S.run, t = task(); if (r.done || S.busy) return;
    if (side === 'L') { if (r.matched['L' + idx]) return; r.sel = idx; sfx('tap'); speak(t.left[idx].label, 'say'); r.feedback = null; render(); return; }
    if (r.matched['R' + idx]) return;
    if (r.sel == null) { r.feedback = { ok: false, text: E.LINES.matchFirst ? E.LINES.matchFirst[0] : 'Алдымен сол жақтан таңда' }; render(); return; }
    if (t.left[r.sel].id === t.right[idx].id) {
      const n = Object.keys(r.matched).length / 2 + 1;
      r.matched['L' + r.sel] = n; r.matched['R' + idx] = n; r.sel = null;
      if (Object.keys(r.matched).length === t.left.length * 2) taskDone(); else partOk();
    } else wrong('R' + idx);
  }
  function seqClick(id) {
    const r = S.run, t = task(); if (r.done || S.busy || r.seq.indexOf(id) >= 0) return;
    if (id === r.seq.length) {
      r.seq.push(id);
      if (r.seq.length === t.steps.length) taskDone(); else { partOk(E.LINES.seqOk[0]); speak(t.steps[id].label, 'say'); }
    } else wrong('C' + id);
  }
  function sortClick(bin) {
    const r = S.run, t = task(); if (r.done || S.busy) return;
    const card = t.cards[r.si];
    if (card.bin === bin) {
      r.placed[card.id] = bin; r.si++;
      if (r.si === t.cards.length) taskDone(); else { partOk(E.LINES.sortOk[0]); speak(t.cards[r.si].label, 'say'); }
    } else wrong('B' + bin);
  }

  function keyPress(k) {
    const r = S.run, t = task(); if (!r || r.done || S.busy || t.kind !== 'input') return;
    if (k === 'back') r.typed = r.typed.slice(0, -1);
    else if (k === 'ok') {
      if (!r.typed) return;
      if (r.typed === t.answer) return taskDone();
      r.typed = ''; return wrong('kp');
    } else if (r.typed.length < 5) { r.typed += k; sfx('tap'); }
    r.feedback = r.feedback && r.feedback.ok === false ? r.feedback : null;
    render();
  }

  function finish() {
    const r = S.run, c = child();
    const secs = Math.round((Date.now() - r.t0) / 1000);
    const ratio = r.correct / r.tasks.length;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    let change = 0;
    if (c.settings.auto) {
      if (ratio >= 0.8 && r.hints === 0 && r.level < MAXL) change = 1;
      else if (ratio < 0.4 && r.level > 1) change = -1;
      if (change) c.settings.levels[r.key] = r.level + change;
    }
    const sticker = E.pick(D.STICKERS);
    c.stickers.push(sticker);
    c.sinceBreak = (c.sinceBreak || 0) + 1;
    db.results.push({ id: E.uid(), child: c.id, game: r.key, level: r.level, total: r.tasks.length, correct: r.correct, errors: r.errors, hints: r.hints, secs, stars, change, at: Date.now() });
    save();
    const suggestBreak = c.settings.breakEvery > 0 && c.sinceBreak >= c.settings.breakEvery;
    S.end = { stars, correct: r.correct, total: r.tasks.length, change, sticker, level: r.level, newLevel: c.settings.levels[r.key], suggestBreak };
    sfx('win');
    go('end');
    speak([E.LINES[stars === 3 ? 'end3' : 'end'][0]].concat(change > 0 ? [E.LINES.levelUp[0]] : []).concat(suggestBreak ? [E.LINES.endBreak[0]] : []), 'cheer');
    burst(true);
  }

  function burst(big) {
    if (set().calm) return;
    const box = document.createElement('div'); box.className = 'burst'; box.setAttribute('aria-hidden', 'true');
    const n = big ? 28 : 12;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.textContent = E.pick(['⭐', '✨', '🌟', '💛', '🎉']);
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * (big ? 320 : 160);
      s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d + 'px');
      s.style.animationDelay = Math.random() * 0.15 + 's';
      box.appendChild(s);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 1600);
  }

  // ---------- сергіту ----------
  let brkStop = null;
  function stopBreak() { if (brkStop) { try { brkStop(); } catch (e) {} brkStop = null; } }
  function startBreak(key) {
    S.brk = key; go('brk');
    const host = root.querySelector('#brkhost');
    brkStop = window.BREAKS.start(key, host, {
      speak, sfx, calm: !!set().calm, mascot,
      done: () => {
        const c = child(); if (c) { c.sinceBreak = 0; db.breaks.push({ child: c.id, key, at: Date.now() }); save(); }
        brkStop = null; S.brkDone = key; render(); sfx('win'); line('breakDone'); burst(true);
      }
    });
  }

  // ---------- нәтижелер ----------
  function statsFor(cid, key) {
    const rs = db.results.filter((r) => r.child === cid && (!key || r.game === key));
    const tot = rs.reduce((s, r) => s + r.total, 0), cor = rs.reduce((s, r) => s + r.correct, 0);
    return { n: rs.length, acc: tot ? Math.round(cor * 100 / tot) : null, hints: rs.reduce((s, r) => s + r.hints, 0), errors: rs.reduce((s, r) => s + r.errors, 0),
      secs: rs.reduce((s, r) => s + r.secs, 0), last: rs.length ? rs[rs.length - 1].at : null, rs };
  }
  const starsOf = (cid, key) => db.results.filter((r) => r.child === cid && (!key || r.game === key)).reduce((s, r) => s + r.stars, 0);
  const bestOf = (cid, key) => db.results.filter((r) => r.child === cid && r.game === key).reduce((m, r) => Math.max(m, r.stars), 0);
  const todayOf = (cid) => { const d = new Date().toDateString(); return db.results.filter((r) => r.child === cid && new Date(r.at).toDateString() === d).length; };
  function overallLevel(c) {
    const ls = D.GAMES.map((g) => c.settings.levels[g.key] || 1);
    return Math.round(ls.reduce((a, b) => a + b, 0) / ls.length);
  }
  const fmtDate = (t) => { if (!t) return '—'; const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const fmtSecs = (s) => Math.floor(s / 60) + ' мин ' + String(s % 60).padStart(2, '0') + ' с';

  function exportCsv() {
    const head = ['Оқушы', 'Ойын', 'Деңгей', 'Тапсырма саны', 'Бірден дұрыс', 'Қате', 'Кеңес', 'Уақыт (с)', 'Жұлдыз', 'Деңгей өзгерісі', 'Күні'];
    const rows = db.results.map((r) => { const c = db.children.find((x) => x.id === r.child); const g = game(r.game); return [c ? c.name : '?', g ? g.title : r.game, r.level, r.total, r.correct, r.errors, r.hints, r.secs, r.stars, r.change > 0 ? 'жоғарылады' : r.change < 0 ? 'төмендеді' : '', fmtDate(r.at)]; });
    const csv = '﻿' + [head].concat(rows).map((r) => r.map((x) => { let v = String(x); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'oina-uiren-natizheler.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- экрандар ----------
  const btn = (act, html, cls, extra) => `<button class="${cls || 'btn'}" data-act="${act}" ${extra || ''}>${html}</button>`;

  function topbar(back, title) {
    const c = child();
    return `<header class="appbar">
      <div class="ab-left">
        ${back ? btn(back, '<span aria-hidden="true">←</span>', 'iconbtn', 'aria-label="Артқа"') : ''}
        <button class="brand" data-act="toHome" aria-label="Басты бет">${mascot('happy', 40)}<b>Ойна да үйрен!</b></button>
      </div>
      <h1 class="ab-title">${esc(title || '')}</h1>
      <div class="ab-right">${c ? `<div class="me"><span class="av">${esc(c.avatar)}</span><span class="nm">${esc(c.name)}</span><span class="st" title="Жинаған жұлдыздар">⭐ ${starsOf(c.id)}</span></div>` : ''}</div>
    </header>`;
  }

  function vHome() {
    const feats = [['🔊', 'Таза қазақша дауыс', 'Баяу, анық, жылы дауыс'], ['🎯', '8 ойын × 4 деңгей', 'Балаға қарай бейімделеді'], ['🤝', 'Қателесуден қорықпа', 'Ақбота көмектесіп, жігерлендіреді'], ['📊', 'Ата-ана мен мұғалімге', 'Баланың жетістігі мен өсуі']];
    return `<main class="home">
      <section class="hero">
        <div class="hero-t">
          <span class="eyebrow">5–6 сынып · ойнап үйренеміз</span>
          <h1>Ойна да үйрен!</h1>
          <p>Сәлем! Мен — <b>Ақбота</b>. Бірге есеп шығарып, уақыт пен ақшаны үйреніп, оқып, өмірге керек дағдыларды меңгерейік!</p>
          <div class="row">${btn('toPlayers', '<span class="play-ico" aria-hidden="true"></span> Ойнауды бастау', 'btn big gold')}${btn('toGate', '👨‍👩‍👧 Ата-ана мен мұғалім', 'btn big glass')}</div>
        </div>
        <div class="hero-m">${mascot('cheer', 230)}</div>
      </section>
      <section class="feats">${feats.map((f) => `<div class="feat"><span class="fi">${f[0]}</span><b>${f[1]}</b><small>${f[2]}</small></div>`).join('')}</section>
      <section class="inside">
        <h2>Ойындар</h2>
        <div class="glist">${D.GAMES.map((g) => `
          <div class="gitem" style="--bg:${g.bg};--ac:${g.accent}"><span class="gico">${g.icon}</span><div><h3>${esc(g.title)}</h3><p>${esc(g.goal)}</p></div></div>`).join('')}
          <div class="gitem" style="--bg:#FFEDE6;--ac:#FF7A59"><span class="gico">🤸</span><div><h3>Сергіту сәті</h3><p>Қимыл, тыныс алу, көпіршіктер, көз жаттығуы және «Жұбын тап».</p></div></div>
        </div>
      </section>
    </main>`;
  }

  function vPlayers() {
    const list = db.children.map((c) => `<button class="pcard" data-act="pickChild" data-v="${c.id}"><span class="pav">${esc(c.avatar)}</span><span class="pname">${esc(c.name)}</span><span class="pst">${esc(c.stickers.slice(-5).join(''))}</span></button>`).join('');
    const av = S.newAv || D.AVATARS[0];
    return `${topbar('toHome', 'Кім ойнайды?')}
    <main class="wrap">
      ${bubble(db.children.length ? 'Өз суретіңді бас!' : 'Сәлем! Атыңды жаз да, өзіңе ұнайтын жануарды таңда', 'happy', 96)}
      ${db.children.length ? `<div class="pgrid">${list}</div>` : ''}
      <section class="card addp">
        <h2>Жаңа ойыншы</h2>
        <label class="fld">Аты <input id="pname" maxlength="20" autocomplete="off" placeholder="Мысалы: Айым"></label>
        <div class="avs" role="radiogroup" aria-label="Бейнеше">${D.AVATARS.map((a) => `<button class="avb ${a === av ? 'on' : ''}" role="radio" aria-checked="${a === av}" data-act="pickAv" data-v="${a}">${a}</button>`).join('')}</div>
        ${S.err ? `<div class="err" role="alert">${esc(S.err)}</div>` : ''}
        ${btn('addChild', '➕ Қосу', 'btn primary')}
      </section>
    </main>`;
  }

  function vMenu() {
    const c = child();
    const brk = c.settings.breakEvery > 0 && c.sinceBreak >= c.settings.breakEvery;
    const today = todayOf(c.id), goal = 3, pct = Math.min(100, Math.round(today * 100 / goal));
    return `${topbar('toPlayers', 'Ойын таңда')}
    <main class="wrap">
      <section class="welcome">
        <div class="wl-m">${mascot(brk ? 'cheer' : 'happy', 110)}</div>
        <div class="wl-t">
          <h2>Сәлем, ${esc(c.name)}!</h2>
          <p>${brk ? 'Біраз ойнадық! Сергіту сәтін жасайық па? 🤸' : 'Бүгін қай ойынды ойнаймыз?'}</p>
        </div>
        <div class="goal" role="img" aria-label="Бүгінгі мақсат: ${today} / ${goal} ойын">
          <span class="ring" style="--p:${pct}"><b>${Math.min(today, goal)}/${goal}</b></span>
          <span><b>Бүгінгі мақсат</b><small>${today >= goal ? 'Орындалды! 🎉' : 'Тағы ' + (goal - today) + ' ойын ойна'}</small></span>
        </div>
      </section>
      <div class="tiles">${D.GAMES.map((g) => {
        const l = c.settings.levels[g.key], best = bestOf(c.id, g.key);
        return `<button class="tile" style="--bg:${g.bg};--ac:${g.accent}" data-act="play" data-v="${g.key}">
          <span class="tile-top"><span class="tile-ico">${g.icon}</span><span class="tile-lv">${LEVEL_NAMES[l]}</span></span>
          <span class="tile-title">${esc(g.title)}</span>
          <span class="tile-sub">${esc(g.levels[l - 1])}</span>
          <span class="tile-foot"><span class="tile-bar"><i style="width:${l * 25}%"></i></span><span class="tile-stars" aria-label="Ең жақсы нәтиже: ${best} жұлдыз">${'★'.repeat(best)}<em>${'★'.repeat(3 - best)}</em></span></span>
        </button>`;
      }).join('')}
        <button class="tile brk ${brk ? 'pulse' : ''}" style="--bg:#FFEDE6;--ac:#FF7A59" data-act="toBreaks">
          <span class="tile-top"><span class="tile-ico">🤸</span><span class="tile-lv">5 жаттығу</span></span>
          <span class="tile-title">Сергіту сәті</span><span class="tile-sub">Денені сергітіп, демаламыз</span>
        </button>
      </div>
      ${c.stickers.length ? `<section class="card"><h2>Менің жапсырмаларым <small>(${c.stickers.length})</small></h2><div class="stk">${c.stickers.slice(-40).map((s) => `<span>${esc(s)}</span>`).join('')}</div></section>` : ''}
      <div class="row center">${btn('toSettings', '⚙️ Баптаулар', 'btn ghost')}</div>
    </main>`;
  }

  function vis(o) {
    if (o.clock) return `<span class="pic">${E.clockSvg(o.clock.h, o.clock.m, 130)}</span>`;
    if (o.money) return `<span class="pic">${E.moneySvg(o.money, 96)}</span>`;
    if (o.light) return `<span class="pic">${E.lightSvg(o.light, 130)}</span>`;
    if (o.text) return '';
    if (o.num != null) return `<span class="num${String(o.num).length >= 4 ? ' long' : String(o.num).length === 3 ? ' mid' : ''}">${esc(o.num)}</span>`;
    return `<span class="emo">${o.emoji}</span>`;
  }
  function groupHtml(g, cls) { return `<span class="grp ${cls || ''} g${g.n}">${Array.from({ length: g.n }, () => `<span class="emo">${g.emoji}</span>`).join('')}</span>`; }

  function heroHtml(t) {
    const parts = [];
    if (t.hero) parts.push(`<span class="emo">${t.hero}</span>`);
    if (t.heroClock) parts.push(`<span class="pic">${E.clockSvg(t.heroClock.h, t.heroClock.m, 220)}</span>`);
    if (t.heroMoney) parts.push(`<span class="coins">${t.heroMoney.map((v) => E.moneySvg(v, 100)).join('')}</span>`);
    if (t.heroEq) parts.push(`<span class="eq">${esc(t.heroEq)}</span>`);
    if (t.heroText) parts.push(`<p class="htext">${esc(t.heroText)}</p>`);
    return parts.length ? `<div class="heroimg ${t.heroText ? 'txt' : 'wide'}">${parts.join('')}</div>` : '';
  }

  function optHtml(o, id, act, idx) {
    const r = S.run, t = task();
    let st = '';
    if (r.wrong[id]) st = ' isWrong';
    if (t.kind === 'multi' && r.found.indexOf(o.id) >= 0) st = ' isRight';
    if (r.done && t.kind === 'choice' && o.id === t.answer) st = ' isRight';
    if (r.hint && !r.done && ((t.kind === 'choice' && o.id === t.answer) || (t.kind === 'multi' && t.answers.indexOf(o.id) >= 0 && r.found.indexOf(o.id) < 0))) st += ' isHint';
    return `<button class="opt${st}" data-act="${act || 'choose'}" data-v="${esc(o.id)}" data-id="${esc(id)}" aria-label="${esc(o.label)}">${idx != null ? `<span class="key" aria-hidden="true">${idx + 1}</span>` : ''}${vis(o)}${o.text ? `<span class="lbl always">${esc(o.text)}</span>` : (o.hideLabel || o.num != null) ? '' : `<span class="lbl">${esc(o.label)}</span>`}${o.price ? `<span class="price">${o.price} ₸</span>` : ''}</button>`;
  }

  function vGame() {
    const r = S.run, t = task(), g = game(r.key);
    const doneN = r.i + (r.done ? 1 : 0), pct = Math.round(doneN * 100 / r.tasks.length);
    let body = '';
    if (t.kind === 'choice' || t.kind === 'multi') {
      body = `${heroHtml(t)}<div class="opts n${t.options.length} ${t.options[0].text ? 'txtopts' : ''}">${t.options.map((o, i) => optHtml(o, o.id, null, i)).join('')}</div>`;
    } else if (t.kind === 'match') {
      body = `<div class="match">
        <div class="mcol">${t.left.map((o, i) => { const m = r.matched['L' + i]; return `<button class="opt sm ${m ? 'isRight m' + m : ''} ${r.sel === i ? 'isSel' : ''}" data-act="mL" data-v="${i}" data-id="L${i}" aria-pressed="${r.sel === i}">${m ? `<b class="pair">${m}</b>` : ''}<span class="emo">${o.emoji}</span><span class="lbl">${esc(o.label)}</span></button>`; }).join('')}</div>
        <div class="marrow" aria-hidden="true">➜</div>
        <div class="mcol">${t.right.map((o, i) => { const m = r.matched['R' + i]; const hint = r.hint && r.sel != null && t.left[r.sel].id === o.id && !m; return `<button class="opt sm ${m ? 'isRight m' + m : ''} ${r.wrong['R' + i] && !m ? 'isWrongSoft' : ''} ${hint ? 'isHint' : ''}" data-act="mR" data-v="${i}" data-id="R${i}">${m ? `<b class="pair">${m}</b>` : ''}<span class="emo">${o.emoji}</span><span class="lbl">${esc(o.label)}</span></button>`; }).join('')}</div>
      </div>`;
    } else if (t.kind === 'seq') {
      body = `<div class="slots">${t.steps.map((s, i) => { const f = r.seq[i] != null; return `<div class="slot ${f ? 'full' : ''}"><b>${i + 1}</b>${f ? `<span class="emo">${t.steps[r.seq[i]].emoji}</span><span class="lbl">${esc(t.steps[r.seq[i]].label)}</span>` : '<span class="q">?</span>'}</div>`; }).join('<span class="arr" aria-hidden="true">→</span>')}</div>
        <div class="opts n${t.cards.length}">${t.cards.filter((c) => r.seq.indexOf(c.id) < 0).map((c) => {
          const hint = r.hint && c.id === r.seq.length;
          return `<button class="opt ${r.wrong['C' + c.id] ? 'isWrongSoft' : ''} ${hint ? 'isHint' : ''}" data-act="seq" data-v="${c.id}" data-id="C${c.id}" aria-label="${esc(c.label)}"><span class="emo">${c.emoji}</span><span class="lbl">${esc(c.label)}</span></button>`; }).join('')}</div>`;
    } else if (t.kind === 'input') {
      const ghost = r.hint && !r.typed ? `<span class="ghost">${esc(t.answer)}</span>` : '';
      body = `${heroHtml(t)}<div class="kp">
        <div class="kp-screen" data-id="kp" aria-live="polite">${r.typed ? esc(r.typed) : ghost || '<span class="ph">?</span>'}</div>
        <div class="kp-grid">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => `<button class="kbtn" data-act="kp" data-v="${d}">${d}</button>`).join('')}
          <button class="kbtn soft" data-act="kp" data-v="back" aria-label="Өшіру">⌫</button><button class="kbtn" data-act="kp" data-v="0">0</button><button class="kbtn okb" data-act="kp" data-v="ok" aria-label="Тексеру">✔</button></div>
      </div>`;
    } else if (t.kind === 'sort') {
      const card = t.cards[Math.min(r.si, t.cards.length - 1)];
      const binHtml = (b) => {
        const inside = t.cards.filter((c) => r.placed[c.id] === b.id).map((c) => `<span class="emo">${c.emoji}</span>`).join('');
        const hint = r.hint && !r.done && card.bin === b.id;
        return `<button class="opt bin ${r.wrong['B' + b.id] ? 'isWrongSoft' : ''} ${hint ? 'isHint' : ''}" data-act="sortB" data-v="${b.id}" data-id="B${b.id}" aria-label="${esc(b.label)}">
          <span class="binhead"><span class="emo">${b.emoji}</span><span class="lbl always">${esc(b.label)}</span></span><span class="binin">${inside}</span></button>`;
      };
      body = `<div class="sortarea">${binHtml(t.bins[0])}
        <div class="sortcard">${r.done ? '<span class="emo">🎉</span>' : `<span class="emo" key="${r.si}">${card.emoji}</span><span class="lbl">${esc(card.label)}</span>`}<small>${Math.min(r.si + 1, t.cards.length)} / ${t.cards.length}</small></div>
        ${binHtml(t.bins[1])}</div>`;
    }
    const fb = r.feedback ? `<div class="fb ${r.feedback.ok ? 'ok' : 'no'}" role="status">${esc(r.feedback.text)}</div>` : '<div class="fb empty" role="status"></div>';
    const word = t.word && r.level <= 2 ? `<span class="cw" style="--c:${t.wordColor}">${esc(t.word)}</span>` : '';
    const ptxt = word ? esc(t.prompt).replace(esc(t.word), word) : esc(t.prompt);
    return `<div class="gscreen" style="--bg:${g.bg};--ac:${g.accent}">
      <header class="gbar">
        ${btn('toMenu', '<span aria-hidden="true">✕</span>', 'iconbtn', 'aria-label="Ойын мәзіріне қайту"')}
        <div class="gtitle"><span class="gi">${g.icon}</span><span><b>${esc(g.title)}</b><small>${LEVEL_NAMES[r.level]} · ${esc(g.levels[r.level - 1])}</small></span></div>
        <div class="gprog" role="progressbar" aria-valuemin="0" aria-valuemax="${r.tasks.length}" aria-valuenow="${doneN}" aria-label="Тапсырма ${r.i + 1} / ${r.tasks.length}"><span class="bar"><i style="width:${pct}%"></i></span><b>${r.i + 1} / ${r.tasks.length}</b></div>
        <span class="gstars" aria-label="Бірден дұрыс: ${r.correct}">⭐ ${r.correct}</span>
      </header>
      <main class="play">
        <div class="prompt"><div class="buddy-m">${mascot(S.mood, 92)}</div><div class="say big"><h1>${ptxt}</h1>${btn('speak', '🔊', 'btn round speak', 'aria-label="Тапсырманы тыңдау"')}</div></div>
        <section class="stage">${body}</section>
        ${fb}
      </main>
    </div>`;
  }

  function vEnd() {
    const e = S.end, g = game(S.game), r = S.run;
    const secs = r ? Math.round((Date.now() - r.t0) / 1000) : 0;
    return `<div class="gscreen" style="--bg:${g.bg};--ac:${g.accent}">
      <main class="end">
        <section class="result">
          <div class="end-m">${mascot('cheer', 130)}</div>
          <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= e.stars ? 'on' : ''}" style="animation-delay:${i * 0.2}s">★</span>`).join('')}</div>
          <h1>${e.stars === 3 ? 'Керемет!' : e.stars === 2 ? 'Жарайсың!' : 'Сен тырыстың, бәрекелді!'}</h1>
          <div class="rstats">
            <div><b>${e.correct} / ${e.total}</b><small>бірден дұрыс</small></div>
            <div><b>${g.icon} ${LEVEL_NAMES[e.level]}</b><small>${esc(g.title)}</small></div>
            <div><b>${e.sticker}</b><small>жаңа жапсырма</small></div>
          </div>
          ${e.change > 0 ? `<p class="lvup">🎉 ${LEVEL_NAMES[e.newLevel]} ашылды!</p>` : ''}
          <div class="row center">
            ${e.suggestBreak ? btn('toBreaks', '🤸 Сергіту сәті', 'btn big primary pulse') : ''}
            ${btn('again', '🔁 Тағы ойнау', 'btn big ' + (e.suggestBreak ? 'ghost' : 'primary'))}
            ${btn('toMenu', '🎮 Басқа ойын', 'btn big ghost')}
          </div>
        </section>
      </main>
    </div>`;
  }
  function vBreaks() {
    return `${topbar('toMenu', 'Сергіту сәті')}
    <main class="wrap">
      ${bubble('Ойыннан кейін денемізді сергітейік! Біреуін таңда', 'cheer', 96)}
      <div class="bgrid">${D.BREAKS.map((b) => `<button class="bcard" style="--ac:${b.color}" data-act="brk" data-v="${b.key}"><span class="mico">${b.icon}</span><span class="mtitle">${esc(b.title)}</span><small>${esc(b.desc)}</small></button>`).join('')}</div>
    </main>`;
  }
  function vBrk() {
    const b = D.BREAKS.find((x) => x.key === S.brk);
    return `<div class="gscreen brkscreen" style="--bg:#FFF6EE;--ac:${b.color}">
      <header class="gbar">${btn('toBreaks', '<span aria-hidden="true">✕</span>', 'iconbtn', 'aria-label="Артқа"')}<div class="gtitle"><span class="gi">${b.icon}</span><span><b>${esc(b.title)}</b><small>Сергіту сәті</small></span></div></header>
      <main class="play"><div id="brkhost" class="brkhost">${S.brkDone === S.brk ? `<div class="end">${mascot('cheer', 140)}<h1>Жарайсың!</h1><p class="big">Денең сергіді. Енді ойынға оралайық!</p><div class="row center">${btn('toMenu', '🎮 Ойынға оралу', 'btn big primary')}${btn('toBreaks', '🤸 Тағы сергу', 'btn big ghost')}</div></div>` : ''}</div></main>
    </div>`;
  }

  function vSettings() {
    const c = child(), s = c.settings;
    const tog = (k, t, d) => `<label class="tog"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
    const seg = (act, cur, vals) => `<span class="seg">${vals.map((v) => `<button class="${cur === v[0] ? 'on' : ''}" data-act="${act}" data-v="${v[0]}">${v[1]}</button>`).join('')}</span>`;
    return `${topbar('toMenu', 'Баптаулар — ' + c.name)}
    <main class="wrap">
      <section class="card"><h2>Ойын деңгейлері</h2>
        <div class="lvtable">${D.GAMES.map((g) => `<div class="lvrow"><span>${g.icon} ${esc(g.title)}</span><span class="seg">${[1, 2, 3, 4].map((l) => `<button class="${s.levels[g.key] === l ? 'on' : ''}" data-act="setLvl" data-g="${g.key}" data-v="${l}" title="${esc(g.levels[l - 1])}">${l}</button>`).join('')}</span><small>${esc(g.levels[s.levels[g.key] - 1])}</small></div>`).join('')}</div>
        ${tog('auto', 'Деңгейді автоматты бейімдеу', '80%-дан жоғары кеңессіз орындаса — деңгей көтеріледі, 40%-дан төмен болса — түседі')}
      </section>
      <section class="card"><h2>Қолдау және қабылдау</h2>
        ${tog('voice', 'Ақботаның дауысы', 'Тапсырма мен мадақ таза қазақша нейрондық дауыспен айтылады (ISSAI KazakhTTS)')}
        <div class="lvrow"><span>Дауыс жылдамдығы</span>${seg('setR', s.voiceRate || 1, [[1, 'Баяу'], [0.85, 'Өте баяу'], [0.72, 'Ең баяу']])}<small>Сөз түсінуі қиын оқушыға жылдамдықты азайтыңыз</small></div>
        ${tog('sound', 'Дыбыстық белгілер', 'Дұрыс жауапқа — қуанышты, қатеге — жұмсақ дыбыс')}
        ${tog('labels', 'Суреттің астындағы жазу', 'Оқи алатын оқушыға көмек. Өшірсе — тек сурет қалады')}
        ${tog('big', 'Үлкен батырмалар мен мәтін', 'Ұсақ моторикасы әлсіз балаға')}
        ${tog('calm', 'Тыныш режим', 'Анимациялар мен жылдам ауысуларды азайтады')}
        ${tog('contrast', 'Жоғары контраст', 'Көру қабілеті төмен балаға')}
        <div class="lvrow"><span>Бір ойындағы тапсырма саны</span>${seg('setN', s.perRound, [[3, '3'], [5, '5'], [8, '8']])}</div>
        <div class="lvrow"><span>Кеңес (дұрыс жауапты жарықтандыру)</span>${seg('setH', s.hintAfter, [[1, '1 қатеден кейін'], [2, '2 қатеден кейін'], [99, 'Өшік']])}</div>
        <div class="lvrow"><span>Сергіту сәтін ұсыну</span>${seg('setB', s.breakEvery, [[2, '2 ойыннан кейін'], [3, '3 ойыннан кейін'], [0, 'Өшік']])}</div>
      </section>
      <div class="row center">${btn('toMenu', '✔ Дайын', 'btn big primary')}</div>
    </main>`;
  }

  function vGate() {
    const g = S.gate;
    return `${topbar('toHome', 'Ата-ана мен мұғалімге')}
    <main class="wrap narrow"><section class="card center">
      <h2>Ересектерге арналған тексеру</h2>
      <p>Нәтижелер панеліне өту үшін есепті шешіңіз:</p>
      <p class="gq">${g.a} × ${g.b} = ?</p>
      <label class="fld" style="max-width:200px;margin:0 auto">Жауап <input id="gate" inputmode="numeric" autocomplete="off"></label>
      ${S.err ? `<div class="err" role="alert">${esc(S.err)}</div>` : ''}
      ${btn('gateOk', 'Кіру', 'btn primary')}
    </section></main>`;
  }

  function vTeacher() {
    const rows = db.children.map((c) => ({ c, st: statsFor(c.id), lvl: overallLevel(c), br: db.breaks.filter((b) => b.child === c.id).length }))
      .sort((a, b) => b.lvl - a.lvl || (b.st.acc || 0) - (a.st.acc || 0));
    const sel = db.children.find((c) => c.id === S.tchild) || (rows[0] && rows[0].c);
    let detail = '';
    if (sel) {
      const st = statsFor(sel.id);
      const recent = st.rs.slice(-12);
      detail = `<section class="card">
        <h2>${esc(sel.avatar)} ${esc(sel.name)} — жеке прогресс</h2>
        <div class="kgrid">${D.GAMES.map((g) => { const s = statsFor(sel.id, g.key); const l = sel.settings.levels[g.key]; return `<div class="kcard" style="--ac:${g.accent}"><b>${g.icon} ${esc(g.title)}</b><span class="kl">${LEVEL_NAMES[l]} · ${esc(g.levels[l - 1])}</span><span>Ойын саны: ${s.n}</span><span>Бірден дұрыс: ${s.acc == null ? '—' : s.acc + '%'}</span><span>Кеңес: ${s.hints} · Қате: ${s.errors}</span><div class="bar"><i style="width:${s.acc || 0}%"></i></div></div>`; }).join('')}</div>
        <h3>Соңғы ойындар динамикасы (бірден дұрыс, %)</h3>
        ${recent.length ? `<div class="chart" role="img" aria-label="Соңғы ойындардағы нәтиже">${recent.map((r) => { const p = Math.round(r.correct * 100 / r.total); const g = game(r.game) || D.GAMES[0]; return `<div class="col" title="${esc(g.title)}, ${LEVEL_NAMES[r.level]}, ${fmtDate(r.at)}"><span class="v">${p}</span><i style="height:${Math.max(4, p)}%;background:${g.accent}"></i><span class="g">${g.icon}</span></div>`; }).join('')}</div>` : '<p class="hint">Әзірге ойын жоқ.</p>'}
        <div class="row">${btn('tSettings', '⚙️ Баптауларын өзгерту', 'btn ghost', 'data-v="' + sel.id + '"')}${btn('delChild', '🗑 Ойыншыны өшіру', 'btn ghost danger', 'data-v="' + sel.id + '"')}</div>
      </section>`;
    }
    return `${topbar('toHome', 'Балалардың жетістіктері')}
    <main class="wrap">
      <section class="card">
        <h2>Оқушылар деңгейі бойынша</h2>
        <p class="hint">Жалпы деңгей барлық ойынның ағымдағы деңгейінің орташасы бойынша анықталады. Бұл — бәсекелік рейтинг емес, әр баланың жеке даму картасы.</p>
        <div class="legend">${[1, 2, 3, 4].map((l) => `<span class="lv${l}">${LEVEL_NAMES[l]} — ${LEVEL_DESC[l]}</span>`).join('')}</div>
        ${rows.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Оқушы</th><th>Жалпы деңгей</th>${D.GAMES.map((g) => `<th title="${esc(g.title)}">${g.icon}</th>`).join('')}<th>Ойын</th><th>Бірден дұрыс</th><th>Кеңес</th><th>Сергіту</th><th>Уақыт</th><th>Соңғы ойын</th></tr></thead><tbody>
          ${rows.map((x) => `<tr class="${sel && sel.id === x.c.id ? 'sel' : ''}" data-act="tPick" data-v="${x.c.id}" tabindex="0"><td><b>${esc(x.c.avatar)} ${esc(x.c.name)}</b></td><td><span class="lvb lv${x.lvl}">${LEVEL_NAMES[x.lvl]}</span></td>${D.GAMES.map((g) => `<td>${x.c.settings.levels[g.key]}</td>`).join('')}<td>${x.st.n}</td><td>${x.st.acc == null ? '—' : x.st.acc + '%'}</td><td>${x.st.hints}</td><td>${x.br}</td><td>${fmtSecs(x.st.secs)}</td><td>${fmtDate(x.st.last)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="hint">Ойыншылар әлі қосылмаған.</p>'}
      </section>
      ${detail}
      <div class="row">${btn('csv', '⬇ CSV жүктеу (Excel)', 'btn primary', db.results.length ? '' : 'disabled')}${btn('wipe', 'Барлық нәтижені тазалау', 'btn ghost danger', db.results.length ? '' : 'disabled')}</div>
      <p class="hint">Деректер тек осы компьютердің браузерінде сақталады және интернетке жіберілмейді.</p>
      <div class="row">${btn('toPlan', '📋 Семинарға арналған қорғау жоспары', 'btn ghost')}</div>
    </main>`;
  }

  function vPlan() { return topbar('toGate', 'Семинарда қорғау жоспары') + '<main class="wrap plan">' + window.PLAN_HTML + '</main>'; }

  const VIEWS = { home: vHome, players: vPlayers, menu: vMenu, game: vGame, end: vEnd, settings: vSettings, gate: vGate, teacher: vTeacher, plan: vPlan, breaks: vBreaks, brk: vBrk };
  function render() {
    applyBodyClasses();
    if ((S.screen === 'game' && !S.run) || (S.screen === 'end' && !S.end) || (S.screen === 'brk' && !S.brk)) S.screen = child() ? 'menu' : 'home';
    if (S.screen === 'teacher' && !S.teacherOk) S.screen = 'home';
    const a = document.activeElement, key = a && root.contains(a) && a.dataset && a.dataset.act ? [a.dataset.act, a.dataset.v, a.dataset.g] : null;
    root.innerHTML = (VIEWS[S.screen] || vHome)();
    const f = root.querySelector('#pname, #gate'); if (f) { f.focus(); return; }
    if (key) {
      const el = Array.from(root.querySelectorAll('[data-act="' + key[0] + '"]')).find((x) => x.dataset.v === key[1] && x.dataset.g === key[2]);
      if (el && !el.disabled) el.focus({ preventScroll: true });
    }
  }

  // ---------- оқиғалар ----------
  const ACT = {
    toHome: () => go('home'),
    toPlayers: () => { S.err = ''; go('players'); },
    toMenu: () => { S.run = null; go('menu'); },
    toSettings: () => go('settings'),
    toPlan: () => go('plan'),
    toBreaks: () => { S.brkDone = null; go('breaks'); line('breaks'); },
    brk: (v) => { S.brkDone = null; startBreak(v); },
    toGate: () => { if (S.teacherOk) return go('teacher'); S.err = ''; S.gate = { a: 3 + E.rnd(6), b: 3 + E.rnd(6) }; go('gate'); },
    gateOk: () => { const v = Number((document.getElementById('gate') || {}).value); if (v === S.gate.a * S.gate.b) { S.teacherOk = true; S.err = ''; go('teacher'); } else { S.err = 'Жауап қате. Қайталап көріңіз.'; render(); } },
    pickAv: (v) => { S.newAv = v; const n = document.getElementById('pname'); const keep = n ? n.value : ''; render(); const m = document.getElementById('pname'); if (m) m.value = keep; },
    addChild: () => {
      const name = ((document.getElementById('pname') || {}).value || '').trim();
      if (name.length < 2) { S.err = 'Баланың атын жазыңыз'; return render(); }
      const c = E.store.newChild(name, S.newAv || D.AVATARS[0]); db.children.push(c); save();
      S.err = ''; S.newAv = null; S.childId = c.id; go('menu'); line('hello');
    },
    pickChild: (v) => { S.childId = v; go('menu'); line('hello'); },
    play: (v) => startGame(v),
    again: () => startGame(S.game),
    speak: () => speakTask(),
    choose: (v) => choose(v),
    mL: (v) => matchClick('L', Number(v)),
    mR: (v) => matchClick('R', Number(v)),
    seq: (v) => seqClick(Number(v)),
    sortB: (v) => sortClick(v),
    kp: (v) => keyPress(v),
    setLvl: (v, el) => { set().levels[el.dataset.g] = Number(v); save(); render(); },
    setN: (v) => { set().perRound = Number(v); save(); render(); },
    setH: (v) => { set().hintAfter = Number(v); save(); render(); },
    setB: (v) => { set().breakEvery = Number(v); save(); render(); },
    setR: (v) => { set().voiceRate = Number(v); save(); render(); line('hello'); },
    tPick: (v) => { S.tchild = v; render(); },
    tSettings: (v) => { S.childId = v; go('settings'); },
    delChild: (v) => { const c = db.children.find((x) => x.id === v); if (c && confirm(c.name + ' және оның барлық нәтижесі өшіріледі. Жалғастырасыз ба?')) { db.children = db.children.filter((x) => x.id !== v); db.results = db.results.filter((r) => r.child !== v); db.breaks = db.breaks.filter((r) => r.child !== v); if (S.childId === v) S.childId = null; S.tchild = null; save(); render(); } },
    csv: () => exportCsv(),
    wipe: () => { if (confirm('Барлық ойын нәтижелері өшіріледі (ойыншылар сақталады). Жалғастырасыз ба?')) { db.results = []; db.breaks = []; save(); render(); } }
  };
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const f = ACT[el.dataset.act]; if (f) f(el.dataset.v, el);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.target.id === 'pname') ACT.addChild();
      else if (e.target.id === 'gate') ACT.gateOk();
      else if (e.target.matches('tr[data-act]')) e.target.click();
    }
  });
  root.addEventListener('change', (e) => {
    const k = e.target.dataset.set; if (!k) return;
    set()[k] = e.target.checked; save(); render();
  });
  // Пернетақтадан ойнау: 1–9 сандары нұсқаны таңдайды, R — тапсырманы қайта тыңдау
  document.addEventListener('keydown', (e) => {
    if (S.screen !== 'game' || e.target.tagName === 'INPUT') return;
    if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') return speakTask();
    const t = task();
    if (t && t.kind === 'input') {
      if (/^[0-9]$/.test(e.key)) keyPress(e.key);
      else if (e.key === 'Backspace') keyPress('back');
      else if (e.key === 'Enter') keyPress('ok');
      return;
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) { const opts = root.querySelectorAll('.play .opt'); if (opts[n - 1]) opts[n - 1].click(); }
  });

  window.APP = { mascot };
  const start = (location.hash.match(/^#\/(\w+)/) || [])[1];
  if (start === 'plan') S.screen = 'plan';
  render();
})();
