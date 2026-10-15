/**
 * The Moon around the Earth, seen from above, with the phase it shows from Earth beside it. A `visotalk/timed@1` component: the picture is a pure function of
 * its props (`phase`, 0 to 1 around the orbit: 0 new, 0.25 first quarter, 0.5 full) and of `ctx.local` (the slow drift of the stars).
 */
import {defineComponent, type TimedContext} from '@visotalk/runtime';

interface Props {
  phase: number;
  /** show the disc as seen from Earth (default true) */
  disc?: boolean;
}

/** The tag a document imports: `import {Moon} from './components/moon.ts'` and `<Moon id="view" phase={0}/>` */
export const Moon = defineComponent<Props>({
  contract: 'visotalk/timed@1',
  mount(host) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(canvas);
    const g = canvas.getContext('2d')!;
    return {
      render(ctx: TimedContext<Props>) {
        const dpr = ctx.pixelRatio;
        canvas.width = Math.round(ctx.width * dpr);
        canvas.height = Math.round(ctx.height * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const W = ctx.width, H = ctx.height, col = ctx.theme.colors;
        g.clearRect(0, 0, W, H);
        // stars: a fixed set from the seed, drifting slowly with local time
        const rnd = ctx.random('stars');
        g.fillStyle = col.faint;
        for (let i = 0; i < 60; i++) {
          const x = (rnd() * W + ctx.local * 6) % W, y = rnd() * H;
          g.fillRect(x, y, 2, 2);
        }
        const phase = Math.min(1, Math.max(0, ctx.props.phase ?? 0));
        const showDisc = ctx.props.disc !== false;
        const R = Math.min(W * (showDisc ? 0.3 : 0.4), H * 0.4);          // orbit radius
        const cx = W * (showDisc ? 0.4 : 0.5), cy = H * 0.5;
        // sunlight from the left
        g.strokeStyle = col.warn;
        g.fillStyle = col.warn;
        g.lineWidth = 3;
        for (let k = -2; k <= 2; k++) {
          const y = cy + k * R * 0.28;
          g.beginPath(); g.moveTo(cx - R * 1.45, y); g.lineTo(cx - R * 1.2, y); g.stroke();
          g.beginPath(); g.moveTo(cx - R * 1.2, y); g.lineTo(cx - R * 1.27, y - 7); g.lineTo(cx - R * 1.27, y + 7); g.closePath(); g.fill();
        }
        // orbit, Earth
        g.strokeStyle = col.border; g.lineWidth = 2; g.setLineDash([8, 10]);
        g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = col.data; g.beginPath(); g.arc(cx, cy, R * 0.22, 0, Math.PI * 2); g.fill();
        // the Moon: angle 0 = new moon (between Earth and Sun, on the sunward side)
        const a = Math.PI + phase * Math.PI * 2;
        const mx = cx + R * Math.cos(a), my = cy + R * Math.sin(a), mr = R * 0.16;
        g.fillStyle = col.faint; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
        g.fillStyle = col.text;
        g.beginPath(); g.arc(mx, my, mr, Math.PI / 2, -Math.PI / 2); g.closePath(); g.fill(); // the half facing the Sun
        if (!showDisc) return;
        // the disc seen from Earth: lit fraction and side follow the phase
        const dx = W * 0.78, dr = Math.min(W * 0.14, H * 0.3);
        g.fillStyle = col.faint; g.beginPath(); g.arc(dx, cy, dr, 0, Math.PI * 2); g.fill();
        const waxing = phase < 0.5;
        const k = Math.cos(phase * Math.PI * 2);                              // terminator ellipse: +1 new .. -1 full
        g.save(); g.beginPath(); g.arc(dx, cy, dr, 0, Math.PI * 2); g.clip();
        g.fillStyle = col.text;
        const side = waxing ? 1 : -1;                                         // lit limb on the right while waxing
        g.beginPath(); g.arc(dx, cy, dr, -Math.PI / 2, Math.PI / 2, side < 0); g.closePath(); g.fill();
        g.fillStyle = k > 0 ? col.faint : col.text;                            // crescent: carve; gibbous: add
        g.beginPath(); g.ellipse(dx, cy, Math.abs(k) * dr, dr, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      },
    };
  },
});
