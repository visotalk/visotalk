"""Synthesise narration lines with a local Kokoro model; cache by content hash.

Usage: python3 scripts/tts_lines.py <speak.json> <out_dir> <kokoro_model_dir>
speak.json: {"voice": "af_heart", "speed": 1, "lines": [{"id": "l1", "say": "..."}]}
Writes <out_dir>/<hash>.wav and prints a JSON manifest {line_id: {"file": ..., "duration": seconds}}.
"""
import hashlib, json, os, sys
import soundfile as sf

spec_path, out_dir, model_dir = sys.argv[1], sys.argv[2], sys.argv[3]
spec = json.load(open(spec_path))
voice, speed = spec.get("voice", "af_heart"), spec.get("speed", 1.0)
os.makedirs(out_dir, exist_ok=True)
kokoro = None
manifest = {}
for line in spec["lines"]:
    key = hashlib.sha1(f"{voice}|{speed}|{line['say']}".encode()).hexdigest()[:12]
    path = os.path.join(out_dir, f"{key}.wav")
    if not os.path.exists(path):
        print(f"speaking {line['id']}", file=sys.stderr, flush=True)
        if kokoro is None:
            from kokoro_onnx import Kokoro
            kokoro = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
        samples, sr = kokoro.create(line["say"], voice=voice, speed=speed, lang="en-us")
        sf.write(path, samples, sr)
    manifest[line["id"]] = {"file": f"{key}.wav", "duration": round(sf.info(path).duration, 4)}
print(json.dumps(manifest))
