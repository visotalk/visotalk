# visotalk

Write a narrated explainer video as a document (`doc.tsx`), check it, and render it to MP4. The document holds the
narration, the objects it talks about and the words each object appears on; the engine owns time, layout and rendering,
and the same document renders to the same frames every time.

```sh
npx visotalk validate doc.tsx
npx visotalk render   doc.tsx      # → .visotalk/<id>/out/final.mp4

# or install once; the command is then `visotalk`
npm i -g visotalk
visotalk validate doc.tsx
```

The commands are listed in the header of the executable and in the agent skill that ships with VisoTalk
(`skills/visotalk/SKILL.md`): `validate`, `prepare`, `sheet`, `still`, `design`, `review`, `qa`, `render`, `preview`,
`play`, `schema`.

## Requirements

- Node.js 20 or later and `ffmpeg` on the `PATH`.
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
