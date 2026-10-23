"""The score of liftoff: one continuous piece, synthesised from a fixed seed, cut to the film's narration.

Run `python3 make-music.py` in this directory to write audio/score.mp3 (44.1 kHz stereo; needs numpy, scipy and ffmpeg).
The piece follows the film: a rocket's rumble and a riser into the title, a calm and then tense pulse under the odds, a ticking
countdown through the three failures, a hush after the third, and a build that opens into A major on the word "orbit".
CUES are seconds in the film: a scene starts 0.8 s after the previous one's last line ends plus that line's hold, a line starts 0.4 s
(or its hold) after the previous one, and a word is its `t0` in `.visotalk/liftoff/voice.json` from its line's start. When a line is
rewritten, recompute them and run this again.
"""
import os
import subprocess
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 44100
LENGTH = 164.0  # the film is 160.07 s; the last chord rings out after it
BEAT = 0.625  # 96 BPM
rng = np.random.default_rng(20201004)
HERE = os.path.dirname(os.path.abspath(__file__))

CUES = {
    "title": 13.46, "book": 19.4, "odds": 38.98, "island": 57.53, "failures": 74.06,
    "fire": 78.73, "short": 92.11, "bumped": 97.38, "f0": 99.9, "flight4": 103.23, "orbit": 112.48,
    "after": 120.74, "why": 139.11, "credits": 151.13, "end": 160.07,
}

n = int(LENGTH * SR)
t = np.arange(n) / SR


def hz(name):
    names = "C C# D D# E F F# G G# A A# B".split()
    pitch, octave = name[:-1], int(name[-1])
    return 440 * 2 ** ((names.index(pitch) + 12 * (octave + 1) - 69) / 12)


def curve(*points):
    """A gain over the whole piece from (seconds, value) points, linear between them."""
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def at(x, seconds, start):
    """Add a short sound into a bus at `start` seconds."""
    i = int(start * SR)
    if i < 0:
        seconds, i = seconds[-i:], 0
    if i >= len(x):
        return
    m = min(len(seconds), len(x) - i)
    x[i:i + m] += seconds[:m]


def tone(freq, seconds, harmonics=(1, 0.5, 0.25, 0.12), detune=(0, 0.004, -0.004)):
    tt = np.arange(int(seconds * SR)) / SR
    out = np.zeros_like(tt)
    for d in detune:
        f = freq * (1 + d)
        for k, a in enumerate(harmonics, 1):
            out += a * np.sin(2 * np.pi * f * k * tt + rng.uniform(0, 6.28))
    return out / (len(detune) * sum(harmonics))


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, "low", fs=SR, output="sos"), x)


def sweep_noise(start, stop, lo, hi, power=2.0):
    """White noise through a one-pole lowpass whose cutoff rises from lo to hi Hz between start and stop seconds."""
    out = np.zeros(n)
    i0, i1 = int(start * SR), int(stop * SR)
    zi = np.zeros(1)
    block = 512
    noise = rng.standard_normal(n)
    for b in range(i0, i1, block):
        e = min(b + block, i1)
        k = ((b - i0) / (i1 - i0)) ** power
        cutoff = lo * (hi / lo) ** k
        a = 1 - np.exp(-2 * np.pi * cutoff / SR)
        y, zi = lfilter([a], [1, -(1 - a)], noise[b:e], zi=zi)
        out[b:e] = y
    return out


# ---------------------------------------------------------------------------------------------------- harmony
A, F, C, G, D, Bb = ("A2 E3 A3 C4 E4", "F2 C3 F3 A3 C4", "C3 G3 C4 E4 G4", "G2 D3 G3 B3 D4", "D3 A3 D4 F4 A4", "A#1 F2 A#2 D3 F3")
CHORDS = [
    (0, A), (8, F), (CUES["title"], "A2 E3 B3 C4 E4"),
    (CUES["book"], C), (28, G), (CUES["odds"], A), (47, F),
    (CUES["island"], "F2 C3 E3 A3 C4"), (66, C), (CUES["failures"], "D2 A2 D3 F3 A3"), (85, Bb), (CUES["bumped"] - 5, "G2 D3 G3 A#3 D4"),
    (CUES["f0"], "A1 E2 A2"), (CUES["flight4"], A), (108, F), (CUES["orbit"] - 0.2, "A2 E3 A3 C#4 E4 A4"),
    (CUES["after"], "D3 A3 D4 F#4 A4"), (128, "A2 E3 A3 C#4 E4"), (CUES["why"], A), (145, F),
    (CUES["credits"] - 1, "A2 E3 A3 C#4 E4 A4"),
]


def pad_bus():
    out = np.zeros(n)
    for k, (start, notes) in enumerate(CHORDS):
        end = CHORDS[k + 1][0] if k + 1 < len(CHORDS) else LENGTH
        dur = end - start + 4.0  # each chord rings 4 s into the next, which is how they melt
        env_len = int(dur * SR)
        e = np.ones(env_len)
        a, r = int(2.2 * SR), int(4.0 * SR)
        e[:a] = np.linspace(0, 1, a) ** 1.5
        e[-r:] = np.linspace(1, 0, r) ** 1.5
        voice = sum(tone(hz(nm), dur) for nm in notes.split()) / len(notes.split())
        at(out, voice * e, start - 1.0)
    return lowpass(out, 2600)


def chord_at(seconds):
    cur = CHORDS[0][1]
    for start, notes in CHORDS:
        if seconds >= start:
            cur = notes
    return [hz(nm) for nm in cur.split()]


def pluck(freq, seconds=0.9):
    tt = np.arange(int(seconds * SR)) / SR
    x = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(4 * np.pi * freq * tt) + 0.12 * np.sin(6 * np.pi * freq * tt)
    return x * np.exp(-tt * 6.0) * np.minimum(1, tt * 400)


def arp_bus():
    out = np.zeros(n)
    pattern = [0, 2, 4, 2, 3, 2, 4, 2]
    step = BEAT / 2
    # after the title the pulse is gentle, tense under the odds, floating on the island, half-time over the failures, then it climbs
    gain = curve((0, 0), (CUES["title"] + 1, 0), (CUES["title"] + 4, 0.22), (CUES["odds"], 0.3), (CUES["island"], 0.2), (CUES["failures"] - 1, 0.2),
                 (CUES["failures"], 0.0), (CUES["f0"] - 0.5, 0.0), (CUES["flight4"], 0.3), (CUES["orbit"] - 0.3, 0.7),
                 (CUES["orbit"], 0.65), (CUES["why"] - 4, 0.6), (CUES["why"], 0.3), (CUES["credits"], 0.22), (CUES["end"] - 2, 0.0))
    i = 0
    s = 0.0
    while s < LENGTH - 1:
        g = gain[min(int(s * SR), n - 1)]
        half = CUES["failures"] <= s < CUES["f0"]
        if g > 0.02 and (not half or i % 2 == 0):
            notes = chord_at(s)
            f = notes[min(pattern[i % 8], len(notes) - 1)] * (2 if s < CUES["orbit"] else 2)
            if CUES["island"] <= s < CUES["failures"]:
                f *= 2 if i % 4 == 0 else 1  # a high glint on the island
            at(out, pluck(f) * g, s)
        i += 1
        s += step / 2 if CUES["flight4"] + 4 < s < CUES["orbit"] else step  # sixteenths over the last bars before "orbit"
    return out


def kick(freq0=110, freq1=42, seconds=0.5):
    tt = np.arange(int(seconds * SR)) / SR
    f = freq1 + (freq0 - freq1) * np.exp(-tt * 18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)


def boom(seconds=3.2, low=38):
    tt = np.arange(int(seconds * SR)) / SR
    body = np.sin(2 * np.pi * np.cumsum(low + 60 * np.exp(-tt * 3)) / SR) * np.exp(-tt * 1.3)
    air = lowpass(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 2.2) * 0.6
    return body + air


def tick(seconds=0.05):
    tt = np.arange(int(seconds * SR)) / SR
    return np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 90) + 0.3 * rng.standard_normal(len(tt)) * np.exp(-tt * 120)


def rhythm_bus():
    out = np.zeros(n)
    # a slow heartbeat under the odds, a quiet countdown over the failures, a four-on-the-floor from the build to the title card
    s = CUES["odds"]
    while s < CUES["island"] - 1:
        at(out, kick() * 0.5, s)
        s += BEAT * 2
    s = CUES["failures"]
    while s < CUES["f0"]:
        at(out, tick() * 0.22, s)
        s += BEAT
    s = CUES["flight4"] + BEAT
    while s < CUES["why"] - 4:
        at(out, kick() * (0.55 if s > CUES["orbit"] else 0.4), s)
        if s > CUES["orbit"]:
            at(out, tick() * 0.1, s + BEAT / 2)
        s += BEAT
    return out


def hits_bus():
    out = np.zeros(n)
    at(out, boom(4.0) * 0.9, CUES["title"])
    for k in ("fire", "short", "bumped"):
        at(out, boom(2.8, 34) * 0.8, CUES[k])
    at(out, boom(5.0, 44) * 1.0, CUES["orbit"])
    return out


def noise_bus():
    out = np.zeros(n)
    # the rocket's roar, quiet and low, lifting with the clip, then the riser that lands on the title
    roar = lowpass(rng.standard_normal(n), 240) * curve((0, 0), (1.5, 0.45), (10, 0.35), (CUES["title"], 0.0), (CUES["title"] + 2, 0), (n / SR, 0))
    riser = sweep_noise(5.0, CUES["title"], 200, 9000, power=2.4) * curve((0, 0), (5, 0), (CUES["title"], 0.55), (CUES["title"] + 0.05, 0), (n / SR, 0))
    up = sweep_noise(CUES["orbit"] - 4.0, CUES["orbit"], 300, 12000, power=2.0) * curve((0, 0), (CUES["orbit"] - 4, 0), (CUES["orbit"], 0.6), (CUES["orbit"] + 0.05, 0), (n / SR, 0))
    shimmer = lowpass(rng.standard_normal(n), 9000) - lowpass(rng.standard_normal(n), 5000)
    shimmer = shimmer * curve((0, 0), (CUES["orbit"], 0), (CUES["orbit"] + 0.2, 0.1), (CUES["orbit"] + 6, 0), (n / SR, 0))
    out = roar + riser + up + shimmer
    return out


def reverb(x, seconds=2.8):
    ir = rng.standard_normal((2, int(seconds * SR))) * np.exp(-np.arange(int(seconds * SR)) / SR * 2.2)
    ir = lowpass(ir, 5000)
    return np.stack([fftconvolve(x, ir[0])[: len(x)], fftconvolve(x, ir[1])[: len(x)]]) * 0.012


def build():
    pad = pad_bus() * curve((0, 0.0), (2, 0.12), (CUES["title"] - 2, 0.4), (CUES["book"], 0.34), (CUES["odds"], 0.3), (CUES["failures"] - 2, 0.3), (CUES["failures"] + 4, 0.22),
                            (CUES["f0"] - 1, 0.3), (CUES["f0"] + 1.5, 0.03), (CUES["flight4"], 0.3), (CUES["orbit"] - 0.5, 0.45), (CUES["orbit"], 0.95), (CUES["after"], 0.7),
                            (CUES["why"], 0.45), (CUES["credits"], 0.55), (CUES["end"] + 2, 0.45), (LENGTH - 1, 0))
    sub = lowpass(np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 110 * t), 160) * curve((0, 0), (3, 0.3), (CUES["title"], 0.4), (CUES["f0"] - 1, 0.35), (CUES["f0"] + 1, 0.05), (CUES["flight4"], 0.3), (CUES["orbit"], 0.5), (CUES["end"], 0.3), (LENGTH - 1, 0))
    arp = arp_bus()
    wet = reverb(pad + arp * 0.8)
    dry_l = pad * 0.6 + arp * 0.6 + sub + rhythm_bus() + hits_bus() + noise_bus()
    stereo = np.stack([dry_l, dry_l]) + wet
    stereo = np.tanh(stereo * 0.9)
    stereo *= 0.89 / np.abs(stereo).max()
    stereo *= curve((0, 0), (0.4, 1), (LENGTH - 3, 1), (LENGTH, 0))
    return stereo


def main():
    x = build()
    wav = os.path.join(HERE, "audio", "score.wav")
    os.makedirs(os.path.dirname(wav), exist_ok=True)
    with wave.open(wav, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((x.T * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-b:a", "160k", os.path.join(HERE, "audio", "score.mp3")], check=True)
    os.remove(wav)


if __name__ == "__main__":
    main()
