"""The film's sounds (ffmpeg writes each mp3). Run from this folder: python3 make-music.py

- audio/music.mp3: the music bed of a product film, fetched rather than made and not in the repository (gitignored): "Tutorial technology"
  by PaulYudin, 2:10, Pixabay (https://pixabay.com/music/corporate-tutorial-technology-182513/), under the Pixabay Content License (free for
  commercial use, no attribution required, not to be resold on its own). The track is registered with Content ID, so a YouTube upload may get
  an automatic claim: dispute it as licensed use and cite the licence. Replace the file and its <Asset> in doc.tsx together.
- chime.mp3: the short bell a workflow station lights with (generated from a fixed seed, like the rest)
- light.mp3: the shimmer the Sun comes on with
- ding.mp3, tick.mp3, miss.mp3, swoosh.mp3: the few effects the animation is marked with (a thing arriving, a small switch, a thing
  landing early, the lockup drawing itself)"""
import os
import subprocess
import urllib.request
import wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def hz(n):  # MIDI note to frequency
    return 440 * 2 ** ((n - 69) / 12)


MUSIC = 'https://cdn.pixabay.com/audio/2023/12/22/audio_fa41605e87.mp3'
if not os.path.exists('audio/music.mp3'):
    os.makedirs('audio', exist_ok=True)
    with urllib.request.urlopen(MUSIC) as r, open('audio/music.mp3', 'wb') as f:
        f.write(r.read())
    print('audio/music.mp3 (fetched)')


def write(name, mono):
    """Write a mono signal as name.wav and name.mp3"""
    mono = (mono * 0.9 / np.max(np.abs(mono))).astype(np.float32)
    with wave.open(f'{name}.wav', 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mono * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{name}.wav', '-b:a', '160k', f'{name}.mp3'], check=True)
    print(f'{name}.mp3')


# a bell: A5 with its inharmonic partials, a quick attack and a short ring
tc = np.arange(int(SR * 0.9)) / SR
bell = sum(a * np.sin(2 * np.pi * hz(81) * r * tc) * np.exp(-tc * d) for a, r, d in [(1, 1, 6), (0.5, 2.01, 9), (0.3, 2.76, 12), (0.15, 4.07, 16)])
write('chime', bell * np.clip(tc / 0.004, 0, 1))

# a shimmer: a rising cluster of soft sines in D major, swelling in and ringing out over two seconds
ts = np.arange(int(SR * 2.4)) / SR
shimmer = np.zeros_like(ts)
for k, n in enumerate([74, 78, 81, 86, 90, 93]):
    on = k * 0.06
    tt = np.clip(ts - on, 0, None)
    shimmer += (ts >= on) * np.sin(2 * np.pi * hz(n) * tt * (1 + 0.002 * np.sin(2 * np.pi * 5 * tt))) * np.clip(tt / 0.25, 0, 1) * np.exp(-tt * 1.6)
write('light', shimmer)


# ding: a small bright bell (E6 and its partials, a soft strike, a short ring), for a thing arriving
tp = np.arange(int(SR * 0.7)) / SR
write('ding', sum(a * np.sin(2 * np.pi * hz(88) * r * tp) * np.exp(-tp * d) for a, r, d in [(1, 1, 7), (0.35, 2.0, 11), (0.18, 3.0, 16)]) * np.clip(tp / 0.003, 0, 1))

# tick: a short high click, for a small switch
tt2 = np.arange(int(SR * 0.06)) / SR
write('tick', (np.sin(2 * np.pi * 2400 * tt2) + 0.3 * rng.standard_normal(len(tt2))) * np.exp(-tt2 * 90))

# miss: two soft falling notes, for a thing landing late
tm = np.arange(int(SR * 0.5)) / SR
note = lambda f, on, ln: (tm >= on) * np.sin(2 * np.pi * f * np.clip(tm - on, 0, None)) * np.exp(-np.clip(tm - on, 0, None) * 9) * np.clip((tm - on) / 0.005, 0, 1) * (tm < on + ln)
write('miss', note(hz(64), 0, 0.5) + note(hz(60), 0.14, 0.36) + 0.4 * note(hz(52), 0.14, 0.36))

# swoosh: noise swelling through a rising band, for the lockup drawing itself
tw = np.arange(int(SR * 0.9)) / SR
noise = rng.standard_normal(len(tw))
out, lo, bp = np.zeros_like(noise), 0.0, 0.0
for i in range(len(noise)):  # a sweeping one-pole band: low-pass minus a slower low-pass
    a = 0.02 + 0.25 * (i / len(noise))
    lo += a * (noise[i] - lo)
    bp += 0.01 * (lo - bp)
    out[i] = lo - bp
write('swoosh', out * np.sin(np.pi * np.clip(tw / 0.9, 0, 1)) ** 2)
