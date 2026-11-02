// How the new Tesla Roadster stops upside down, made by Claude Opus 5.5 with the skill and a 3D motion of its own (Wind Tunnel, in
// parts/: a test section, a generic test car, smoke, pressure and forces in three.js) built for this film.
// One take: a single global part holds the tunnel for the whole film, and every scene moves its camera and changes what is in it by
// tweening that part's props, so nothing ever cuts. The demo is shown the motion's way: the car drives a faint road that leaves the
// floor, curls up a tall wall and over onto a ledge, seen from beside it, and stops upside down. Once it stands still no wind blows
// past it: only the air the fans pump out moves. The car is the motion's generic coupé, not the Roadster.
// Facts: the reveal on 15 Oct 2026, the C-shaped ramp and the separate cold-gas thrusters (ten, with 600 litres of compressed
// air) are from the launch coverage (CNBC, Space.com, The Verge). Tesla calls the system a "multi-mode fan and ground sealing
// system" that "provides enough suction to hold the vehicle upside down, even when stationary". The skirts (side, front and rear,
// deployable, sealing the floor) and the four fans in a row across the tail (two central ones drawing from the sealed floor) are
// from Tesla's patent US 12,377,920 (filed April 2025, granted August 2025); four fans in the diffuser show in Tesla's rear photos
// (EVXL). Tesla claims cornering above 2 g (tyres and suction together); it has published no suction figure. The ramp "quickly
// became a vertical wall and then an overhanging ledge"; nobody was in the car; the Rocket trim has ten cold-gas thrusters and
// 600 litres (about 250 kg) of compressed air; the car "briefly" lifts off; production is aimed at 2028 (Space.com, Wikipedia). Air pressure at sea level is 101.3 kPa, about 10.3 tonnes on a square metre. The "a tenth less on four and a
// half square metres" figure is an illustration, worked out here (10.1 kPa x 4.5 m^2 = 45.6 kN, about 4.6 tonnes), not a measurement.
import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set, Asset, Sound} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {OnTrack, TestSection, TRACK_AT} from './parts/world.tsx';
import {TestCar} from './parts/car.tsx';
import {Airflow} from './parts/airflow.tsx';
import {PressureFloor} from './parts/pressure.tsx';
import {AirPush, ForceArrow} from './parts/force.tsx';
import {Callout} from './parts/callout.tsx';
import {RunSlate} from './parts/slate.tsx';
import {Readout} from './parts/gauge.tsx';
import {clamp, mix} from './parts/tunnel.tsx';
import {HANG, along, driveCam, speed} from './parts/shot.tsx';

export default <Doc id="roadster-zh" poster={12.5} title="一辆车，怎么倒挂在天花板上？" lang="zh-CN" voice="minimax:Chinese (Mandarin)_Radio_Host" speed={1.0}
  theme="visotalk/dark" canvas="16x9"
  tokens={{colors: {bg: '#04070C', panel: '#0D1422', panel2: '#18243A', border: '#2A3A52', text: '#E8EEF5', muted: '#8A9BB4', faint: '#1A2638', data: '#4FD1FF', grad: '#FF8A3D', op: '#9FB4FF', good: '#5BE3A8', bad: '#FF5D5D', warn: '#FFC24D'},
    fonts: {sans: '"Hanken Grotesk", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Big Shoulders Display", "Noto Sans SC", sans-serif'},
    caption: {font: 'sans', size: 34, weight: 500, color: '#E8EEF5', background: 'rgba(4, 7, 12, 0.82)', radius: 2, padding: [10, 26], bottom: 70, rule: '#4FD1FF', ruleSide: 'left'}}}
  pacing={{lead: 0.4, hold: 0.5, tail: 0.9}} exports={{captions: 'burned'}}>


  {/* the score (an original 120 BPM track that builds to the stop and drops at 12 s) and the effects (the drive, camera moves, the
      tunnel's wind, the fans): all synthesised for this film, no samples */}
  <Asset id="music" kind="audio" src="media/music.mp3" license={{id: "user-owned", obligations: []}} />
  <Asset id="drive" kind="audio" src="media/drive.mp3" license={{id: "user-owned", obligations: []}} />
  <Asset id="whoosh" kind="audio" src="media/whoosh.mp3" license={{id: "user-owned", obligations: []}} />
  <Asset id="wind" kind="audio" src="media/wind.mp3" license={{id: "user-owned", obligations: []}} />
  <Asset id="whir" kind="audio" src="media/whir.mp3" license={{id: "user-owned", obligations: []}} />

  {/* the whole film: one tunnel, one road, one car (and, for the wall, the car's outline where it climbed); every scene below
      tweens these props */}
  <Part id="film">{() => {
    const p = (k: string, d: number) => useProp(k, d) as number;
    // the camera: following the drive (`follow` 1), or the part's own props once the car has stopped
    const follow = p('follow', 1), go = p('go', 0), push = p('push', 0);
    const free = {yaw: p('yaw', HANG.yaw), pitch: p('pitch', HANG.pitch), dist: p('dist', HANG.dist), tx: p('tx', HANG.tx), ty: p('ty', HANG.ty), tz: p('tz', HANG.tz)};
    const d = driveCam(go), cam = {} as typeof free;
    for (const k of Object.keys(free) as Array<keyof typeof free>) cam[k] = mix(free[k], mix(d[k], HANG[k], push), follow);
    // the car: where it is on the road, and the air it drives into (only on the flat: the smoke fades before the curl)
    const s = along(go), drive = speed(go) * clamp((-s - 2) / 6);
    const wind = p('wind', 0), still = p('still', 0), wing = p('wing', 0), wingOn = p('wingOn', 0);
    const fans = p('fans', 0.6), xray = p('xray', 0), skirt = p('skirt', 0), run = p('run', 0), v = speed(go) * follow;
    const k = p('k', 0);
    const ghost = p('ghost', 0), gl = {grip: p('ggrip', 0), press: p('gpress', 0), weight: p('gweight', 0), fric: p('gfric', 0)};
    const fade = (v: number, el: unknown) => v > 0 ? <div style={{position: 'absolute', inset: 0, opacity: v}}>{el as never}</div> : null;
    return (
      <TestSection {...cam} fov={32 + 6 * v} shake={0.3 * v} road={p('road', 0)} spin={p('spin', 0)} air={0} walls={0}>
        <OnTrack along={s} wheels={run}>
          <PressureFloor show={p('floor', 1)} seal={skirt} suction={p('suc', 0.6)} />
          <Airflow lines={24} seal={skirt} fans={fans} stream={Math.max(drive, wind * (1 - still))} speed={mix(1.4, 0.3, still)} />
          <TestCar show={p('car', 0)} skirt={skirt} fans={fans} xray={xray} wing={wingOn} grip={p('grip', 0)} />
          <AirPush show={p('air', 0)} under={mix(1, 0.15, k)} net={p('net', 0)} around={p('around', 0)} />
          <ForceArrow x={1.95} y={2.6} length={mix(0.5, 1.4, wing) * (1 - still)} grow={wingOn} tone="calm" label="尾翼下压力" value={still > 0.5 ? '速度为零：没有了' : '随速度变大'} />
          <Callout x={2.0} y={0.3} z={-0.22} dx={90} dy={250} text="风扇 × 4" note="车尾一排（据特斯拉专利）" show={p('c1', 0)} />
          <Callout x={0.4} y={0.06} z={-0.8} dx={200} dy={150} text="裙边" note="四周落下封住车底（据专利）" tone="force" show={p('c2', 0)} />
          <Callout x={2.3} y={0.3} z={0.22} dx={140} dy={250} text="往后排气" note="只排掉漏进来的空气" show={p('c3', 0)} />
          <Callout x={-0.3} y={0.02} z={-0.5} dx={420} dy={330} text="车底面积 ≈ 4.5 m²" note="压差 × 面积 = 力" tone="low" show={p('c4', 0)} />
          <ForceArrow x={-0.7} y={2.6} length={2.0} grow={p('suck', 0)} label="吸力" value="示意比例" tone="force" />
          <ForceArrow x={0.9} y={0.7} dir="up" length={1.2} grow={p('weight', 0)} label="车重" tone="high" />
        </OnTrack>
        {/* the wall: the car's outline where it climbed, with the forces that hold it there */}
        {ghost > 0 && (
          <OnTrack along={(TRACK_AT.wall + TRACK_AT.top) / 2}>
            <TestCar show={0.48 * ghost} skirt={skirt} grip={gl.grip} />
            <ForceArrow x={0} y={2.4} length={1.4} grow={gl.press} label="空气按住它" value="压向墙面" />
            <ForceArrow x={-0.2} y={0.55} z={-1.3} dir="right" length={1.0} grow={gl.weight} label="车重" tone="high" />
            <ForceArrow x={1.42} y={0.05} z={-1.3} dir="left" length={1.0} grow={gl.fric} label="摩擦力" value="按得越紧越大" tone="calm" />
          </OnTrack>
        )}
        <RunSlate run="RUN 01 · 贴墙测试" title={'一辆车，\n怎么倒挂在天花板上？'} sub="特斯拉新 Roadster · 通用试验车演示，非实车影像" show={p('title', 0)} />
        {fade(p('windR', 0), <Readout x={1400} y={150} label="风速" value={mix(mix(120, 200, wing), 0, still)} unit="km/h" max={250} tone="low" note="风洞的风速，示意" />)}
        {fade(p('tonsR', 0), <Readout x={1400} y={150} label="一平方米上的空气" value={p('tons', 0)} unit="吨" max={12} decimals={1} tone="low" note="海平面大气压 101.3 kPa" />)}
        {fade(p('gauges', 0), <Readout x={110} y={150} label="外面的气压" value={101.3} unit="kPa" max={101.3} decimals={1} tone="high" />)}
        {fade(p('gauges', 0), <Readout x={1410} y={150} label="车底的气压" value={mix(101.3, 91.2, k)} unit="kPa" max={101.3} decimals={1} tone="low" note="少一成：示意" />)}
        {fade(p('gR', 0), <Readout x={1400} y={150} label="过弯抓地力（特斯拉称）" value={2 * p('g', 0)} unit="g+" max={3} decimals={0} tone="force" note="含轮胎与吸力，未经独立验证" />)}
        {fade(p('gas', 0), <Readout x={1400} y={150} label="冷气推进（Rocket 版）" value={600} unit="升" max={600} tone="low" note="10 个喷口 · 约 250 kg 压缩空气 · 据 Space.com" />)}
        <RunSlate run="RUN 05 · 结论" title={'按住它的，\n是空气'} sub="特斯拉称投产在 2028 年 · 数字来自发布会与报道" show={p('end', 0)} />
      </TestSection>
    );
  }}</Part>

  <Scene id="title" title="问题" duration={3.4}>
    <Sound asset="music" at="start" volume={-3} duck={8} />
    <Animation>
      <Appear target="film" at="start" dur={0} />
      <Tween target="film" to={{road: 1}} at={0} dur={2.4} easing="easeInOut" />
      <Tween target="film" to={{title: 1}} at={0.5} dur={1.2} easing="easeOut" />
      <Tween target="film" to={{car: 1}} at={1.1} dur={1.4} easing="easeOut" />
    </Animation>
  </Scene>

  <Scene id="drive" title="开上墙，开到头顶">
    <Line id="l1">十月的发布会上，特斯拉新 Roadster 顺着一条弯道开上墙，一直开到头顶。</Line>
    <Line id="l2" hold={0.8}>然后，它倒挂着，停住了。</Line>
    <Sound asset="drive" at="start" volume={-2} duck={3} />
    <Animation>
      <Tween target="film" to={{title: 0}} at={0.3} dur={0.8} />
      {/* 8.6 s from the scene's start: the car comes to rest at 12 s into the film, on the score's drop */}
      <Tween target="film" to={{go: 1}} at={0} dur={8.6} easing="linear" />
      <Tween target="film" to={{push: 1}} line="l2" word="倒挂着" dur={1.8} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="riddle" title="不是靠风">
    <Line id="l3">赛车也能紧贴路面，靠的是速度：风越快，尾翼把车压得越紧。</Line>
    <Line id="l4" hold={1}>可现在，风停了，车速是零。它还挂在那儿。</Line>
    <Sound asset="whoosh" at="start" volume={-6} />
    <Sound asset="wind" line="l3" volume={-8} duck={3} />
    <Animation>
      {/* the camera goes round to the other side of the car while the fans' air and the floor's glow give way to the tunnel's wind */}
      <Set target="film" to={{yaw: 190, pitch: -12, dist: 9.6, tx: 2.5, ty: 11.3, tz: 0, follow: 0}} at="start" />
      <Tween target="film" to={{yaw: 212, pitch: -8, dist: 9.5, tx: 2.5, ty: 11.3, tz: 0}} at={0} dur={1.6} easing="easeInOut" />
      <Tween target="film" to={{floor: 0, fans: 0, wind: 1}} at={0} dur={2.4} easing="easeInOut" />
      <Tween target="film" to={{windR: 1}} at={1.4} dur={1} />
      {/* while the race car is talked about the view turns over, so the car hanging from the ceiling reads as a car on a road; it turns
          back to hanging when the wind stops */}
      <Tween target="film" to={{spin: 180}} line="l3" dur={1.6} easing="easeInOut" />
      {/* in the wind the wheels turn on the rolling road, faster and then slower, and stand still once it stops */}
      <Tween target="film" to={{run: 34}} line="l3" until={{line: 'l4', word: '车速是零'}} easing="easeInOut" />
      <Tween target="film" to={{wingOn: 1}} line="l3" word="尾翼" dur={0.7} />
      <Tween target="film" to={{wing: 1}} line="l3" word="风越快" dur={1.6} easing="easeInOut" />
      <Tween target="film" to={{still: 1}} line="l4" word="风停了" dur={1.6} easing="easeOut" />
      <Tween target="film" to={{spin: 0}} line="l4" word="车速是零" dur={1.6} easing="easeInOut" />
      <Tween target="film" to={{wingOn: 0, windR: 0}} at="end" offset={-1.1} dur={1} />
    </Animation>
  </Scene>

  <Scene id="air" title="空气本身">
    <Line id="l5">按住它的，是空气本身：每一平方米上，都压着差不多十吨空气。</Line>
    <Line id="l6" hold={0.8}>平时我们感觉不到，因为四面八方，压得一样多。</Line>
    <Sound asset="whoosh" at="start" volume={-8} />
    <Animation>
      <Tween target="film" to={{yaw: 228, pitch: -4, dist: 10}} at={0} dur={1.5} easing="easeInOut" />
      <Tween target="film" to={{air: 1}} line="l5" word="空气本身" dur={1.2} />
      <Tween target="film" to={{tons: 10.3, tonsR: 1}} line="l5" word="十吨" dur={1.2} easing="easeOut" />
      <Tween target="film" to={{xray: 0.5, around: 1}} line="l6" word="四面八方" dur={1} />
      <Tween target="film" to={{tonsR: 0}} at="end" offset={-1} dur={0.9} />
    </Animation>
  </Scene>

  <Scene id="under" title="车底">
    <Line id="l7">秘密在车底：车尾一排风扇，不停地把车底的空气往外抽，</Line>
    <Line id="l8">按特斯拉的专利，四周的裙边会落下来，封住缝隙，外面的空气补不进去。</Line>
    <Line id="l8b">出风口不用很大：车底封住了，风扇只要把漏进来的一点空气排出去。</Line>
    <Line id="l9" hold={1}>力也不是风扇吹出来的：车底只要比外面少一成气压，四五平方米的车底，就会被按上四吨多的力。</Line>
    <Sound asset="whoosh" at="start" volume={-8} />
    <Sound asset="whir" line="l7" word="风扇" volume={-10} duck={3} />
    <Animation>
      <Tween target="film" to={{yaw: 204, pitch: -12, dist: 9.2, ty: 10.9}} at={0} dur={1.5} easing="easeInOut" />
      <Tween target="film" to={{air: 0, around: 0}} at={0} dur={1.2} />
      <Set target="film" to={{suc: 0}} at="start" />
      <Tween target="film" to={{xray: 1}} line="l7" word="秘密在车底" dur={1.4} easing="easeInOut" />
      <Tween target="film" to={{fans: 1, c1: 1}} line="l7" word="风扇" dur={1.2} />
      <Tween target="film" to={{c2: 1, skirt: 1}} line="l8" word="裙边" dur={1.2} />
      <Tween target="film" to={{c1: 0, c2: 0, c3: 1}} line="l8b" word="出风口" dur={0.9} />
      <Tween target="film" to={{c3: 0, gauges: 1, floor: 1, air: 1}} line="l9" word="少一成气压" dur={0.6} />
      <Tween target="film" to={{c4: 1}} line="l9" word="四五平方米" dur={0.9} />
      <Tween target="film" to={{k: 1, suc: 1}} line="l9" word="少一成气压" dur={1.6} easing="easeOut" />
      <Tween target="film" to={{net: 1}} line="l9" word="四吨多的力" dur={0.9} />
      <Tween target="film" to={{c4: 0, gauges: 0}} at="end" offset={-0.9} dur={0.8} />
    </Animation>
  </Scene>

  <Scene id="wall" title="墙面">
    <Line id="l10">在竖直的墙上，这股力把轮胎死死按在墙面；按得越紧，摩擦力越大，车就滑不下来。</Line>
    <Sound asset="whoosh" at="start" volume={-6} />
    <Animation>
      {/* down to the wall it climbed: its outline is drawn there, and the forces on it */}
      <Tween target="film" to={{yaw: 172, pitch: 2, dist: 11, tx: -2.9, ty: 6, tz: 0}} at={0} dur={1.8} easing="easeInOut" />
      <Tween target="film" to={{xray: 0, air: 0, net: 0}} at={0} dur={1.2} />
      <Tween target="film" to={{ghost: 1}} at={0.4} dur={1.2} easing="easeOut" />
      <Tween target="film" to={{gweight: 1}} line="l10" word="在竖直的墙上" dur={0.8} />
      <Tween target="film" to={{gpress: 1}} line="l10" word="这股力" dur={0.9} />
      <Tween target="film" to={{ggrip: 1, gfric: 1}} line="l10" word="摩擦力越大" dur={0.9} />
    </Animation>
  </Scene>

  <Scene id="ledger" title="头顶上">
    <Line id="l11">倒挂在头顶时，这股力先要抵掉车重，剩下的，才把轮胎按在路上。</Line>
    <Line id="l12" hold={1.2} text="特斯拉的说法是：停着也能倒挂住，过弯能超过 2 g。吸力到底多大，还没有官方数字。">特斯拉的说法是：停着也能倒挂住，过弯能超过两个 g。吸力到底多大，还没有官方数字。</Line>
    <Sound asset="whoosh" at="start" volume={-6} />
    <Animation>
      <Tween target="film" to={{yaw: 216, pitch: -6, dist: 10.5, tx: 2.5, ty: 11.3}} at={0} dur={1.8} easing="easeInOut" />
      <Tween target="film" to={{ghost: 0, gpress: 0, gweight: 0, gfric: 0, ggrip: 0}} at={0} dur={1.4} />
      <Tween target="film" to={{suck: 1}} line="l11" word="这股力" dur={0.8} />
      <Tween target="film" to={{weight: 1}} line="l11" word="车重" dur={0.8} />
      <Tween target="film" to={{grip: 1}} line="l11" word="剩下的" dur={0.8} />
      <Tween target="film" to={{g: 1, gR: 1}} line="l12" word="两个 g" dur={1} easing="easeOut" />
      <Tween target="film" to={{gR: 0}} at="end" offset={-1} dur={0.9} />
    </Animation>
  </Scene>

  <Scene id="hop" title="另一套系统">
    <Line id="l13">至于离开墙、在空中翻身，靠的是另一套系统：据报道，是十个冷气喷口和六百升压缩空气。</Line>
    <Line id="l14" hold={2}>那只是短暂地离地。让它倒挂着不掉下来的，始终是空气。</Line>
    <Animation>
      <Tween target="film" to={{yaw: 210, pitch: -6, dist: 12, tx: 4.5, ty: 12.4, tz: -2.8}} at={0} dur={7} easing="easeInOut" />
      <Tween target="film" to={{suck: 0, weight: 0}} at={0} dur={1} />
      <Tween target="film" to={{gas: 1}} line="l13" word="另一套系统" dur={0.5} />
      <Tween target="film" to={{gas: 0}} line="l14" word="始终是空气" dur={0.5} />
      <Tween target="film" to={{end: 1}} line="l14" word="始终是空气" dur={1.2} easing="easeOut" />
    </Animation>
  </Scene>
</Doc>;
