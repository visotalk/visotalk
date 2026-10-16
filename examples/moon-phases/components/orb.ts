/** The Sun, the Earth and the Moon seen from above, with the view from Earth beside them. Every part is revealed by a numeric prop the document moves. */
import {defineComponent, type TimedContext} from '@visotalk/runtime';
import {CREAM, DEG, clamp, ease, litPath, maria, px} from './lunar.ts';

interface Props {
  sun: number; ball: number; focus: number; rim: number; earth: number; orbit: number; rays: number;
  tagSun: number; tagMoon: number; tagEarth: number; tagPos: number; tagView: number;
  view: number; angle: number; align: number; glow: number; ghosts: number;
  gOne: number; gAngle: number; face: number; shadow: number; sight: number;
}

const SUN = '#ffc94d';

export const Orb = defineComponent<Props>({
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
        const p = ctx.props;
        g.clearRect(0, 0, W, H);
        const cyc = px(H / 2), R = Math.min(260, H * 0.38);
        const sunX = px(W * 0.1), sunR = 66;
        const ex = px(W * 0.46), eR = 46;
        const insetX = px(W * 0.865), insetR = Math.min(140, H * 0.2);
        const mr = 42;
        const orbitPos = (a: number): [number, number] => [ex - R * Math.cos(a * DEG), cyc + R * Math.sin(a * DEG)];
        const [ox, oy] = orbitPos(p.angle);
        const f = ease(p.focus);
        const bx = ox + (px(W * 0.5) - ox) * f, by = oy + (cyc - oy) * f, br = mr + (132 - mr) * f;
        const label = (t: string, x: number, y: number, a: number, c = col.text, size = 32, align: CanvasTextAlign = 'center') => {
          if (a <= 0) return;
          g.globalAlpha = clamp(a); g.fillStyle = c; g.font = `700 ${size}px ${sans}`; g.textAlign = align; g.textBaseline = 'middle';
          g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = col.bg; g.strokeText(t, px(x), px(y)); g.fillText(t, px(x), px(y)); g.globalAlpha = 1;
        };

        // light rays from the Sun
        if (p.rays > 0) {
          g.globalAlpha = 0.16 * clamp(p.rays); g.strokeStyle = SUN; g.lineWidth = 3;
          const reach = f > 0.5 ? bx - br - 10 : px(W * 0.74);
          for (const dy of [-0.8, -0.4, 0, 0.4, 0.8]) {
            const y = cyc + dy * (f > 0.5 ? br : 190);
            g.beginPath(); g.moveTo(sunX + sunR + 14, y); g.lineTo(reach * clamp(p.rays) + (1 - clamp(p.rays)) * (sunX + sunR + 14), y); g.stroke();
          }
          g.globalAlpha = 1;
        }
        // the Earth's shadow
        if (p.shadow > 0) {
          const s = ease(p.shadow), L = (px(W * 0.74) - ex) * s;
          g.globalAlpha = 0.9;
          g.fillStyle = 'rgba(8,10,20,0.85)'; g.strokeStyle = col.muted; g.lineWidth = 3; g.setLineDash([12, 10]);
          g.beginPath(); g.moveTo(ex, cyc - eR); g.lineTo(ex + L, cyc - eR * 0.55); g.lineTo(ex + L, cyc + eR * 0.55); g.lineTo(ex, cyc + eR); g.closePath(); g.fill(); g.stroke();
          g.setLineDash([]); g.globalAlpha = 1;
        }
        // the orbit
        if (p.orbit > 0) {
          g.setLineDash([10, 12]); g.lineWidth = 3; g.strokeStyle = col.border; g.globalAlpha = 1;
          g.beginPath(); g.arc(ex, cyc, R, Math.PI, Math.PI + Math.PI * 2 * clamp(p.orbit)); g.stroke(); g.setLineDash([]);
        }
        // the Sun / lamp
        if (p.sun > 0) {
          const s = ease(p.sun);
          const gl = g.createRadialGradient(sunX, cyc, sunR * 0.4, sunX, cyc, sunR * 2.4);
          gl.addColorStop(0, 'rgba(255,201,77,0.45)'); gl.addColorStop(1, 'rgba(255,201,77,0)');
          g.globalAlpha = s; g.fillStyle = gl; g.beginPath(); g.arc(sunX, cyc, sunR * 2.4, 0, Math.PI * 2); g.fill();
          g.fillStyle = SUN; g.beginPath(); g.arc(sunX, cyc, sunR * (0.6 + 0.4 * s), 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        }
        label('Sun', sunX, cyc + sunR + 54, p.tagSun, SUN);
        // alignment line: Sun - Moon - Earth
        if (p.align > 0) {
          g.globalAlpha = 0.8; g.strokeStyle = col.warn; g.lineWidth = 3; g.setLineDash([4, 10]);
          const tx = sunX + sunR + 20, k = ease(p.align);
          g.beginPath(); g.moveTo(tx, cyc); g.lineTo(tx + (ex + R + 40 - tx) * k, cyc); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        }
        // the Earth
        if (p.earth > 0) {
          const e = ease(p.earth);
          g.globalAlpha = e;
          g.fillStyle = '#1b2b52'; g.beginPath(); g.arc(ex, cyc, eR, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(ex, cyc, eR, -Math.PI / 2, Math.PI / 2, true); g.closePath();
          const eg = g.createLinearGradient(ex - eR, 0, ex, 0); eg.addColorStop(0, '#5fa0e8'); eg.addColorStop(1, '#2d5fa8');
          g.fillStyle = eg; g.fill();
          g.fillStyle = 'rgba(90,170,110,0.9)'; g.beginPath(); g.arc(ex - 16, cyc - 8, 12, 0, Math.PI * 2); g.arc(ex - 6, cyc + 14, 8, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
        }
        label('Earth', ex, cyc + eR + 40, p.tagEarth * (1 - clamp(p.tagView)), '#7fb4f0');
        label('Our viewpoint', ex, cyc + eR + 40, clamp(p.tagView), '#7fb4f0');
        // ghost Moons: the same lit half all the way round
        if (p.ghosts > 0) {
          for (let i = 0; i < 8; i++) {
            const a = i * 45; if (Math.abs(((p.angle - a + 540) % 360) - 180) < 22) continue;
            const [gx, gy] = orbitPos(a);
            g.globalAlpha = 0.9 * ease(p.ghosts - i * 0.08);
            g.fillStyle = '#3a4058'; g.beginPath(); g.arc(gx, gy, mr, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc(gx, gy, mr, -Math.PI / 2, Math.PI / 2, true); g.closePath(); g.fillStyle = CREAM; g.fill();
            g.globalAlpha = 1;
          }
        }
        // yesterday's Moon and the step to tonight
        if (p.gOne > 0) {
          const [gx, gy] = orbitPos(p.gAngle), k = ease(p.gOne);
          g.globalAlpha = 0.55 * k; g.strokeStyle = col.muted; g.lineWidth = 4; g.setLineDash([6, 6]);
          g.beginPath(); g.arc(gx, gy, mr, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
          g.globalAlpha = k; g.strokeStyle = col.warn; g.lineWidth = 8;
          g.beginPath(); g.arc(ex, cyc, R + 4, Math.PI - p.gAngle * DEG, Math.PI - p.angle * DEG, true); g.stroke();
          g.globalAlpha = 1;
        }
        // eclipse tint: the Moon inside the shadow
        const dFull = Math.abs((((p.angle - 180) % 360) + 540) % 360 - 180);
        const ecl = p.shadow > 0.9 ? clamp(1 - dFull / 25) : 0;
        // the sight line from Earth to Moon
        if (p.view > 0 && p.ball > 0 && f < 0.5) {
          g.globalAlpha = 0.35 + 0.65 * clamp(p.sight); g.strokeStyle = col.data; g.lineWidth = 2 + 3 * clamp(p.sight);
          const dx = ox - ex, dy = oy - cyc, d = Math.hypot(dx, dy) || 1;
          g.beginPath(); g.moveTo(ex + dx / d * (eR + 4), cyc + dy / d * (eR + 4)); g.lineTo(ox - dx / d * (mr + 4), oy - dy / d * (mr + 4)); g.stroke(); g.globalAlpha = 1;
        }
        // the Moon (or the ball)
        if (p.ball > 0) {
          const b = ease(p.ball), r = br * (0.7 + 0.3 * b);
          g.globalAlpha = b;
          g.fillStyle = '#343a52'; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(bx, by, r, -Math.PI / 2, Math.PI / 2, true); g.closePath();
          const lg = g.createLinearGradient(bx - r, 0, bx, 0); lg.addColorStop(0, '#fffbe8'); lg.addColorStop(1, CREAM);
          if (p.glow > 0) { g.shadowColor = SUN; g.shadowBlur = 36 * p.glow; }
          g.fillStyle = lg; g.fill(); g.shadowBlur = 0;
          if (f > 0.5) maria(g, bx, by, r, 0.28 * f);
          if (ecl > 0) { g.fillStyle = `rgba(150,50,35,${0.85 * ecl})`; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill(); }
          g.strokeStyle = col.border; g.lineWidth = 3; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.stroke();
          if (p.rim > 0) {
            g.strokeStyle = col.warn; g.lineWidth = 4; g.setLineDash([10, 8]);
            const e = ease(p.rim);
            g.beginPath(); g.moveTo(bx, by - r - 22); g.lineTo(bx, by - r - 22 + (2 * r + 44) * e); g.stroke(); g.setLineDash([]);
          }
          if (p.face > 0) {
            const dx = ex - bx, dy = cyc - by, d = Math.hypot(dx, dy) || 1, mx = bx + dx / d * r * 0.62, my = by + dy / d * r * 0.62;
            g.globalAlpha = b * clamp(p.face); g.fillStyle = col.warn; g.beginPath(); g.arc(mx, my, 9, 0, Math.PI * 2); g.fill();
            g.strokeStyle = col.warn; g.lineWidth = 3; g.beginPath(); g.arc(mx, my, 17, 0, Math.PI * 2); g.stroke();
          }
          g.globalAlpha = 1;
          const ox2 = f > 0.5 ? 0 : (bx - ex) / R, oy2 = f > 0.5 ? 1 : (by - cyc) / R;
          const bottom = oy2 >= 0 && by + r + 34 > H - 24; // no room below: the label would touch the bottom edge
          const side = (Math.abs(ox2) > 0.5 && f < 0.5) || bottom;
          const dir = ox2 !== 0 && !bottom ? Math.sign(ox2) : 1;
          const lx = side ? bx + dir * (r + 14) : bx, ly = side ? by : by + (oy2 >= 0 ? 1 : -1) * (r + 34);
          const lal: CanvasTextAlign = side ? (dir > 0 ? 'left' : 'right') : 'center';
          label('Moon', lx, ly, p.tagMoon * (1 - clamp(p.tagPos)), CREAM, 32, lal);
          if (p.tagPos > 0) {
            const k = ease(p.tagPos);
            g.globalAlpha = k; g.strokeStyle = CREAM; g.lineWidth = 3;
            g.beginPath(); g.moveTo(bx + 4, by - r - 4); g.lineTo(bx + 4 + 70 * k, by - r - 4 - 40 * k); g.stroke(); g.globalAlpha = 1;
            label("Moon's position", bx + 84, by - r - 46, p.tagPos, CREAM, 32, 'left');
          }
        }
        // the view from Earth
        if (p.view > 0) {
          const v = ease(p.view), r = insetR * (0.8 + 0.2 * v);
          g.globalAlpha = v;
          g.fillStyle = '#10131f'; g.beginPath(); g.arc(insetX, cyc, r + 22, 0, Math.PI * 2); g.fill();
          g.strokeStyle = col.data; g.lineWidth = 3; g.beginPath(); g.arc(insetX, cyc, r + 22, 0, Math.PI * 2); g.stroke();
          g.fillStyle = '#2b3047'; g.beginPath(); g.arc(insetX, cyc, r, 0, Math.PI * 2); g.fill();
          litPath(g, insetX, cyc, r, p.angle);
          const vg = g.createRadialGradient(insetX - r * 0.3, cyc - r * 0.3, r * 0.1, insetX, cyc, r); vg.addColorStop(0, '#fffbe8'); vg.addColorStop(1, CREAM);
          g.fillStyle = vg; g.fill();
          maria(g, insetX, cyc, r, 0.34);
          if (ecl > 0) { g.fillStyle = `rgba(150,50,35,${0.85 * ecl})`; g.beginPath(); g.arc(insetX, cyc, r, 0, Math.PI * 2); g.fill(); }
          label('What we see', insetX, cyc + r + 62, v, col.data, 30); // label
          g.globalAlpha = 1;
        }
      },
    };
  },
});
