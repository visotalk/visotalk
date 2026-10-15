/**
 * Safe expressions for IR values (`{$expr: "x * y"}`): numbers, strings, identifiers, + - * / %, unary -,
 * comparisons, ternary, parentheses and a fixed function set. No property access, no calls outside the set.
 */
export type Scope = Record<string, number | string | boolean>;

const FUNCS: Record<string, (...a: never[]) => number | string> = {
  abs: (x: number) => Math.abs(x),
  min: (...a: number[]) => Math.min(...a),
  max: (...a: number[]) => Math.max(...a),
  clamp: (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x)),
  round: (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  floor: (x: number) => Math.floor(x),
  ceil: (x: number) => Math.ceil(x),
  pow: (x: number, y: number) => x ** y,
  sqrt: (x: number) => Math.sqrt(x),
  exp: (x: number) => Math.exp(x),
  log: (x: number) => Math.log(x),
  tanh: (x: number) => Math.tanh(x),
  /** fmt(v, "0.00") → fixed decimals from the pattern */
  fmt: (x: number, pattern = '0.00') => {
    const d = (pattern.split('.')[1] ?? '').length;
    return x.toFixed(d);
  },
};

type Node =
  | {k: 'num'; v: number}
  | {k: 'str'; v: string}
  | {k: 'id'; name: string}
  | {k: 'un'; op: string; a: Node}
  | {k: 'bin'; op: string; a: Node; b: Node}
  | {k: 'tern'; c: Node; a: Node; b: Node}
  | {k: 'call'; fn: string; args: Node[]};

export class ExprError extends Error {}

function tokenize(src: string): string[] {
  const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|"[^"]*"|'[^']*'|==|!=|<=|>=|&&|\|\||[-+*/%(),?:<>!])/gy;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  let pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    m = re.exec(src);
    if (!m) {
      if (/^\s*$/.test(src.slice(pos))) break;
      throw new ExprError(`unexpected character at ${pos}: "${src.slice(pos, pos + 8)}"`);
    }
    out.push(m[1]);
    pos = re.lastIndex;
  }
  return out;
}

const PREC: Record<string, number> = {'||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6};

export function parse(src: string): Node {
  const t = tokenize(src);
  let i = 0;
  const peek = () => t[i];
  const next = () => t[i++];
  const expect = (s: string) => {
    if (next() !== s) throw new ExprError(`expected "${s}" in "${src}"`);
  };
  const primary = (): Node => {
    const tok = next();
    if (tok === undefined) throw new ExprError(`unexpected end of "${src}"`);
    if (tok === '(') {
      const e = expr();
      expect(')');
      return e;
    }
    if (tok === '-' || tok === '!') return {k: 'un', op: tok, a: primary()};
    if (/^[\d.]/.test(tok)) return {k: 'num', v: Number(tok)};
    if (/^["']/.test(tok)) return {k: 'str', v: tok.slice(1, -1)};
    if (/^[A-Za-z_]/.test(tok)) {
      if (peek() === '(') {
        next();
        if (!(tok in FUNCS)) throw new ExprError(`unknown function "${tok}"`);
        const args: Node[] = [];
        if (peek() !== ')') {
          do args.push(expr());
          while (peek() === ',' && next());
        }
        expect(')');
        return {k: 'call', fn: tok, args};
      }
      return {k: 'id', name: tok};
    }
    throw new ExprError(`unexpected "${tok}" in "${src}"`);
  };
  const binary = (min: number): Node => {
    let left = primary();
    while (peek() !== undefined && PREC[peek()] >= min) {
      const op = next();
      left = {k: 'bin', op, a: left, b: binary(PREC[op] + 1)};
    }
    return left;
  };
  const expr = (): Node => {
    const c = binary(1);
    if (peek() === '?') {
      next();
      const a = expr();
      expect(':');
      return {k: 'tern', c, a, b: expr()};
    }
    return c;
  };
  const e = expr();
  if (i < t.length) throw new ExprError(`unexpected "${t[i]}" in "${src}"`);
  return e;
}

/** Identifiers an expression reads (for validation: must be declared params or allowed names) */
export function identifiers(src: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node): void => {
    if (n.k === 'id') out.add(n.name);
    else if (n.k === 'un') walk(n.a);
    else if (n.k === 'bin') (walk(n.a), walk(n.b));
    else if (n.k === 'tern') (walk(n.c), walk(n.a), walk(n.b));
    else if (n.k === 'call') n.args.forEach(walk);
  };
  walk(parse(src));
  return [...out];
}

const cache = new Map<string, Node>();

export function evaluate(src: string, scope: Scope): number | string | boolean {
  let n = cache.get(src);
  if (!n) cache.set(src, (n = parse(src)));
  const ev = (n: Node): number | string | boolean => {
    switch (n.k) {
      case 'num': return n.v;
      case 'str': return n.v;
      case 'id':
        if (!(n.name in scope)) throw new ExprError(`unknown name "${n.name}"`);
        return scope[n.name];
      case 'un': return n.op === '-' ? -(ev(n.a) as number) : !ev(n.a);
      case 'tern': return ev(n.c) ? ev(n.a) : ev(n.b);
      case 'call': return (FUNCS[n.fn] as (...a: unknown[]) => number | string)(...n.args.map(ev));
      case 'bin': {
        const a = ev(n.a) as number, b = ev(n.b) as number;
        switch (n.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '%': return a % b;
          case '<': return a < b;
          case '>': return a > b;
          case '<=': return a <= b;
          case '>=': return a >= b;
          case '==': return a === b;
          case '!=': return a !== b;
          case '&&': return a && b;
          case '||': return a || b;
        }
      }
    }
    throw new ExprError('bad node');
  };
  return ev(n);
}

export const isExpr = (v: unknown): v is {$expr: string} => !!v && typeof v === 'object' && '$expr' in (v as object);

/** Resolve a Value<T> against a scope */
export const resolveValue = <T>(v: T | {$expr: string}, scope: Scope): T | number | string | boolean =>
  isExpr(v) ? evaluate(v.$expr, scope) : v;
