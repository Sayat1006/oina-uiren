"""Қазақша дауыс файлдарын ElevenLabs арқылы жасайды → assets/voice/*.mp3 + manifest.json

Piper нұсқасының (build-voice.py) орнына қолданылады. Сайттың өзі өзгермейді: дауыс алдын ала
жазылып, дайын mp3 ретінде сақталады, сондықтан API кілті сайтқа ешқашан түспейді.

Қажет: ElevenLabs API кілті (Eleven v3 моделі қазақ тілін қолдайды); ffmpeg.
Іске қосу:
  export ELEVENLABS_API_KEY=...            # кілтті кодқа жазбаңыз
  node tools/collect-voice.js
  python tools/build-voice-eleven.py --voice <voice_id> [--limit 5]   # алдымен бірнеше сөйлеммен сынау

--limit N  тек алғашқы N жаңа сөйлемді жазады (дауысты тыңдап, баптауды таңдау үшін).
Piper дауысына қайту: python tools/build-voice.py --model kk-issai-high.onnx
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
piper_build = import_module('build-voice')  # kk_num/speakable қайта қолданылады

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice')
API = 'https://api.elevenlabs.io/v1/text-to-speech/'

# Эмоция Eleven v3-тің дыбыс тегтерімен ([gently], [excited] т.б.) және дауыс баптауымен беріледі.
# tempo: ffmpeg арқылы қосымша баяулату (1.0 — өзгеріссіз). ЗДЕ бар оқушы үшін бәрі баяу.
STYLES = {
    'say':   dict(tag='[calm, clear]', stability=0.5, tempo=0.88, pause=0.55),
    'cheer': dict(tag='[excited, warm]', stability=0.0, tempo=0.95, pause=0.40),
    'calm':  dict(tag='[gently, softly]', stability=0.5, tempo=0.85, pause=0.65),
    'num':   dict(tag='', stability=1.0, tempo=0.90, pause=0.30),
}
VERSION = 'eleven1'


def tts(key, voice, model, text, st):
    body = json.dumps({
        'text': (st['tag'] + ' ' + text).strip(),
        'model_id': model,
        'voice_settings': {'stability': st['stability'], 'similarity_boost': 0.8},
    }).encode('utf-8')
    req = urllib.request.Request(API + voice + '?output_format=mp3_44100_128', data=body, method='POST',
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** (attempt + 1))
                continue
            raise SystemExit(f'ElevenLabs қатесі {e.code}: {e.read()[:300].decode("utf-8", "replace")}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', required=True, help='ElevenLabs voice_id')
    ap.add_argument('--model', default='eleven_v3')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        raise SystemExit('ELEVENLABS_API_KEY орнатылмаған')

    phrases = json.load(open(os.path.join(ROOT, 'tools', 'phrases.json'), encoding='utf-8'))
    old = {}
    mpath = os.path.join(OUT, 'manifest.json')
    if os.path.exists(mpath):
        old = json.load(open(mpath, encoding='utf-8'))
    manifest, todo = {}, []
    for p in phrases:
        sid = hashlib.sha1(f"{VERSION}|{args.voice}|{args.model}|{p['key']}".encode('utf-8')).hexdigest()[:12]
        name = f"{p['style']}-{sid}.mp3"
        if os.path.exists(os.path.join(OUT, name)):
            manifest[p['key']] = name
        else:
            todo.append((p, name))
            if p['key'] in old:  # жазылғанша бұрынғы (Piper) дауысы қала береді
                manifest[p['key']] = old[p['key']]
    if args.limit:
        todo = todo[:args.limit]
    print(f'phrases: {len(phrases)}, new: {len(todo)}')

    for i, (p, name) in enumerate(todo):
        st = STYLES[p['style']]
        audio = tts(key, args.voice, args.model, piper_build.speakable(p['text']), st)
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            tmp.write(audio)
        af = (f"atempo={st['tempo']},silenceremove=start_periods=1:start_threshold=-50dB,"
              f"areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.05")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-af', af, '-ac', '1', '-ar', '44100', '-b:a', '64k',
                        os.path.join(OUT, name)], check=True)
        os.unlink(tmp.name)
        manifest[p['key']] = name
        print(f'  {i + 1}/{len(todo)} {p["style"]}: {p["text"][:50]}', flush=True)

    keep = set(manifest.values())
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in keep:
            os.unlink(os.path.join(OUT, f))
    json.dump(manifest, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('done', len(manifest))


if __name__ == '__main__':
    sys.exit(main())
