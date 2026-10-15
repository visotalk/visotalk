/** Three discs of the Moon (a sliver, a half, a full disc) and the one circle they all share. */
import {defineComponent, type TimedContext} from '@visotalk/runtime';
import {CREAM, clamp, ease, litPath, maria, px} from './lunar.ts';

interface Props { shown: number; whole: number }

const ANGLES = [40, 90, 180];
const NAMES = ['sliver', 'half', 'full'];

export const Phases = defineComponent<Props>({
  contract: 'visotalk/timed@1',
  mount(host) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
    host.appendChild(canvas);
    const g = canvas.getContext('2d')!;
    return {
      render(ctx: TimedContext<Props>) {
        const dpr = ctx.pixelRatio;
        canvas.width = Math.round(ctx.width * dpr); canvas.height = Math.round(ctx.height * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const W = ctx.width, H = ctx.height, col = ctx.theme.colors, sans = ctx.theme.fonts.sans;
        const {shown, whole} = ctx.props;
        g.clearRect(0, 0, W, H);
        const r = Math.min(150, H * 0.26), cy = px(H * 0.46);
        ANGLES.forEach((a, i) => {
          const k = ease(shown - i);
          if (k <= 0) return;
          const cx = px(W * (0.2 + 0.3 * i)), rr = r * (0.85 + 0.15 * k);
          g.globalAlpha = k;
          // the whole sphere: dark part, faint when unknown, filled once we say it is still there
          g.fillStyle = `rgba(70,76,96,${0.35 + 0.35 * whole})`;
          g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
          litPath(g, cx, cy, rr, a);
          const grad = g.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.1, cx, cy, rr);
          grad.addColorStop(0, '#fff8e0'); grad.addColorStop(1, CREAM);
          g.fillStyle = grad; g.fill();
          maria(g, cx, cy, rr, 0.35);
          // the outline of the one circle
          g.setLineDash([14, 12]); g.lineWidth = 4; g.strokeStyle = col.data;
          g.globalAlpha = k * whole;
          g.beginPath(); g.arc(cx, cy, rr + 16, 0, Math.PI * 2 * whole); g.stroke();
          g.setLineDash([]);
          g.globalAlpha = k;
          g.fillStyle = col.muted; g.font = `700 34px ${sans}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(NAMES[i], cx, cy + r + 62);
          g.globalAlpha = 1;
        });
      },
    };
  },
});
