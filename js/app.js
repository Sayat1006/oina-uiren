/* «Ойна да үйрен!» — экрандар мен ойын барысы. */
(function () {
  const D = window.DATA, E = window.ENGINE;
  const root = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LEVEL_NAMES = ['', '1-деңгей', '2-деңгей', '3-деңгей'];
  const LEVEL_DESC = ['', 'Бастапқы: педагогтің көмегімен орындайды', 'Орта: ішінара өз бетімен орындайды', 'Жоғары: өз бетімен орындайды'];

  let db = E.store.load();
  const S = { screen: 'home', childId: null, game: null, run: null, gate: null, tchild: null, busy: false, toast: null };

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
  }
  const speak = (t) => { if (set().voice) E.say(t); };
  const sfx = (k) => { if (set().sound) E.SFX[k](); };

  // ---------- навигация ----------
  function go(screen, extra) {
    Object.assign(S, { screen }, extra || {});
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    const h = '#/' + screen;
    if (location.hash !== h) { try { history.pushState(null, '', h); } catch (e) {} }
    render(); window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', () => {
    const s = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'home';
    S.screen = ['game', 'end'].indexOf(s) >= 0 ? 'menu' : s;
    if (['menu', 'settings'].indexOf(S.screen) >= 0 && !child()) S.screen = 'players';
    if (S.screen === 'teacher' && !S.teacherOk) S.screen = 'home';
    render();
  });

  // ---------- ойын барысы ----------
  function startGame(key) {
    const c = child(); const lvl = c.settings.levels[key] || 1;
    const tasks = E.MAKE[key](lvl, c.settings.perRound);
    S.game = key;
    S.run = { key, level: lvl, tasks, i: 0, t0: Date.now(), correct: 0, errors: 0, hints: 0, taskErr: 0, done: false,
      sel: null, matched: {}, seq: [], wrong: {}, hint: false, feedback: null, log: [] };
    go('game');
    setTimeout(() => speakTask(), 350);
  }
  function task() { return S.run && S.run.tasks[S.run.i]; }
  function speakTask() { const t = task(); if (t) speak(t.prompt); }

  function praise() { return E.pick(D.PRAISE); }

  function wrong(id) {
    const r = S.run;
    r.errors++; r.taskErr++; r.wrong[id] = true;
    sfx('soft');
    r.feedback = { ok: false, text: E.pick(D.TRY) };
    if (r.taskErr >= set().hintAfter && !r.hint) { r.hint = true; r.hints++; }
    render();
    shake(id);
    speak(r.feedback.text);
  }
  function shake(id) {
    const el = root.querySelector('[data-id="' + id + '"]');
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  }
  function taskDone() {
    const r = S.run;
    if (r.taskErr === 0) r.correct++;
    r.log.push({ errors: r.taskErr });
    r.feedback = { ok: true, text: praise() };
    r.done = true; S.busy = true;
    sfx('good'); speak(r.feedback.text);
    render(); burst();
    setTimeout(() => {
      S.busy = false;
      if (r !== S.run) return;
      if (r.i < r.tasks.length - 1) {
        Object.assign(r, { i: r.i + 1, taskErr: 0, done: false, sel: null, matched: {}, seq: [], wrong: {}, hint: false, feedback: null });
        render(); speakTask();
      } else finish();
    }, set().calm ? 1700 : 1300);
  }

  function choose(id) {
    const r = S.run, t = task();
    if (!r || r.done || S.busy || r.wrong[id]) return;
    if (t.kind === 'choice') { if (id === t.answer) taskDone(); else wrong(id); return; }
  }
  function matchClick(side, idx) {
    const r = S.run, t = task(); if (r.done || S.busy) return;
    if (side === 'L') { if (r.matched['L' + idx]) return; r.sel = idx; sfx('tap'); speak(t.left[idx].label); r.feedback = null; render(); return; }
    if (r.matched['R' + idx]) return;
    if (r.sel == null) { r.feedback = { ok: false, text: 'Алдымен жануарды таңда' }; render(); speak(r.feedback.text); return; }
    if (t.left[r.sel].id === t.right[idx].id) {
      const n = Object.keys(r.matched).length / 2 + 1;
      r.matched['L' + r.sel] = n; r.matched['R' + idx] = n; r.sel = null; r.hint = false; r.wrong = {}; sfx('good');
      if (Object.keys(r.matched).length === t.left.length * 2) taskDone(); else { r.feedback = { ok: true, text: praise() }; render(); }
    } else wrong('R' + idx);
  }
  function seqClick(id) {
    const r = S.run, t = task(); if (r.done || S.busy || r.seq.indexOf(id) >= 0) return;
    if (id === r.seq.length) {
      r.seq.push(id); r.hint = false; r.wrong = {}; sfx('tap'); speak(t.steps[id].label);
      if (r.seq.length === t.steps.length) taskDone(); else { r.feedback = { ok: true, text: 'Дұрыс! Ал енді не болады?' }; render(); }
    } else wrong('C' + id);
  }

  function finish() {
    const r = S.run, c = child();
    const secs = Math.round((Date.now() - r.t0) / 1000);
    const ratio = r.correct / r.tasks.length;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    let change = 0;
    if (c.settings.auto) {
      if (ratio >= 0.8 && r.hints === 0 && r.level < 3) change = 1;
      else if (ratio < 0.4 && r.level > 1) change = -1;
      if (change) c.settings.levels[r.key] = r.level + change;
    }
    const sticker = E.pick(D.STICKERS);
    c.stickers.push(sticker);
    db.results.push({ id: E.uid(), child: c.id, game: r.key, level: r.level, total: r.tasks.length, correct: r.correct, errors: r.errors, hints: r.hints, secs, stars, change, at: Date.now() });
    save();
    S.end = { stars, correct: r.correct, total: r.tasks.length, change, sticker, level: r.level, newLevel: c.settings.levels[r.key] };
    sfx('win');
    go('end');
    speak(stars === 3 ? 'Керемет! Сен үш жұлдыз алдың!' : 'Жарайсың! Сен ойынды аяқтадың!');
    burst(true);
  }

  // жұлдызша анимациясы
  function burst(big) {
    if (set().calm) return;
    const box = document.createElement('div'); box.className = 'burst'; box.setAttribute('aria-hidden', 'true');
    const n = big ? 28 : 12;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.textContent = E.pick(['⭐', '✨', '🌟', '💛']);
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * (big ? 320 : 160);
      s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d + 'px');
      s.style.animationDelay = Math.random() * 0.15 + 's';
      box.appendChild(s);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 1600);
  }

  // ---------- нәтижелер ----------
  function statsFor(cid, key) {
    const rs = db.results.filter((r) => r.child === cid && (!key || r.game === key));
    const tot = rs.reduce((s, r) => s + r.total, 0), cor = rs.reduce((s, r) => s + r.correct, 0);
    return { n: rs.length, acc: tot ? Math.round(cor * 100 / tot) : null, hints: rs.reduce((s, r) => s + r.hints, 0), errors: rs.reduce((s, r) => s + r.errors, 0),
      secs: rs.reduce((s, r) => s + r.secs, 0), last: rs.length ? rs[rs.length - 1].at : null, rs };
  }
  // Жалпы деңгей: ойындар деңгейлерінің орташасы (дөңгелектенген)
  function overallLevel(c) {
    const ls = D.GAMES.map((g) => c.settings.levels[g.key] || 1);
    return Math.round(ls.reduce((a, b) => a + b, 0) / ls.length);
  }
  const fmtDate = (t) => { if (!t) return '—'; const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const fmtSecs = (s) => Math.floor(s / 60) + ' мин ' + String(s % 60).padStart(2, '0') + ' с';

  function exportCsv() {
    const head = ['Оқушы', 'Ойын', 'Деңгей', 'Тапсырма саны', 'Бірден дұрыс', 'Қате', 'Кеңес', 'Уақыт (с)', 'Жұлдыз', 'Деңгей өзгерісі', 'Күні'];
    const rows = db.results.map((r) => { const c = db.children.find((x) => x.id === r.child); return [c ? c.name : '?', game(r.game).title, r.level, r.total, r.correct, r.errors, r.hints, r.secs, r.stars, r.change > 0 ? 'жоғарылады' : r.change < 0 ? 'төмендеді' : '', fmtDate(r.at)]; });
    const csv = '﻿' + [head].concat(rows).map((r) => r.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'oina-uiren-natizheler.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- экрандар ----------
  const btn = (act, html, cls, extra) => `<button class="${cls || 'btn'}" data-act="${act}" ${extra || ''}>${html}</button>`;

  function topbar(back, title) {
    const c = child();
    return `<header class="top">
      ${back ? btn(back, '<span aria-hidden="true">⬅</span> Артқа', 'btn ghost', 'aria-label="Артқа"') : '<span></span>'}
      <div class="toptitle">${esc(title || '')}</div>
      ${c ? `<div class="me"><span class="av">${c.avatar}</span><span>${esc(c.name)}</span></div>` : '<span></span>'}
    </header>`;
  }

  function vHome() {
    return `<main class="home">
      <div class="hero">
        <div class="logo" aria-hidden="true">🌈🐾🏡🔎</div>
        <h1>Ойна да үйрен!</h1>
        <p>Түстерді, жануарларды, күн тәртібі мен заттарды танып-білуге арналған ойын</p>
        ${btn('toPlayers', '▶ Ойнау', 'btn big primary')}
      </div>
      <section class="inside">
        <h2>Ойынның ішінде не бар?</h2>
        <div class="glist">${D.GAMES.map((g, i) => `
          <div class="gitem" style="--bg:${g.bg};--ac:${g.accent}"><span class="gico">${g.icon}</span><div><h3>${i + 1}. ${esc(g.title)}</h3><p>${esc(g.goal)}</p></div></div>`).join('')}
        </div>
      </section>
      <nav class="foot">
        ${btn('toGate', '👩‍🏫 Педагогке', 'btn ghost')}
        ${btn('toPlan', '📋 Қорғау жоспары', 'btn ghost')}
      </nav>
    </main>`;
  }

  function vPlayers() {
    const list = db.children.map((c) => `<button class="pcard" data-act="pickChild" data-v="${c.id}"><span class="pav">${c.avatar}</span><span class="pname">${esc(c.name)}</span><span class="pst">${c.stickers.slice(-5).join('')}</span></button>`).join('');
    const av = S.newAv || D.AVATARS[0];
    return `${topbar('toHome', 'Кім ойнайды?')}
    <main class="wrap">
      ${db.children.length ? `<div class="pgrid">${list}</div>` : '<p class="hint">Әзірге ойыншы жоқ. Төменде жаңа ойыншы қосыңыз.</p>'}
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
    return `${topbar('toPlayers', 'Ойын таңда')}
    <main class="wrap">
      <div class="mgrid">${D.GAMES.map((g) => {
        const l = c.settings.levels[g.key];
        return `<button class="mcard" style="--bg:${g.bg};--ac:${g.accent}" data-act="play" data-v="${g.key}">
          <span class="mico">${g.icon}</span><span class="mtitle">${esc(g.title)}</span>
          <span class="mlvl">${'●'.repeat(l)}${'○'.repeat(3 - l)} <small>${LEVEL_NAMES[l]}</small></span></button>`;
      }).join('')}</div>
      ${c.stickers.length ? `<section class="card"><h2>Менің жапсырмаларым (${c.stickers.length})</h2><div class="stk">${c.stickers.map((s) => `<span>${s}</span>`).join('')}</div></section>` : ''}
      <div class="row center">${btn('toSettings', '⚙️ Баптаулар', 'btn ghost')}</div>
    </main>`;
  }

  function optHtml(o, id, cls, extra) {
    const r = S.run, t = task();
    let st = '';
    if (r.wrong[id]) st = ' isWrong';
    if (r.done && t.kind === 'choice' && o.id === t.answer) st = ' isRight';
    if (r.hint && !r.done && t.kind === 'choice' && o.id === t.answer) st += ' isHint';
    const vis = o.swatch ? `<span class="sw" style="background:${o.swatch}"></span>` : `<span class="emo">${o.emoji}</span>`;
    return `<button class="opt${cls || ''}${st}" data-act="${extra || 'choose'}" data-v="${esc(o.id)}" data-id="${esc(id)}" aria-label="${esc(o.label)}" ${r.wrong[id] ? 'aria-disabled="true"' : ''}>${vis}<span class="lbl">${esc(o.label)}</span></button>`;
  }

  function vGame() {
    const r = S.run, t = task(), g = game(r.key);
    const dots = r.tasks.map((_, i) => `<span class="dot ${i < r.i || (i === r.i && r.done) ? 'done' : i === r.i ? 'cur' : ''}"></span>`).join('');
    let body = '';
    if (t.kind === 'choice') {
      body = `${t.hero ? `<div class="heroimg"><span class="emo">${t.hero}</span><span class="lbl">${esc(t.heroLabel)}</span></div>` : ''}
        <div class="opts n${t.options.length}">${t.options.map((o) => optHtml(o, o.id)).join('')}</div>`;
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
    }
    const fb = r.feedback ? `<div class="fb ${r.feedback.ok ? 'ok' : 'no'}" role="status">${r.feedback.ok ? '😊' : '🤔'} ${esc(r.feedback.text)}</div>` : '<div class="fb empty" role="status"></div>';
    const word = t.word && r.level === 1 ? `<span class="cw" style="--c:${t.wordColor}">${esc(t.word)}</span>` : '';
    return `<div class="gscreen" style="--bg:${g.bg};--ac:${g.accent}">
      <header class="top">
        ${btn('toMenu', '🏠', 'btn ghost round', 'aria-label="Ойын мәзіріне қайту"')}
        <div class="dots" aria-label="Тапсырма ${r.i + 1} / ${r.tasks.length}">${dots}</div>
        <span class="lvlchip">${g.icon} ${LEVEL_NAMES[r.level]}</span>
      </header>
      <main class="play">
        <div class="prompt">
          <h1>${word ? esc(t.prompt).replace(esc(t.word), word) : esc(t.prompt)}</h1>
          ${btn('speak', '🔊', 'btn round speak', 'aria-label="Тапсырманы тыңдау"')}
        </div>
        ${body}
        ${fb}
      </main>
    </div>`;
  }

  function vEnd() {
    const e = S.end, g = game(S.game);
    return `<div class="gscreen" style="--bg:${g.bg};--ac:${g.accent}">
      <main class="end">
        <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= e.stars ? 'on' : ''}" style="animation-delay:${i * 0.2}s">★</span>`).join('')}</div>
        <h1>${e.stars === 3 ? 'Керемет!' : e.stars === 2 ? 'Жарайсың!' : 'Сен тырыстың, бәрекелді!'}</h1>
        <p class="big">${e.correct} / ${e.total} тапсырманы бірден орындадың</p>
        <div class="sticker"><span>${e.sticker}</span><small>Жаңа жапсырма!</small></div>
        ${e.change > 0 ? `<p class="lvup">🎉 ${LEVEL_NAMES[e.newLevel]} ашылды!</p>` : ''}
        <div class="row center">
          ${btn('again', '🔁 Тағы ойнау', 'btn big primary')}
          ${btn('toMenu', '🎮 Басқа ойын', 'btn big ghost')}
        </div>
      </main>
    </div>`;
  }

  function vSettings() {
    const c = child(), s = c.settings;
    const tog = (k, t, d) => `<label class="tog"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
    return `${topbar('toMenu', 'Баптаулар — ' + c.name)}
    <main class="wrap">
      <section class="card"><h2>Ойын деңгейлері</h2>
        <div class="lvtable">${D.GAMES.map((g) => `<div class="lvrow"><span>${g.icon} ${esc(g.title)}</span><span class="seg">${[1, 2, 3].map((l) => `<button class="${s.levels[g.key] === l ? 'on' : ''}" data-act="setLvl" data-g="${g.key}" data-v="${l}" title="${esc(g.levels[l - 1])}">${l}</button>`).join('')}</span><small>${esc(g.levels[s.levels[g.key] - 1])}</small></div>`).join('')}</div>
        ${tog('auto', 'Деңгейді автоматты бейімдеу', '80%-дан жоғары кеңессіз орындаса — деңгей көтеріледі, 40%-дан төмен болса — түседі')}
      </section>
      <section class="card"><h2>Қолдау және қабылдау</h2>
        ${tog('voice', 'Тапсырманы дауыстап оқу', 'Браузердің сөйлеу синтезі қолданылады' + (E.hasKkVoice() ? ' (қазақ дауысы бар)' : ' (қазақ дауысы табылмады, жақын дауыс қолданылады)'))}
        ${tog('sound', 'Дыбыстық белгілер', 'Дұрыс жауапқа — қуанышты, қатеге — жұмсақ дыбыс')}
        ${tog('labels', 'Суреттің астындағы жазу', 'Оқи алатын балаға көмек. Өшірсе — тек сурет қалады')}
        ${tog('big', 'Үлкен батырмалар мен мәтін', 'Ұсақ моторикасы әлсіз балаға')}
        ${tog('calm', 'Тыныш режим', 'Анимациялар мен жылдам ауысуларды азайтады')}
        ${tog('contrast', 'Жоғары контраст', 'Көру қабілеті төмен балаға')}
        <div class="lvrow"><span>Бір ойындағы тапсырма саны</span><span class="seg">${[3, 5, 8].map((n) => `<button class="${s.perRound === n ? 'on' : ''}" data-act="setN" data-v="${n}">${n}</button>`).join('')}</span></div>
        <div class="lvrow"><span>Кеңес (дұрыс жауапты жарықтандыру)</span><span class="seg">${[[1, '1 қатеден кейін'], [2, '2 қатеден кейін'], [99, 'Өшік']].map((h) => `<button class="${s.hintAfter === h[0] ? 'on' : ''}" data-act="setH" data-v="${h[0]}">${h[1]}</button>`).join('')}</span></div>
      </section>
      <div class="row center">${btn('toMenu', '✔ Дайын', 'btn big primary')}</div>
    </main>`;
  }

  function vGate() {
    const g = S.gate;
    return `${topbar('toHome', 'Педагогке арналған бөлім')}
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
    const rows = db.children.map((c) => {
      const st = statsFor(c.id), lvl = overallLevel(c);
      return { c, st, lvl };
    }).sort((a, b) => b.lvl - a.lvl || (b.st.acc || 0) - (a.st.acc || 0));
    const sel = db.children.find((c) => c.id === S.tchild) || (rows[0] && rows[0].c);
    let detail = '';
    if (sel) {
      const st = statsFor(sel.id);
      const recent = st.rs.slice(-12);
      detail = `<section class="card">
        <h2>${sel.avatar} ${esc(sel.name)} — жеке прогресс</h2>
        <div class="kgrid">${D.GAMES.map((g) => { const s = statsFor(sel.id, g.key); const l = sel.settings.levels[g.key]; return `<div class="kcard" style="--ac:${g.accent}"><b>${g.icon} ${esc(g.title)}</b><span class="kl">${LEVEL_NAMES[l]}</span><span>Ойын саны: ${s.n}</span><span>Бірден дұрыс: ${s.acc == null ? '—' : s.acc + '%'}</span><span>Кеңес: ${s.hints} · Қате: ${s.errors}</span><div class="bar"><i style="width:${s.acc || 0}%"></i></div></div>`; }).join('')}</div>
        <h3>Соңғы ойындар динамикасы (бірден дұрыс, %)</h3>
        ${recent.length ? `<div class="chart" role="img" aria-label="Соңғы ойындардағы нәтиже">${recent.map((r) => { const p = Math.round(r.correct * 100 / r.total); const g = game(r.game); return `<div class="col" title="${esc(g.title)}, ${LEVEL_NAMES[r.level]}, ${fmtDate(r.at)}"><span class="v">${p}</span><i style="height:${Math.max(4, p)}%;background:${g.accent}"></i><span class="g">${g.icon}</span></div>`; }).join('')}</div>` : '<p class="hint">Әзірге ойын жоқ.</p>'}
        <div class="row">${btn('tSettings', '⚙️ Баптауларын өзгерту', 'btn ghost', 'data-v="' + sel.id + '"')}${btn('delChild', '🗑 Ойыншыны өшіру', 'btn ghost danger', 'data-v="' + sel.id + '"')}</div>
      </section>`;
    }
    return `${topbar('toHome', 'Педагог панелі: нәтижелер')}
    <main class="wrap">
      <section class="card">
        <h2>Оқушылар деңгейі бойынша</h2>
        <p class="hint">Деңгей төрт ойынның ағымдағы деңгейінің орташасы бойынша анықталады. Бұл — бәсекелік рейтинг емес, әр баланың жеке даму картасы.</p>
        <div class="legend">${[1, 2, 3].map((l) => `<span class="lv${l}">${LEVEL_NAMES[l]} — ${LEVEL_DESC[l]}</span>`).join('')}</div>
        ${rows.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Оқушы</th><th>Жалпы деңгей</th>${D.GAMES.map((g) => `<th title="${esc(g.title)}">${g.icon}</th>`).join('')}<th>Ойын</th><th>Бірден дұрыс</th><th>Кеңес</th><th>Уақыт</th><th>Соңғы ойын</th></tr></thead><tbody>
          ${rows.map((x) => `<tr class="${sel && sel.id === x.c.id ? 'sel' : ''}" data-act="tPick" data-v="${x.c.id}" tabindex="0"><td><b>${x.c.avatar} ${esc(x.c.name)}</b></td><td><span class="lvb lv${x.lvl}">${LEVEL_NAMES[x.lvl]}</span></td>${D.GAMES.map((g) => `<td>${x.c.settings.levels[g.key]}</td>`).join('')}<td>${x.st.n}</td><td>${x.st.acc == null ? '—' : x.st.acc + '%'}</td><td>${x.st.hints}</td><td>${fmtSecs(x.st.secs)}</td><td>${fmtDate(x.st.last)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="hint">Ойыншылар әлі қосылмаған.</p>'}
      </section>
      ${detail}
      <div class="row">${btn('csv', '⬇ CSV жүктеу (Excel)', 'btn primary', db.results.length ? '' : 'disabled')}${btn('wipe', 'Барлық нәтижені тазалау', 'btn ghost danger', db.results.length ? '' : 'disabled')}</div>
      <p class="hint">Деректер тек осы компьютердің браузерінде сақталады және интернетке жіберілмейді.</p>
    </main>`;
  }

  function vPlan() { return topbar('toHome', 'Семинарда қорғау жоспары') + '<main class="wrap plan">' + window.PLAN_HTML + '</main>'; }

  const VIEWS = { home: vHome, players: vPlayers, menu: vMenu, game: vGame, end: vEnd, settings: vSettings, gate: vGate, teacher: vTeacher, plan: vPlan };
  function render() {
    applyBodyClasses();
    if ((S.screen === 'game' && !S.run) || (S.screen === 'end' && !S.end)) S.screen = child() ? 'menu' : 'home';
    if (S.screen === 'teacher' && !S.teacherOk) S.screen = 'home';
    root.innerHTML = (VIEWS[S.screen] || vHome)();
    const f = root.querySelector('#pname, #gate'); if (f) f.focus();
  }

  // ---------- оқиғалар ----------
  const ACT = {
    toHome: () => go('home'),
    toPlayers: () => { S.err = ''; go('players'); },
    toMenu: () => { S.run = null; go('menu'); },
    toSettings: () => go('settings'),
    toPlan: () => go('plan'),
    toGate: () => { if (S.teacherOk) return go('teacher'); S.err = ''; S.gate = { a: 3 + Math.floor(Math.random() * 6), b: 3 + Math.floor(Math.random() * 6) }; go('gate'); },
    gateOk: () => { const v = Number((document.getElementById('gate') || {}).value); if (v === S.gate.a * S.gate.b) { S.teacherOk = true; S.err = ''; go('teacher'); } else { S.err = 'Жауап қате. Қайталап көріңіз.'; render(); } },
    pickAv: (v) => { S.newAv = v; const n = document.getElementById('pname'); const keep = n ? n.value : ''; render(); const m = document.getElementById('pname'); if (m) m.value = keep; },
    addChild: () => {
      const name = ((document.getElementById('pname') || {}).value || '').trim();
      if (name.length < 2) { S.err = 'Баланың атын жазыңыз'; return render(); }
      const c = E.store.newChild(name, S.newAv || D.AVATARS[0]); db.children.push(c); save();
      S.err = ''; S.newAv = null; S.childId = c.id; go('menu');
    },
    pickChild: (v) => { S.childId = v; go('menu'); speak('Сәлем, ' + child().name + '! Ойын таңда'); },
    play: (v) => startGame(v),
    again: () => startGame(S.game),
    speak: () => speakTask(),
    choose: (v) => choose(v),
    mL: (v) => matchClick('L', Number(v)),
    mR: (v) => matchClick('R', Number(v)),
    seq: (v) => seqClick(Number(v)),
    setLvl: (v, el) => { set().levels[el.dataset.g] = Number(v); save(); render(); },
    setN: (v) => { set().perRound = Number(v); save(); render(); },
    setH: (v) => { set().hintAfter = Number(v); save(); render(); },
    tPick: (v) => { S.tchild = v; render(); },
    tSettings: (v) => { S.childId = v; go('settings'); },
    delChild: (v) => { const c = db.children.find((x) => x.id === v); if (c && confirm(c.name + ' және оның барлық нәтижесі өшіріледі. Жалғастырасыз ба?')) { db.children = db.children.filter((x) => x.id !== v); db.results = db.results.filter((r) => r.child !== v); if (S.childId === v) S.childId = null; S.tchild = null; save(); render(); } },
    csv: () => exportCsv(),
    wipe: () => { if (confirm('Барлық ойын нәтижелері өшіріледі (ойыншылар сақталады). Жалғастырасыз ба?')) { db.results = []; save(); render(); } }
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
  // Пернетақтадан ойнау: 1–4 сандары нұсқаны таңдайды, R — тапсырманы қайта тыңдау
  document.addEventListener('keydown', (e) => {
    if (S.screen !== 'game' || e.target.tagName === 'INPUT') return;
    if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') return speakTask();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) { const opts = root.querySelectorAll('.play .opt'); if (opts[n - 1]) opts[n - 1].click(); }
  });

  const start = (location.hash.match(/^#\/(\w+)/) || [])[1];
  if (start === 'plan') S.screen = 'plan';
  render();
})();
