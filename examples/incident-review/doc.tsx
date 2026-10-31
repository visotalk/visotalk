import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {MinuteBand, Devices} from './parts/impact.tsx';
import {Share, TwoViews} from './parts/reach.tsx';
import {CertLink, RenewRing} from './parts/cause.tsx';
import {Timeline, LogPanel} from './parts/timeline.tsx';
import {Ledger} from './parts/findings.tsx';
import {Actions} from './parts/actions.tsx';

export default <Doc id="incident-review" poster={80} title={"Notes stopped syncing: what the review says"} lang={"en"} voice={"af_heart"} theme="visotalk/dark" canvas="16x9">
  <Scene id="impact" title="What people saw">
    <Line id="l1" text={"For 47 minutes on Tuesday 14 October, notes stopped syncing."}>For forty-seven minutes on Tuesday the fourteenth of October, notes stopped syncing.</Line>
    <Line id="l2">People could still read and edit what was already on their phone or laptop.</Line>
    <Line id="l3">But nothing they changed reached their other devices, and shared notebooks stopped updating.</Line>
    <Line id="l4">No notes were lost: every edit waited on the device and synced when the service came back.</Line>

    <Part id="band" x={160} y={250} w={1600} h={290}><MinuteBand /></Part>
    <Part id="devices" x={160} y={520} w={1600} h={420} z={2}><Devices /></Part>

    <Animation>
      <Appear target="band" line="l1" word="minutes" dur={0} />
      <Tween target="band" to={{span: 1}} line="l1" word="minutes" dur={2.2} easing="easeOutQuart" />
      <Tween target="band" to={{value: 47}} line="l1" word="minutes" dur={1.8} easing="easeOutQuart" />

      <Appear target="devices" line="l2" word="phone" dur={0.45} />
      <Appear target="laptop" line="l2" word="phone" dur={0.45} />
      <Appear target="phone" line="l2" word="phone" dur={0.45} />

      <Tween target="devices" to={{gap: 1, stale: 1}} line="l3" word="devices" dur={0.9} easing="easeOut" />

      <Tween target="devices" to={{stale: 0}} line="l4" word="synced" dur={0.6} />
      <Tween target="devices" to={{flow: 1}} line="l4" word="synced" dur={2} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="reach" title="How many, and why it was hard to see">
    <Line id="l5" text={"About 12% of people who opened Nook in that window saw a “Couldn’t sync” banner."}>About twelve percent of people who opened Nook in that window saw a couldn't sync banner.</Line>
    <Line id="l6" text={"Roughly 38,000 accounts."}>Roughly thirty-eight thousand accounts.</Line>
    <Line id="l7">To them the app looked broken, while the service looked fine.</Line>

    <Part id="share" x={120} y={120} w={1700} h={730}><Share /></Part>
    <Part id="views" x={160} y={140} w={1600} h={600} z={2}><TwoViews /></Part>

    <Animation>
      <Appear target="share" line="l5" word="percent" dur={0} />
      <Tween target="share" to={{lit: 1}} line="l5" word="percent" dur={2.2} easing="easeOut" />
      <Tween target="share" to={{value: 12}} line="l5" word="percent" dur={1.6} easing="easeOutQuart" />
      <Tween target="share" to={{accounts: 1}} line="l6" word="accounts" dur={0.5} />
      <Tween target="share" to={{count: 38000}} line="l6" word="roughly" dur={1.5} easing="easeOutQuart" />

      <Disappear target="share" line="l7" word="app" dur={0.4} />
      <Appear target="views" line="l7" word="app" dur={0.4} />
      <Tween target="views" to={{app: 1}} line="l7" word="app" dur={0.7} />
      <Tween target="views" to={{service: 1}} line="l7" word="service" dur={0.7} />
    </Animation>
  </Scene>

  <Scene id="cause" title="The one certificate">
    <Line id="l8" text={"The sync service talks to the storage cluster over TLS, and its certificate is its proof of identity."}>The sync service talks to the storage cluster over T L S, and its certificate is its proof of identity.</Line>
    <Line id="l9">That certificate had been issued by hand a year earlier, outside the system that renews all the others.</Line>
    <Line id="l10">So nothing renewed it, and nothing warned anyone.</Line>
    <Line id="l11" text={"At 09:12 it expired, and sync requests started failing."}>At nine twelve it expired, and sync requests started failing.</Line>

    <Part id="link" x={160} y={300} w={1600} h={460}><CertLink /></Part>
    <Part id="ring" x={110} y={150} w={1700} h={700} z={2}><RenewRing /></Part>

    <Animation>
      <Appear target="link" line="l8" word="certificate" dur={0} />
      <Appear target="svc" line="l8" word="sync" />
      <Appear target="store" line="l8" word="storage" />
      <Tween target="link" to={{wire: 1}} line="l8" word="over" dur={1.2} />
      <Tween target="link" to={{cert: 1}} line="l8" word="certificate" dur={0.6} />

      <Disappear target="link" line="l9" word="issued" dur={0.35} />
      <Appear target="ring" line="l9" word="issued" dur={0.35} />
      <Tween target="ring" to={{draw: 1}} line="l9" word="outside" dur={1.4} easing="easeOut" />
      <Tween target="ring" to={{dots: 1}} line="l9" word="renews" dur={1.3} easing="easeOut" />
      <Tween target="ring" to={{stray: 1}} line="l9" word="hand" dur={0.6} />
      <Tween target="ring" to={{silent: 1}} line="l10" word="nothing warned" dur={0.6} />

      <Disappear target="ring" line="l11" word="expired" dur={0.3} />
      <Appear target="link" line="l11" word="expired" dur={0.3} />
      <Tween target="link" to={{broke: 1}} line="l11" word="expired" dur={0.7} />
    </Animation>
  </Scene>

  <Scene id="timeline" title="The forty-seven minutes">
    <Line id="l12">The review’s timeline is the spine of the whole story.</Line>
    <Line id="l13" text={"The alert fired at 09:16, four minutes after the first failure."}>The alert fired at nine sixteen, four minutes after the first failure.</Line>
    <Line id="l14">But the logs said “connection reset”, not “certificate expired”.</Line>
    <Line id="l15" text={"Finding the cause took 25 minutes more, until 09:41."}>Finding the cause took twenty-five minutes more, until nine forty-one.</Line>
    <Line id="l16" text={"A new certificate was issued and rolled out by 09:52."}>A new certificate was issued and rolled out by nine fifty-two.</Line>
    <Line id="l17" text={"Sync was back for everyone at 09:59, and the queued changes drained in 6 minutes."}>Sync was back for everyone at nine fifty-nine, and the queued changes drained in six minutes.</Line>

    <Part id="spine" x={150} y={80} w={1240} h={760}><Timeline /></Part>
    <Part id="log" x={1430} y={300} w={440} h={340} z={2}><LogPanel /></Part>

    <Animation>
      <Appear target="spine" line="l12" word="timeline" dur={0} />
      <Tween target="spine" to={{draw: 1}} line="l12" word="timeline" dur={1.4} easing="easeOut" />
      <Set target="spine" to={{shown: 1}} line="l13" word="alert" />
      <Tween target="spine" to={{shown: 2}} line="l13" word="sixteen" dur={0.5} />

      <Appear target="log" line="l14" word="logs" dur={0.4} />
      <Tween target="log" to={{reveal: 1}} line="l15" word="cause" dur={0.6} />

      <Tween target="spine" to={{shown: 4}} line="l15" word="fortyone" dur={0.5} />
      <Tween target="spine" to={{shown: 5}} line="l16" word="fiftytwo" dur={0.5} />
      <Tween target="spine" to={{drain: 1}} line="l17" word="drained" dur={0.9} easing="easeOut" />
    </Animation>
  </Scene>

  <Scene id="findings" title="What went badly, and what held">
    <Line id="l18">So what does the review conclude?</Line>
    <Line id="l19">Two things went badly.</Line>
    <Line id="l20">One certificate lived outside automatic renewal, and no one knew.</Line>
    <Line id="l21" text={"And the error message hid its own cause for 25 minutes."}>And the error message hid its own cause for twenty-five minutes.</Line>
    <Line id="l22">One thing went well: keeping every edit on the device did exactly what it was built for.</Line>

    <Part id="ledger" x={160} y={160} w={1600} h={640}><Ledger /></Part>

    <Animation>
      <Appear target="ledger" line="l19" word="badly" dur={0} />
      <Tween target="ledger" to={{bad1: 1}} line="l19" word="two" dur={0.5} />
      <Tween target="ledger" to={{bad2: 1}} line="l19" word="badly" dur={0.5} />
      <Tween target="ledger" to={{good: 1}} line="l22" word="well" dur={0.7} easing="easeOut" />
    </Animation>
  </Scene>

  <Scene id="actions" title="What to do next">
    <Line id="l23">The review leaves three actions, each with an owner and a date.</Line>
    <Line id="l24">Move every certificate into automatic renewal, and fail the build when one is found outside it.</Line>
    <Line id="l25" text={"Alert 30 days before any certificate expires."}>Alert thirty days before any certificate expires.</Line>
    <Line id="l26" text={"And log TLS failures with their reason, not a bare reset."}>And log T L S failures with their reason, not a bare reset.</Line>
    <Line id="l27">The first matters most: with it, this outage could not have happened.</Line>
    <Line id="l28">So when you own a service, ask what renews its certificates.</Line>

    <Part id="actions" x={140} y={160} w={1640} h={680}><Actions /></Part>

    <Animation>
      <Appear target="actions" line="l23" word="three" dur={0} />
      <Tween target="actions" to={{slots: 1}} line="l23" word="three" dur={0.5} />
      <Tween target="actions" to={{one: 1}} line="l24" word="certificate" dur={0.5} />
      <Tween target="actions" to={{two: 1}} line="l25" word="thirty" dur={0.5} />
      <Tween target="actions" to={{three: 1}} line="l26" word="failures" dur={0.5} />
      <Tween target="actions" to={{hero: 1}} line="l27" word="first" dur={0.7} easing="easeOut" />
    </Animation>
  </Scene>
</Doc>;
