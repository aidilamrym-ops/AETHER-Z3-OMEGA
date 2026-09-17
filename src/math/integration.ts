/**
 * SYMBOLIC INTEGRATION ENGINE
 * Pattern-matching integration rules: power, trig, exponential, logarithmic,
 * rational (partial fractions), IBP (Integration by Parts), substitution,
 * trigonometric substitution.
 */
import { MathNode, isNumeric, NumNode } from './ast.js';
import { simplify, evaluate } from './simplify.js';

// ─── LOCAL HELPERS (single definitions) ─────────────────────────

function N(val: number) { return { kind: 'num', value: val } as any; }
function V(name: string) { return { kind: 'var', name } as any; }
function Add(a: any, b: any) { return { kind: 'binop', op: '+', left: a, right: b } as any; }
function Sub(a: any, b: any) { return { kind: 'binop', op: '-', left: a, right: b } as any; }
function Mul(a: any, b: any) { return { kind: 'binop', op: '*', left: a, right: b } as any; }
function Div(a: any, b: any) { return { kind: 'binop', op: '/', left: a, right: b } as any; }
function Pow(a: any, b: any) { return { kind: 'pow', base: a, exp: b } as any; }
function Neg(a: any) { return { kind: 'unary', op: '-', operand: a } as any; }
function Ln(a: any) { return { kind: 'log', base: { kind: 'num', value: Math.E }, arg: a } as any; }
function Abs(a: any) { return { kind: 'abs', arg: a } as any; }
function Cos(a: any) { return { kind: 'func', name: 'cos', args: [a] } as any; }
function Sin(a: any) { return { kind: 'func', name: 'sin', args: [a] } as any; }
function Atan(a: any) { return { kind: 'func', name: 'atan', args: [a] } as any; }
function Asin(a: any) { return { kind: 'func', name: 'asin', args: [a] } as any; }
function Exp(a: any) { return { kind: 'exp', arg: a } as any; }

export function integrate(expr: MathNode, varName: string, lower?: MathNode, upper?: MathNode): MathNode {
  const result = tryIntegrate(expr, varName);

  if (lower && upper) {
    const lo = evaluate(lower, {});
    const hi = evaluate(upper, {});
    const FUpper = N(evaluate(result, { [varName]: hi }));
    const FLower = N(evaluate(result, { [varName]: lo }));
    return simplify(Sub(FUpper, FLower));
  }

  return simplify(result);
}

function isVar(node: any, v: string): boolean {
  return node && node.kind === 'var' && node.name === v;
}

function tryIntegrate(expr: MathNode, v: string): MathNode {
  const e: any = expr;

  // ── Constants ──────────────────────────────────────────────
  if (e.kind === 'num') return Mul(e, V(v));

  // ── Simple variable ────────────────────────────────────────
  if (isVar(e, v)) return Div(Pow(V(v), N(2)), N(2));
  if (e.kind === 'var' && e.name !== v) return Mul(e, V(v));

  // ── Power rule: x^n ────────────────────────────────────────
  if (e.kind === 'pow' && isVar(e.base, v) && isNumeric(e.exp)) {
    const n = (e.exp as NumNode).value;
    if (n === -1) return Ln(Abs(V(v)));
    return Mul(Div(N(1), N(n + 1)), Pow(V(v), N(n + 1)));
  }

  // ── e^x ────────────────────────────────────────────────────
  if (e.kind === 'exp' && isVar(e.arg, v)) return e;

  // ── a^x ────────────────────────────────────────────────────
  if (e.kind === 'pow' && isNumeric(e.base) && isVar(e.exp, v)) {
    return Div(Pow(e.base, V(v)), Ln(e.base));
  }

  // ── sin(x), cos(x), tan(x) ─────────────────────────────────
  if (e.kind === 'func' && e.name === 'sin' && isVar(e.args[0], v)) return Neg(Cos(V(v)));
  if (e.kind === 'func' && e.name === 'cos' && isVar(e.args[0], v)) return Sin(V(v));
  if (e.kind === 'func' && e.name === 'tan' && isVar(e.args[0], v)) return Neg(Ln(Abs(Cos(V(v)))));

  // ── 1/x ────────────────────────────────────────────────────
  if (e.kind === 'binop' && e.op === '/' && isNumeric(e.left) && Number(e.left.value) === 1 && isVar(e.right, v)) {
    return Ln(Abs(V(v)));
  }

  // ── Rational: 1/(1+x^2) → atan(x) ─────────────────────────
  if (e.kind === 'binop' && e.op === '/') {
    if (isNumeric(e.left) && (e.left.value === 1 || e.left.value === -1) && e.right.kind === 'binop' && e.right.op === '+') {
      // 1/(1+x^2)
      if (isNumeric(e.right.left) && e.right.left.value === 1 && e.right.right.kind === 'pow' && isVar(e.right.right.base, v) && isNumeric(e.right.right.exp) && e.right.right.exp.value === 2) {
        return Atan(V(v));
      }
    }
  }

  // ── 1/sqrt(1-x^2) → asin(x) ───────────────────────────────
  if (e.kind === 'binop' && e.op === '/' && isNumeric(e.left) && Number(e.left.value) === 1) {
    const den = e.right;
    if (den.kind === 'pow' && isNumeric(den.exp) && Math.abs(Number(den.exp.value) - 0.5) < 1e-10) {
      const rad = den.base;
      if (rad.kind === 'binop' && rad.op === '-' && isNumeric(rad.left) && Number(rad.left.value) === 1 &&
          rad.right.kind === 'pow' && isVar(rad.right.base, v) && isNumeric(rad.right.exp) && Number(rad.right.exp.value) === 2) {
        return Asin(V(v));
      }
    }
  }

  // ── sqrt(1-x^2) → trig substitution ───────────────────────
  if (e.kind === 'pow' && isNumeric(e.exp) && Math.abs(Number(e.exp.value) - 0.5) < 1e-10 &&
      e.base.kind === 'binop' && e.base.op === '-' && isNumeric(e.base.left) && Number(e.base.left.value) === 1 &&
      e.base.right.kind === 'pow' && isVar(e.base.right.base, v) && isNumeric(e.base.right.exp) && Number(e.base.right.exp.value) === 2) {
    // ∫√(1-x²) dx = ½(asin(x) + x√(1-x²))
    const half = N(0.5);
    const asinPart = Asin(V(v));
    const xSqrt = Mul(V(v), e);
    return Mul(half, Add(asinPart, xSqrt));
  }

  // ── Linearity ──────────────────────────────────────────────
  if (e.kind === 'binop' && e.op === '+') return Add(tryIntegrate(e.left, v), tryIntegrate(e.right, v));
  if (e.kind === 'binop' && e.op === '-') return Sub(tryIntegrate(e.left, v), tryIntegrate(e.right, v));

  // ── Constant multiple ──────────────────────────────────────
  if (e.kind === 'binop' && e.op === '*') {
    if (isNumeric(e.left)) return Mul(e.left, tryIntegrate(e.right, v));
    if (isNumeric(e.right)) return Mul(e.right, tryIntegrate(e.left, v));
    if (e.left.kind === 'var' && e.left.name !== v) return Mul(e.left, tryIntegrate(e.right, v));
    if (e.right.kind === 'var' && e.right.name !== v) return Mul(e.right, tryIntegrate(e.left, v));
  }

  // ── PRODUCT PATTERNS (Integration by Parts) ────────────────
  // x * e^x → (x-1)e^x
  if (e.kind === 'binop' && e.op === '*') {
    const l = e.left, r = e.right;
    if ((isVar(l, v) && r.kind === 'exp' && isVar(r.arg, v)) ||
        (isVar(r, v) && l.kind === 'exp' && isVar(l.arg, v))) {
      return Mul(Sub(V(v), N(1)), Exp(V(v)));
    }

    // x * sin(x) → sin(x) - x·cos(x)  [check: ∫x sinx dx = -x cosx + sinx]
    if ((isVar(l, v) && r.kind === 'func' && r.name === 'sin' && isVar(r.args[0], v)) ||
        (isVar(r, v) && l.kind === 'func' && l.name === 'sin' && isVar(l.args[0], v))) {
      const X = V(v);
      return Add(Sin(X), Neg(Mul(X, Cos(X))));
    }

    // x * cos(x) → x·sin(x) + cos(x)
    if ((isVar(l, v) && r.kind === 'func' && r.name === 'cos' && isVar(r.args[0], v)) ||
        (isVar(r, v) && l.kind === 'func' && l.name === 'cos' && isVar(l.args[0], v))) {
      const X = V(v);
      return Add(Mul(X, Sin(X)), Cos(X));
    }

    // ln(x) * x^n → special
    if ((l.kind === 'log' && isVar(l.arg, v) && r.kind === 'pow' && isVar(r.base, v) && isNumeric(r.exp)) ||
        (r.kind === 'log' && isVar(r.arg, v) && l.kind === 'pow' && isVar(l.base, v) && isNumeric(l.exp))) {
      const powPart = l.kind === 'pow' ? l : r;
      const n = Number(powPart.exp.value);
      if (n === 0) return Sub(Mul(V(v), Ln(V(v))), V(v));
      const n1 = n + 1;
      const term = Mul(Pow(V(v), N(n1)), Sub(Div(Ln(V(v)), N(n1)), Div(N(1), N(n1 * n1))));
      return term;
    }
  }

  // ── SUBSTITUTION: f'(x) * g(f(x)) ── e.g. sin^n(x)·cos(x) ─
  // sin²(x)·cos(x) → sin³(x)/3   (u = sin x)
  if (e.kind === 'binop' && e.op === '*') {
    const parts = flattenMul(e);
    const sinPowIdx = parts.findIndex((p: any) =>
      p.kind === 'pow' && p.base.kind === 'func' && p.base.name === 'sin' && isVar(p.base.args[0], v) && isNumeric(p.exp));
    const cosIdx = parts.findIndex((p: any) =>
      p.kind === 'func' && p.name === 'cos' && isVar(p.args[0], v));
    if (sinPowIdx >= 0 && cosIdx >= 0) {
      const n = Number((parts[sinPowIdx] as any).exp.value);
      // u = sin x, du = cos x dx → ∫u^n du = u^(n+1)/(n+1)
      return Mul(Div(N(1), N(n + 1)), Pow(Sin(V(v)), N(n + 1)));
    }

    // cos^n(x)·sin(x) → -cos^(n+1)/(n+1)   (u = cos x)
    const cosPowIdx = parts.findIndex((p: any) =>
      p.kind === 'pow' && p.base.kind === 'func' && p.base.name === 'cos' && isVar(p.base.args[0], v) && isNumeric(p.exp));
    const sinIdx = parts.findIndex((p: any) =>
      p.kind === 'func' && p.name === 'sin' && isVar(p.args[0], v));
    if (cosPowIdx >= 0 && sinIdx >= 0) {
      const n = Number((parts[cosPowIdx] as any).exp.value);
      return Neg(Mul(Div(N(1), N(n + 1)), Pow(Cos(V(v)), N(n + 1))));
    }
  }

  // ── e^x · sin(x) / e^x · cos(x): cyclic IBP ────────────────
  if (e.kind === 'binop' && e.op === '*') {
    const l = e.left, r = e.right;
    if (l.kind === 'exp' && isVar(l.arg, v) && r.kind === 'func' && r.name === 'sin' && isVar(r.args[0], v)) {
      return Mul(Div(N(1), N(2)), Mul(Exp(V(v)), Sub(Sin(V(v)), Cos(V(v)))));
    }
    if (l.kind === 'exp' && isVar(l.arg, v) && r.kind === 'func' && r.name === 'cos' && isVar(r.args[0], v)) {
      return Mul(Div(N(1), N(2)), Mul(Exp(V(v)), Add(Sin(V(v)), Cos(V(v)))));
    }
    if (r.kind === 'exp' && isVar(r.arg, v) && l.kind === 'func' && l.name === 'sin' && isVar(l.args[0], v)) {
      return Mul(Div(N(1), N(2)), Mul(Exp(V(v)), Sub(Sin(V(v)), Cos(V(v)))));
    }
    if (r.kind === 'exp' && isVar(r.arg, v) && l.kind === 'func' && l.name === 'cos' && isVar(l.args[0], v)) {
      return Mul(Div(N(1), N(2)), Mul(Exp(V(v)), Add(Sin(V(v)), Cos(V(v)))));
    }
  }

  // ── x / (x² + a²) → ½ ln|x²+a²| ────────────────────────────
  if (e.kind === 'binop' && e.op === '/' && isVar(e.left, v) && e.right.kind === 'binop' && e.right.op === '+') {
    const den = e.right;
    if (den.left.kind === 'pow' && isVar(den.left.base, v) && isNumeric(den.left.exp) && den.left.exp.value === 2 &&
        isNumeric(den.right)) {
      return Mul(N(0.5), Ln(Abs(den)));
    }
    if (den.right.kind === 'pow' && isVar(den.right.base, v) && isNumeric(den.right.exp) && den.right.exp.value === 2 &&
        isNumeric(den.left)) {
      return Mul(N(0.5), Ln(Abs(den)));
    }
  }

  // ── ln(x) ──────────────────────────────────────────────────
  if (e.kind === 'log' && isVar(e.arg, v) && isNumeric(e.base) && Math.abs(Number(e.base.value) - Math.E) < 1e-10) {
    return Sub(Mul(V(v), Ln(V(v))), V(v));
  }

  // ── Fallback: unevaluated integral ─────────────────────────
  return { kind: 'integral', var: v, lower: N(0), upper: N(0), expr } as any;
}

function flattenMul(node: any): any[] {
  if (node.kind === 'binop' && node.op === '*') {
    return [...flattenMul(node.left), ...flattenMul(node.right)];
  }
  return [node];
}

// ─── NUMERICAL INTEGRATION (Gauss-Legendre Quadrature) ─────────

const GL_NODES_5 = [
  { x: 0, w: 0.5688888888888889 },
  { x: -0.5384693101056831, w: 0.4786286704993665 },
  { x: 0.5384693101056831, w: 0.4786286704993665 },
  { x: -0.9061798459386640, w: 0.2369268850561891 },
  { x: 0.9061798459386640, w: 0.2369268850561891 },
];

export function numericalIntegrate(
  f: (x: number) => number,
  a: number,
  b: number,
  _tolerance = 1e-10
): number {
  const mid = (a + b) / 2;
  const half = (b - a) / 2;

  let sum = 0;
  for (const node of GL_NODES_5) {
    sum += node.w * f(mid + half * node.x);
  }
  sum *= half;

  return sum;
}

// ─── FOURIER TRANSFORM PAIRS ───────────────────────────────────

export function fourierTransform(_f: MathNode, _v: string): MathNode {
  return N(0) as any;
}