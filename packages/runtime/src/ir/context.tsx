/** Shared state for IR rendering: document, compiled timeline, params, live/export mode. */
import React, {createContext, useContext, useSyncExternalStore} from 'react';
import {viewOwn, type Compiled, type ParamDef, type PathView, type Scope, type VisoDoc} from '@visotalk/ir';
import {useDocTime} from '../react';
import type {TimedComponent} from '../timed';

export class ParamStore {
  private values: Scope;
  private listeners = new Set<() => void>();
  constructor(readonly defs: Record<string, ParamDef>) {
    this.values = Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, d.default]));
  }
  subscribe = (fn: () => void) => (this.listeners.add(fn), () => void this.listeners.delete(fn));
  get = () => this.values;
  set(name: string, v: number | string | boolean) {
    const d = this.defs[name];
    if (d?.type === 'number' && typeof v === 'number') {
      const step = d.step ?? 0;
      let x = Math.min(d.max ?? Infinity, Math.max(d.min ?? -Infinity, v));
      if (step) x = Math.round(x / step) * step;
      v = +x.toFixed(6);
    }
    if (this.values[name] === v) return;
    this.values = {...this.values, [name]: v};
    this.listeners.forEach((f) => f());
  }
  reset() {
    for (const [k, d] of Object.entries(this.defs)) this.set(k, d.default);
  }
}

export interface IRContext {
  doc: VisoDoc;
  c: Compiled;
  params: ParamStore;
  /** live player: interactions active; export: params at defaults, export policies applied */
  live: boolean;
  /** canvas preset in use */
  preset: string;
  /** asset id → URL */
  assetUrl: (id: string) => string;
  /** L2 components by `components` id */
  components: Record<string, TimedComponent<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const Ctx = createContext<IRContext | null>(null);
export const IRProvider: React.FC<IRContext & {children: React.ReactNode}> = ({children, ...v}) => <Ctx.Provider value={v}>{children}</Ctx.Provider>;
export const useIR = (): IRContext => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useIR outside IRProvider');
  return c;
};
export const useScope = (): Scope => {
  const {params} = useIR();
  return useSyncExternalStore(params.subscribe, params.get);
};
/** Presence and motion state of an IR path at the current document time */
export const usePathView = (path: string): PathView & {t: number} => {
  const {c} = useIR();
  const t = useDocTime();
  return {...viewOwn(c, path, t), t};
};

/** Number formatting by pattern: "0", "0.00", "+0.0", "0%", "0,0" */
export function formatValue(v: unknown, format?: string): string {
  if (typeof v !== 'number') return String(v);
  const f = format ?? (Number.isInteger(v) ? '0' : '0.00');
  const pct = f.endsWith('%');
  const sign = f.startsWith('+');
  const core = f.replace(/[+%]/g, '');
  const decimals = (core.split('.')[1] ?? '').length;
  const n = pct ? v * 100 : v;
  let s = n.toFixed(decimals);
  if (core.includes(',')) s = Number(s).toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  if (sign && n >= 0) s = `+${s}`;
  return pct ? `${s}%` : s;
}
