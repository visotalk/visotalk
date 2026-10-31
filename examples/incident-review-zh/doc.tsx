import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {Devices} from './parts/devices.tsx';
import {DownMinutes, Chapters} from './parts/countdown.tsx';
import {Affected, Accounts, NoLoss} from './parts/affected.tsx';
import {CertLink, RenewalRing, Missing} from './parts/cause.tsx';
import {Span, LogWindow} from './parts/span.tsx';
import {FixList, Prevented} from './parts/fixes.tsx';

export default <Doc
  id="incident-review-zh"
  poster={92}
  title={"笔记同步中断四十七分钟：给新同事的复盘"}
  lang={"zh"}
  voice={"minimax:Chinese (Mandarin)_News_Anchor"}
  theme="visotalk/dark"
  canvas="16x9"
  tokens={{fonts: {sans: '"Noto Sans SC", sans-serif', mono: '"Noto Sans SC", sans-serif'}}}
>
  {/* 一、发生了什么 */}
  <Scene id="outage" title="发生了什么">
    <Line id="l1">十月十四号早上九点十二分，Nook 的笔记同步停了。</Line>
    <Line id="l2">设备之间的改动传不过去，一停就是四十七分钟。</Line>
    <Line id="l3">这是平台组写的复盘。两分钟说清三件事：发生了什么，为什么重要，接下来做什么。</Line>

    <Part id="devices" x={120} y={70} w={1680} h={620}><Devices /></Part>
    <Part id="down" x={120} y={690} w={620} h={180}><DownMinutes /></Part>
    <Part id="chapters" x={880} y={710} w={900} h={80}><Chapters /></Part>

    <Animation>
      <Appear target="devices" line="l1" word="Nook" />
      <Tween target="devices" to={{gap: 1}} line="l1" word="笔记同步停了" dur={1.2} />
      <Appear target="down" line="l2" word="四十七分钟" />
      <Tween target="down" to={{value: 47}} line="l2" word="四十七分钟" dur={1.8} />
      <Appear target="chapters" line="l3" word="三件事" />
    </Animation>
  </Scene>

  {/* 二、影响 */}
  <Scene id="impact" title="影响：多少人、有没有丢笔记">
    <Line id="l4">先看影响。那段时间打开 Nook 的人里，大约百分之十二看到了“无法同步”的提示。</Line>
    <Line id="l5">折算下来是三万八千个账号，共享笔记本也停在旧内容上。</Line>
    <Line id="l6">但没有任何一条笔记丢失：改动先存在设备上，服务一恢复就全部补上了。</Line>

    <Part id="affected" x={110} y={100} w={700} h={700}><Affected /></Part>
    <Part id="accounts" x={880} y={180} w={900} h={280}><Accounts /></Part>
    <Part id="noloss" x={840} y={500} w={940} h={340}><NoLoss /></Part>

    <Animation>
      <Appear target="affected" line="l4" word="百分之十二" />
      <Tween target="affected" to={{pct: 12}} line="l4" word="百分之十二" dur={1.4} />
      <Appear target="accounts" line="l5" word="三万八千" />
      <Tween target="accounts" to={{value: 38000}} line="l5" word="三万八千" dur={2} />
      <Appear target="noloss" line="l6" word="没有任何一条笔记丢失" />
      <Tween target="noloss" to={{draw: 1}} line="l6" word="没有任何一条笔记丢失" dur={0.9} />
    </Animation>
  </Scene>

  {/* 三、原因 */}
  <Scene id="cause" title="原因：一张游离在外的证书">
    <Line id="l7">原因比想象中简单：同步服务用一张证书连存储集群，它在九点十二分正好过期。</Line>
    <Line id="l8">这张证书是一年前手工签发的，一直游离在自动续期的系统之外。</Line>
    <Line id="l9">所以既没有人续期，也没有任何告警。一张没人记得的证书，挡住了所有同步。</Line>

    <Part id="cert" x={100} y={110} w={1720} h={440}><CertLink /></Part>
    <Part id="ring" x={110} y={470} w={620} h={400}><RenewalRing /></Part>
    <Part id="missing" x={800} y={650} w={1000} h={90}><Missing /></Part>

    <Animation>
      <Appear target="cert" line="l7" word="一张证书" />
      <Tween target="cert" to={{expired: 1}} line="l7" word="过期" dur={0.8} />
      <Appear target="ring" line="l8" word="自动续期" />
      <Tween target="ring" to={{out: 1}} line="l8" word="之外" dur={1.6} />
      <Appear target="missing" line="l9" word="没有人续期" />
    </Animation>
  </Scene>

  {/* 四、时间线 */}
  <Scene id="timeline" title="时间线：四分钟发现，二十五分钟定位">
    <Line id="l10">再看当时是怎么找的：九点十六分告警触发，离开故障只有四分钟，这很快。</Line>
    <Line id="l11">但找到原因又用了二十五分钟，因为日志只写“连接被重置”，没写“证书已过期”。</Line>
    <Line id="l12">九点五十二分换上新证书，七分钟后所有人恢复，积压的改动六分钟内处理完。</Line>

    <Part id="span" x={110} y={110} w={1700} h={470}><Span /></Part>
    <Part id="log" x={980} y={520} w={760} h={300}><LogWindow /></Part>

    <Animation>
      <Appear target="span" line="l10" word="九点十六分" />
      <Tween target="span" to={{grow: 1}} line="l10" dur={2.4} />
      <Tween target="span" to={{a1: 1}} line="l10" word="告警触发" dur={0.5} />
      <Tween target="span" to={{m1: 1}} line="l10" word="四分钟" dur={0.5} />
      <Tween target="span" to={{a2: 1, m2: 1}} line="l11" word="二十五分钟" dur={0.5} />
      <Appear target="log" line="l11" word="日志" />
      <Tween target="log" to={{found: 1}} line="l11" word="证书已过期" dur={0.5} />
      <Tween target="span" to={{a3: 1}} line="l12" word="九点五十二分" dur={0.5} />
    </Animation>
  </Scene>

  {/* 五、改进项 */}
  <Scene id="fixes" title="接下来做什么：三条改进项">
    <Line id="l13">接下来做什么。三条改进项，都写了负责人和截止日期。</Line>
    <Line id="l14">把每张证书纳入自动续期，发现游离的就让构建失败；证书到期前三十天告警；日志要写明真正的原因。</Line>
    <Line id="l15">第一条最要紧。有了它，这次故障根本不会发生。</Line>

    <Part id="fixlist" x={130} y={95} w={1660} h={580}><FixList /></Part>
    <Part id="prevented" x={400} y={700} w={1100} h={180}><Prevented /></Part>

    <Animation>
      <Appear target="fixlist" line="l13" word="三条改进项" />
      <Tween target="fixlist" to={{reveal: 1}} line="l13" word="三条改进项" dur={0.4} />
      <Tween target="fixlist" to={{reveal: 2}} line="l14" word="构建失败" dur={0.4} />
      <Tween target="fixlist" to={{reveal: 3}} line="l14" word="真正的原因" dur={0.4} />
      <Tween target="fixlist" to={{hero: 1}} line="l15" word="第一条" dur={0.6} />
      <Appear target="prevented" line="l15" word="根本不会发生" />
      <Tween target="prevented" to={{cross: 1}} line="l15" word="不会发生" dur={0.7} />
    </Animation>
  </Scene>
</Doc>;
