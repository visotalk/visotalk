# Explainers that explain a source: what holds for any topic

Read this when the video reports what studies, a paper or a dataset found, and when the same format is made again and again (a series). It is practice, not syntax: the
syntax is in `markup.md`.

## The first frame

Frame 0 is the thumbnail and the first thing a viewer sees. Give it a part that appears at the start with no fade: `<Appear target="poster" at="start" dur={0}/>`, and the same for
a chapter rail if the film has one. A poster is one illustration, one big figure and one short line, nothing else; the next scene's picture replaces it a few seconds in
(`<Disappear target="poster" line="l1" word="…"/>`). A cover for a platform is that frame; a vertical film whose lower half is the caption block gets a cover with the poster
lifted to the middle of the canvas, made from `still --time 0` and a crop.

## A phone screen (9x16)

A phone shows little: one figure and one short line per scene. A vertical film is read as large words typed onto the lower half, one at a time, over one big picture in the upper half.
The frame is 1080 x 1920 in two halves. **Picture:** the upper half, y 160 to 980, the figure as large as it will go (190 px or more across, usually most of the width), no axes, bands or
labels beside it. **Words:** `exports={{captions: 'words'}}` types the spoken words in the lower half from y 1012, in 88 px bold type, one word appearing as each is said (the line being
said in full ink, the earlier ones dimmer), a block of up to about six lines, so write each line short (about twelve words at most) or it wraps into a wall. `qa` measures it: it takes a frame at the end of every block and reports `caption-safe` when the block ends below y 1720. In Chinese, Japanese and Korean each character is a word and appears on its share of the line (about 20 characters a line of narration at most; a block holds about 40), and a line breaks between words, not inside them, as far as the platform's word segmenter knows them: if a word is still split at a line end, reword the sentence. The block clears a moment after the last word, so the held last frame is the picture alone: give the film a closing picture or line on purpose. `'burned'` is a small box
near y 1650 and does not do this. Nothing else goes in the lower half, and the last 200 px stay empty: platforms put their own name and buttons there. A figure drawn past the canvas edge
is reported by `qa`, so keep it inside. A thin scale line with a dot and a soft range is enough to say "where in the range". The detail is for the long film.

A vertical film is its own film, not the horizontal one fitted to a phone: it is watched for less time on another kind of platform, so write it shorter (30 to 45 seconds, one idea) with `canvas="9x16"`, and draw it for that frame. A burned caption in a tall frame is already larger and keeps off the edges.

## A light variant

`theme="visotalk/light"` is built in, with the dark theme's keys on a pale ground. A variant that is only a look is `{preset: "16x9", theme: "visotalk/light"}`: the same film, drawn with it (`render --theme visotalk/light`, `qa` checks it with the others). It only works for a part that draws from tokens (`var(--vt-text)`, `useTheme()`); a colour written into a part stays what it is, so a picture with its own colours (a moon, a sun) reads the theme to choose between two palettes.

## A long film

`exports={{captions: 'sidecar'}}`: the video and the player show no captions and `render` writes `captions.srt` for the platform's own track. A chapter rail that fills by the
clock reads the scenes' spans with `useScenes()` (from `@visotalk/runtime`) and the document time with `useDocTime()`, so it advances across every chapter instead of stepping
at scene starts:

```tsx
const Rail = ({chapters}: {chapters: Array<{name: string; scenes: string[]}>}) => {
  const t = useDocTime(), scenes = useScenes();
  const spans = chapters.map((c) => { const own = scenes.filter((s) => c.scenes.includes(s.id)); return {name: c.name, from: Math.min(...own.map((s) => s.from)), end: Math.max(...own.map((s) => s.end))}; });
  const now = Math.max(0, spans.findIndex((c) => t < c.end));
  // a bar per chapter, flex: end - from, filled to clamp((t - from) / (end - from))
};
```

## Music and sounds

A film may carry a bed of music and a few effects (`<Sound>`, `markup.md`). What the product film learned: bring the bed in once the first thing has been said, not under the cold open; set it about −8 dB under its file with `duck={4}` to `6` so it steps back while the narrator speaks and returns in the pauses; fade it in over a second or so and out over several, and let it run on alone for a few seconds after the last word (a scene of `duration` after the narration is how). Effects are the exception: a click on a moment the picture already carries only makes the film busier, so add one only where it tells the viewer something the picture does not. The track is somebody else's file: the asset's `license` and `source` say whose and on what terms (a registered track may draw an automatic claim on upload), and the file itself stays out of the repository. The film is checked with the sound on: the voice must stay the loudest thing.

**A film scored to a beat** (no narration, or a passage without it: `examples/near-light`). Choose a tempo and make every scene a whole number of bars (at 100 BPM a bar is 2.4 s, so `duration={7.2}` is three), then put every event on a beat with `at`: the step of a figure, a cut, a hit, a riser that ends on the downbeat it leads into. The sounds are events in the document like the animation, one `<Sound>` each, so the picture and the sound are moved by editing one file; a part that must answer a sound (a flash on an impact, a lamp on a ping) reads them with `useSounds()` instead of repeating their times. Short sounds made for the film (a synthesised kick, a riser cut to one bar, a tick whose length is its period, looped) are its own material (`license={{id: "user-owned", …}}`); keep the script that makes them beside the document. A sound that follows a number the picture changes continuously (a pitch that falls as something stops) is made for that span and placed on it; the engine does not synthesise.

## Illustrations

Line art on a clear ground (ink-coloured PNG, white turned into alpha, cropped) reads on any theme. Declare each as `<Asset id kind="image" src="media/x.png" license={{id: "user-owned", obligations: []}} />` and draw it
with `<img src={useAsset("x")} />` in a part. Four to six an episode: the poster, a scene that is only one figure, the open question. People and objects, never a figure or a word on the drawing
(a generator that puts text in must be re-run). `build --artifact` bundles them.

## Honest pictures

- A figure on screen is a figure in the source, with its scope (who, how many, which task) on the same screen as the sentence that gives it. Different experiments are not drawn on one
  axis without saying they are not comparable; a calculation is labelled as one; an illustration says it is one.
- A range that crosses its reference is drawn hollow. What a source's authors say is attributed to them; what the film says itself is marked as its own view.
- Nothing appears before the words that bring it (anchor each object on its own words), and nothing the narration has moved on from stays on screen.

## An independent check before it ships

`scripts/review-frames.mjs <doc.tsx>` takes one frame per narrated line of a rendered film and cuts them into parts. Give each part, the frames it names and the list of sources to a fresh
reader (a subagent with no view of your reasoning) and ask for problems only: figures against sources, the picture against the words at that moment, defects, the honesty rules above. Fix, rebuild,
look again at the frames you changed.

## Delivering

The default review copy is the player, not a video: `build doc.tsx --artifact` writes `player.html` and `artifact.json` (the files to publish with it: the soundtrack as one MP3, mixed as the video's is, your other assets, and the faces the
document names or its CJK default; otherwise the viewer's system font stands in). Copy them where the publishing tool can read them and publish `player.html` with those files. An MP4 only when it is asked for: `render doc.tsx`
renders in segments of 3000 frames and keeps each once it is whole, so the same command run again after an interruption picks up at the segment it stopped in (a sandbox that goes idle is recycled and takes a background render with it; run it in the foreground and run it again after a restart).

## Gotchas met on the way

- A part of a scene is unmounted with the scene: a later scene cannot `Disappear` it. A part is invisible until an `appear`.
- An anchor phrase must be unique in its line (`anchor.ambiguous`); numbers are spelled out in the line with `text=` carrying the digits for the caption.
- `qa` samples a frame where every target is on at once, so objects that replace each other are reported as overlapping there; check such a pair on the frames of their own lines.
- A key (voice, image generation) goes in the environment of the one command that needs it, never a file.
