"""Word times for narration clips by CTC forced alignment (torchaudio wav2vec2, English only); cached per clip.

Usage: python3 align_lines.py <speak.json> <wav_dir> <manifest.json>
speak.json: {"lines": [{"id": "l1", "say": "..."}]}   manifest.json: {line_id: {"file": "<hash>.wav", ...}} (tts_lines.py output)
Writes <wav_dir>/<hash>.words2.json and prints {line_id: [{"w", "t0", "t1", "p"}]}: one entry per whitespace token of `say`
(seconds from the clip start), so a word index in the IR means the same token here. A token with no letters
(a digit string, a symbol) gets an empty span at the end of the word before it. A line that cannot be aligned
is left out and reported on stderr. Exit 3 when torchaudio is missing.
"""
import contextlib, json, os, re, sys

spec_path, wav_dir, manifest_path = sys.argv[1:4]
lines = json.load(open(spec_path))["lines"]
manifest = json.load(open(manifest_path))
model = None
index = {}


def load_torch():
    """Imported on the first clip that is not cached: loading torch takes seconds, minutes on a busy machine, and a build command asks for every line again."""
    global BUNDLE, torch, torchaudio, F, sf
    try:
        import soundfile as sf
        import torch, torchaudio
        import torchaudio.functional as F
        from torchaudio.pipelines import WAV2VEC2_ASR_BASE_960H as BUNDLE
    except ImportError as e:
        print(f"torchaudio and soundfile are needed for word alignment: {e}", file=sys.stderr)
        sys.exit(3)
    index.update({c: i for i, c in enumerate(BUNDLE.get_labels())})


def align(wav_path, say):
    global model
    if not index:
        print("aligning words (loading torch and the aligner model; slow the first time)", file=sys.stderr, flush=True)
        load_torch()
    if model is None:
        # the first call downloads the weights, and the download notice is printed on stdout, which carries the JSON result
        with contextlib.redirect_stdout(sys.stderr):
            model = BUNDLE.get_model().eval()
    wav, sr = sf.read(wav_path, dtype="float32")
    wav = torch.from_numpy(wav)
    if sr != BUNDLE.sample_rate:
        wav = torchaudio.functional.resample(wav, sr, BUNDLE.sample_rate)
    with torch.inference_mode():
        emission, _ = model(wav[None])
        emission = torch.log_softmax(emission, -1)
    tokens = say.split()
    spoken = [re.sub(r"[^A-Z']", "", t.upper()) for t in tokens]
    letters = [w for w in spoken if w]
    if not letters:
        return []
    target = torch.tensor([[index[c] for c in "|".join(letters)]])
    path, _ = F.forced_align(emission, target, blank=0)
    probs = torch.exp(emission[0, torch.arange(emission.size(1)), path[0]])
    spans = F.merge_tokens(path[0], probs)
    frame = wav.size(0) / emission.size(1) / BUNDLE.sample_rate
    out, k, last = [], 0, 0.0
    for token, w in zip(tokens, spoken):
        key = re.sub(r"[^a-z0-9']", "", token.lower())
        if not w:
            out.append({"w": key, "t0": last, "t1": last})
            continue
        span = spans[k:k + len(w)]
        k += len(w) + 1  # the "|" between words is a token of its own
        last = round(span[-1].end * frame, 3)
        # p: how sure the aligner was of this word (mean probability of its letters); a word without letters has none
        out.append({"w": key, "t0": round(span[0].start * frame, 3), "t1": last, "p": round(sum(float(x.score) for x in span) / len(span), 2)})
    return out


result = {}
for line in lines:
    wav_path = os.path.join(wav_dir, manifest[line["id"]]["file"])
    # the suffix names the shape of an entry: bump it when the entry changes, so an older cache is not read
    cache = wav_path[:-len(".wav")] + ".words2.json"
    try:
        if not os.path.exists(cache):
            print(f"aligning {line['id']}", file=sys.stderr, flush=True)
            json.dump(align(wav_path, line["say"]), open(cache, "w"))
        result[line["id"]] = json.load(open(cache))
    except Exception as e:  # one bad clip must not hide the others
        print(f"line {line['id']} not aligned: {e}", file=sys.stderr)
print(json.dumps(result))
