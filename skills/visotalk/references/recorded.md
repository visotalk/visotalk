# A recording as the narration

Read this when you are given someone's own recording to put pictures on (a voice-over, a talking-head video, or a filmed piece with its own voice-over), or when a document says `voice="recording:…"`.

## What is fixed and what is yours

- `visotalk recording take.mp4 --out doc.tsx` transcribes it (MiniMax `asr-1.0`, `MINIMAX_API_KEY`; English or Chinese, at most an hour, a video at a constant frame rate) into a valid document: the recording as an asset, every sentence a `<Line>` with its measured span and words, all in one scene. Comments at its top say where the speech is, how long the silence before the first word and after the last is, and every pause of two seconds or more, and for a video every cut from one shot to the next: that is the shape your scenes are planned on.
- **Fixed**: what was said and when. Never change a line's words, `span`, `words`, `id` or order, the asset, `voice`, or a video's canvas size and frame rate; `validate` and the editor refuse it. Nothing is re-voiced or re-timed.
- **Yours**: the scenes, the parts, the animation and the captions. Split the one scene into scenes by moving whole `<Line>` elements, in order. Add scenes without lines where there is no speech. Fix a caption the recognizer got wrong with `text="…"`, and anchor on a neighbouring word it got right (`validate --anchors` shows what each anchor finds).
- **The recording is the clock.** The film is exactly as long as the recording, so there is no length to scope. A scene starts where its first line was said (the first scene at 0), and a scene without lines starts where the speech before it ended; each scene ends where the next starts. A scene has no `duration`, and `pacing` does nothing.

## Trimming, only when asked

Nothing is cut from a recording unless the person asks. If they do, before anything is drawn: `visotalk recording take.mp4 --out doc.tsx --trim fillers` cuts hesitations ("um", "uh" and their Chinese counterparts), and `--trim fillers,pauses` also shortens every silence between two words to 0.8 s (`pauses=0.5` for a tighter talk). It reuses the transcript, keeps the original file, cuts picture and sound together into a `-trimmed` file beside it and writes the document on that, keeping the scenes the lines were grouped into and the captions already corrected. The comments at the top of the document say what a trim would cut, so you can tell the person before they choose. Silence before the first word and after the last is kept. Shortening pauses suits one raw take; in an edited video the silences carry pictures or music, so say so if they ask for it there. Stammers and retakes are not cut: that is their editor's job.

## Design on the recording

- **Read the transcript and its pauses before you plan.** The structure is already there: its sentences, its silences, its speed. Plan scenes on those sentences, not on the script you would have written.
- **A pause is part of the piece.** Two seconds or more of music or breath between lines is where the last idea lands: the picture holds, finishes a slow move or settles; it does not go still for five seconds, and it does not bring a new subject that no word names. Time anything in a pause from the end of the line before it (`line="l3" edge="end" offset={0.8}`) or in seconds into the scene, never by guessing.
- **Music before the first word** is an opening: a scene without lines that sets the subject (a title, the place, the object). **After the last word**, a closing picture stays to the end.
- **Recognized words can be wrong**, more often in names and numbers. Read each line before you anchor on it.
- Everything in `SKILL.md` still holds: one change on the word that names it, nothing a slide deck would give, at least two seconds on screen.

## Audio only

The stage is yours, as for any explainer: the canvas is 1920×1080 unless you set it, and the recording plays under the whole film.

## A video of the presenter

- **The video is under every scene**, whole and in sync, and `sheet`, `still`, `qa` and `build` show it. Its size and frame rate are the canvas and the frame rate.
- **Find the presenter first.** Look at every shot before you draw: `sheet doc.tsx --shots` is one picture with the middle frame of each shot between the cuts, listed with their seconds, so one look tells which shots show the presenter and where (their hands and what they hold too). Declare where their face and shoulders are with `keepClear={[{x, y, w, h}]}` on `<Doc>`, in canvas pixels, with room above the head and around the shoulders. When the video cuts between the presenter and other footage, give each region the seconds of the shots that show them: `{x, y, w, h, from: 3.3, to: 7.9}` (one region per run of presenter shots). `qa` reports anything drawn inside a region while it is on screen, and `still` counts it as taken, not empty. A person holding something is not one rectangle: give the face and the object in their hands a region each, rather than one box that takes the free side too.
- **The person is the subject until a word names something to show.** A hook, a turn and the close are theirs alone, or theirs with one short phrase. Graphics go in the free side, away from the face; the free side is not the whole frame.
- **Text over a video needs its own ground**: a panel or a scrim under it, because the picture behind changes. Labels at least 40 px tall at 1080 lines, scaled to the canvas height.
- **A full-frame cutaway** (a chart, a screen, a photo) covers the person: one subject, a few seconds, and back to them; never two scenes in a row without them.
- **Moving the person** (a circle in a corner while a chart takes the frame, one half of a split): a part that draws `<Video asset="take" fit="cover"/>`, with `Video` imported from `@visotalk/runtime`, inside the shape you want. The recording always shows the moment being heard, wherever it is drawn. A part that covers the whole frame hides the video under it. Move the person at a scene's start, not in the middle of a sentence, and at most a few times a minute, and say where they are in that scene with `keepClear` on the `<Scene>` (`[]` when the recorded position is covered).

## A style for footage

A built-in style that draws its own ground (paper, a notebook, a stage) would cover the footage. Over a video recording, choose one made for `talking-head` (`visotalk style list`), such as `on-air`: it draws no ground and its components are tags made to sit on a shot. `style use` on a recording applies only the look; the recording keeps its voice, clock and frame.

## A filmed video (shots, a brand film, a vlog)

When the picture is footage rather than a person talking to the camera, the film already has its images: yours are supers over them (a word, a figure, a line that draws, a small diagram), not a redraw. Shots of another length cut from one to the next, and the speech runs across them.

- **One scene is often right.** A scene ends on the start of a line, and its parts with it, while a super over footage ends on a cut; keep the lines in one scene (or split only where a cut and a line start meet) and time each super with `at` in seconds.
- **The cuts are the picture's sentences.** Something appears on a word or on a cut, and goes on a cut or at the end of its line; never in the middle of a shot for no reason in the sound or the picture. Time a cut in seconds into the scene (`at`), from the cut list at the top of the document; a super that spans a cut is redrawn for the next shot's free space or goes with the first. Going with a cut is `<Disappear at={cut} dur={0}/>`: a fade starting at the cut runs into the next shot, over whatever it shows.
- **When the camera moves**, the thing a ring or label points at moves with it, and a part's coordinates do not: move the whole part with the shot, `<Tween target="ring" to={{x: -210}} at={cut} dur={2.05} easing="linear"/>` over the shot's length, the distance measured on two stills at its ends. A shot that moves too much for that gets a tag in a corner instead.
- **Each shot has its own free space.** Look at every shot once (`sheet doc.tsx --shots`), and place each super where that shot is empty: a sky, a road, a wall, out of focus. Never over a face, the runner, the product, or the mark of the film. Declare those with `keepClear` per scene where they hold still; where they move, keep clear of where they go.
- **A frame that is already designed** (a title, an end card with a logo, on-screen text) gets nothing on it.
- **Less than an explainer.** The footage carries the story: a few supers, each on the word or cut that earns it, large and simply set, with a ground (a shadow, a scrim) only where the shot behind is busy. Stretches without speech are the picture's; leave them alone unless the sound asks for something.

## Deliver

- Audio only: `build doc.tsx --out DIR` (the page plays the recording) and `render doc.tsx` (MP4, written to `.visotalk/<id>/out/final.mp4`, or into `--out DIR`).
- A video, as one file: `render doc.tsx --over`, the pictures composited over the original video: `final.mp4` in `.visotalk/<id>/out/` (or `--out DIR`); `video.mp4` and `overlay.mov` beside it are its steps. Captions are burned in unless `exports={{captions: 'sidecar'}}`; over footage whose supers already carry the words, sidecar is usually right.
- A video, for an editor (CapCut, Premiere): `render doc.tsx --layer mov` (ProRes 4444) or `--layer webm` (VP9), the pictures over a transparent background at the recording's size and exact frame rate, with your sounds and without the narration; laid over the original on the timeline at 0, it matches frame for frame. A part covering the whole frame is in the layer too. An editor usually adds its own subtitles, so give it `exports={{captions: 'sidecar'}}` (a `captions.srt` beside the video) unless burned captions were asked for.
- Music and effects that were uploaded: `<Sound>` (`references/markup.md`); `render doc.tsx --audio narration|mix|effects` writes one bus as MP3. Nothing generates music: use licensed audio you were given.
