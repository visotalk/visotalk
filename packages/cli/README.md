# visotalk

Explainer videos whose timeline is the narration: write one as `doc.tsx`, check it, and render it to MP4. The document holds the
narration, the pictures it shows (parts of ordinary React) and the words each thing appears on; the engine times every word and solves
the timeline from them, so a rewritten line, another voice or another language keeps the picture in sync, and the same document renders
to the same frames every time.

```sh
npx visotalk validate doc.tsx
npx visotalk render   doc.tsx      # → .visotalk/<id>/out/final.mp4

# or install once; the command is then `visotalk`
npm i -g visotalk
visotalk validate doc.tsx
```

The commands are listed in the header of the executable and in the agent skill that ships with VisoTalk
(`skills/visotalk/SKILL.md`): `validate`, `prepare`, `sheet`, `still`, `design`, `review`, `qa`, `render`,
`play`, `schema`.

## Recorded narration and sound

`visotalk recording take.mp4 --out doc.tsx` transcribes an original audio/video file through MiniMax `asr-1.0`. Set `MINIMAX_API_KEY` (and optionally `MINIMAX_BASE_URL`); supported recognition languages are English and Chinese, and the document takes the language that was spoken (`--lang` only hints the recognizer). Files must have an audio stream and be at most one hour. Video must have a constant frame rate. The generated document keeps the original media, measured word times, pauses, dimensions and exact frame-rate ratio. `prepare` uses that recording rather than synthesizing speech. Edit captions with `text=`, keeping speech, line order and measured timings unchanged. Only when the person asks, `--trim fillers` cuts hesitations and `--trim fillers,pauses[=0.8]` also shortens silences between words to that many seconds: picture and sound are cut together at frame edges into a `-trimmed` file beside the original, before anything is drawn (the transcript is cached under `.visotalk/recordings/`, so deciding later costs no second recognition).

Declare uploaded music/effects as audio assets and place them with `Sound`. Volume and ducking are dB; fades are seconds. `render doc.tsx --audio narration|mix|effects` exports an MP3 bus. `render doc.tsx --layer mov|webm` exports a transparent ProRes 4444 or VP9 layer, including effects but excluding narration. `render doc.tsx --over` composites graphics over the original video as MP4. These recording outputs retain the source dimensions, frame count and rational frame rate. Music generation is deferred; provide your own licensed audio.

## Styles

`visotalk style list` lists the built-in styles, one line each with the kinds of video it is made for, its look and what it fits; `style show stage-light` (or a pack directory) prints its configuration and its components. `style use stage-light doc.tsx` copies the complete pack into the work's `style/` and applies its tokens, caption skin included, as document literals. An existing copy is never overwritten. `style check doc.tsx` checks the local copy and document, reports locked-field disagreements and missing `STYLE.md` sections, and regenerates section 8 of `STYLE.md` from the components' literal `meta` exports. Checks never execute a component module. Adapting a work's copy does not change its source style.

## Requirements

- Node.js 22.12 or later and `ffmpeg` on the `PATH`.
- Python 3.9 or later.
- Rendering uses a pinned `chrome-headless-shell` ([Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)).
- Narration uses a local [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) model, and word timing (English) a wav2vec2 aligner, both through Python.

`validate` and `schema` need none of these. `visotalk doctor` shows what is missing and `visotalk doctor --fix` installs it into
`~/.visotalk` (about 1 GB, checked against fixed sizes and SHA-256 sums); `ffmpeg` and Python are yours to install. To use your own copies instead,
set `VISOTALK_CHROME` (a chrome-headless-shell binary), `KOKORO_DIR` (a folder with `kokoro-v1.0.onnx` and `voices-v1.0.bin`) and
`VISOTALK_PYTHON` (a Python with `kokoro-onnx`, `soundfile`, `torch` and `torchaudio`). `VISOTALK_HOME` moves `~/.visotalk`; keep that path
short, because narration fails under one longer than about 90 characters.

## License

MIT.
