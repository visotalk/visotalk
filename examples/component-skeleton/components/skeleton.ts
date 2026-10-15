/**
 * The smallest complete component: the contract, and one use of each technique in `techniques.ts`. It draws a row of numbered squares joined by arrows and a
 * line of captions under it; replace the drawing with your own picture and keep the shape: `defineComponent`, `mount(host)` once, `render(ctx)` for any
 * time in any order, everything from `ctx.props`, `ctx.width` and `ctx.height`, theme colours from `ctx.theme.colors`.
 * The document places the component in a slot and moves its props on the words (`<Tween on="x" shown={3}>`); the component never decides when anything happens.
 */
import {defineComponent, type TimedContext} from '@visotalk/runtime';
import {arrow, ease, fitFont, gridOf, px, stagger} from './techniques.ts';

interface Props {
  /** how many squares have appeared (2.4: two and 40 % of the third) */
  shown: number;
  captions: string[];
}

export const Skeleton = defineComponent<Props>({
  contract: 'visotalk/timed@1',
  mount(host) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
    const html = document.createElement('div');
    host.appendChild(canvas);
    host.appendChild(html);
    const g = canvas.getContext('2d')!;
    return {
      render(ctx: TimedContext<Props>) {
        const dpr = ctx.pixelRatio;
        canvas.width = Math.round(ctx.width * dpr);
        canvas.height = Math.round(ctx.height * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const W = ctx.width, H = ctx.height, col = ctx.theme.colors, sans = ctx.theme.fonts.sans;
        const {shown, captions} = ctx.props;
        g.clearRect(0, 0, W, H);
        const usable = W - 8; // canvas content at the very edge can be cut: keep a small margin
        const n = captions.length, size = px(Math.min(160, (usable - 120 * (n - 1)) / n)), gap = px((usable - size * n) / Math.max(n - 1, 1));
        const y = px(H * 0.4);
        captions.forEach((_, i) => {
          const k = ease(stagger(shown, i));
          if (k <= 0) return;
          const x = px(i * (size + gap));
          g.globalAlpha = k;
          g.fillStyle = col.panel2; g.strokeStyle = col.border; g.lineWidth = 3;
          g.beginPath(); g.roundRect(x, y, size, size, 20); g.fill(); g.stroke();
          g.fillStyle = col.text; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = `700 ${fitFont(g, String(i + 1), 700, sans, 64, size - 24)}px ${sans}`;
          g.fillText(String(i + 1), x + size / 2, y + size / 2);
          if (i > 0) { g.fillStyle = col.muted; arrow(g, x - gap + 12, x - 12, y + size / 2); }
          g.globalAlpha = 1;
        });
        // the captions are HTML: the browser wraps and aligns them
        const cells = gridOf(html, n, gap);
        html.style.cssText += `;position:absolute;left:0;top:${y + size + 40}px;width:${W}px;font-family:${sans};font-size:36px;font-weight:400;color:${col.muted};text-align:center`;
        cells.forEach((cell, i) => { cell.textContent = captions[i]; cell.style.opacity = String(ease(stagger(shown, i))); });
      },
    };
  },
});
