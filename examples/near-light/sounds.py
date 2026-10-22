"""The sound library of near-light: every one-shot and bed the document places with <Sound>, synthesised from a fixed seed.

Run `python3 sounds.py` in this directory to write audio/*.wav (48 kHz, 16-bit). The document decides when each plays; nothing here knows the
film's timeline except the lengths it was cut to (a riser ends on the downbeat it leads into; a pad lasts the bars it holds).
Needs numpy and scipy.
"""
import os
import wave

import numpy as np
from scipy.signal import fftconvolve, lfilter

SR = 48000
BEAT = 0.6  # 100 BPM
rng = np.random.default_rng(424242)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')


def note(name):
    names = 'C C# D D# E F F# G G# A A# B'.split()
    pitch, octave = name[:-1], int(name[-1])
    return 440 * 2 ** ((names.index(pitch) + 12 * (octave + 1) - 69) / 12)


def t_axis(seconds):
    return np.arange(int(round(seconds * SR))) / SR


def write(name, x, peak=0.9):
    """Mono or (2, n) stereo, scaled so its loudest sample is `peak`."""
    x = np.atleast_2d(x)
    x = x / (np.abs(x).max() + 1e-12) * peak
    data = (np.clip(x.T, -1, 1) * 32767).astype('<i2')
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(x.shape[0])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# one room for everything: a 3.2 s exponential tail, stereo
IR = rng.standard_normal((2, int(3.2 * SR))) * np.exp(-6.9 * t_axis(3.2) / 3.2)
IR[:, : int(0.02 * SR)] = 0
IR /= np.sqrt((IR ** 2).sum(axis=1, keepdims=True))


def room(x, wet, tail=0.0):
    """Stereo dry + reverb; `tail` seconds of silence are added first so the room can ring out."""
    x = np.atleast_2d(x)
    if x.shape[0] == 1:
        x = np.vstack([x, x])
    x = np.hstack([x, np.zeros((2, int(tail * SR)))])
    w = np.vstack([fftconvolve(x[c], IR[c])[: x.shape[1]] for c in range(2)])
    return x + wet * w


def pan(x, p):
    """Equal-power pan of a mono signal, p in -1..1."""
    a = (p + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)])


def biquad_band(x, centre, q, block=256):
    """A band-pass whose centre moves (an array, one value per sample), in blocks."""
    y, zi = np.zeros_like(x), np.zeros(2)
    for i in range(0, len(x), block):
        f = centre[min(i + block // 2, len(centre) - 1)]
        w0 = 2 * np.pi * min(f, SR * 0.45) / SR
        alpha = np.sin(w0) / (2 * q)
        b = np.array([alpha, 0, -alpha])
        a = np.array([1 + alpha, -2 * np.cos(w0), 1 - alpha])
        y[i:i + block], zi = lfilter(b / a[0], a / a[0], x[i:i + block], zi=zi)
    return y


def one_pole_hp(x, f):
    a = np.exp(-2 * np.pi * f / SR)
    return lfilter([(1 + a) / 2, -(1 + a) / 2], [1, -a], x)


# ---------- pads: band-limited additive voices; the cutoff is a soft roll-off over the harmonics ----------

def voice(freq, seconds, cutoff, kind='saw', glide=None):
    """One oscillator with harmonics up to 12 kHz. `glide` (a factor) slides the pitch exponentially over the whole length."""
    t = t_axis(seconds)
    f = freq * (glide ** (t / seconds) if glide else 1)
    phase = 2 * np.pi * np.cumsum(f) / SR
    out = np.zeros_like(t)
    fc = cutoff if np.isscalar(cutoff) else cutoff
    for n in range(1, 64):
        if freq * n > 12000:
            break
        if kind == 'tri' and n % 2 == 0:
            continue
        amp = (1 / n) if kind == 'saw' else (1 / n ** 2)
        roll = 1 / (1 + (f * n / fc) ** 4)  # 24 dB/oct-ish
        out += amp * roll * np.sin(n * phase)
    return out


def envelope(seconds, attack, release):
    t = t_axis(seconds)
    e = np.minimum(1, t / max(attack, 1e-4))
    return e * np.clip((seconds - t) / max(release, 1e-4), 0, 1)


def pad(notes, hold, cutoff, attack, release=0.8, glide=None, cut_end=None):
    """A chord held for `hold` seconds then released; voices spread across the stereo field."""
    seconds = hold + release
    mix = np.zeros((2, int(round(seconds * SR))))
    for i, n in enumerate(notes):
        f = note(n)
        c = cutoff if cut_end is None else cutoff * (cut_end / cutoff) ** (t_axis(seconds) / seconds)
        v = 0.5 * voice(f, seconds, c, 'saw', glide) + 0.5 * voice(f * 2 ** (7 / 1200), seconds, c, 'saw', glide) \
            + 0.6 * voice(f / 2, seconds, c, 'tri', glide)
        level = 0.35 if n.endswith('5') else 1.0
        mix += pan(v * level * envelope(seconds, attack, release), (i / max(1, len(notes) - 1) - 0.5) * 0.8)
    return room(mix, 0.6)


DM9 = ['A3', 'C4', 'E4', 'F4']          # minor ninth over D: while accelerating
DMAJ9 = ['A3', 'C#4', 'E4', 'F#4', 'F#5']  # major ninth: the bright crowded sky at 0.99
GSUS = ['D3', 'G3', 'A3', 'D4']


def sine_loop(freq, cycles):
    """A sine cut to a whole number of cycles, so `loop` repeats it without a click."""
    t = t_axis(cycles / freq)
    return np.sin(2 * np.pi * freq * t)


def tri_loop(freq, seconds):
    t = t_axis(seconds)
    x = sum(((-1) ** k) / (2 * k + 1) ** 2 * np.sin(2 * np.pi * (2 * k + 1) * freq * t) for k in range(6))
    return lfilter([0.2], [1, -0.8], x)


# ---------- hits ----------

def kick(seconds=1.0):
    t = t_axis(seconds)
    f = np.where(t < 0.09, 150 * (44 / 150) ** (t / 0.09), 44 * (38 / 44) ** ((t - 0.09) / max(seconds - 0.09, 1e-3)))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.9 / seconds)
    click = one_pole_hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) * 0.25
    return body + click


def impact():
    t = t_axis(1.6)
    return room(one_pole_hp(rng.standard_normal(len(t)), 500) * np.exp(-t * 6.9 / 1.6), 1.0, tail=1.0)


def riser(seconds):
    """Noise through a band-pass that opens from 250 Hz to 7 kHz, swelling, and stopping dead at its end: place it to end on the downbeat."""
    t = t_axis(seconds)
    centre = 250 * (7000 / 250) ** (t / seconds)
    x = biquad_band(rng.standard_normal(len(t)), centre, 1.1)
    gain = 1e-4 * (1 / 1e-4) ** (t / seconds)
    return room(x * gain, 0.35)


def ping(freq):
    t = t_axis(0.4)
    x = np.sin(2 * np.pi * freq * t) * np.minimum(1, t / 0.003) * np.exp(-t * 6.9 / 0.35)
    out = np.zeros(int(1.8 * SR))
    for k in range(5):  # an eighth-note echo
        d = int(k * BEAT / 2 * SR)
        out[d:d + len(x)] += x * 0.38 ** k
    return room(out, 0.5)


def tick(freq, seconds, level=1.0):
    """One light-clock tick at the start of a file `seconds` long: looped, it ticks once a period."""
    t = t_axis(seconds)
    n = int(0.025 * SR)
    burst = biquad_band(rng.standard_normal(n), np.full(n, freq), 9) * np.exp(-t[:n] / 0.006)
    x = np.zeros(len(t))
    x[:n] = burst * level
    return x


def brake():
    """The ship stops in one bar: the chord, the bass and the sub slide two octaves down, and a band of noise falls with them."""
    seconds = 2.4
    t = t_axis(seconds)
    chord = pad(DMAJ9, seconds - 0.05, 3200, 0.02, release=0.05, glide=0.25, cut_end=140)[:, : len(t)]
    fade = np.exp(-t * 2.2)
    sub = np.sin(2 * np.pi * np.cumsum(note('D1') * 0.5 ** (t / seconds)) / SR) * (1 - t / seconds) * 0.9
    noise = biquad_band(rng.standard_normal(len(t)), 3200 * (250 / 3200) ** (t / seconds), 2) * np.exp(-t * 3.8) * 0.5
    return chord * fade * 0.8 + pan(sub, 0) + pan(noise, 0)


def breath():
    """The bar of near silence after the stop: a faint high chord."""
    seconds = 2.4
    mix = sum(pan(np.sin(2 * np.pi * note(n) * t_axis(seconds)) * envelope(seconds, 0.6, 0.2), 0.4 if i % 2 else -0.4)
              for i, n in enumerate(['A4', 'C5', 'E5', 'F5']))
    return room(mix, 0.8, tail=1.0)


def digits():
    """The digits of c^2 rolling (a rattle that thins out) and each landing (a pentatonic ping), cut to the document's timing:
    the roll starts with the file and digit k lands at 0.3 + 0.07 (k + 1) s."""
    lands = [0.3 + 0.07 * (k + 1) for k in range(17)]
    seconds = lands[-1] + 1.5
    out = np.zeros((2, int(seconds * SR)))
    t = 0.05
    while t < lands[-1]:
        left = sum(1 for s in lands if s > t) / 17
        if rng.random() < left:
            x = tick(3000 + rng.random() * 6000, 0.03, 0.08 * left + 0.02)
            i = int(t * SR)
            out[:, i:i + len(x)] += pan(x, (rng.random() - 0.5) * 1.4)
        t += 0.028
    penta = [note(n) for n in ['D6', 'E6', 'F#6', 'A6', 'B6', 'D7']]
    for k, s in enumerate(lands):
        f = penta[k % 6] * (2 if k >= 12 else 1)
        tt = t_axis(0.35)
        x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6.9 / 0.35) * 0.025
        i = int(s * SR)
        out[:, i:i + len(x)] += pan(x, (k / 16 - 0.5) * 1.2)
    return room(out, 0.4)


if __name__ == '__main__':
    write('pad-dm9-dark', pad(DM9, 12.0, 700, 1.5), 0.5)
    write('pad-dm9-mid', pad(DM9, 7.2, 1600, 0.8), 0.45)
    write('pad-dm9-bright', pad(DM9, 2.4, 3000, 0.6), 0.4)
    write('pad-dmaj9', pad(DMAJ9, 4.8, 4200, 0.8), 0.55)
    write('pad-gsus', pad(GSUS, 2.4, 1500, 0.8), 0.4)
    write('pad-dm9-hit', pad(DM9, 5.2, 1700, 0.04), 0.5)
    write('sub', sine_loop(note('D1'), 88), 0.9)
    write('bass', tri_loop(note('A1'), 2.4), 0.6)
    write('kick', kick(1.0), 0.95)
    write('kick-long', kick(2.4), 0.95)
    write('impact', impact(), 0.7)
    for name, seconds in [('riser-short', 0.45), ('riser-bar', 2.4), ('riser-long', 2.0), ('riser-end', 1.8)]:
        write(name, riser(seconds)[:, : int(round(seconds * SR))], 0.6)
    for k, n in enumerate(['C7', 'E7', 'A7', 'E8']):
        write(f'ping-{k + 1}', ping(note(n)), 0.35)
    write('tick-ship', tick(1800, BEAT), 0.5)
    # the outside clock ticks once per 0.6 s of its own time, so gamma times faster: one loop per speed
    for name, gamma in [('tick-out-1', 1.0), ('tick-out-030', 1.048), ('tick-out-060', 1.25), ('tick-out-090', 2.294), ('tick-out-099', 7.089)]:
        write(name, tick(2600, BEAT / gamma), 0.4)
    write('brake', brake(), 0.8)
    write('breath', breath(), 0.25)
    write('digits', digits(), 0.4)
