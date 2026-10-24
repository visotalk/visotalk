# Narration is the new timeline

The introduction film of VisoTalk, made with VisoTalk itself: English, 16:9, about three and three-quarter minutes, in a young American man's
voice (`minimax:English_Explanatory_Man`, at 1.1×), with a Chinese version from the same document (`doc.zh-CN.json`). One picture runs
through its first half: a sentence across the frame, with the pictures it explains hung from its words. Pinned to a ruler of seconds, the
pictures fall behind when a word is added, and the Sun comes on in the pause before "Let there be… light!"; hung on the words, they follow
every rewrite, voice and language. It is the site's introduction example.

## Layout

| Path | What it is |
| --- | --- |
| `doc.tsx` | The film: nine scenes, their lines, the drawing code and the animation. Every word on screen goes through `useText`, so the overlay can translate it; its lockup is a copy of the site's generated one (an example cannot import from the site), drawn as the site's header animates it |
| `doc.zh-CN.json` | The Chinese version: the lines, the phrase each anchor moves to, the words on screen, the Chinese cover of The Oldest Light, and the sentence's own language (`rail-base`) with the languages it switches through (`rail-others`) |
| `oldest-light.ts` | The Oldest Light's scene and line spans as its engine solves them, drawn by the long-form scene |
| `make-music.py` | The sounds: it fetches the music (`audio/music.mp3`, a product-film track from Pixabay, gitignored; licence in the file) and generates the rest from a fixed seed: the workflow's chime (`chime.mp3`), the Sun's shimmer (`light.mp3`) and the few effects (`ding`, `tick`, `miss`, `swoosh`) |
| `suosi-avatar.jpg` | SuoSi's GitHub avatar, beside The Oldest Light's cover |
| `oldest-cover.jpg`, `oldest-cover.zh-CN.jpg` | The Oldest Light's covers: stills of the film's end card, in English (`still --time 411.5 --lang en`) and in Chinese (`still --time 390.3`) |
| `frame-*.jpg` | Eight frames of this film, which its workflow and closing scenes show |
| `.visotalk/visotalk-intro*/` | The voiced narration of each language (MiniMax), so a rebuild needs no key |
| `say-*.mp3` | Each language's name said in that language, played as the sentence switches to it (the slots `say-1` … `say-4` follow `rail-others`): MiniMax `speech-2.8-hd` voices `Chinese (Mandarin)_News_Anchor`, `Japanese_KindLady` (written in kana, with `language_boost` set, so it is read as Japanese), `French_Female_News Anchor`, `German_SweetLady`, `English_Graceful_Lady`, trimmed and normalised to −16 LUFS |

## Rebuild

```sh
cd examples/visotalk-intro && python3 make-music.py && cd -                     # once: fetches audio/music.mp3
pnpm visotalk qa examples/visotalk-intro/doc.tsx [--lang zh-CN]                 # from the repository root
pnpm visotalk render examples/visotalk-intro/doc.tsx [--lang zh-CN]
pnpm examples:build visotalk-intro visotalk-intro-zh-cn                         # the site's players
```

A rewritten line is voiced again with `MINIMAX_API_KEY` (a China account also sets `MINIMAX_BASE_URL=https://api.minimaxi.com` and
`MINIMAX_TTS_MODEL=speech-2.8-hd`). The overlay cannot move an animation, so what depends on the length of a spoken word in the light gag
reads its numbers from `texts` (`clk-let-dur`, `clk-let-from` …, taken from that language's `voice.json`). When a scene changes what it
shows, re-take the `frame-*.jpg` stills it calls back to (`visotalk still doc.tsx --time …`). Neither version carries captions on the
picture (`captions: "sidecar"`); `render` writes `out/captions.srt` beside the video.
