import {Appear, Asset, Beat, Card, Counter, CountUp, Credits, Crossfade, Disappear, Doc, Image, KenBurns, Line, Run, Scene, Shape, Stamp, Text, Timeline, Item, Tween, Video, Chip, Set} from '@visotalk/jsx';

/**
 * "Liftoff", a book explainer that uses real photographs and a real clip. The Demo-2 launch opens it and the title is laid on that launch;
 * the book's span is a to-scale axis of years; the odds are bars whose lengths carry the gap; Omelek is a photo and a zoom-out of rings;
 * one schematic rocket and one moving marker tell the three failures; the failure crosses carry into the fourth launch as a tally.
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
    {id: "hist", url: "https://en.wikipedia.org/wiki/History_of_SpaceX", title: "History of SpaceX (Wikipedia)"},
    {id: "spacex", url: "https://en.wikipedia.org/wiki/SpaceX", title: "SpaceX (Wikipedia)"},
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
  generator="visotalk skill"
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

  {/* hook: the real launch, then the title laid on it */}
  <Video id="clip" asset="demo2" rate={0.6} dim={0.5} label="Falcon 9 lifting off with Crew Dragon, Demo-2"/>
  <Card id="lt-demo2" style="lowerThird" title="May 30, 2020" body="Crew Dragon Demo-2 · Kennedy Space Center"/>
  <Text id="first-a" text="First private company" style="display" look={{size: 64, align: "left"}}/>
  <Text id="first-b" text="to launch people into orbit" style="display" look={{size: 64, align: "left"}}/>
  <Text id="eyebrow" text="a book explainer" style="eyebrow" look={{color: "text"}}/>
  <Text id="liftoff-title" text="Liftoff" style="display" look={{size: 140}}>
    <Run text="Lift"/>
    <Run text="off" style="grad"/>
  </Text>
  <Text id="byline" text="Eric Berger" style="byline" look={{color: "text"}}/>

  {/* book: a to-scale axis of years (71.6 px per year from x=280 at 2002) */}
  <Shape id="axis" shape="line" x1={280} y1={400} x2={1640} y2={400} draw={0} look={{stroke: "faint", strokeWidth: 8}}/>
  <Shape id="dot-2002" shape="circle" x={256} y={376} w={48} h={48} look={{fill: "grad", stroke: "grad"}}/>
  <Shape id="lab-2002" shape="rect" x={80} y={290} w={440} h={60} text="SpaceX founded, 2002" look={{fill: "transparent", stroke: "transparent", size: 40, color: "text", weight: 700}}/>
  <Shape id="span" shape="rect" x={280} y={374} w={2} h={52} look={{fill: "grad", stroke: "grad", radius: 6}}/>
  <Shape id="lab-span" shape="rect" x={210} y={446} w={600} h={60} text="Falcon 1: the first four launches" look={{fill: "transparent", stroke: "transparent", size: 36, color: "grad", weight: 700}}/>
  <Shape id="dot-2021" shape="circle" x={1616} y={376} w={48} h={48} look={{fill: "data", stroke: "data"}}/>
  <Shape id="lab-2021" shape="rect" x={1360} y={290} w={560} h={60} text="Liftoff published, 2021" look={{fill: "transparent", stroke: "transparent", size: 40, color: "data", weight: 700}}/>
  <Shape id="ic-eng" shape="icon" icon="user" x={455} y={620} w={130} look={{stroke: "data", strokeWidth: 2}}/>
  <Shape id="lab-eng" shape="rect" x={320} y={770} w={400} h={60} text="engineers" look={{fill: "transparent", stroke: "transparent", size: 44, color: "data", weight: 700}}/>
  <Shape id="ic-tech" shape="icon" icon="user" x={895} y={620} w={130} look={{stroke: "good", strokeWidth: 2}}/>
  <Shape id="lab-tech" shape="rect" x={760} y={770} w={400} h={60} text="technicians" look={{fill: "transparent", stroke: "transparent", size: 44, color: "good", weight: 700}}/>
  <Shape id="ic-exec" shape="icon" icon="user" x={1335} y={620} w={130} look={{stroke: "warn", strokeWidth: 2}}/>
  <Shape id="lab-exec" shape="rect" x={1200} y={770} w={400} h={60} text="executives" look={{fill: "transparent", stroke: "transparent", size: 44, color: "warn", weight: 700}}/>

  {/* odds: full-width bars from x=160 (the incumbents), and SpaceX's people drawn as a sliver of about 1.7 percent of the bar, a little under the narration's own bound (fewer than 200 against at least ten thousand, 2 percent) */}
  <Text id="odds-title" text="The odds were absurd." style="title"/>
  <Shape id="lab-p-name" shape="rect" x={160} y={228} w={690} h={52} text="Boeing and Lockheed Martin, each" look={{fill: "transparent", stroke: "transparent", size: 40, color: "muted", weight: 700}}/>
  <Shape id="bar-p-big" shape="rect" x={160} y={284} w={2} h={110} look={{fill: "muted", stroke: "muted", radius: 8}}/>
  <Shape id="lab-p-big" shape="rect" x={160} y={284} w={1600} h={110} text="tens of thousands of employees" look={{fill: "transparent", stroke: "transparent", size: 52, color: "bg", weight: 700}}/>
  <Shape id="bar-p-sx" shape="rect" x={160} y={410} w={28} h={110} look={{fill: "grad", stroke: "grad", radius: 6}}/>
  <Shape id="lab-p-sx" shape="rect" x={208} y={435} w={750} h={60} text="SpaceX: fewer than 200 people" look={{fill: "transparent", stroke: "transparent", size: 48, color: "grad", weight: 700}}/>
  <Shape id="lab-m-name" shape="rect" x={160} y={566} w={790} h={52} text="Boeing and Lockheed Martin, each year" look={{fill: "transparent", stroke: "transparent", size: 40, color: "muted", weight: 700}}/>
  <Shape id="bar-m-big" shape="rect" x={160} y={622} w={2} h={110} look={{fill: "muted", stroke: "muted", radius: 8}}/>
  <Shape id="lab-m-big" shape="rect" x={160} y={622} w={1600} h={110} text="tens of billions of dollars in revenue" look={{fill: "transparent", stroke: "transparent", size: 52, color: "bg", weight: 700}}/>
  <Shape id="bar-m-sx" shape="rect" x={160} y={748} w={28} h={110} look={{fill: "grad", stroke: "grad", radius: 6}}/>
  <Shape id="lab-m-sx" shape="rect" x={208} y={773} w={860} h={60} text="SpaceX: money for one more rocket" look={{fill: "transparent", stroke: "transparent", size: 48, color: "grad", weight: 700}}/>

  {/* island: the photo, then a zoom-out of rings around one point (1420, 520) */}
  <Image id="omelek" asset="omelek" style="rounded" label="Omelek Island from the air"/>
  <Shape id="dot-om" shape="circle" x={1406} y={506} w={28} h={28} look={{fill: "grad", stroke: "grad"}}/>
  <Shape id="ring-atoll" shape="circle" x={1330} y={430} w={180} h={180} draw={0} look={{fill: "transparent", stroke: "data", strokeWidth: 4}}/>
  <Shape id="lab-atoll" shape="rect" x={1250} y={406} w={340} h={48} text="Kwajalein Atoll" look={{fill: "bg", stroke: "transparent", size: 34, color: "data", weight: 700}}/>
  <Shape id="ring-marshall" shape="circle" x={1220} y={320} w={400} h={400} draw={0} look={{fill: "transparent", stroke: "op", strokeWidth: 4}}/>
  <Shape id="lab-marshall" shape="rect" x={1230} y={296} w={380} h={48} text="Marshall Islands" look={{fill: "bg", stroke: "transparent", size: 34, color: "op", weight: 700}}/>
  <Shape id="ring-pacific" shape="circle" x={1100} y={200} w={640} h={640} draw={0} look={{fill: "transparent", stroke: "muted", strokeWidth: 4}}/>
  <Shape id="lab-pacific" shape="rect" x={1250} y={176} w={340} h={48} text="Pacific Ocean" look={{fill: "bg", stroke: "transparent", size: 34, color: "muted", weight: 700}}/>
  <Image id="pad-2005" asset="prelaunch" style="rounded" label="Falcon 1 on the Omelek pad, 2005"/>
  <Shape id="ic-clock" shape="icon" icon="clock" x={1010} y={250} w={100} look={{stroke: "warn", strokeWidth: 2}}/>
  <Shape id="w-deadlines" shape="rect" x={1140} y={260} w={640} h={80} text="deadlines" look={{fill: "transparent", stroke: "transparent", size: 72, color: "warn", weight: 700, align: "left"}}/>
  <Shape id="ic-sun" shape="icon" icon="sun" x={1010} y={400} w={100} look={{stroke: "bad", strokeWidth: 2}}/>
  <Shape id="w-heat" shape="rect" x={1140} y={410} w={640} h={80} text="heat" look={{fill: "transparent", stroke: "transparent", size: 72, color: "bad", weight: 700, align: "left"}}/>
  <Shape id="ic-salt" shape="icon" icon="droplet" x={1010} y={550} w={100} look={{stroke: "data", strokeWidth: 2}}/>
  <Shape id="w-salt" shape="rect" x={1140} y={560} w={640} h={80} text="salt" look={{fill: "transparent", stroke: "transparent", size: 72, color: "data", weight: 700, align: "left"}}/>
  <Shape id="ic-iso" shape="icon" icon="radio" x={1010} y={700} w={100} look={{stroke: "muted", strokeWidth: 2}}/>
  <Shape id="w-iso" shape="rect" x={1140} y={710} w={640} h={80} text="cut off" look={{fill: "transparent", stroke: "transparent", size: 72, color: "muted", weight: 700, align: "left"}}/>

  {/* failures: one schematic rocket, one marker that moves to where each flight went wrong */}
  <Timeline id="flights" label="Falcon 1 flights 1 to 4">
    <Item id="f1" label="Flight 1" date="Mar 2006" status="fail"/>
    <Item id="f2" label="Flight 2" date="Mar 2007" status="fail"/>
    <Item id="f3" label="Flight 3" date="Aug 2008" status="fail"/>
    <Item id="f4" label="Flight 4" status="unknown"/>
  </Timeline>
  <Image id="photo-1" asset="prelaunch" style="rounded" label="Falcon 1 on the Omelek pad, 2005"/>
  <Image id="photo-2" asset="darpa" style="rounded" label="DARPA payload fairing for Falcon 1"/>
  <Image id="photo-3" asset="adastra" style="rounded" label="Falcon 1 on Omelek, July 2008"/>
  <Shape id="r-nose" shape="path" path="M 1245 330 C 1245 290 1280 250 1300 230 C 1320 250 1355 290 1355 330 Z" look={{fill: "panel2", stroke: "text", strokeWidth: 4}}/>
  <Shape id="r-s2" shape="rect" x={1245} y={330} w={110} h={170} look={{fill: "panel2", stroke: "text", strokeWidth: 4}}/>
  <Shape id="r-s1" shape="rect" x={1245} y={514} w={110} h={300} look={{fill: "panel2", stroke: "text", strokeWidth: 4}}/>
  <Shape id="r-eng" shape="rect" x={1265} y={814} w={70} h={30} look={{fill: "faint", stroke: "text", strokeWidth: 3}}/>
  <Shape id="mk" shape="circle" x={1250} y={774} w={100} h={100} look={{fill: "transparent", stroke: "bad", strokeWidth: 8}}/>
  <Shape id="fire" shape="icon" icon="flame" x={1260} y={846} w={80} look={{stroke: "warn", fill: "warn", strokeWidth: 2}}/>
  <Shape id="km" shape="rect" x={1380} y={385} w={300} h={64} text="289 km up" look={{fill: "transparent", stroke: "transparent", size: 44, color: "data", weight: 700}}/>
  <Shape id="x1" shape="icon" icon="x" x={250} y={450} w={190} look={{stroke: "bad", strokeWidth: 3}}/>
  <Shape id="x2" shape="icon" icon="x" x={560} y={450} w={190} look={{stroke: "bad", strokeWidth: 3}}/>
  <Shape id="x3" shape="icon" icon="x" x={870} y={450} w={190} look={{stroke: "bad", strokeWidth: 3}}/>

  {/* flight 4: the tally carries over; a fourth slot becomes a check */}
  <Image id="f4-photo" asset="f4" dim={0.2} label="Falcon 1 Flight 4 lifting off"/>
  <Shape id="slot4" shape="circle" x={360} y={100} w={64} h={64} look={{fill: "transparent", stroke: "muted", strokeWidth: 4}}/>
  <Shape id="ok4" shape="icon" icon="circle-check" x={360} y={100} w={64} look={{stroke: "good", strokeWidth: 3}}/>
  <Text id="f4-date" text="Sept 28, 2008" style="overlayHero"/>
  <Chip id="orbit" text="ORBIT" style="stamp"/>
  <Text id="f4-first" text="First privately developed, liquid-fueled rocket in orbit" style="display" look={{size: 72}}/>

  {/* after: the contract as growing figures, then a route */}
  <Image id="iss" asset="iss" dim={0.5} label="Dragon grappled by the station's robotic arm, October 2012"/>
  <Counter id="n-money" value={1.6} format="0.0" unit="billion dollars" style="data" look={{size: 96, font: "sans", weight: 700, color: "text", background: "rgba(8,11,18,0.8)", border: "faint", radius: 28, padding: 28}}/>
  <Counter id="n-flights" value={12} unit="cargo flights" style="data" look={{size: 96, font: "sans", weight: 700, color: "text", background: "rgba(8,11,18,0.8)", border: "faint", radius: 28, padding: 28}}/>
  <Shape id="seg-1" shape="line" x1={330} y1={730} x2={650} y2={730} draw={0} arrow look={{stroke: "text", strokeWidth: 5}}/>
  <Shape id="seg-2" shape="line" x1={770} y1={730} x2={1090} y2={730} draw={0} arrow look={{stroke: "text", strokeWidth: 5}}/>
  <Shape id="seg-3" shape="line" x1={1210} y1={730} x2={1530} y2={730} draw={0} arrow look={{stroke: "text", strokeWidth: 5}}/>
  <Shape id="n-f1" shape="circle" x={200} y={670} w={120} h={120} look={{fill: "panel", stroke: "grad", strokeWidth: 4}}/>
  <Shape id="i-f1" shape="icon" icon="rocket" x={225} y={695} w={70} look={{stroke: "grad", strokeWidth: 2}}/>
  <Shape id="t-f1" shape="rect" x={110} y={805} w={300} h={50} text="Falcon 1" look={{fill: "transparent", stroke: "transparent", size: 38, color: "text", weight: 700}}/>
  <Shape id="n-f9" shape="circle" x={640} y={670} w={120} h={120} look={{fill: "panel", stroke: "data", strokeWidth: 4}}/>
  <Shape id="i-f9" shape="icon" icon="rocket" x={665} y={695} w={70} look={{stroke: "data", strokeWidth: 2}}/>
  <Shape id="t-f9" shape="rect" x={550} y={805} w={300} h={50} text="Falcon 9" look={{fill: "transparent", stroke: "transparent", size: 38, color: "text", weight: 700}}/>
  <Shape id="n-dr" shape="circle" x={1080} y={670} w={120} h={120} look={{fill: "panel", stroke: "op", strokeWidth: 4}}/>
  <Shape id="i-dr" shape="icon" icon="box" x={1105} y={695} w={70} look={{stroke: "op", strokeWidth: 2}}/>
  <Shape id="t-dr" shape="rect" x={990} y={805} w={300} h={50} text="Dragon" look={{fill: "transparent", stroke: "transparent", size: 38, color: "text", weight: 700}}/>
  <Shape id="n-st" shape="circle" x={1520} y={670} w={120} h={120} look={{fill: "panel", stroke: "good", strokeWidth: 4}}/>
  <Shape id="i-st" shape="icon" icon="satellite" x={1545} y={695} w={70} look={{stroke: "good", strokeWidth: 2}}/>
  <Shape id="t-st" shape="rect" x={1430} y={805} w={300} h={50} text="Station, 2012" look={{fill: "transparent", stroke: "transparent", size: 38, color: "text", weight: 700}}/>

  {/* why: one line strikes the biography, then becomes the underline of the team */}
  <Shape id="w-bio" shape="rect" x={160} y={300} w={1600} h={150} text="a Musk biography" look={{fill: "transparent", stroke: "transparent", size: 120, color: "muted", weight: 700}}/>
  <Shape id="w-rule" shape="line" x1={470} y1={375} x2={1450} y2={375} draw={0} look={{stroke: "bad", strokeWidth: 10}}/>
  <Shape id="w-team" shape="rect" x={160} y={470} w={1600} h={130} text="a small team learning by failing" look={{fill: "transparent", stroke: "transparent", size: 88, color: "text", weight: 700}}/>
  <Text id="why-line" text="How SpaceX works today started here." style="display" look={{size: 110}}>
    <Run text="How SpaceX works today "/>
    <Run text="started here." style="grad"/>
  </Text>
  <Text id="credits-title" text="Liftoff · Eric Berger · 2021" style="title">
    <Run text="Liftoff "/>
    <Run text="· Eric Berger · 2021" style="light"/>
  </Text>
  <Credits
    id="credits"
    scale={1.25}
    look={{color: "text"}}
    note={"Summary written from public reviews and descriptions; no text from the book is reproduced.\nCC BY 2.0: creativecommons.org/licenses/by/2.0"}
  />

  <Scene id="hook" pattern="photoStory" slots={{media: "clip", lowerThird: "lt-demo2"}}>
    <Beat id="launch">
      <Line
        id="h1"
        text="On May 30, 2020, a SpaceX rocket carried two NASA astronauts toward orbit."
        say="On May thirtieth, twenty twenty, a SpaceX rocket carried two NASA astronauts toward orbit."
      />
      <Appear on="lt-demo2" line="h1" word="NASA"/>
    </Beat>
    <Beat id="first" slots={{upper: "first-a", center: "first-b"}}>
      <Line id="h2" text="It was the first time a private company had launched people into orbit."/>
      <Appear on="first-a" line="h2" word="private"/>
      <Appear on="first-b" line="h2" word="launched"/>
    </Beat>
    <Beat id="title" slots={{foot: "byline", upper: "eyebrow", center: "liftoff-title", lowerThird: null}}>
      <Line id="h3" text="Eric Berger's book Liftoff goes back to the years when that company was fighting to survive."/>
      <Disappear on={["lt-demo2", "first-a", "first-b"]} at="start" dur={0.5}/>
      <Appear on="byline" line="h3" word="Berger's"/>
      <Appear on="eyebrow" line="h3" word="book"/>
      <Appear on="liftoff-title" line="h3" word="Liftoff"/>
    </Beat>
  </Scene>

  <Scene id="book" pattern="full" slots={{main: ["axis", "dot-2002", "lab-2002", "span", "lab-span", "dot-2021", "lab-2021", "ic-eng", "lab-eng", "ic-tech", "lab-tech", "ic-exec", "lab-exec"]}}>
    <Beat id="what">
      <Line
        id="b1"
        text="Published in 2021, Liftoff follows SpaceX from its founding in 2002, through the first four launches of its first rocket, Falcon 1."
        say="Published in twenty twenty one, Liftoff follows SpaceX from its founding in two thousand two, through the first four launches of its first rocket, Falcon One."
      />
      <Tween on="axis" draw={1} line="b1" word="Published" dur={1.4}/>
      <Appear on={["dot-2021", "lab-2021"]} line="b1" word="twenty twenty one"/>
      <Appear on={["dot-2002", "lab-2002"]} line="b1" word="founding"/>
      <Appear on="span" line="b1" word="first four launches"/>
      <Tween on="span" w={430} line="b1" word="first four launches" dur={1.2}/>
      <Appear on="lab-span" line="b1" word="Falcon One"/>
    </Beat>
    <Beat id="who">
      <Line id="b2" text="Berger, a space reporter, built it from interviews with the engineers, technicians, and executives who were there."/>
      <Appear on={["ic-eng", "lab-eng"]} line="b2" word="engineers"/>
      <Appear on={["ic-tech", "lab-tech"]} line="b2" word="technicians"/>
      <Appear on={["ic-exec", "lab-exec"]} line="b2" word="executives"/>
    </Beat>
  </Scene>

  <Scene
    id="odds"
    pattern="stage"
    slots={{title: "odds-title", main: ["lab-p-name", "bar-p-big", "lab-p-big", "bar-p-sx", "lab-p-sx", "lab-m-name", "bar-m-big", "lab-m-big", "bar-m-sx", "lab-m-sx"]}}
  >
    <Beat id="absurd">
      <Line id="o1" text="The odds were absurd."/>
      <Appear on="odds-title" line="o1" word="odds"/>
    </Beat>
    <Beat id="big">
      <Line
        id="o2"
        text="Boeing and Lockheed Martin each had tens of thousands of employees, and tens of billions of dollars in yearly revenue."
      />
      <Appear on="lab-p-name" line="o2" word="Boeing"/>
      <Appear on="bar-p-big" line="o2" word="tens of thousands"/>
      <Tween on="bar-p-big" w={1600} line="o2" word="tens of thousands" dur={1.2}/>
      <Appear on="lab-p-big" line="o2" word="tens of thousands" offset={1.0}/>
      <Appear on="lab-m-name" line="o2" word="tens of billions" offset={-0.6}/>
      <Appear on="bar-m-big" line="o2" word="tens of billions"/>
      <Tween on="bar-m-big" w={1600} line="o2" word="tens of billions" dur={1.2}/>
      <Appear on="lab-m-big" line="o2" word="tens of billions" offset={1.0}/>
    </Beat>
    <Beat id="small">
      <Line
        id="o3"
        text="SpaceX had fewer than 200 people, and by 2008, money for only one more rocket."
        say="SpaceX had fewer than two hundred people, and by two thousand eight, money for only one more rocket."
      />
      <Appear on={["bar-p-sx", "lab-p-sx"]} line="o3" word="fewer than two hundred"/>
      <Appear on={["bar-m-sx", "lab-m-sx"]} line="o3" word="money"/>
    </Beat>
  </Scene>

  <Scene id="island" pattern="split" slots={{left: "omelek", right: ["dot-om", "ring-atoll", "lab-atoll", "ring-marshall", "lab-marshall", "ring-pacific", "lab-pacific"]}} options={{ratio: 0.45}}>
    <Beat id="where" hold={1.2}>
      <Line
        id="i1"
        text="To launch, the team went to Omelek, a tiny island in Kwajalein Atoll, in the Marshall Islands, in the middle of the Pacific."
        say="To launch, the team went to Omelek, a tiny island in Kwajalein Atoll, in the Marshall Islands, in the middle of the Pacific."
      />
      <Appear on="omelek" line="i1" word="Omelek"/>
      <KenBurns on="omelek" line="i1" word="Omelek" params={{from: [1, 50, 50], to: [1.15, 45, 55]}}/>
      <Appear on="dot-om" line="i1" word="tiny"/>
      <Tween on="ring-atoll" draw={1} line="i1" word="island" offset={0.6} dur={0.8}/>
      <Appear on="ring-atoll" line="i1" word="island" offset={0.6}/>
      <Appear on="lab-atoll" line="i1" word="island" offset={0.8}/>
      <Tween on="ring-marshall" draw={1} line="i1" word="Marshall" dur={0.8}/>
      <Appear on="ring-marshall" line="i1" word="Marshall"/>
      <Appear on="lab-marshall" line="i1" word="Marshall" offset={0.2}/>
      <Tween on="ring-pacific" draw={1} line="i1" word="Pacific" dur={1}/>
      <Appear on="ring-pacific" line="i1" word="Pacific"/>
      <Appear on="lab-pacific" line="i1" word="Pacific" offset={0.2}/>
    </Beat>
    <Beat id="life" slots={{left: "pad-2005", right: ["ic-clock", "w-deadlines", "ic-sun", "w-heat", "ic-salt", "w-salt", "ic-iso", "w-iso"]}}>
      <Line id="i2" text="Much of the book is set there: engineers racing deadlines, in heat and salt, cut off from everything."/>
      <Disappear on={["omelek", "dot-om", "ring-atoll", "lab-atoll", "ring-marshall", "lab-marshall", "ring-pacific", "lab-pacific"]} at="start" dur={0.4}/>
      <Appear on="pad-2005" at="start" offset={0.3}/>
      <KenBurns on="pad-2005" at="start" offset={0.3} params={{from: [1, 50, 90], to: [1.12, 50, 20]}}/>
      <Appear on={["ic-clock", "w-deadlines"]} line="i2" word="deadlines"/>
      <Appear on={["ic-sun", "w-heat"]} line="i2" word="heat"/>
      <Appear on={["ic-salt", "w-salt"]} line="i2" word="salt"/>
      <Appear on={["ic-iso", "w-iso"]} line="i2" word="cut off"/>
    </Beat>
  </Scene>

  <Scene
    id="failures"
    pattern="timeline"
    slots={{track: "flights", left: "photo-1", right: ["r-nose", "r-s2", "r-s1", "r-eng", "mk", "fire", "km"]}}
  >
    <Beat id="flight1">
      <Line
        id="f1"
        text="On the first flight, in March 2006, a fuel leak started a fire, and the rocket was lost."
        say="On the first flight, in March two thousand six, a fuel leak started a fire, and the rocket was lost."
      />
      <Tween on="flights" draw={1} at="start" dur={0.8}/>
      <Appear on="flights#f1" line="f1" word="two thousand six"/>
      <Appear on="photo-1" line="f1" word="March"/>
      <KenBurns on="photo-1" line="f1" word="March" params={{from: [1, 50, 70], to: [1.12, 50, 30]}}/>
      <Appear on={["r-nose", "r-s2", "r-s1", "r-eng"]} line="f1" word="fuel"/>
      <Appear on="mk" line="f1" word="leak"/>
      <Appear on="fire" line="f1" word="fire"/>
    </Beat>
    <Beat id="flight2" slots={{left: "photo-2"}}>
      <Line
        id="f2"
        text="On the second flight, in March 2007, the rocket reached space, about 289 kilometers up, but a control problem cut the second stage short."
        say="On the second flight, in March two thousand seven, the rocket reached space, about two hundred eighty nine kilometers up, but a control problem cut the second stage short."
      />
      <Disappear on={["photo-1", "fire"]} at="start" dur={0.3}/>
      <Appear on="flights#f2" line="f2" word="two thousand seven"/>
      <Appear on="photo-2" line="f2" word="March"/>
      <KenBurns on="photo-2" line="f2" word="March" params={{from: [1, 50, 30], to: [1.12, 50, 60]}}/>
      <Appear on="km" line="f2" word="space"/>
      <Tween on="mk" x={1250} y={365} line="f2" word="control problem" dur={0.8}/>
    </Beat>
    <Beat id="flight3" slots={{left: "photo-3"}}>
      <Line
        id="f3"
        text="On the third flight, in August 2008, the first stage bumped into the second after separation."
        say="On the third flight, in August two thousand eight, the first stage bumped into the second after separation."
      />
      <Disappear on={["photo-2", "km"]} at="start" dur={0.3}/>
      <Appear on="flights#f3" line="f3" word="two thousand eight"/>
      <Appear on="photo-3" line="f3" word="August"/>
      <KenBurns on="photo-3" line="f3" word="August" params={{from: [1, 50, 90], to: [1.12, 50, 70]}}/>
      <Tween on="mk" x={1250} y={456} line="f3" word="bumped" dur={0.8}/>
    </Beat>
    <Beat id="tally" slots={{left: ["x1", "x2", "x3"]}}>
      <Line id="f0" text="Three launches, three failures."/>
      <Disappear on="photo-3" at="start" dur={0.3}/>
      <Appear on="x1" line="f0" word="Three"/>
      <Appear on="x2" line="f0" word="launches"/>
      <Appear on="x3" line="f0" word="three failures"/>
    </Beat>
  </Scene>

  <Scene id="flight4" pattern="photoStory" slots={{media: "f4-photo", center: "f4-date", lower: "orbit", badge: ["x1", "x2", "x3", "slot4", "ok4"]}}>
    <Beat id="last" slots={{center: null, lower: null}}>
      <Line
        id="g1"
        text="According to Musk, the fourth Falcon 1 was the last rocket they could pay for."
        say="According to Musk, the fourth Falcon One was the last rocket they could pay for."
      />
      <KenBurns on="f4-photo" at="start" params={{from: [1, 50, 70], to: [1.25, 50, 35]}}/>
      <Tween on="x1" x={120} y={100} w={64} line="g1" word="fourth" dur={0.8}/>
      <Tween on="x2" x={200} y={100} w={64} line="g1" word="fourth" dur={0.8}/>
      <Tween on="x3" x={280} y={100} w={64} line="g1" word="fourth" dur={0.8}/>
      <Appear on="slot4" line="g1" word="last"/>
    </Beat>
    <Beat id="orbit" hold={1.4} slots={{center: "f4-date", lower: "orbit"}}>
      <Line
        id="g2"
        text="On September 28, 2008, it reached orbit."
        say="On September twenty eighth, two thousand eight, it reached orbit."
      />
      <Appear on="f4-date" line="g2" word="two thousand eight"/>
      <Disappear on="slot4" line="g2" word="orbit" dur={0.5}/>
      <Crossfade on="ok4" line="g2" word="orbit" dur={0.5}/>
      <Stamp on="orbit" line="g2" word="orbit" dur={0.4}/>
    </Beat>
    <Beat id="first" slots={{center: "f4-first", lower: null}}>
      <Line id="g3" text="It was the first privately developed, liquid-fueled rocket to reach orbit."/>
      <Disappear on={["f4-date", "orbit"]} at="start" dur={0.4}/>
      <Appear on="f4-first" line="g3" word="first"/>
    </Beat>
  </Scene>

  <Scene id="after" pattern="photoStory" slots={{media: "iss", upper: "n-money", lower: "n-flights", foot: ["seg-1", "seg-2", "seg-3", "n-f1", "i-f1", "t-f1", "n-f9", "i-f9", "t-f9", "n-dr", "i-dr", "t-dr", "n-st", "i-st", "t-st"]}} >
    <Beat id="contract" slots={{foot: null}}>
      <Line
        id="a1"
        text="Three months later, NASA awarded SpaceX a contract worth up to one point six billion dollars, for twelve cargo flights to the space station."
      />
      <KenBurns on="iss" at="start" params={{from: [1, 50, 50], to: [1.12, 42, 50]}}/>
      <Appear on="n-money" line="a1" word="one point six"/>
      <CountUp on="n-money" line="a1" word="one point six" dur={1.4}/>
      <Appear on="n-flights" line="a1" word="twelve"/>
      <CountUp on="n-flights" line="a1" word="twelve" dur={1.2}/>
    </Beat>
    <Beat id="path" slots={{upper: null, lower: null, foot: ["seg-1", "seg-2", "seg-3", "n-f1", "i-f1", "t-f1", "n-f9", "i-f9", "t-f9", "n-dr", "i-dr", "t-dr", "n-st", "i-st", "t-st"]}}>
      <Line
        id="a2"
        text="It opened the way from Falcon 1 to Falcon 9 and Dragon, which first reached the station in 2012."
        say="It opened the way from Falcon One to Falcon Nine and Dragon, which first reached the station in twenty twelve."
      />
      <Disappear on={["n-money", "n-flights"]} at="start" dur={0.4}/>
      <Appear on={["n-f1", "i-f1", "t-f1"]} line="a2" word="Falcon One"/>
      <Tween on="seg-1" draw={1} line="a2" word="Falcon One" offset={0.6} dur={0.7}/>
      <Appear on={["n-f9", "i-f9", "t-f9"]} line="a2" word="Falcon Nine"/>
      <Tween on="seg-2" draw={1} line="a2" word="Falcon Nine" offset={0.6} dur={0.7}/>
      <Appear on={["n-dr", "i-dr", "t-dr"]} line="a2" word="Dragon"/>
      <Tween on="seg-3" draw={1} line="a2" word="Dragon" offset={0.6} dur={0.7}/>
      <Appear on={["n-st", "i-st", "t-st"]} line="a2" word="twenty twelve"/>
    </Beat>
  </Scene>

  <Scene id="why" pattern="full" slots={{main: ["w-bio", "w-rule", "w-team"]}}>
    <Beat id="portrait">
      <Line id="w1" text="Liftoff is less a Musk biography than a portrait of a small team that learned by failing, quickly and cheaply."/>
      <Appear on="w-bio" line="w1" word="Musk"/>
      <Tween on="w-rule" draw={1} line="w1" word="than" dur={0.5}/>
      <Disappear on="w-bio" line="w1" word="portrait" dur={0.3}/>
      <Tween on="w-rule" x1={240} y1={610} x2={1680} y2={610} line="w1" word="portrait" dur={0.7}/>
      <Set on="w-rule" look={{stroke: "grad", strokeWidth: 10}} line="w1" word="portrait"/>
      <Appear on="w-team" line="w1" word="small"/>
    </Beat>
    <Beat id="today" pattern="title" slots={{title: "why-line"}}>
      <Line id="w2" text="How SpaceX works today started here."/>
      <Disappear on={["w-rule", "w-team"]} at="start" dur={0.4}/>
      <Appear on="why-line" line="w2" word="works"/>
    </Beat>
    <Beat id="credits" pattern="board" slots={{title: "credits-title", wide: "credits"}} options={{band: false}} hold={4}>
      <Line
        id="c1"
        text="Liftoff, by Eric Berger, published in 2021."
        say="Liftoff, by Eric Berger, published in twenty twenty one."
      />
      <Appear on="credits-title" line="c1" word="twenty twenty one"/>
      <Appear on="credits" line="c1" offset={1}/>
    </Beat>
  </Scene>
</Doc>;
