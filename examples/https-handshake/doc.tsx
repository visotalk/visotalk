// A 16x9 web-page explainer: the TLS handshake, drawn on one link between a browser and a server.
// The look lives in parts/kit.tsx; each scene's picture is one part in parts/.
import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set, Disappear} from '@visotalk/jsx';
import {Cover} from './parts/cover.tsx';
import {Knock} from './parts/knock.tsx';
import {Cert} from './parts/cert.tsx';
import {Keys} from './parts/keys.tsx';
import {Coded} from './parts/coded.tsx';
import {Close} from './parts/close.tsx';

export default <Doc id="https-handshake" title="What happens when a browser opens an HTTPS site" lang="en"
  voice="minimax:English_Trustworthy_Man" speed={1} theme="visotalk/dark" canvas="16x9"
  tokens={{
    colors: {bg: '#0A1120', panel: '#111C2E', panel2: '#16243A', border: '#25344C', text: '#F1EAD9', muted: '#93A1B5', faint: '#4A5B72', data: '#8FB6D6', grad: '#F2B44C', good: '#F2B44C', bad: '#E06B5E'},
    fonts: {sans: '"Inter", sans-serif', mono: '"JetBrains Mono", monospace', display: '"Hanken Grotesk", sans-serif'},
    caption: {font: 'sans', size: 32, weight: 500, color: '#F1EAD9', background: 'rgba(8,14,24,0.72)', radius: 8, padding: [12, 22], bottom: 34, maxWidth: 1280, rule: '#F2B44C', ruleSide: 'left'},
  }}>

  <Scene id="cover" title="The padlock">
    <Line id="l1">That little padlock is the end of a very careful conversation.</Line>
    <Part id="cover"><Cover /></Part>
    <Animation>
      <Appear target="cover" at="start" dur={0} />
      <Tween target="cover" to={{shut: 1}} line="l1" word="padlock" dur={0.5} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="knock" title="The handshake">
    <Line id="l2">Before a page loads, your browser and the site agree how to talk securely.</Line>
    <Line id="l3">It is a short exchange called the TLS handshake.</Line>
    <Part id="knock"><Knock /></Part>
    <Animation>
      <Appear target="knock" at="start" dur={0.5} />
      <Appear target="hello" line="l2" word="agree" />
      <Tween id="go" target="hello" to={{x: 558}} line="l2" word="agree" dur={0.9} easing="easeInOutSine" />
      <Appear target="reply" after="go" />
      <Tween target="reply" to={{x: -558}} after="go" dur={0.9} easing="easeInOutSine" />
      <Tween target="knock" to={{lit: 1}} line="l3" word="handshake" dur={0.7} />
      <Appear target="hs-bracket" line="l3" word="handshake" dur={0.5} />
    </Animation>
  </Scene>

  <Scene id="cert" title="The certificate">
    <Line id="l4">First, the site shows a certificate, like a passport for its domain.</Line>
    <Line id="l5">The browser checks who signed it, the name, and the dates.</Line>
    <Line id="l6">A forged certificate fails those checks, and the browser stops.</Line>
    <Part id="cert"><Cert /></Part>
    <Animation>
      <Appear target="cert" at="start" dur={0.5} />
      <Set target="cert" to={{bad: 0, broken: 0}} at="start" />
      <Set target="card" to={{x: 150, scale: 0.94}} at="start" />
      <Appear target="card" line="l4" word="certificate" dur={0.5} />
      <Tween target="card" to={{x: 0, scale: 1}} line="l4" word="certificate" dur={0.8} easing="easeOutQuart" />
      <Appear target="check-sig" line="l5" word="signed" />
      <Appear target="check-name" line="l5" word="name" />
      <Appear target="check-dates" line="l5" word="dates" />
      <Tween target="cert" to={{bad: 1}} line="l6" word="forged" dur={0.5} easing="easeOut" />
      <Tween target="cert" to={{broken: 1}} line="l6" word="stops" dur={0.4} />
    </Animation>
  </Scene>

  <Scene id="keys" title="The key">
    <Line id="l7">Next, they agree on a secret key without ever sending it.</Line>
    <Line id="l8">Each mixes a private colour into the other's public one.</Line>
    <Line id="l9">Both sides get the same key, but a listener cannot.</Line>
    <Part id="keys"><Keys /></Part>
    <Animation>
      <Appear target="keys" at="start" dur={0.5} />
      <Set target="keys" to={{formed: 0}} at="start" />
      <Appear target={["priv-l", "priv-r"]} line="l7" word="secret key" stagger={0.18} />
      <Appear target="nosend" line="l7" word="sending" />
      <Appear target={["pub-l", "pub-r"]} line="l8" word="each" stagger={0.1} />
      <Disappear target="nosend" line="l8" word="public" dur={0.3} />
      <Tween id="send-a" target="pub-l" to={{x: 684}} line="l8" word="public" dur={0.62} easing="easeInOutSine" />
      <Tween id="send-b" target="pub-r" to={{x: -684}} after="send-a" dur={0.62} easing="easeInOutSine" />
      <Tween id="result" target="keys" to={{formed: 1}} after="send-b" dur={0.75} easing="easeOutQuart" />
      <Appear target="same" line="l9" word="same key" />
      <Appear target="listener" line="l9" word="listener" />
      <Appear target="no" line="l9" word="cannot" />
    </Animation>
  </Scene>

  <Scene id="coded" title="Talking in code">
    <Line id="l10">Now every message is locked with that key before it leaves.</Line>
    <Line id="l11">On the same Wi-Fi, a snoop records the traffic and sees only gibberish.</Line>
    <Line id="l12">The site unlocks each message, so your password arrives private and unchanged.</Line>
    <Part id="coded"><Coded /></Part>
    <Animation>
      <Appear target="coded" at="start" dur={0.5} />
      <Set target="coded" to={{locked: 0}} at="start" />
      <Set target="msg" to={{x: 0}} at="start" />
      <Appear target="msg" line="l10" word="message" />
      <Tween target="coded" to={{locked: 1}} line="l10" word="locked" dur={0.45} easing="easeOut" />
      <Tween id="leave" target="msg" to={{x: 740}} line="l10" word="leaves" dur={1.0} easing="easeInOutSine" />
      <Appear target="listener" line="l11" word="snoop" />
      <Appear target="tap" line="l11" word="records" />
      <Appear target="recorded" line="l11" word="records" />
      <Appear target="gib" line="l11" word="gibberish" />
      <Tween target="coded" to={{locked: 0}} line="l12" word="unlocks" dur={0.5} easing="easeOut" />
      <Appear target="intact" line="l12" word="password" />
    </Animation>
  </Scene>

  <Scene id="close" title="The address bar">
    <Line id="l13" hold={1.4}>That is all the padlock means: the handshake worked.</Line>
    <Part id="close"><Close /></Part>
    <Animation>
      <Appear target="close" at="start" dur={0.5} />
      <Set target="tick" to={{scale: 0.2}} at="start" />
      <Appear target="tick" line="l13" word="worked" />
      <Tween target="tick" to={{scale: 1}} line="l13" word="worked" dur={0.55} easing="easeOutBack(2.2)" />
      <Appear target="done" line="l13" word="worked" />
    </Animation>
  </Scene>
</Doc>;
