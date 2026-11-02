// Installed-engine syntax reference only; not a sample approved for publication.
import {Doc, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
import {TitleRule} from '../parts/title-rule.tsx';

export default <Doc
  id="data-editorial-demo"
  title="Data Editorial syntax reference"
  lang="en"
  canvas="16x9"
  theme="visotalk/light"
  tokens={{
    colors: {
      bg: '#F6F3EA', text: '#1D2330', data: '#1F6FD0',
      good: '#1E9E55', bad: '#D13B3B', warn: '#B7791F',
    },
    fonts: {sans: '"Inter", sans-serif', mono: '"JetBrains Mono", monospace'},
  }}
  voice="minimax:English_Trustworthy_Man"
  speed={1}
  lexicon={{API: 'A P I'}}
  pacing={{lead: 0.4, hold: 0.4, tail: 0.8}}
  exports={{captions: 'burned'}}
>
  <Scene id="idea">
    <Line id="one">A clear question gives the picture a purpose.</Line>
    <Part id="question" x={160} y={280} w={1500} h={180}>
      <TitleRule title="One clear question" />
    </Part>
    <Animation>
      <Appear target="question" line="one" word="question" />
    </Animation>
  </Scene>
</Doc>;
