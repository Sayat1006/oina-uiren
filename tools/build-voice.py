"""Қазақша дауыс файлдарын жасайды (ISSAI KazakhTTS, Piper моделі) → assets/voice/*.mp3 + manifest.json

Қажет: pip install piper-tts; ffmpeg; модель kk-issai-high.onnx (+ .onnx.json):
  https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-kk-issai-high.tar.gz
Іске қосу:
  node tools/collect-voice.js
  python tools/build-voice.py --model path/to/kk-issai-high.onnx [--speaker 3]

Эмоция: әр стильге сөйлеу жылдамдығы, интонацияның еркіндігі және дауыс биіктігі бөлек беріледі.
  say   — анық, сабырлы нұсқаулық
  cheer — қуанышты, жылдамырақ, жоғарырақ дауыс (мадақ)
  calm  — жұмсақ, баяу, қолдаушы дауыс (қате болғанда, тыныс алу жаттығуы)
  num   — сандар
"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice')

STYLES = {
    'say':   dict(length=1.06, noise=0.55, noise_w=0.75, pitch=1.03, vol=1.00),
    'cheer': dict(length=0.92, noise=0.78, noise_w=0.95, pitch=1.10, vol=1.12),
    'calm':  dict(length=1.18, noise=0.45, noise_w=0.60, pitch=0.99, vol=0.92),
    'num':   dict(length=1.00, noise=0.50, noise_w=0.70, pitch=1.03, vol=1.00),
}

ONES = ['нөл', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз']
TENS = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан']


def kk_num(n):
    n = int(n)
    if n == 0:
        return 'нөл'
    out = []
    th, h, t, o = n // 1000, n % 1000 // 100, n % 100 // 10, n % 10
    if th:
        out.append('мың' if th == 1 else kk_num(th) + ' мың')
    if h:
        out.append('жүз' if h == 1 else ONES[h] + ' жүз')
    if t:
        out.append(TENS[t])
    if o:
        out.append(ONES[o])
    return ' '.join(out)


def speakable(text):
    # Мәтін ішіндегі цифрларды сөзбен жазу (мысалы, «101 нөмірін теру»)
    text = re.sub(r'\d+', lambda m: kk_num(m.group(0)), text)
    return text.replace('«', '').replace('»', '').replace('—', ',')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--speaker', type=int, default=3)  # 3 = ISSAI_KazakhTTS_F1_Raya (әйел дауысы)
    args = ap.parse_args()

    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(args.model)
    phrases = json.load(open(os.path.join(ROOT, 'tools', 'phrases.json'), encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    todo = []
    for p in phrases:
        sid = hashlib.sha1(f"{args.speaker}|{p['key']}".encode('utf-8')).hexdigest()[:12]
        name = f"{p['style']}-{sid}.mp3"
        manifest[p['key']] = name
        if not os.path.exists(os.path.join(OUT, name)):
            todo.append((p, name))
    print(f'phrases: {len(phrases)}, new: {len(todo)}')

    def synth(item):
        p, name = item
        st = STYLES[p['style']]
        cfg = SynthesisConfig(speaker_id=args.speaker, length_scale=st['length'], noise_scale=st['noise'], noise_w_scale=st['noise_w'])
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            wav_path = tmp.name
        with wave.open(wav_path, 'wb') as w:
            voice.synthesize_wav(speakable(p['text']), w, syn_config=cfg)
        sr = 22050
        af = (f"asetrate={int(sr * st['pitch'])},aresample={sr},atempo={1 / st['pitch']:.4f},"
              f"volume={st['vol']},silenceremove=start_periods=1:start_threshold=-50dB,"
              f"areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.05")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav_path, '-af', af, '-ac', '1', '-ar', '22050', '-b:a', '40k',
                        os.path.join(OUT, name)], check=True)
        os.unlink(wav_path)

    # Синтез кезекпен орындалады
    for i, item in enumerate(todo):
        synth(item)
        if (i + 1) % 100 == 0:
            print(f'  {i + 1}/{len(todo)}', flush=True)

    keep = set(manifest.values())
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in keep:
            os.unlink(os.path.join(OUT, f))
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('done', len(manifest))


if __name__ == '__main__':
    sys.exit(main())
