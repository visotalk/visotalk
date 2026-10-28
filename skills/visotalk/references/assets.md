# Material from the internet: finding, keeping and declaring it

When a real picture, logo, clip or sound would explain better than a drawing, fetch it. Decide it when you plan a scene (the thing itself) and fetch before you draw it.

A film about a real place, event or person is shown with real pictures of it: plan at least the opening and the place itself as photographs, and draw what has no photograph (a route, a profile, a count). `visotalk asset search "<words>"` lists candidates you may keep, with what each shows, its size, licence and author; `visotalk asset get N --id NAME` saves one to `media/` and prints its `<Asset>`. Use them rather than fetching pages by hand.

## What you may keep

Only what you may use:

- public domain, such as a government agency's own work;
- CC0;
- CC BY, with the attribution it asks for;
- CC BY-SA, with its attribution and `share-alike` in its obligations (most photographs of places and events on Wikimedia Commons are under it);
- a project's published brand kit whose terms allow this use.

Never "free to look at", never a file of unknown origin, never a hotlink (the file must be local).

## Where it goes

The project's local library: `media/` beside the document, one file per asset, named for what it is (`media/rocket-launch.jpg`). Name a file in lower case with hyphens and a plain extension, and keep to PNG, JPEG, GIF, WebP, MP4 or WebM where you can: only such files can be imported by VisoTalk's web app from a `.visotalk` bundle (`visotalk export`), which refuses `Rocket Launch.JPG`. Reuse what the library already holds before fetching again. Note the size and aspect of what you fetched: they go into the layout.

## How it is declared

Every file in the library that a document uses is an asset with its source page and licence, declared in `<Doc>`, and read in a part with `useAsset("launch")` (the URL, for `<img src>`):

```tsx
<Asset id="launch" kind="image" src="media/rocket-launch.jpg"
  license={{id: "PD-USGov", attribution: "Agency/Photographer", obligations: []}}
  source="https://example.org/the-page-it-came-from"/>
```

- `id` is the SPDX id where there is one (`CC0-1.0`, `CC-BY-4.0`), or a well-known label (`PD-USGov`, `user-owned`).
- `obligations` lists what the licence asks for (`attribution`, `share-alike`, `non-commercial`, `no-derivatives`); the credits are generated from them.
- A licence you cannot name is a reason not to use the file.
- A photo holds 8 seconds at most; move it (a slow `<Tween>` of `scale` or `x`) or cut. Never use book covers, film stills, ripped video or portraits of real people without a licence.
- A clip is an asset of `kind="video"` (constant frame rate, H.264 is safe) and is drawn in a part with `<Video asset="clip" in={2} rate={0.6} fit="cover"/>` from `@visotalk/runtime`: it plays from `in` seconds of the source at `rate`, starting `start` seconds into the scene (default 0, the scene's start). Its sound is not used; the narration is. Cut a clip to the seconds you need before you add it, since an export decodes every frame of it.

## A small mark

A logo or a symbol that is small and simple can be drawn instead as inline SVG in a part (`references/parts.md`). A brand's logo is an asset all the same: draw it only from a source you hold and may use, and say where it came from in a comment above the scene.
