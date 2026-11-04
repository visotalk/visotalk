// The sample's one map: why antibiotics stop working, as a loop of four stages, the gene that travels on a plasmid behind it,
// what feeds the loop and what blocks it; and a second sheet laid over it to compare a susceptible cell with a resistant one.
// Sources: GBD 2021 Antimicrobial Resistance Collaborators, "Global burden of bacterial antimicrobial resistance 1990–2021",
// The Lancet 404 (2024), 1199–1226 (1.14 million deaths attributable to bacterial resistance in 2021, and 1.91 million forecast for 2050); Fleming-Dutra et al.,
// "Prevalence of inappropriate antibiotic prescriptions among US ambulatory care visits, 2010–2011", JAMA 315 (2016), 1864–1873
// (at least 30% of outpatient oral antibiotic prescriptions unnecessary).
import {useProp} from '@visotalk/runtime';
import {IdeaMap} from '../../parts/map.tsx';
import {Heading} from '../../parts/heading.tsx';
import {Key} from '../../parts/key.tsx';
import {Locator} from '../../parts/locator.tsx';
import {Units} from '../../parts/units.tsx';
import {Pictogram} from '../../parts/pictogram.tsx';
import {Chart} from '../../parts/chart.tsx';
import {Bracket} from '../../parts/bracket.tsx';
import {Compare} from '../../parts/compare.tsx';
import {Sheet} from '../../parts/sheet.tsx';
import type {MapEdge, MapNode, View} from '../../parts/geometry.ts';

const NODES: MapNode[] = [
  {id: 'use', kind: 'picture', glyph: 'pill', term: 'Antibiotic use'},
  {id: 'sel', kind: 'picture', glyph: 'bacterium', term: 'Selection'},
  {id: 'spread', kind: 'picture', glyph: 'bacterium', term: 'Resistant strains'},
  {id: 'hard', kind: 'picture', glyph: 'person', term: 'Harder infections'},
  {id: 'unneeded', glyph: 'document', term: 'Unneeded prescriptions', beside: {of: 'use', side: 't'}},
  {id: 'steward', kind: 'action', glyph: 'shield', term: 'Stewardship', beside: {of: 'unneeded', side: 'l'}},
  {id: 'plasmid', kind: 'picture', glyph: 'plasmid', term: 'Plasmid', beside: {of: 'sel', side: 't'}},
  {id: 'gene', kind: 'picture', glyph: 'dna', term: 'Resistance gene', beside: {of: 'plasmid', side: 'r'}},
  {id: 'blac', kind: 'picture', glyph: 'scissors', term: 'Beta-lactamase', beside: {of: 'gene', side: 'r'}},
  {id: 'pen', kind: 'picture', glyph: 'pill', term: 'Penicillin', beside: {of: 'blac', side: 'b'}},
];

const EDGES: MapEdge[] = [
  {id: 'e1', from: 'use', to: 'sel', kind: 'causes', label: 'spares the resistant', flow: true},
  {id: 'e2', from: 'sel', to: 'spread', kind: 'leads', label: 'multiply', flow: true},
  {id: 'e3', from: 'spread', to: 'hard', kind: 'leads', label: 'infect others', flow: true},
  {id: 'e4', from: 'hard', to: 'use', kind: 'leads', label: 'more courses', flow: true},
  {id: 'e5', from: 'unneeded', to: 'use', kind: 'contributes', label: 'adds courses'},
  {id: 'e6', from: 'steward', to: 'unneeded', kind: 'prevents', label: 'blocks'},
  {id: 'e7', from: 'plasmid', to: 'sel', kind: 'contributes', label: 'passed on', flow: true},
  {id: 'e8', from: 'gene', to: 'plasmid', kind: 'part', label: 'part of'},
  {id: 'e9', from: 'gene', to: 'blac', kind: 'causes', label: 'makes'},
  {id: 'e10', from: 'blac', to: 'pen', kind: 'opposes', label: 'works against'},
];

const RING = ['use', 'sel', 'spread', 'hard'];
export const VIEWS: View[] = [
  RING,
  {ids: RING, grow: [0, 0, 0, 130]},
  {ids: ['unneeded', 'use'], grow: [0, 0, 720, 0]},
  ['steward', 'unneeded', 'use'],
  ['sel', 'plasmid', 'gene'],
  ['gene', 'blac', 'pen'],
  {ids: RING, grow: [0, 0, 0, 380]},
];

const KEY = [
  {kind: 'causes' as const, label: 'causes'},
  {kind: 'leads' as const, label: 'leads to'},
  {kind: 'contributes' as const, label: 'adds to'},
  {kind: 'prevents' as const, label: 'blocks'},
  {kind: 'part' as const, label: 'is part of'},
  {kind: 'opposes' as const, label: 'works against'},
];

export function World() {
  const p = (name: string, base = 0) => useProp(name, base);
  // the map grows in its terms' order (grow, a step a term): each line is ruled before the term it reaches
  const struck = p('struck');
  const nodes = NODES.map((n) => ({...n, state: n.id === 'hard' && p('hot') > 0.5 ? 'active' as const : n.id === 'unneeded' && p('hot2') > 0.5 ? 'active' as const : n.id === 'pen' && struck > 0 ? 'struck' as const : undefined, strike: n.id === 'pen' ? struck : undefined, actAt: n.id === 'spread' ? p('multiply') : undefined, act: n.id === 'spread' ? 'multiply' as const : undefined}));
  const edges = EDGES.map((e) => ({...e, state: e.id === 'e5' && p('hot2') > 0.5 ? 'active' as const : undefined}));
  const grow = p('grow');
  const cam = {views: VIEWS, view: p('view'), ride: 'e9', rideMix: p('rideMix'), rideZoom: 1.25, lead: 40};
  const keyN = p('key');
  const cmp = p('cmp'), compare = p('compare'), cellAct = p('cellAct');
  return <>
    <IdeaMap nodes={nodes} edges={edges} layout="cycle" grow={grow} {...cam} speed={p('speed')}>
      <Pictogram name="loop" among={RING} size={128} act="spin" tone="red" show={p('loop')} />
      <Bracket ids={RING} side="below" note="a loop that feeds itself" show={p('loop')} />
      <Units at="unneeded" glyph="document" total={10} marked={3} cols={10} size={58} label="unnecessary, at least" source="US, 2010–11 · JAMA, 2016" show={p('fig30')} />
    </IdeaMap>
    {/* the closing figures, at full size under the whole loop the camera has pulled back to */}
    <Chart x={470} y={640} title="Deaths caused by resistant bacteria, a year" source="GBD 2021 AMR Collaborators · The Lancet, 2024" width={640}
        rows={[{label: '2021', value: 1.14, shown: '1.14 million'}, {label: '2050', value: 1.91, shown: '1.91 million, forecast', estimate: true, marked: true}]} show={p('chart')} />
    {cmp > 0.001 && (
      // a second layout sheet laid over the first
      <div style={{position: 'absolute', inset: 0, opacity: cmp}}>
        <Sheet camX={960} camY={480 - (1 - cmp) * 40}>
          <Compare x={330} y={640} marked="right" kind="opposes" label="or" actAt={cellAct}
            left={{term: 'Susceptible', glyph: 'bacterium', act: 'burst', points: ['its wall fails']}}
            right={{term: 'Resistant', glyph: 'bacterium', act: 'multiply', points: ['the drug is cut first']}}
            show={compare} />
        </Sheet>
      </div>
    )}
    <Heading kicker="Microbiology · a feedback loop" title="Why do antibiotics stop working?" show={p('heading')} />
    <Key items={KEY.slice(0, Math.ceil(keyN))} show={Math.min(1, keyN / Math.max(1, Math.ceil(keyN)) + 0.0001) * (1 - p('locator'))} />
    <Locator nodes={nodes} edges={edges} layout="cycle" grow={grow} {...cam} show={p('locator') * (1 - cmp)} />
  </>;
}
