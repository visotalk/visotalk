import {Appear, Asset, Beat, Card, Chip, Credits, Crossfade, Disappear, Doc, DrawIn, Field, Image, Item, KenBurns, Line, Run, Scene, Stamp, Text, Timeline, Video} from '@visotalk/jsx';

/**
 * "Liftoff" book explainer, a port of the Remotion prototype (media-heavy: photos with Ken Burns moves, a video clip, lower thirds, a timeline).
 * Media are public domain or CC BY 2.0 (see `assets`); the summary is written from public reviews and descriptions.
 */
export default <Doc
  spec="0.4.0"
  id="liftoff"
  title="Liftoff, by Eric Berger: a book explainer"
  lang="en"
  sources={[
    {
      id: "pw",
      url: "https://www.publishersweekly.com/9780062979971",
      title: "Publishers Weekly review"
    },
    {
      id: "apple",
      url: "https://books.apple.com/au/book/liftoff/id1526796614",
      title: "Apple Books listing"
    },
    {
      id: "space",
      url: "https://www.space.com/liftoff-spacex-early-days-book-eric-berger",
      title: "Space.com review"
    },
    {id: "wiki", url: "https://en.wikipedia.org/wiki/Falcon_1", title: "Falcon 1 (Wikipedia)"},
    {
      id: "sfn",
      url: "https://spaceflightnow.com/news/n0812/23crsawards/",
      title: "Spaceflight Now: CRS awards"
    },
    {
      id: "nasa",
      url: "https://images.nasa.gov/details/KSC-20200608-MH-Demo-2_4K_Video_Release-3251785",
      title: "NASA Demo-2 video"
    }
  ]}
  generator="port of the liftoff prototype"
  theme="visotalk/dark"
  voice="am_michael"
  speed={1}
  lexicon={{}}
  canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned", credits: "auto"}}
>
  <Asset
    id="demo2"
    kind="video"
    src="media/demo2_clip.mp4"
    license={{id: "PD-USGov", attribution: "NASA/Chris Chamberland", obligations: []}}
    source="https://images.nasa.gov/details/KSC-20200608-MH-Demo-2_4K_Video_Release-3251785"
  />
  <Asset
    id="f4"
    kind="image"
    src="media/f4_launch.jpg"
    license={{id: "CC0-1.0", attribution: "SpaceX", obligations: []}}
    source="https://commons.wikimedia.org/wiki/File:Falcon_1_Flight_4_launch.jpg"
  />
  <Asset
    id="prelaunch"
    kind="image"
    src="media/prelaunch_2005.jpg"
    license={{
      id: "CC-BY-2.0",
      attribution: "Steve Jurvetson",
      url: "https://creativecommons.org/licenses/by/2.0/",
      obligations: ["attribution"]
    }}
    source="https://commons.wikimedia.org/wiki/File:Falcon_1_Prelaunch_(67235805).jpg"
  />
  <Asset
    id="darpa"
    kind="image"
    src="media/darpa_falcon.jpg"
    license={{id: "PD-USGov", attribution: "DARPA", obligations: []}}
    source="https://commons.wikimedia.org/wiki/File:Falcon_Small_Launch_Vehicle_(SpaceX's_Falcon_I)_to_be_launched_from_Kwajalein_Atoll,_Marshall_Islands.tiff"
  />
  <Asset
    id="omelek"
    kind="image"
    src="media/omelek.jpg"
    license={{id: "PD-USGov", attribution: "U.S. Army SMDC", obligations: []}}
    source="https://commons.wikimedia.org/wiki/File:Omelek_Island.jpg"
  />
  <Asset
    id="adastra"
    kind="image"
    src="media/ad_astra_2008.jpg"
    license={{
      id: "CC-BY-2.0",
      attribution: "Steve Jurvetson",
      url: "https://creativecommons.org/licenses/by/2.0/",
      obligations: ["attribution"]
    }}
    source="https://commons.wikimedia.org/wiki/File:SpaceX_–_Ad_Astra!_(2725865469).jpg"
  />
  <Asset
    id="iss"
    kind="image"
    src="media/iss_dragon.jpg"
    license={{id: "PD-USGov", attribution: "NASA (ISS033-E-011151)", obligations: []}}
    source="https://images.nasa.gov/details/iss033e011151"
  />

  <Video id="clip" asset="demo2" rate={0.8} dim={0.15} label="Falcon 9 lifting off with Crew Dragon, Demo-2"/>
  <Card
    id="lt-demo2"
    style="lowerThird"
    title="May 30, 2020"
    body="Falcon 9 · Crew Dragon Demo-2 · Kennedy Space Center"
  />
  <Chip id="first-private" text="First private company to launch people into orbit" style="overlayStatement-left"/>
  <Text id="eyebrow" text="a book explainer" style="eyebrow"/>
  <Text id="liftoff-title" text="Liftoff" style="display">
    <Run text="Lift"/>
    <Run text="off" style="grad"/>
  </Text>
  <Text id="byline" text="Eric Berger" style="byline"/>
  <Text id="k-book" text="The book" style="kicker"/>
  <Card
    id="cover"
    style="cover"
    title="Liftoff"
    body="Elon Musk and the Desperate Early Days That Launched SpaceX"
    kicker="Eric Berger"
    label="Typographic stand-in for the book; the real cover is not reproduced"
  />
  <Card id="facts" style="meta">
    <Field id="published" label="Published" value="2021 · William Morrow"/>
    <Field id="length" label="Length" value="288 pages"/>
    <Field id="covers" label="Covers" value="2002 founding → first four Falcon 1 launches"/>
    <Field id="author" label="Author" value="Space reporter, Ars Technica"/>
  </Card>
  <Text id="interviews" text="interviews with engineers · technicians · executives" style="label">
    <Run text="interviews with "/>
    <Run text="engineers · technicians · executives" style="accent"/>
  </Text>
  <Text id="k-odds" text="The odds · early 2000s" style="kicker"/>
  <Text id="odds-title" text="The odds were absurd." style="title"/>
  <Card id="incumbents" style="stats" title="Boeing · Lockheed Martin">
    <Field id="staff" label="employees, each" value="10,000s"/>
    <Field id="revenue" label="revenue per year" value="$10Bs"/>
  </Card>
  <Card id="spacex" style="stats-accent" title="SpaceX">
    <Field id="staff" label="people" value="< 200"/>
    <Field id="cash" label="in the bank" value="~$100M"/>
  </Card>
  <Image id="omelek" asset="omelek" dim={0.1} label="Omelek Island from the air"/>
  <Card
    id="lt-omelek"
    style="lowerThird"
    title="Omelek Island"
    body="Kwajalein Atoll · Marshall Islands · Pacific Ocean"
  />
  <Image id="pad-2005" asset="prelaunch" label="Falcon 1 on the Omelek pad, 2005"/>
  <Chip id="pad-2005-label" text="Falcon 1 on Omelek, November 2005" style="overlayLabel-left"/>
  <Chip id="c-deadlines" text="deadlines" style="overlay-left"/>
  <Chip id="c-heat" text="heat" style="overlay-left"/>
  <Chip id="c-salt" text="salt" style="overlay-left"/>
  <Chip id="c-isolation" text="isolation" style="overlay-left"/>
  <Text id="k-fail" text="Falcon 1 · flights 1–3" style="kicker"/>
  <Timeline id="flights" label="Falcon 1 flights 1 to 4">
    <Item id="f1" label="Flight 1" date="Mar 2006" status="fail"/>
    <Item id="f2" label="Flight 2" date="Mar 2007" status="fail"/>
    <Item id="f3" label="Flight 3" date="Aug 2008" status="fail"/>
    <Item id="f4" label="Flight 4" status="unknown"/>
  </Timeline>
  <Image id="photo-1" asset="prelaunch" style="rounded" label="Falcon 1 on the pad, Omelek (2005)"/>
  <Card
    id="why-1"
    style="bare"
    kicker="Flight 1 · Mar 2006"
    title="fuel leak → fire"
    body="photo: Falcon 1 on the pad, Omelek (2005)"
  />
  <Image id="photo-2" asset="darpa" style="rounded" label="DARPA payload fairing for Falcon 1"/>
  <Card
    id="why-2"
    style="bare"
    kicker="Flight 2 · Mar 2007"
    title="reached 289 km · 2nd stage cut short"
    body="photo: DARPA payload fairing for Falcon 1"
  />
  <Image id="photo-3" asset="adastra" style="rounded" label="Falcon 1 on Omelek, July 2008"/>
  <Card
    id="why-3"
    style="bare"
    kicker="Flight 3 · Aug 2008"
    title="stages re-contacted after separation"
    body="photo: Falcon 1 on Omelek, July 2008"
  />
  <Text id="zero" text="0 for 3" style="failStat"/>
  <Image id="f4" asset="f4" dim={0.2} label="Falcon 1 Flight 4 lifting off"/>
  <Card id="lt-f4" style="lowerThird" title="Flight 4" body="the last rocket they could pay for, according to Musk"/>
  <Text id="f4-date" text="Sept 28, 2008" style="overlayHero"/>
  <Chip id="orbit" text="ORBIT" style="stamp"/>
  <Chip id="f4-first" text="first privately developed liquid-fueled rocket to reach orbit" style="overlayBox"/>
  <Image id="iss" asset="iss" dim={0.35} label="Dragon grappled by the station’s robotic arm, October 2012"/>
  <Card id="lt-nasa" style="lowerThird" title="Dec 23, 2008 · NASA contract" body="three months after Flight 4"/>
  <Card id="stat-money" style="overlayStat" title="up to $1.6B" body="contract value"/>
  <Card id="stat-flights" style="overlayStat" title="12" body="cargo flights to the ISS"/>
  <Chip id="path-0" text="Falcon 1" style="overlayBox-left"/>
  <Chip id="arrow-1" text="→" style="arrow"/>
  <Chip id="path-1" text="Falcon 9" style="overlayBox-left"/>
  <Chip id="arrow-2" text="→" style="arrow"/>
  <Chip id="path-2" text="Dragon" style="overlayBox-left"/>
  <Chip id="arrow-3" text="→" style="arrow"/>
  <Chip id="path-3" text="ISS · 2012" style="overlayBox-left"/>
  <Text id="iss-note" text="photo: Dragon grappled by the station’s robotic arm, October 2012" style="overlayNote"/>
  <Text id="k-why" text="Why read it" style="kicker"/>
  <Card id="not-bio" style="strike" kicker="not" title="a Musk biography"/>
  <Card id="but-team" style="emph" kicker="but" title="a small team that learned by failing — fast and cheap"/>
  <Text id="why-line" text="How SpaceX works today started here." style="headline">
    <Run text="How SpaceX works today "/>
    <Run text="started here." style="grad"/>
  </Text>
  <Text id="credits-title" text="Liftoff · Eric Berger · 2021" style="title">
    <Run text="Liftoff "/>
    <Run text="· Eric Berger · 2021" style="light"/>
  </Text>
  <Credits
    id="credits"
    note={"Summary written from public reviews and descriptions; no text from the book is reproduced.\nCC BY 2.0: creativecommons.org/licenses/by/2.0"}
  />
  <Text id="footer" text="explainer made with VisoTalk" style="footer"/>

  <Scene id="hook" pattern="photoStory" slots={{media: "clip", lowerThird: "lt-demo2", statement: "first-private"}}>
    <Beat id="launch">
      <Line id="h1" text="On May 30th, 2020, a SpaceX rocket carried two NASA astronauts toward orbit."/>
      <Line id="h2" text="It was the first time a private company had launched people into orbit."/>
      <Appear on="lt-demo2" line="h1" offset={0.6}/>
      <Appear on="first-private" line="h2" offset={0.3}/>
    </Beat>
    <Beat id="title" pattern="title" slots={{kicker: "eyebrow", title: "liftoff-title", subtitle: "byline"}}>
      <Line id="h3">Eric Berger's book Liftoff goes back to the years when that company could have died at any moment.</Line>
      <Disappear on={["clip", "lt-demo2", "first-private"]} at="start" offset={-0.2} dur={0.6}/>
      <Crossfade on={["eyebrow", "liftoff-title", "byline"]} at="start" offset={-0.2} dur={0.6}/>
    </Beat>
  </Scene>

  <Scene
    id="book"
    pattern="split"
    slots={{kicker: "k-book", left: "cover", right: ["facts", "interviews"]}}
    options={{ratio: 0.32, stack: ["right"], titleH: 40, gap: 30}}
  >
    <Beat id="what">
      <Line
        id="b1"
        text="Published in 2021, Liftoff follows SpaceX from its founding in 2002 through the first four launches of its first rocket, Falcon 1."
        say="Published in twenty twenty one, Liftoff follows SpaceX from its founding in two thousand two, through the first four launches of its first rocket, Falcon One."
      />
      <Appear on="cover" line="b1" offset={0.1}/>
      <Appear on="facts#published" line="b1" offset={0.8}/>
      <Appear on="facts#length" line="b1" offset={1.4}/>
      <Appear on="facts#covers" line="b1" word="founding"/>
    </Beat>
    <Beat id="who">
      <Line
        id="b2"
        text="Berger, a longtime space reporter now at Ars Technica, built it from interviews with the engineers, technicians, and executives who were there."
      />
      <Appear on="facts#author" line="b2" offset={0.4}/>
      <Appear on="interviews" line="b2" word="interviews"/>
    </Beat>
  </Scene>

  <Scene
    id="odds"
    pattern="compare"
    slots={{kicker: "k-odds", title: "odds-title", left: "incumbents", right: "spacex"}}
  >
    <Beat id="absurd">
      <Line id="o1" text="The odds were absurd."/>
      <Appear on="odds-title" line="o1" offset={0.1}/>
    </Beat>
    <Beat id="big">
      <Line
        id="o2"
        text="Boeing and Lockheed Martin each had tens of thousands of employees, and tens of billions of dollars in yearly revenue."
      />
      <Appear on="incumbents" line="o2" offset={0.3}/>
    </Beat>
    <Beat id="small">
      <Line id="o3" text="SpaceX had fewer than two hundred people, and about a hundred million dollars in the bank."/>
      <Appear on="spacex" line="o3" offset={0.3}/>
    </Beat>
  </Scene>

  <Scene id="island" pattern="photoStory" slots={{media: "omelek", lowerThird: "lt-omelek"}}>
    <Beat id="where">
      <Line
        id="i1"
        text="To launch, the team went to Omelek, a tiny island in Kwajalein Atoll, in the Marshall Islands, in the middle of the Pacific."
      />
      <KenBurns on="omelek" at="start" params={{from: [1, 50, 50], to: [1.18, 55, 45]}}/>
      <Appear on="lt-omelek" line="i1" offset={0.8}/>
    </Beat>
    <Beat
      id="life"
      slots={{
        side: "pad-2005",
        sideLabel: "pad-2005-label",
        statement: ["c-deadlines", "c-heat", "c-salt", "c-isolation"]
      }}
      options={{split: 0.42, flow: ["statement"], gap: 14}}
    >
      <Line
        id="i2"
        text="Much of the story happens here: engineers racing deadlines, far from home, in heat, salt, and isolation."
      />
      <Crossfade on={["pad-2005", "pad-2005-label"]} at="start" dur={0.5}/>
      <KenBurns on="pad-2005" at="start" params={{from: [1, 50, 30], to: [1.12, 50, 40]}}/>
      <Appear on={["c-deadlines", "c-heat", "c-salt", "c-isolation"]} line="i2" offset={1.2} stagger={0.15}/>
    </Beat>
  </Scene>

  <Scene id="failures" pattern="timeline" slots={{kicker: "k-fail", track: "flights", left: "photo-1", right: "why-1"}}>
    <Beat id="flight1">
      <Line
        id="f1"
        text="Flight 1, March 2006: a fuel leak started a fire, and the rocket was lost."
        say="Flight one, March two thousand six: a fuel leak started a fire, and the rocket was lost."
      />
      <DrawIn on="flights" at="start" dur={0.8}/>
      <Appear on="flights#f1" line="f1" offset={0.2}/>
      <Appear on={["photo-1", "why-1"]} line="f1" offset={0.4}/>
      <KenBurns on="photo-1" line="f1" offset={0} params={{from: [1, 50, 40], to: [1.1, 50, 50]}}/>
    </Beat>
    <Beat id="flight2" slots={{left: "photo-2", right: "why-2"}}>
      <Line
        id="f2"
        text="Flight 2, March 2007: it reached space, about 289 kilometers up, but a control problem cut the second stage short."
        say="Flight two, March two thousand seven: it reached space, about two hundred and eighty nine kilometers up, but a control problem cut the second stage short."
      />
      <Disappear on={["photo-1", "why-1"]} at="start" dur={0.3}/>
      <Appear on="flights#f2" line="f2" offset={0.2}/>
      <Appear on={["photo-2", "why-2"]} line="f2" offset={0.4}/>
      <KenBurns on="photo-2" line="f2" offset={0} params={{from: [1, 50, 40], to: [1.1, 50, 50]}}/>
    </Beat>
    <Beat id="flight3" slots={{left: "photo-3", right: "why-3"}}>
      <Line
        id="f3"
        text="Flight 3, August 2008: after separation, the first stage bumped back into the second."
        say="Flight three, August two thousand eight: after separation, the first stage bumped back into the second."
      />
      <Disappear on={["photo-2", "why-2"]} at="start" dur={0.3}/>
      <Appear on="flights#f3" line="f3" offset={0.2}/>
      <Appear on={["photo-3", "why-3"]} line="f3" offset={0.4}/>
      <KenBurns on="photo-3" line="f3" offset={0} params={{from: [1, 50, 85], to: [1.1, 50, 85]}}/>
    </Beat>
    <Beat id="tally" slots={{note: "zero"}}>
      <Line id="f0" text="Three launches, three failures."/>
      <Stamp on="zero" line="f0" offset={0.1} dur={0.4}/>
    </Beat>
  </Scene>

  <Scene
    id="flight4"
    pattern="photoStory"
    slots={{media: "f4", lowerThird: "lt-f4", center: "f4-date", lower: "orbit", foot: "f4-first"}}
  >
    <Beat id="last">
      <Line id="g1" text="According to Musk, the fourth Falcon 1 was the last one they had money for."/>
      <KenBurns on="f4" at="start" params={{from: [1, 50, 35], to: [1.22, 50, 20]}}/>
      <Appear on="lt-f4" line="g1" offset={0.5}/>
    </Beat>
    <Beat id="orbit">
      <Line
        id="g2"
        text="On September 28, 2008, it reached orbit."
        say="On September twenty eighth, two thousand eight, it reached orbit."
      />
      <Appear on="f4-date" line="g2" offset={0.2}/>
      <Stamp on="orbit" line="g2" word="orbit" dur={0.4}/>
    </Beat>
    <Beat id="first">
      <Line id="g3" text="Falcon 1 became the first privately developed, liquid-fueled rocket to circle the Earth."/>
      <Appear on="f4-first" line="g3" offset={0.3}/>
    </Beat>
  </Scene>

  <Scene
    id="after"
    pattern="photoStory"
    slots={{
      media: "iss",
      lowerThird: "lt-nasa",
      upper: ["stat-money", "stat-flights"],
      lower: ["path-0", "arrow-1", "path-1", "arrow-2", "path-2", "arrow-3", "path-3"],
      foot: "iss-note"
    }}
    options={{flow: ["upper", "lower"], gap: 24}}
  >
    <Beat id="contract">
      <Line
        id="a1"
        text="Three months later, NASA awarded SpaceX a contract worth up to one point six billion dollars, for twelve cargo flights to the space station."
      />
      <KenBurns on="iss" at="start" params={{from: [1, 50, 50], to: [1.15, 40, 50]}}/>
      <Appear on="lt-nasa" line="a1" offset={0.3}/>
      <Appear on="stat-money" line="a1" word="up to"/>
      <Appear on="stat-flights" line="a1" word="twelve"/>
    </Beat>
    <Beat id="path">
      <Line
        id="a2"
        text="That money carried the company from Falcon 1 to Falcon 9 and Dragon, which first reached the station in 2012."
        say="That money carried the company from Falcon One to Falcon Nine and Dragon, which first reached the station in twenty twelve."
      />
      <Appear
        on={["path-0", "arrow-1", "path-1", "arrow-2", "path-2", "arrow-3", "path-3"]}
        line="a2"
        offset={0.6}
        stagger={0.65}
      />
      <Appear on="iss-note" line="a2" offset={5.6}/>
    </Beat>
  </Scene>

  <Scene
    id="why"
    pattern="split"
    slots={{kicker: "k-why", left: "not-bio", right: "but-team", below: "why-line"}}
    options={{ratio: 0.43, titleH: 70, below: 280}}
  >
    <Beat id="portrait">
      <Line
        id="w1"
        text="Liftoff is less a Musk biography than a portrait of a small team that learned by failing, quickly and cheaply."
      />
      <Appear on="not-bio" line="w1" offset={0.3}/>
      <Appear on="but-team" line="w1" word="portrait"/>
    </Beat>
    <Beat id="today">
      <Line id="w2" text="If you want to understand why SpaceX moves the way it does today, this is where it started."/>
      <Appear on="why-line" line="w2" offset={0.4}/>
    </Beat>
  </Scene>

  <Scene
    id="outro"
    pattern="board"
    slots={{title: "credits-title", wide: "credits", note: "footer"}}
    options={{band: false}}
  >
    <Beat id="credits" hold={4}>
      <Line
        id="c1"
        text="Liftoff, by Eric Berger, published in 2021."
        say="Liftoff, by Eric Berger, published in twenty twenty one."
      />
      <Appear on="credits-title" line="c1" offset={0.1}/>
      <Appear on="credits" line="c1" offset={1}/>
      <Appear on="footer" line="c1" offset={1.6}/>
    </Beat>
  </Scene>
</Doc>;
