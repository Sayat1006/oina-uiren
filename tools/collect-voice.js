// Ойында айтылатын барлық сөйлемді жинайды → tools/phrases.json
// Іске қосу: node tools/collect-voice.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {}, Math, Date, console, fetch: () => Promise.reject(new Error('no fetch')), performance: { now: () => 0 } };
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const D = ctx.window.DATA, E = ctx.window.ENGINE;

const out = new Map();
const add = (parts, style) => E.partsToClips(parts, style).forEach((c) => out.set(c.k, { key: c.k, text: c.text, style: c.style }));

// 1) Генераторлар: әр ойын, әр деңгей, көп рет
for (const g of Object.keys(E.MAKE)) {
  for (let level = 1; level <= 4; level++) {
    for (let rep = 0; rep < 800; rep++) {
      for (const t of E.MAKE[g](level, 8)) {
        add(t.voice || [t.prompt], 'say');
        if (t.kind === 'seq') t.steps.forEach((s) => add(s.label, 'say'));
        if (t.kind === 'sort') t.cards.forEach((c) => add(c.label, 'say'));
        if (t.kind === 'match') t.left.forEach((c) => add(c.label, 'say'));
      }
    }
  }
}
// 2) Деректердегі барлық сыныптау мен реттілік жазулары (кездейсоқ іріктеуде қалып қоймасын)
[D.NATURE_SORTS, [D.SAFE_SORT]].forEach((arr) => arr.forEach((s) => s.a.concat(s.b).forEach((c) => add(c[1], 'say'))));
[D.CYCLES, D.ROAD_SEQ].forEach((arr) => arr.forEach((r) => r.steps.forEach((s) => add(s[1], 'say'))));
D.DAYS.forEach((d) => add(d, 'say'));
// 3) Тұрақты сөйлемдер мен эмоциялар
Object.values(E.LINES).forEach(([text, style]) => add(text, style));
D.PRAISE.forEach((t) => add(t, 'cheer'));
D.TRY.forEach((t) => add(t, 'calm'));
D.MOVES.forEach((m) => add(m.text, 'cheer'));
// 4) Сандар: санау және ойында кездесуі мүмкін мәндер
for (let n = 0; n <= 120; n++) add(n, 'say');
for (let n = 130; n <= 2000; n += 10) add(n, 'say');

const list = [...out.values()].sort((a, b) => a.key.localeCompare(b.key));
fs.writeFileSync(path.join(__dirname, 'phrases.json'), JSON.stringify(list, null, 1));
const by = {}; list.forEach((p) => { by[p.style] = (by[p.style] || 0) + 1; });
console.log('phrases', list.length, by);
