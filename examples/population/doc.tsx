import {Doc, Text, Scene, Beat, Line, Appear, Disappear, Crossfade, Tween, Shape} from "@visotalk/jsx";

export default <Doc spec="0.4.0" id="population" title="The eight billion" lang="en" theme="visotalk/dark" canvas="16x9" exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned", credits: "none"}}>
  <Text id="t0" text={"The eight billion"} style="title"/>
  <Shape id="ring" shape="circle" x={440} y={290} w={440} h={440} draw={0} look={{"stroke": "grad", "strokeWidth": 12, "fill": "transparent"}}/>
  <Shape id="watch" shape="icon" icon={"timer"} x={550} y={400} w={220} look={{"stroke": "data", "strokeWidth": 2.5}}/>
  <Shape id="big" shape="rect" x={1000} y={420} w={700} h={180} text={"1 billion"} look={{"fill": "transparent", "stroke": "transparent", "size": 150, "color": "text", "font": "sans", "weight": 700}}/>
  <Shape id="bigsub" shape="rect" x={1000} y={610} w={700} h={54} text={"how many years each?"} look={{"fill": "transparent", "stroke": "transparent", "size": 44, "color": "muted", "font": "mono", "weight": 400}}/>
  <Text id="t1" text={"Years it took to add each billion"} style="title"/>
  <Shape id="o1" shape="rect" x={150} y={231} w={140} h={54} text={"1st"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b1" shape="rect" x={330} y={235} w={2} h={46} text={"all of history"} look={{"fill": "#3a3f4a", "stroke": "transparent", "color": "text", "size": 30, "radius": 8}}/>
  <Shape id="o2" shape="rect" x={150} y={301} w={140} h={54} text={"2nd"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b2" shape="rect" x={330} y={305} w={2} h={46} look={{"fill": "#5b8def", "stroke": "transparent", "radius": 8}}/>
  <Shape id="y2" shape="rect" x={1442} y={301} w={190} h={54} text={"123 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="r2" shape="rect" x={1640} y={301} w={230} h={54} text={"1927"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "grad", "font": "mono", "weight": 400}}/>
  <Shape id="o3" shape="rect" x={150} y={371} w={140} h={54} text={"3rd"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b3" shape="rect" x={330} y={375} w={2} h={46} look={{"fill": "#3fb0d0", "stroke": "transparent", "radius": 8}}/>
  <Shape id="y3" shape="rect" x={637} y={371} w={190} h={54} text={"33 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="r3" shape="rect" x={1640} y={371} w={230} h={54} text={"1960"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "grad", "font": "mono", "weight": 400}}/>
  <Shape id="o4" shape="rect" x={150} y={441} w={140} h={54} text={"4th"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b4" shape="rect" x={330} y={445} w={2} h={46} look={{"fill": "#4cc59a", "stroke": "transparent", "radius": 8}}/>
  <Shape id="y4" shape="rect" x={467} y={441} w={190} h={54} text={"14 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="o5" shape="rect" x={150} y={511} w={140} h={54} text={"5th"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b5" shape="rect" x={330} y={515} w={2} h={46} look={{"fill": "#a3d055", "stroke": "transparent", "radius": 8}}/>
  <Shape id="y5" shape="rect" x={458} y={511} w={190} h={54} text={"13 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="o6" shape="rect" x={150} y={581} w={140} h={54} text={"6th"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b6" shape="rect" x={330} y={585} w={2} h={46} look={{"fill": "#e8c33c", "stroke": "transparent", "radius": 8}}/>
  <Shape id="y6" shape="rect" x={449} y={581} w={190} h={54} text={"12 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="o7" shape="rect" x={150} y={651} w={140} h={54} text={"7th"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b7" shape="rect" x={330} y={655} w={2} h={46} look={{"fill": "#f19a34", "stroke": "transparent", "radius": 8}}/>
  <Shape id="y7" shape="rect" x={449} y={651} w={190} h={54} text={"12 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="o8" shape="rect" x={150} y={721} w={140} h={54} text={"8th"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b8" shape="rect" x={330} y={725} w={2} h={46} look={{"fill": "#f26a2e", "stroke": "transparent", "radius": 8}}/>
  <Shape id="y8" shape="rect" x={440} y={721} w={190} h={54} text={"11 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="r8" shape="rect" x={1640} y={721} w={230} h={54} text={"Nov 2022"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "grad", "font": "mono", "weight": 400}}/>
  <Shape id="o9" shape="rect" x={150} y={791} w={140} h={54} text={"9th"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="b9" shape="rect" x={330} y={795} w={2} h={46} look={{"fill": "transparent", "stroke": "warn", "strokeWidth": 4, "radius": 8}}/>
  <Shape id="y9" shape="rect" x={476} y={791} w={190} h={54} text={"15 years"} look={{"fill": "transparent", "stroke": "transparent", "size": 38, "color": "text", "font": "sans", "weight": 400}}/>
  <Shape id="r9" shape="rect" x={1640} y={791} w={230} h={54} text={"2037 UN"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "warn", "font": "mono", "weight": 400}}/>
  <Shape id="r1" shape="rect" x={1640} y={231} w={230} h={54} text={"1804"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "grad", "font": "mono", "weight": 400}}/>
  <Shape id="trend" shape="line" x1={1430} y1={328} x2={760} y2={748} arrow={true} draw={0} look={{"stroke": "grad", "strokeWidth": 6}}/>
  <Shape id="decade" shape="rect" x={820} y={688} w={460} h={76} text={"about a decade"} look={{"fill": "transparent", "stroke": "transparent", "size": 52, "color": "grad", "font": "sans", "weight": 700}}/>
  <Shape id="rabbit" shape="icon" icon={"rabbit"} x={1250} y={560} w={130} look={{"stroke": "warn", "strokeWidth": 2.5}}/>
  <Shape id="again" shape="icon" icon={"repeat"} x={1420} y={560} w={130} look={{"stroke": "warn", "strokeWidth": 2.5}}/>
  <Text id="t2" text={"A slower pace, a rising total"} style="title"/>
  <Shape id="axx" shape="line" x1={300} y1={820} x2={1640} y2={820} arrow={true} draw={0} look={{"stroke": "muted", "strokeWidth": 4}}/>
  <Shape id="axy" shape="line" x1={300} y1={820} x2={300} y2={250} arrow={true} draw={0} look={{"stroke": "muted", "strokeWidth": 4}}/>
  <Shape id="ltime" shape="rect" x={1480} y={760} w={160} h={54} text={"time"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="lpeople" shape="rect" x={330} y={252} w={200} h={54} text={"people"} look={{"fill": "transparent", "stroke": "transparent", "size": 34, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="ca" shape="path" path={"M 300 790 C 600 770 760 420 1000 400"} draw={0} look={{"stroke": "data", "strokeWidth": 9}}/>
  <Shape id="cb" shape="path" path={"M 1000 400 C 1150 380 1200 336 1330 335 C 1450 335 1520 360 1620 400"} draw={0} look={{"stroke": "data", "strokeWidth": 9}}/>
  <Shape id="pk" shape="circle" x={1312} y={317} w={36} h={36} look={{"fill": "good", "stroke": "good"}}/>
  <Shape id="pkl" shape="rect" x={1232} y={250} w={196} h={54} text={"peak"} look={{"fill": "transparent", "stroke": "transparent", "size": 44, "color": "good", "font": "sans", "weight": 700}}/>
  <Text id="t3" text={"Why the pace slows"} style="title"/>
  <Shape id="u0" shape="icon" icon={"user"} x={340} y={400} w={110} look={{"stroke": "data", "strokeWidth": 2.5}}/>
  <Shape id="u1" shape="icon" icon={"user"} x={480} y={400} w={110} look={{"stroke": "data", "strokeWidth": 2.5}}/>
  <Shape id="u2" shape="icon" icon={"user"} x={620} y={400} w={110} look={{"stroke": "data", "strokeWidth": 2.5}}/>
  <Shape id="u3" shape="icon" icon={"user"} x={760} y={400} w={110} look={{"stroke": "data", "strokeWidth": 2.5}}/>
  <Shape id="lfam" shape="rect" x={320} y={540} w={560} h={54} text={"children per family"} look={{"fill": "transparent", "stroke": "transparent", "size": 36, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="hp" shape="icon" icon={"heart-pulse"} x={1050} y={330} w={90} look={{"stroke": "good", "strokeWidth": 2.5}}/>
  <Shape id="life" shape="rect" x={1050} y={450} w={150} h={40} look={{"fill": "good", "stroke": "transparent", "radius": 20}}/>
  <Shape id="llife" shape="rect" x={1050} y={520} w={560} h={54} text={"years of life"} look={{"fill": "transparent", "stroke": "transparent", "size": 36, "color": "muted", "font": "mono", "weight": 400}}/>
  <Shape id="ring2" shape="circle" x={770} y={290} w={380} h={380} draw={0} look={{"stroke": "grad", "strokeWidth": 10, "fill": "transparent"}}/>
  <Shape id="rab2" shape="icon" icon={"rabbit"} x={860} y={380} w={200} look={{"stroke": "warn", "strokeWidth": 2.5}}/>
  <Shape id="tur" shape="icon" icon={"turtle"} x={860} y={380} w={200} look={{"stroke": "data", "strokeWidth": 2.5}}/>
  <Scene id="intro" pattern="stage" slots={{title: "t0", main: ["ring", "watch", "big", "bigsub"]}}>
    <Beat id="bp1" hold={2.5}>
      <Line id="p1">How fast is the world's population really growing? Count it in billions.</Line>
      <Appear on="t0" line="p1" word="population"/>
      <Tween on="ring" draw={1} line="p1" word="Count" dur={1.2}/>
      <Appear on="watch" line="p1" word="Count" offset={0.5}/>
      <Appear on="big" line="p1" word="billions"/>
      <Appear on="bigsub" line="p1" word="billions" offset={0.5}/>
    </Beat>
  </Scene>
  <Scene id="waits" pattern="stage" slots={{title: "t1", main: ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "o1", "o2", "o3", "o4", "o5", "o6", "o7", "o8", "o9", "y2", "y3", "y4", "y5", "y6", "y7", "y8", "y9", "r1", "r2", "r3", "r8", "r9", "trend", "decade", "rabbit", "again"]}}>
    <Beat id="bp2">
      <Line id="p2" text={"For almost all of history, the number stayed small. It took humanity until 1804 to reach one billion people."}>For almost all of history, the number stayed small. It took humanity until eighteen oh four to reach one billion people.</Line>
      <Appear on="t1" line="p2" word="For"/>
      <Appear on={["b1","o1"]} line="p2" word="history"/>
      <Tween on="b1" w={1150} line="p2" word="history" dur={1.4}/>
      <Appear on="r1" line="p2" word="eighteen"/>
    </Beat>
    <Beat id="bp3">
      <Line id="p3" text={"The second billion took 123 years, arriving in 1927."}>The second billion took one hundred and twenty three years, arriving in nineteen twenty seven.</Line>
      <Appear on={["b2","o2"]} line="p3" word="second"/>
      <Tween on="b2" w={1100} line="p3" word="second" dur={1.4}/>
      <Appear on="y2" line="p3" word="one"/>
      <Appear on="r2" line="p3" word="nineteen"/>
    </Beat>
    <Beat id="bp4">
      <Line id="p4" text={"The third took only 33 years, in 1960."}>The third took only thirty three years, in nineteen sixty.</Line>
      <Appear on={["b3","o3"]} line="p4" word="third"/>
      <Tween on="b3" w={295} line="p4" word="third" dur={1.4}/>
      <Appear on="y3" line="p4" word="thirty"/>
      <Appear on="r3" line="p4" word="nineteen"/>
    </Beat>
    <Beat id="bp5">
      <Line id="p5" text={"Then 14 years for the fourth, and 13 for the fifth."}>Then fourteen years for the fourth, and thirteen for the fifth.</Line>
      <Appear on={["b4","o4"]} line="p5" word="fourteen"/>
      <Tween on="b4" w={125} line="p5" word="fourteen" dur={1.4}/>
      <Appear on="y4" line="p5" word="fourteen"/>
      <Appear on={["b5","o5"]} line="p5" word="thirteen"/>
      <Tween on="b5" w={116} line="p5" word="thirteen" dur={1.4}/>
      <Appear on="y5" line="p5" word="thirteen"/>
    </Beat>
    <Beat id="bp6">
      <Line id="p6" text={"The sixth and the seventh each took 12 years."}>The sixth and the seventh each took twelve years.</Line>
      <Appear on={["b6","o6"]} line="p6" word="sixth"/>
      <Tween on="b6" w={107} line="p6" word="sixth" dur={1.4}/>
      <Appear on={["b7","o7"]} line="p6" word="seventh"/>
      <Tween on="b7" w={107} line="p6" word="seventh" dur={1.4}/>
      <Appear on={["y6","y7"]} line="p6" word="twelve"/>
    </Beat>
    <Beat id="bp7">
      <Line id="p7" text={"The eighth billion took 11 years, and arrived in November 2022."}>The eighth billion took eleven years, and arrived in November twenty twenty two.</Line>
      <Appear on={["b8","o8"]} line="p7" word="eighth"/>
      <Tween on="b8" w={98} line="p7" word="eighth" dur={1.4}/>
      <Appear on="y8" line="p7" word="eleven"/>
      <Appear on="r8" line="p7" word="twenty twenty two"/>
    </Beat>
    <Beat id="bp8">
      <Line id="p8" text={"So the wait for each billion has shrunk from 123 years to about a decade."}>So the wait for each billion has shrunk from one hundred and twenty three years to about a decade.</Line>
      <Tween on="trend" draw={1} line="p8" word="shrunk" dur={1.5}/>
      <Appear on="decade" line="p8" word="decade"/>
    </Beat>
    <Beat id="bp9" hold={1.5}>
      <Line id="p9">The world did not just get bigger. It got bigger faster, again and again.</Line>
      <Appear on="rabbit" line="p9" word="faster"/>
      <Appear on="again" line="p9" word="again"/>
    </Beat>
    <Beat id="bp10" hold={2.5}>
      <Line id="p10" text={"But the United Nations projects the ninth billion in 2037, a gap of 15 years."}>But the United Nations projects the ninth billion in twenty thirty seven, a gap of fifteen years.</Line>
      <Disappear on={["trend","decade","rabbit","again"]} line="p10" word="But"/>
      <Appear on={["b9","o9"]} line="p10" word="ninth"/>
      <Tween on="b9" w={134} line="p10" word="ninth" dur={1.4}/>
      <Appear on="y9" line="p10" word="fifteen"/>
      <Appear on="r9" line="p10" word="twenty thirty seven"/>
    </Beat>
  </Scene>
  <Scene id="peak" pattern="stage" slots={{title: "t2", main: ["axx", "axy", "ltime", "lpeople", "ca", "cb", "pk", "pkl"]}}>
    <Beat id="bp11">
      <Line id="p11">A slower pace does not mean fewer people: the total keeps rising for decades.</Line>
      <Appear on="t2" line="p11" word="slower"/>
      <Tween on="axx" draw={1} line="p11" word="total" dur={1.0}/>
      <Tween on="axy" draw={1} line="p11" word="total" dur={1.0}/>
      <Appear on="ltime" line="p11" word="total"/>
      <Appear on="lpeople" line="p11" word="people"/>
      <Tween on="ca" draw={1} line="p11" word="keeps rising" dur={2.5}/>
    </Beat>
    <Beat id="bp12" hold={2.5}>
      <Line id="p12">After that, growth keeps slowing, and the total is expected to peak later this century.</Line>
      <Tween on="cb" draw={1} line="p12" word="keeps slowing" dur={2.5}/>
      <Appear on={["pk","pkl"]} line="p12" word="peak"/>
    </Beat>
  </Scene>
  <Scene id="why" pattern="stage" slots={{title: "t3", main: ["u0", "u1", "u2", "u3", "lfam", "hp", "life", "llife", "ring2", "rab2", "tur"]}}>
    <Beat id="bp13">
      <Line id="p13">Fewer children per family, and longer lives, are changing how the numbers add up.</Line>
      <Appear on="t3" line="p13" word="Fewer"/>
      <Appear on={["u0","u1","u2","u3"]} line="p13" word="children"/>
      <Appear on="lfam" line="p13" word="per"/>
      <Disappear on={["u2","u3"]} line="p13" word="numbers"/>
      <Appear on={["hp","life"]} line="p13" word="longer"/>
      <Tween on="life" w={560} line="p13" word="longer" dur={1.5}/>
      <Appear on="llife" line="p13" word="lives"/>
    </Beat>
    <Beat id="bp14" hold={3}>
      <Line id="p14">The sprint is ending.</Line>
      <Disappear on={["t3","u0","u1","lfam","hp","life","llife"]} line="p14" word="The"/>
      <Tween on="ring2" draw={1} line="p14" word="sprint" dur={1.2}/>
      <Appear on="rab2" line="p14" word="The"/>
      <Disappear on="rab2" line="p14" word="ending" edge="end" offset={0.8}/>
      <Crossfade on="tur" line="p14" word="ending" edge="end" offset={0.8}/>
    </Beat>
  </Scene>
</Doc>;