/*
 * jp-population: why Japan's population is shrinking, told with official statistics.
 *
 * SOURCES (every figure drawn or spoken comes from one of these; read on 2026-10-21):
 *
 * 1. Statistics Bureau of Japan, "Japan Statistical Yearbook 2026" (75th edition),
 *    Table 2-1 "Population" (B: 1920 to 2024), published as Excel y750201b00.xlsx.
 *    Page:  https://www.stat.go.jp/data/nenkan/75nenkan/02.html
 *    File:  https://www.stat.go.jp/data/nenkan/75nenkan/zuhyou/y750201b00.xlsx
 *    Columns used: total population on 1 October (thousands), live births and deaths
 *    (thousands, from the previous October to the end of September of the year stated,
 *    foreigners included; vital-statistics preliminary reports from October 2020).
 *    Figures quoted in the narration or labels:
 *      population (thousands): 1949 81,773 | 2008 128,084 (the series maximum) | 2024 123,802
 *      births (thousands): 1949 2,694 | 2024 717      deaths (thousands): 2024 1,607
 *      natural change 2024: -890    deaths first exceed births in 2007 (1,102 vs 1,104)
 *    The arrays POP, BIRTH and DEATH below hold the 1949 to 2024 rows of that table.
 *    The 428 (= 128,084 - 123,802) on screen is the film's own subtraction.
 *
 * 2. Statistics Bureau of Japan, "Population Estimates" (jinko suikei), released 2026-10-20.
 *    URL: https://www.stat.go.jp/data/jinsui/new.html
 *    1 May 2026 (final, based on the 2020 census), thousands:
 *      total 122,812 | under 15: 13,263 | 15 to 64: 73,322 | 65 and over: 36,227
 *    Also 1 May 2026 (final), change from the same month a year earlier:
 *      Japanese nationals -855 thousand | foreign residents +325 thousand (3,974 thousand)
 *      total population -530 thousand
 *    (The 1 October 2026 preliminary block of the page gives only the total, 122.69 million, -530 thousand.)
 *
 * 3. Same Yearbook, Table 2-2 "Population projections by sex", y750202000.xlsx
 *    https://www.stat.go.jp/data/nenkan/75nenkan/zuhyou/y750202000.xlsx
 *    Source line of the table: National Institute of Population and Social Security
 *    Research (IPSS), "Population Projections for Japan (2023 estimate)". The table does
 *    not name the variant, so the film does not either. Total population, thousands:
 *      2050 104,686 | 2070 86,996 (PROJ below holds 2025 to 2060 yearly, then 2065, 2070).
 *    Projected points are the source's own; the film draws a straight line between them.
 */
import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween} from '@visotalk/jsx';
import {useProp, Obj} from '@visotalk/runtime';

// ---- data (thousands of people) -------------------------------------------------------
const FIRST = 1949;
const POP = [81773, 84115, 84541, 85808, 86981, 88239, 90077, 90172, 90928, 91767, 92641, 94302, 94287, 95181, 96156, 97182, 99209, 99036, 100196, 101331, 102536, 104665, 106100, 107595, 109104, 110573, 111940, 113094, 114165, 115190, 116155, 117060, 117902, 118728, 119536, 120305, 121049, 121660, 122239, 122745, 123205, 123611, 124101, 124567, 124938, 125265, 125570, 125859, 126157, 126472, 126667, 126926, 127316, 127486, 127694, 127787, 127768, 127901, 128033, 128084, 128032, 128057, 127834, 127593, 127414, 127237, 127095, 127042, 126919, 126749, 126555, 126146, 125502, 124947, 124352, 123802];
const BIRTH = [2694, 2417, 2239, 2071, 1932, 1795, 1769, 1709, 1613, 1638, 1672, 1624, 1607, 1628, 1669, 1704, 1811, 1461, 1875, 1870, 1914, 1932, 2020, 2067, 2107, 2067, 1948, 1866, 1781, 1730, 1663, 1616, 1548, 1529, 1524, 1507, 1452, 1397, 1372, 1323, 1270, 1241, 1224, 1228, 1205, 1229, 1222, 1203, 1209, 1215, 1198, 1194, 1185, 1176, 1138, 1126, 1087, 1091, 1102, 1108, 1087, 1083, 1074, 1047, 1045, 1022, 1025, 1004, 966, 945, 895, 871, 831, 799, 758, 717];
const DEATH = [938, 907, 873, 787, 773, 728, 708, 708, 764, 702, 693, 713, 699, 718, 679, 670, 712, 670, 676, 699, 685, 721, 696, 692, 705, 722, 707, 707, 700, 696, 689, 722, 725, 720, 735, 749, 738, 767, 752, 786, 794, 824, 829, 854, 882, 877, 925, 896, 921, 933, 985, 968, 966, 981, 1023, 1024, 1078, 1090, 1104, 1142, 1146, 1188, 1256, 1248, 1277, 1274, 1301, 1300, 1343, 1370, 1380, 1372, 1440, 1530, 1595, 1607];
const PROJ_YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049, 2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058, 2059, 2060, 2065, 2070];
const PROJ = [123262, 122661, 122044, 121414, 120771, 120116, 119448, 118766, 118071, 117362, 116639, 115902, 115152, 114391, 113619, 112837, 112045, 111243, 110434, 109620, 108801, 107981, 107159, 106336, 105512, 104686, 103859, 103029, 102195, 101355, 100508, 99654, 98792, 97920, 97038, 96148, 91587, 86996];
// Statistics Bureau, 1 May 2026 (final)
const AGE = {young: 13263, work: 73322, old: 36227};
// Statistics Bureau, 1 May 2026 (final), change on a year earlier
const JP_CHANGE = -855, FOREIGN_CHANGE = 325, TOTAL_CHANGE = -530;

// ---- helpers --------------------------------------------------------------------------
const wan = (k: number) => Math.round(k / 10);                 // thousands -> units of 10,000
const fmtPop = (k: number) => { const w = wan(k); return `${Math.floor(w / 10000)}億${w % 10000}万人`; };
const at = (arr: number[], year: number, first = FIRST) => {  // linear between table rows
  const i = Math.min(arr.length - 1, Math.max(0, year - first)), a = Math.floor(i), b = Math.min(arr.length - 1, a + 1);
  return arr[a] + (arr[b] - arr[a]) * (i - a);
};
const SRC = '出典：総務省統計局『日本統計年鑑』令和8年版';
const FONT = 'var(--vt-sans)';

const Header = ({title, src}: {title: string; src: string}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1640, height: 90, fontFamily: FONT}}>
    <div style={{fontSize: 40, fontWeight: 700, color: 'var(--vt-text)'}}>{title}</div>
    <div style={{fontSize: 28, color: 'var(--vt-muted)', marginTop: 6}}>{src}</div>
  </div>
);

// plot box inside the 1640 x 610 svg
const PL = 170, PR = 1330, PT = 100, PB = 530;

// ---- poster ---------------------------------------------------------------------------
const Poster = () => {
  const hl = useProp('hl', 0);
  const X = (y: number) => 80 + ((y - FIRST) / (2024 - FIRST)) * 1480;
  const Y = (v: number) => 740 - ((v - 80000) / 50000) * 250;
  const years = POP.map((_, i) => FIRST + i);
  const d = (from: number, to: number) => years.filter((y) => y >= from && y <= to).map((y, i) => `${i ? 'L' : 'M'}${X(y)} ${Y(at(POP, y))}`).join(' ');
  return (
    <div style={{position: 'relative', width: 1640, height: 800, fontFamily: FONT}}>
      <svg viewBox="0 0 1640 800" width={1640} height={800} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={d(1949, 2008)} fill="none" style={{stroke: 'var(--vt-faint)'}} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d(2008, 2024)} fill="none" style={{stroke: 'var(--vt-faint)'}} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d(2008, 2024)} fill="none" style={{stroke: 'var(--vt-bad)', opacity: hl}} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={X(2008)} cy={Y(128084)} r={14} style={{fill: 'var(--vt-text)', opacity: 0.9}} />
      </svg>
      <div style={{position: 'absolute', left: 80, top: 60, fontSize: 36, color: 'var(--vt-muted)', letterSpacing: 6}}>公的統計で読む</div>
      <div style={{position: 'absolute', left: 74, top: 110, fontSize: 150, fontWeight: 700, lineHeight: 1.12, color: 'var(--vt-text)'}}>日本の人口は、<br />なぜ減る？</div>
    </div>
  );
};

// ---- the population line (scenes peak and projection) ---------------------------------
const PopChart = ({x1, projection}: {x1: number; projection: boolean}) => {
  const yr = useProp('yr', projection ? 2024 : FIRST);        // observed line drawn up to this year
  const pr = useProp('pr', 2024);         // projection drawn up to this year
  const X = (y: number) => PL + ((y - FIRST) / (x1 - FIRST)) * (PR - PL);
  const Y = (v: number) => PB - ((v - 80000) / 50000) * (PB - PT);
  const head = Math.min(2024, yr);
  const obs: string[] = [];
  for (let y = FIRST; y <= Math.floor(head); y++) obs.push(`${obs.length ? 'L' : 'M'}${X(y)} ${Y(at(POP, y))}`);
  if (head > Math.floor(head)) obs.push(`L${X(head)} ${Y(at(POP, head))}`);
  const line = obs.join(' ');
  const area = `${line} L${X(head)} ${PB} L${X(FIRST)} ${PB} Z`;
  const proj: string[] = [`M${X(2024)} ${Y(POP[POP.length - 1])}`];
  PROJ_YEARS.forEach((y, i) => { if (y <= pr) proj.push(`L${X(y)} ${Y(PROJ[i])}`); });
  const lastIdx = PROJ_YEARS.findIndex((y) => y > pr);
  if (lastIdx > 0 && pr > PROJ_YEARS[lastIdx - 1]) {
    const y0 = PROJ_YEARS[lastIdx - 1], y1 = PROJ_YEARS[lastIdx], t = (pr - y0) / (y1 - y0);
    proj.push(`L${X(pr)} ${Y(PROJ[lastIdx - 1] + (PROJ[lastIdx] - PROJ[lastIdx - 1]) * t)}`);
  }
  const ticks = projection ? [1950, 1970, 1990, 2010, 2030, 2050, 2070] : [1950, 1970, 1990, 2010];
  const val = at(POP, head);
  return (
    <div style={{position: 'relative', width: 1640, height: 700, fontFamily: FONT}}>
      <Header title="日本の総人口（各年10月1日現在）" src={projection ? `${SRC} ／ 将来は国立社会保障・人口問題研究所の推計` : SRC} />
      <svg viewBox="0 0 1640 610" width={1640} height={610} style={{position: 'absolute', left: 0, top: 90}}>
        {[80000, 100000, 120000].map((v) => (
          <g key={v}>
            <line x1={PL - 8} x2={PL} y1={Y(v)} y2={Y(v)} style={{stroke: 'var(--vt-muted)'}} strokeWidth={2} />
            <text x={PL - 18} y={Y(v) + 10} textAnchor="end" fontSize={28} style={{fill: 'var(--vt-muted)', fontFamily: FONT}}>{v === 80000 ? '8000万' : v === 100000 ? '1億' : '1億2000万'}</text>
          </g>
        ))}
        {ticks.map((y) => <text key={y} x={X(y)} y={PB + 40} textAnchor="middle" fontSize={28} style={{fill: 'var(--vt-muted)', fontFamily: FONT}}>{y}</text>)}
        <text x={PL + 24} y={PT + 20} textAnchor="start" fontSize={28} style={{fill: 'var(--vt-faint)', fontFamily: FONT}}>縦軸は8000万人から</text>
        <path d={area} style={{fill: 'var(--vt-data)', opacity: 0.14}} />
        <path d={line} fill="none" style={{stroke: 'var(--vt-data)'}} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        {head >= 2008 && head <= 2024 && <path d={`M${X(2008)} ${Y(128084)} ${obs.filter((_, i) => FIRST + i >= 2008).join(' ').replace(/^M/, 'L')}`} fill="none" style={{stroke: 'var(--vt-bad)'}} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
        {projection && <path d={proj.join(' ')} fill="none" style={{stroke: 'var(--vt-warn)'}} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 18" />}
        <circle cx={X(head)} cy={Y(val)} r={projection ? 0 : 14} style={{fill: 'var(--vt-text)'}} />
        {!projection && <Obj as="g" id="peak">
          <line x1={X(2008)} x2={X(2008)} y1={Y(128084) - 8} y2={Y(128084) + 170} style={{stroke: 'var(--vt-text)'}} strokeWidth={2} strokeDasharray="6 8" />
          <circle cx={X(2008)} cy={Y(128084)} r={12} style={{fill: 'var(--vt-text)'}} />
          <text x={X(2008)} y={PT - 26} textAnchor="middle" fontSize={34} fontWeight={700} style={{fill: 'var(--vt-text)', fontFamily: FONT}}>2008年 ピーク</text>
        </Obj>}
        {!projection && <Obj as="g" id="drop">
          <line x1={PR + 56} x2={PR + 56} y1={Y(128084)} y2={Y(123802)} style={{stroke: 'var(--vt-bad)'}} strokeWidth={4} />
          <line x1={PR + 44} x2={PR + 68} y1={Y(128084)} y2={Y(128084)} style={{stroke: 'var(--vt-bad)'}} strokeWidth={4} />
          <line x1={PR + 44} x2={PR + 68} y1={Y(123802)} y2={Y(123802)} style={{stroke: 'var(--vt-bad)'}} strokeWidth={4} />
          <text x={PR + 84} y={(Y(128084) + Y(123802)) / 2 + 2} fontSize={48} fontWeight={700} style={{fill: 'var(--vt-bad)', fontFamily: FONT}}>−428万人</text>
          <text x={PR + 84} y={(Y(128084) + Y(123802)) / 2 + 40} fontSize={28} style={{fill: 'var(--vt-muted)', fontFamily: FONT}}>差し引き</text>
        </Obj>}
        {projection && <Obj as="g" id="p2050">
          <circle cx={X(2050)} cy={Y(104686)} r={13} style={{fill: 'var(--vt-warn)'}} />
          <text x={X(2050) + 24} y={Y(104686) - 22} textAnchor="start" fontSize={40} fontWeight={700} style={{fill: 'var(--vt-warn)', fontFamily: FONT}}>2050年 約1億470万人</text>
        </Obj>}
        {projection && <Obj as="g" id="p2070">
          <circle cx={X(2070)} cy={Y(86996)} r={13} style={{fill: 'var(--vt-warn)'}} />
          <text x={X(2070) - 26} y={Y(86996) + 54} textAnchor="end" fontSize={40} fontWeight={700} style={{fill: 'var(--vt-warn)', fontFamily: FONT}}>2070年 約8700万人</text>
        </Obj>}
        {projection && <Obj as="g" id="ipss">
          <text x={X(2028)} y={Y(120771) - 36} fontSize={34} style={{fill: 'var(--vt-warn)', fontFamily: FONT}}>社人研の推計（点線）</text>
        </Obj>}
      </svg>
      {!projection && (
        <div style={{position: 'absolute', left: 700, top: 400, color: 'var(--vt-text)'}}>
          <div style={{fontSize: 40, color: 'var(--vt-muted)'}}>{Math.round(head)}年</div>
          <div style={{fontSize: 128, fontWeight: 700, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>{fmtPop(val)}</div>
        </div>
      )}
    </div>
  );
};

// ---- births and deaths ----------------------------------------------------------------
const VPT = 130, VPB = 530, VPR = 1090;
const VitalChart = () => {
  const by = useProp('by', FIRST);        // births drawn up to this year
  const dy = useProp('dy', FIRST);        // deaths drawn up to this year
  const gy = useProp('gy', 2007);         // gap shaded up to this year
  const X = (y: number) => PL + ((y - FIRST) / (2024 - FIRST)) * (VPR - PL);
  const Y = (v: number) => VPB - (v / 2800) * (VPB - VPT);
  const path = (arr: number[], upTo: number) => {
    const p: string[] = [];
    for (let y = FIRST; y <= Math.floor(upTo); y++) p.push(`${p.length ? 'L' : 'M'}${X(y)} ${Y(at(arr, y))}`);
    if (upTo > Math.floor(upTo) && upTo < 2024) p.push(`L${X(upTo)} ${Y(at(arr, upTo))}`);
    return p.join(' ');
  };
  const gapPts: string[] = [], back: string[] = [];
  if (gy > 2007) {
    for (let y = 2007; y <= Math.floor(gy); y++) { gapPts.push(`${X(y)} ${Y(at(BIRTH, y))}`); back.unshift(`${X(y)} ${Y(at(DEATH, y))}`); }
    if (gy > Math.floor(gy) && gy < 2024) { gapPts.push(`${X(gy)} ${Y(at(BIRTH, gy))}`); back.unshift(`${X(gy)} ${Y(at(DEATH, gy))}`); }
  }
  const bv = at(BIRTH, by), dv = at(DEATH, dy);
  return (
    <div style={{position: 'relative', width: 1640, height: 700, fontFamily: FONT}}>
      <Header title="出生数と死亡数（前年10月〜当年9月の合計・外国人を含む）" src={SRC} />
      <svg viewBox="0 0 1640 610" width={1640} height={610} style={{position: 'absolute', left: 0, top: 90}}>
        {[0, 1000, 2000].map((v) => (
          <g key={v}>
            <line x1={PL} x2={VPR} y1={Y(v)} y2={Y(v)} style={{stroke: 'var(--vt-border)'}} strokeWidth={2} />
            <text x={PL - 18} y={Y(v) + 10} textAnchor="end" fontSize={28} style={{fill: 'var(--vt-muted)', fontFamily: FONT}}>{v === 0 ? '0' : `${v / 10}万`}</text>
          </g>
        ))}
        {[1950, 1970, 1990, 2010].map((y) => <text key={y} x={X(y)} y={VPB + 40} textAnchor="middle" fontSize={28} style={{fill: 'var(--vt-muted)', fontFamily: FONT}}>{y}</text>)}
        {gy > 2007 && <polygon points={[...gapPts, ...back].join(' ')} style={{fill: 'var(--vt-bad)', opacity: 0.4}} />}
        <path d={path(DEATH, dy)} fill="none" style={{stroke: 'var(--vt-bad)'}} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(BIRTH, by)} fill="none" style={{stroke: 'var(--vt-data)'}} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        {dy > FIRST && <circle cx={X(Math.min(dy, 2024))} cy={Y(dv)} r={13} style={{fill: 'var(--vt-bad)'}} />}
        <circle cx={X(Math.min(by, 2024))} cy={Y(bv)} r={13} style={{fill: 'var(--vt-data)'}} />
        <Obj as="g" id="cross">
          <line x1={X(2007)} x2={X(2007)} y1={VPB} y2={VPT - 4} style={{stroke: 'var(--vt-text)'}} strokeWidth={2} strokeDasharray="6 8" />
          <text x={X(2007)} y={VPT - 20} textAnchor="middle" fontSize={34} fontWeight={700} style={{fill: 'var(--vt-text)', fontFamily: FONT}}>2007年 死亡が上回る</text>
        </Obj>
        <Obj as="g" id="net">
          <line x1={VPR + 40} x2={VPR + 40} y1={Y(1607)} y2={Y(717)} style={{stroke: 'var(--vt-text)'}} strokeWidth={4} />
          <line x1={VPR + 28} x2={VPR + 52} y1={Y(1607)} y2={Y(1607)} style={{stroke: 'var(--vt-text)'}} strokeWidth={4} />
          <line x1={VPR + 28} x2={VPR + 52} y1={Y(717)} y2={Y(717)} style={{stroke: 'var(--vt-text)'}} strokeWidth={4} />
          <text x={VPR + 72} y={(Y(1607) + Y(717)) / 2 + 2} fontSize={48} fontWeight={700} style={{fill: 'var(--vt-text)', fontFamily: FONT}}>−89万人</text>
          <text x={VPR + 72} y={(Y(1607) + Y(717)) / 2 + 40} fontSize={28} style={{fill: 'var(--vt-muted)', fontFamily: FONT}}>自然減（2024）</text>
        </Obj>
      </svg>
      <div style={{position: 'absolute', left: 1190, top: 110, width: 450, whiteSpace: 'nowrap'}}>
        <div style={{fontSize: 40, color: 'var(--vt-data)', fontWeight: 700}}>出生数 <span style={{fontSize: 76, fontVariantNumeric: 'tabular-nums'}}>{wan(bv)}万人</span></div>
        <div style={{fontSize: 40, color: 'var(--vt-bad)', fontWeight: 700, opacity: dy > FIRST ? 1 : 0}}>死亡数 <span style={{fontSize: 76, fontVariantNumeric: 'tabular-nums'}}>{wan(dv)}万人</span></div>
      </div>
    </div>
  );
};

// ---- age structure --------------------------------------------------------------------
const AGE_TOTAL = AGE.young + AGE.work + AGE.old;
const AgeChart = () => {
  const young = useProp('young', 0), old = useProp('old', 0), work = useProp('work', 0);
  const W = 1640, wy = (AGE.young / AGE_TOTAL) * W, ww = (AGE.work / AGE_TOTAL) * W, wo = (AGE.old / AGE_TOTAL) * W;
  const seg = (left: number, width: number, frac: number, colour: string) => (
    <div style={{position: 'absolute', left, top: 370, width: Math.round(width * frac), height: 230, background: colour, borderRadius: left === 0 ? '16px 0 0 16px' : left + width >= W - 1 ? '0 16px 16px 0' : 0}} />
  );
  return (
    <div style={{position: 'relative', width: 1640, height: 700, fontFamily: FONT}}>
      <Header title="年齢3区分の人口（2026年5月1日現在・確定値）" src="出典：総務省統計局「人口推計」" />
      <div style={{position: 'absolute', left: 0, top: 370, width: W, height: 230, border: '2px solid var(--vt-border)', borderRadius: 16, boxSizing: 'border-box'}} />
      {seg(0, wy, young, 'var(--vt-data)')}
      {seg(wy, ww, work, 'var(--vt-panel2)')}
      {seg(wy + ww, wo, old, 'var(--vt-warn)')}
      <Obj id="lab-total" style={{position: 'absolute', left: 0, top: 622, width: W, textAlign: 'center', color: 'var(--vt-muted)'}}>
        <div style={{height: 14, borderLeft: '3px solid var(--vt-muted)', borderRight: '3px solid var(--vt-muted)', borderBottom: '3px solid var(--vt-muted)', boxSizing: 'border-box'}} />
        <div style={{fontSize: 40, marginTop: 14}}>総人口 {fmtPop(AGE_TOTAL)}</div>
      </Obj>
      <Obj id="lab-work" style={{position: 'absolute', left: wy, top: 430, width: ww, textAlign: 'center', color: 'var(--vt-text)'}}>
        <div style={{fontSize: 40, color: 'var(--vt-muted)'}}>15〜64歳</div>
        <div style={{fontSize: 64, fontWeight: 700}}>{wan(AGE.work)}万人</div>
      </Obj>
      <Obj id="lab-old" style={{position: 'absolute', left: wy + ww, top: 185, width: wo, color: 'var(--vt-warn)'}}>
        <div style={{fontSize: 48, fontWeight: 700}}>65歳以上</div>
        <div style={{fontSize: 96, fontWeight: 700, lineHeight: 1.1}}>{wan(AGE.old)}万人</div>
      </Obj>
      <Obj id="lab-young" style={{position: 'absolute', left: 0, top: 185, width: 600, color: 'var(--vt-data)'}}>
        <div style={{fontSize: 48, fontWeight: 700}}>15歳未満</div>
        <div style={{fontSize: 96, fontWeight: 700, lineHeight: 1.1}}>{wan(AGE.young)}万人</div>
      </Obj>
    </div>
  );
};

// ---- Japanese nationals, foreign residents, total -------------------------------------
const WalkChart = () => {
  const a = useProp('a', 0), b = useProp('b', 0), c = useProp('c', 0);
  const X = (v: number) => 1560 + v * 14.5;      // v in units of 10,000 (-100 .. 0)
  const jp = JP_CHANGE / 10, fo = FOREIGN_CHANGE / 10, tot = TOTAL_CHANGE / 10;
  const bar = (v0: number, v1: number, y: number, colour: string, frac: number) => {
    const x0 = X(v0), x1 = X(v0 + (v1 - v0) * frac);
    return <div style={{position: 'absolute', left: Math.min(x0, x1), top: y, width: Math.abs(x1 - x0), height: 64, background: colour, borderRadius: 10}} />;
  };
  const label = (id: string, left: number, top: number, name: string, value: string, colour: string, size: number) => (
    <Obj id={id} style={{position: 'absolute', left, top, whiteSpace: 'nowrap', color: 'var(--vt-text)'}}>
      <span style={{fontSize: 40}}>{name}</span> <span style={{fontSize: size, fontWeight: 700, color: colour}}>{value}</span>
    </Obj>
  );
  return (
    <div style={{position: 'relative', width: 1640, height: 700, fontFamily: FONT}}>
      <Header title="前年同月からの人口の増減（2026年5月1日現在・確定値）" src="出典：総務省統計局「人口推計」" />
      <div style={{position: 'absolute', left: X(0) - 1, top: 130, width: 2, height: 510, background: 'var(--vt-muted)'}} />
      {[-100, -80, -60, -40, -20, 0].map((v) => (
        <div key={v} style={{position: 'absolute', left: X(v) - 80, top: 650, width: 160, textAlign: 'center', fontSize: 28, color: 'var(--vt-muted)'}}>{v === 0 ? '0' : `${v}万`}</div>
      ))}
      {bar(0, jp, 230, 'var(--vt-bad)', a)}
      {bar(jp, jp + fo, 405, 'var(--vt-good)', b)}
      {bar(0, tot, 590, 'var(--vt-text)', c)}
      {label('lab-jp', X(jp), 128, '日本人', '−85.5万人', 'var(--vt-bad)', 72)}
      {label('lab-fo', X(jp), 303, '外国人', '+32.5万人', 'var(--vt-good)', 72)}
      {label('lab-tot', X(tot), 466, '総人口', '−53万人', 'var(--vt-text)', 96)}
    </div>
  );
};

export default <Doc id="jp-population" poster={30} title="日本の人口はなぜ減るのか" lang="ja" voice="minimax:Japanese_KindLady" theme="visotalk/dark" canvas="16x9">
  <Scene id="intro">
    <Line id="i1">日本の人口は、なぜ減っているのか。</Line>
    <Part id="poster" x={140} y={140} w={1640} h={800}>{() => <Poster />}</Part>
    <Animation>
      <Appear target="poster" at="start" dur={0} />
      <Tween target="poster" to={{hl: 1}} line="i1" word="減っている" dur={1.2} />
    </Animation>
  </Scene>

  <Scene id="peak">
    <Line id="l1">人口は戦後増え続け、二〇〇八年、一億二千八百八万人でピークに。</Line>
    <Line id="l2">以降は減り始め、二〇二四年は一億二千三百八十万人。四百二十八万人の減少です。</Line>
    <Part id="popa" x={140} y={170} w={1640} h={700}>{() => <PopChart x1={2024} projection={false} />}</Part>
    <Animation>
      <Appear target="popa" line="l1" word="戦後" />
      <Tween target="popa" to={{yr: 2008}} line="l1" word="戦後" offset={0.2} dur={5.6} easing="easeInOutSine" />
      <Appear target="peak" line="l1" word="ピーク" />
      <Tween target="popa" to={{yr: 2024}} line="l2" word="減り始め" dur={3.4} easing="easeInOutSine" />
      <Appear target="drop" line="l2" word="四百二十八万人" />
    </Animation>
  </Scene>

  <Scene id="natural">
    <Line id="l3">出生数は一九四九年の二百六十九万人から、二〇二四年は七十二万人に。</Line>
    <Line id="l4">一方、死亡数は増えて百六十一万人。</Line>
    <Line id="l5">二〇〇七年から死亡が出生を上回り、差は八十九万人です。</Line>
    <Part id="vital" x={140} y={170} w={1640} h={700}>{() => <VitalChart />}</Part>
    <Animation>
      <Appear target="vital" line="l3" word="出生数" />
      <Tween target="vital" to={{by: 2024}} line="l3" word="一九四九年" dur={5.2} easing="easeInOutSine" />
      <Tween target="vital" to={{dy: 2024}} line="l4" word="死亡数" dur={3.6} easing="easeInOutSine" />
      <Appear target="cross" line="l5" word="二〇〇七年" />
      <Tween target="vital" to={{gy: 2024}} line="l5" word="上回り" dur={2.6} easing="easeInOutSine" />
      <Appear target="net" line="l5" word="八十九万人" />
    </Animation>
  </Scene>

  <Scene id="age">
    <Line id="l6">年齢別では、六十五歳以上が三千六百二十三万人、十五歳未満は千三百二十六万人。</Line>
    <Part id="agebar" x={140} y={170} w={1640} h={700}>{() => <AgeChart />}</Part>
    <Animation>
      <Appear target="agebar" line="l6" word="年齢別" />
      <Tween target="agebar" to={{work: 1}} line="l6" word="年齢別" dur={1.2} easing="easeOutQuart" />
      <Appear target="lab-work" line="l6" word="年齢別" offset={0.5} />
      <Appear target="lab-total" line="l6" word="年齢別" offset={1.0} />
      <Tween target="agebar" to={{old: 1}} line="l6" word="六十五歳以上" dur={1.2} easing="easeOutQuart" />
      <Appear target="lab-old" line="l6" word="六十五歳以上" offset={0.2} />
      <Tween target="agebar" to={{young: 1}} line="l6" word="十五歳未満" dur={1.2} easing="easeOutQuart" />
      <Appear target="lab-young" line="l6" word="十五歳未満" offset={0.2} />
    </Animation>
  </Scene>

  <Scene id="walk">
    <Line id="l7">日本人は八十五万五千人減り、外国人は三十二万五千人増え、総人口は五十三万人減。</Line>
    <Part id="walk" x={140} y={170} w={1640} h={700}>{() => <WalkChart />}</Part>
    <Animation>
      <Appear target="walk" line="l7" word="日本人は" />
      <Tween target="walk" to={{a: 1}} line="l7" word="日本人は" dur={1.4} easing="easeOutQuart" />
      <Appear target="lab-jp" line="l7" word="日本人は" offset={0.3} />
      <Tween target="walk" to={{b: 1}} line="l7" word="外国人は" dur={1.2} easing="easeOutQuart" />
      <Appear target="lab-fo" line="l7" word="外国人は" offset={0.2} />
      <Tween target="walk" to={{c: 1}} line="l7" word="総人口は" dur={1.2} easing="easeOutQuart" />
      <Appear target="lab-tot" line="l7" word="総人口は" offset={0.2} />
    </Animation>
  </Scene>

  <Scene id="future">
    <Line id="l8">社人研の推計では、二〇五〇年に約一億四百七十万人、二〇七〇年に約八千七百万人。</Line>
    <Line id="l9">これは推計であり、確定した未来ではありません。</Line>
    <Part id="popb" x={140} y={170} w={1640} h={700}>{() => <PopChart x1={2070} projection={true} />}</Part>
    <Animation>
      <Appear target="popb" at="start" />
      <Appear target="ipss" line="l8" word="社人研" />
      <Tween target="popb" to={{pr: 2050}} line="l8" word="社人研" dur={3.2} easing="easeInOutSine" />
      <Appear target="p2050" line="l8" word="二〇五〇年" offset={0.6} />
      <Tween target="popb" to={{pr: 2070}} line="l8" word="二〇七〇年" dur={1.8} easing="easeInOutSine" />
      <Appear target="p2070" line="l8" word="二〇七〇年" offset={1.6} />
    </Animation>
  </Scene>
</Doc>;
