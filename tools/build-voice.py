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
    # length: сөйлеу ұзақтығы (1.0 — модельдің қалыпты жылдамдығы; үлкен болған сайын баяу).
    # Ерекше білім беруді қажет ететін оқушыға арналғандықтан бәрі әдейі баяу жазылады.
    # pause: сөйлемдер арасындағы үзіліс (секунд).
    # lufs: дыбыс қаттылығы (EBU R128). Барлық файл бірдей қаттылықта естіледі, мадақ сәл қаттырақ, қолдау сәл ақырын.
    'say':   dict(length=1.40, noise=0.55, noise_w=0.70, pitch=1.03, lufs=-16, pause=0.55),
    'cheer': dict(length=1.22, noise=0.75, noise_w=0.90, pitch=1.10, lufs=-15, pause=0.40),
    'calm':  dict(length=1.50, noise=0.45, noise_w=0.60, pitch=0.99, lufs=-17.5, pause=0.65),
    'num':   dict(length=1.35, noise=0.50, noise_w=0.65, pitch=1.03, lufs=-16, pause=0.30),
}
VERSION = 'clear3'  # стиль өзгерсе, файлдар қайта жазылуы үшін

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
        sid = hashlib.sha1(f"{VERSION}|{args.speaker}|{p['key']}".encode('utf-8')).hexdigest()[:12]
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
        sr = voice.config.sample_rate
        gap = b'\x00\x00' * int(sr * st['pause'])
        with wave.open(wav_path, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
            # Әр сөйлем бөлек синтезделеді, арасына үзіліс қосылады
            for i, chunk in enumerate(voice.synthesize(speakable(p['text']), syn_config=cfg)):
                if i:
                    w.writeframes(gap)
                w.writeframes(chunk.audio_int16_bytes)
        # Тембр, төменгі гуілді кесу, басы мен соңындағы үнсіздікті алу, жұмсақ кіріс/шығыс (шертпесіз)
        base = (f"asetrate={int(sr * st['pitch'])},aresample={sr},atempo={1 / st['pitch']:.4f},highpass=f=70,"
                f"silenceremove=start_periods=1:start_threshold=-50dB,"
                f"areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                f"afade=t=in:d=0.012,areverse,afade=t=in:d=0.04,areverse,apad=pad_dur=0.05")
        # Қаттылықты екі өтуде теңестіру: алдымен өлшеу, сосын сызықтық түзету
        ln = f"loudnorm=I={st['lufs']}:TP=-1.5:LRA=11"
        # Өте қысқа сөз (мысалы, «бір») 0,4 с-тан қысқа болса, қаттылықты өлшеу мүмкін емес: өлшеуде файл 4 рет қайталанады
        r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav_path, '-af', base + ',aloop=loop=3:size=2000000,' + ln + ':print_format=json', '-f', 'null', '-'],
                           capture_output=True, text=True, check=True)
        m = json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])
        ln2 = (f"{ln}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
               f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav_path, '-af', base + ',' + ln2, '-ac', '1', '-ar', str(sr), '-b:a', '64k',
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
