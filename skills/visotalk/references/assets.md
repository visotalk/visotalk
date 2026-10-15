# Material from the internet: finding, keeping and declaring it

When a real picture, logo, clip or sound would explain better than a drawing, fetch it. This is decided in the design answers (the thing itself) and done after the last scene's design is answered and before `doc.tsx` is written, never while drawing: if drawing shows that something is missing, go back, change the answer, then fetch.

## What you may keep

Only what you may use:

- public domain, such as a government agency's own work;
- CC0;
- CC BY, with the attribution it asks for;
- a project's published brand kit whose terms allow this use.

Never "free to look at", never a file of unknown origin, never a hotlink (the file must be local).

## Where it goes

The project's local library: `media/` beside the document, one file per asset, named for what it is (`media/rocket-launch.mp4`). Reuse what the library already holds before fetching again. Note the size and aspect of what you fetched: they go into the layout answered in the design.

## How it is declared

Every file in the library that a document uses is an asset with its source page and licence:

```tsx
<Asset id="launch" kind="video" src="media/rocket-launch.mp4"
  license={{id: "PD-USGov", attribution: "Agency/Photographer", obligations: []}}
  source="https://example.org/the-page-it-came-from"/>
```

- `id` is the SPDX id where there is one (`CC0-1.0`, `CC-BY-4.0`), or a well-known label (`PD-USGov`, `user-owned`).
- `obligations` lists what the licence asks for (`attribution`, `share-alike`, `non-commercial`, `no-derivatives`); the credits are generated from them.
- A licence you cannot name is a reason not to use the file.
- A photo holds 8 seconds at most; use `<KenBurns>` or cut. Never use book covers, film stills, ripped video or portraits of real people without a licence.

## A small mark

A logo or a symbol that is small and simple can be drawn instead as an `svg` shape (`references/objects.md`, "Icons and drawings"). A brand's logo is an asset all the same: draw it only from a source you hold and may use, and say where it came from in a comment above the scene.
