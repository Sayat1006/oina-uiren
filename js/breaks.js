/* Сергіту сәті: қимыл, тыныс алу, көпіршіктер, көз жаттығуы, «Жұбын тап». */
window.BREAKS = (function () {
  const D = window.DATA;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const NUMS = ['бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз', 'он'];

  function start(key, host, api) {
    const timers = [];
    let raf = null, stopped = false;
    const T = (f, ms) => { const id = setTimeout(() => { if (!stopped) f(); }, ms); timers.push(id); return id; };
    const I = (f, ms) => { const id = setInterval(() => { if (!stopped) f(); }, ms); timers.push(id); return id; };
    const stop = () => { stopped = true; timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); if (raf) cancelAnimationFrame(raf); };
    const finish = () => { stop(); api.done(); };
    const startBtn = (text, cb) => {
      host.innerHTML = `<div class="brk-intro">${api.mascot('happy', 130)}<p class="big">${text}</p><button class="btn big primary" data-b="go">▶ Бастау</button></div>`;
      host.querySelector('[data-b=go]').addEventListener('click', cb);
      api.speak(text);
    };
    ({ move, breath, bubbles, eyes, memory })[key]();
    return stop;

    // 1. Қимыл жаттығуы
    function move() {
      const moves = shuffle(D.MOVES).slice(0, 4);
      const beat = api.calm ? 1600 : 1200;
      startBtn('Орныңнан тұр! Ақботамен бірге қимылдайық', () => step(0));
      let cur = -1;
      function step(i) {
        if (i <= cur) return; cur = i;
        if (i >= moves.length) return finish();
        const m = moves[i];
        host.innerHTML = `<div class="mv">
          <div class="mv-step">${i + 1} / ${moves.length}</div>
          <div class="mv-fig a-${m.anim}"><span class="emo">${m.emoji}</span></div>
          <h1>${m.text}</h1>
          <div class="mv-count" aria-live="polite"><b>0</b> / ${m.count}</div>
          <div class="mv-dots">${Array.from({ length: m.count }, () => '<i></i>').join('')}</div>
          <button class="btn ghost" data-b="next">Келесі ➜</button>
        </div>`;
        host.querySelector('[data-b=next]').addEventListener('click', () => { clearAll(); step(i + 1); });
        api.speak(m.text);
        let n = 0;
        const iv = I(() => {
          n++; api.sfx('beat');
          host.querySelector('.mv-count b').textContent = n;
          const d = host.querySelectorAll('.mv-dots i')[n - 1]; if (d) d.className = 'on';
          if (n <= 10) api.speak(NUMS[n - 1]);
          if (n >= m.count) { clearInterval(iv); T(() => step(i + 1), 1300); }
        }, beat);
        function clearAll() { clearInterval(iv); }
      }
    }

    // 2. Шарды үрлейміз (тыныс алу)
    function breath() {
      const cycles = 4;
      startBtn('Ыңғайлы отыр. Шармен бірге баяу дем аламыз', () => {
        host.innerHTML = `<div class="br">
          <div class="br-stage"><div class="br-ball"><span class="emo">🎈</span></div></div>
          <h1 class="br-text">Дайындал…</h1>
          <div class="mv-dots">${Array.from({ length: cycles }, () => '<i></i>').join('')}</div>
        </div>`;
        const ball = host.querySelector('.br-ball'), txt = host.querySelector('.br-text');
        let c = 0;
        const cycle = () => {
          if (c >= cycles) return finish();
          txt.textContent = 'Мұрныңмен дем ал…'; api.speak('Дем ал');
          ball.style.transition = 'transform 4s ease-in-out'; ball.style.transform = 'scale(1.9)';
          T(() => { txt.textContent = 'Ұста…'; }, 4000);
          T(() => {
            txt.textContent = 'Ақырын үрле…'; api.speak('Ақырын үрле');
            ball.style.transform = 'scale(1)';
          }, 5200);
          T(() => { const d = host.querySelectorAll('.mv-dots i')[c]; if (d) d.className = 'on'; c++; cycle(); }, 9400);
        };
        T(cycle, 800);
      });
    }

    // 3. Көпіршіктер
    function bubbles() {
      const goal = 15;
      startBtn('Көпіршіктерді басып жар! ' + goal + ' көпіршік жарсаң болды', () => {
        host.innerHTML = `<div class="bb"><div class="bb-count">🫧 <b>0</b> / ${goal}</div><div class="bb-area"></div></div>`;
        const area = host.querySelector('.bb-area'), cnt = host.querySelector('.bb-count b');
        const cols = ['#7FD3FF', '#B49CFF', '#FF9EC7', '#8FE3B5', '#FFD27F'];
        let popped = 0;
        const spawn = () => {
          if (area.children.length > 9) return;
          const b = document.createElement('button');
          const size = 70 + Math.random() * 60;
          b.className = 'bubble'; b.setAttribute('aria-label', 'Көпіршік');
          b.style.width = b.style.height = size + 'px';
          b.style.left = (Math.random() * 86) + '%';
          b.style.setProperty('--c', cols[Math.floor(Math.random() * cols.length)]);
          b.style.animationDuration = (api.calm ? 11 : 7) + Math.random() * 4 + 's';
          b.addEventListener('animationend', () => b.remove());
          b.addEventListener('click', () => {
            if (b.classList.contains('popped')) return;
            b.classList.add('popped'); api.sfx('pop'); popped++; cnt.textContent = popped;
            setTimeout(() => b.remove(), 300);
            if (popped >= goal) T(finish, 500);
          });
          area.appendChild(b);
        };
        spawn(); I(spawn, api.calm ? 1100 : 750);
      });
    }

    // 4. Көбелекті бақыла (көз жаттығуы)
    function eyes() {
      startBtn('Басыңды қозғалтпа. Көбелекті тек көзіңмен бақыла', () => {
        host.innerHTML = `<div class="ey"><div class="ey-area"><span class="ey-b emo">🦋</span></div><h1 class="ey-t">Солға — оңға</h1><div class="ey-bar"><i></i></div></div>`;
        const area = host.querySelector('.ey-area'), b = host.querySelector('.ey-b'), t = host.querySelector('.ey-t'), bar = host.querySelector('.ey-bar i');
        const phases = [['Солға — оңға', (p) => [Math.sin(p * 6.28 * 2), 0]], ['Жоғары — төмен', (p) => [0, Math.sin(p * 6.28 * 2)]],
          ['Шеңбер бойымен', (p) => [Math.cos(p * 6.28 * 2), Math.sin(p * 6.28 * 2)]], ['Сегіз сызамыз', (p) => [Math.sin(p * 6.28 * 2), Math.sin(p * 6.28 * 4) / 2]]];
        const per = api.calm ? 8000 : 6000, total = per * phases.length;
        const t0 = performance.now(); let last = -1;
        const loop = (now) => {
          if (stopped) return;
          const el = Math.max(0, now - t0); if (el >= total) return finish();
          const pi = Math.floor(el / per), p = (el % per) / per;
          if (pi !== last) { last = pi; t.textContent = phases[pi][0]; api.speak(phases[pi][0]); }
          const [x, y] = phases[pi][1](p);
          const w = area.clientWidth / 2 - 50, h = area.clientHeight / 2 - 50;
          b.style.transform = `translate(${x * w}px, ${y * h}px)`;
          bar.style.width = (el / total * 100) + '%';
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    }

    // 5. Жұбын тап (есте сақтау)
    function memory() {
      const pool = ['🍎', '🐶', '⭐', '🌸', '🚗', '🐟', '🎈', '🍌'];
      const pics = shuffle(pool).slice(0, 4);
      const cards = shuffle(pics.concat(pics)).map((e, i) => ({ i, e, open: false, ok: false }));
      let first = null, lock = false, found = 0;
      api.speak('Карталарды ашып, бірдей суреттерді тап');
      host.innerHTML = `<div class="mm"><h1>Бірдей суреттерді тап</h1><div class="mm-grid">${cards.map((c) => `<button class="mm-card" data-i="${c.i}" aria-label="Жабық карта"><span class="mm-in"><span class="mm-back">?</span><span class="mm-front emo">${c.e}</span></span></button>`).join('')}</div><p class="big">Табылды: <b>0</b> / ${pics.length}</p></div>`;
      const els = Array.from(host.querySelectorAll('.mm-card'));
      els.forEach((b) => b.addEventListener('click', () => flip(Number(b.dataset.i))));
      const draw = () => {
        cards.forEach((c) => { const b = els[c.i]; b.classList.toggle('open', c.open || c.ok); b.classList.toggle('ok', c.ok); b.setAttribute('aria-label', c.open || c.ok ? 'Ашық карта' : 'Жабық карта'); });
        host.querySelector('.mm p b').textContent = found;
      };
      const flip = (i) => {
        const c = cards[i]; if (lock || c.open || c.ok) return;
        c.open = true; api.sfx('flip');
        if (!first) { first = c; draw(); return; }
        const a = first; first = null;
        if (a.e === c.e) { a.ok = c.ok = true; found++; T(() => api.sfx('good'), 250); draw(); if (found === pics.length) T(finish, 900); }
        else { lock = true; draw(); T(() => { a.open = c.open = false; lock = false; draw(); }, api.calm ? 1400 : 1000); }
      };
    }
  }
  return { start };
})();
