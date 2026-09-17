/**
 * SYMBOLIC DIFFERENTIATION ENGINE
 * Self-contained - no external imports to avoid conflicts
 */

function evaluateNum(node: any): number | null {
  if (node && node.kind === 'num') return node.value;
  return null;
}

export function diff(expr: any, wrt: string, order = 1): any {
  let result = diffOnce(expr, wrt);
  for (let i = 1; i < order; i++) {
    result = diffOnce(result, wrt);
  }
  return result;
}

function mk(kind: string, extra: object = {}) { return { kind, ...extra }; }

// ─── HELPER CONSTRUCTORS ────────────────────────────────────────
function N(val: number) { return mk('num', { value: val }); }
function Add(a: any, b: any) { return mk('binop', { op: '+', left: a, right: b }); }
function Sub(a: any, b: any) { return mk('binop', { op: '-', left: a, right: b }); }
function Mul(a: any, b: any) { return mk('binop', { op: '*', left: a, right: b }); }
function Div(a: any, b: any) { return mk('binop', { op: '/', left: a, right: b }); }
function Pow(a: any, b: any) { return mk('pow', { base: a, exp: b }); }
function Neg(a: any) { return mk('unary', { op: '-', operand: a }); }
function Fn(name: string, args: any[]) { return mk('func', { name, args }); }
function Sin(a: any) { return Fn('sin', [a]); }
function Cos(a: any) { return Fn('cos', [a]); }
function Cosh(a: any) { return Fn('cosh', [a]); }
function Sinh(a: any) { return Fn('sinh', [a]); }
function Tanh(a: any) { return Fn('tanh', [a]); }
function Ln(a: any) { return mk('log', { base: N(Math.E), arg: a }); }
function Exp(a: any) { return mk('exp', { arg: a }); }
function Sqrt(a: any) { return Pow(a, N(0.5)); }
function Abs(a: any) { return mk('abs', { arg: a }); }
function Gamma(a: any) { return mk('gamma', { arg: a }); }
function Polygamma(order: any, arg: any) { return mk('polygamma', { order, arg }); }
function ZetaPrime(a: any) { return Fn('zeta_prime', [a]); }
function Diff(wrt: string, e: any, order: number) { return mk('diff', { wrt, order, expr: e }); }
function Integral(v: string, lo: any, hi: any, e: any) { return mk('integral', { var: v, lower: lo, upper: hi, expr: e }); }
function Sum(v: string, lo: any, hi: any, e: any) { return mk('sum', { var: v, lower: lo, upper: hi, expr: e }); }
function Prod(v: string, lo: any, hi: any, e: any) { return mk('prod', { var: v, lower: lo, upper: hi, expr: e }); }
function Limit(v: string, t: any, e: any, dir = 'both') { return mk('limit', { var: v, target: t, dir, expr: e }); }
function Eq(l: any, r: any) { return mk('equation', { left: l, right: r }); }

function occurs(v: string, node: any): boolean {
  if (!node || typeof node !== 'object') return false;
  switch (node.kind) {
    case 'var': return node.name === v;
    case 'num': return false;
    case 'unary': return occurs(v, node.operand);
    case 'binop': return occurs(v, node.left) || occurs(v, node.right);
    case 'pow': return occurs(v, node.base) || occurs(v, node.exp);
    case 'log': return occurs(v, node.base) || occurs(v, node.arg);
    case 'func': return node.args?.some((a: any) => occurs(v, a)) ?? false;
    case 'abs': case 'exp': case 'gamma': case 'zeta': case 'erf': return occurs(v, node.arg);
    case 'factorial': return false;
    case 'diff': return occurs(v, node.expr);
    case 'integral': case 'sum': case 'prod': return v !== node.var && occurs(v, node.expr);
    case 'limit': return v !== node.var && occurs(v, node.expr);
    case 'equation': return occurs(v, node.left) || occurs(v, node.right);
    default: return false;
  }
}

function diffOnce(expr: any, wrt: string): any {
  if (!expr) return N(0);
  switch (expr.kind) {
    case 'num': return N(0);
    case 'var': return expr.name === wrt ? N(1) : N(0);
    case 'unary': {
      const d = diffOnce(expr.operand, wrt);
      return expr.op === '-' ? Neg(d) : d;
    }
    case 'binop': return diffBinop(expr, wrt);
    case 'pow': return diffPow(expr, wrt);
    case 'func': return diffFunc(expr, wrt);
    case 'log': return diffFunc(expr, wrt);
    case 'abs':
      return Mul(diffOnce(expr.arg, wrt), Div(expr.arg, Abs(expr.arg)));
    case 'factorial': return N(0);
    case 'gamma':
      return Mul(Mul(Gamma(expr.arg), Polygamma(N(0), expr.arg)), diffOnce(expr.arg, wrt));
    case 'zeta':
      return Mul(N(-1), Mul(ZetaPrime(expr.arg), diffOnce(expr.arg, wrt)));
    case 'erf': {
      const coeff = Mul(Div(N(2), Pow(N(Math.PI), N(2))), Exp(Neg(Pow(expr.arg, N(2)))));
      return Mul(coeff, diffOnce(expr.arg, wrt));
    }
    case 'exp':
      return Mul(Exp(expr.arg), diffOnce(expr.arg, wrt));
    case 'diff':
      return Diff(expr.wrt, diffOnce(expr.expr, wrt), expr.order + 1);
    case 'integral':
      return Integral(expr.var, expr.lower, expr.upper, diffOnce(expr.expr, wrt));
    case 'sum':
      return Sum(expr.var, expr.lower, expr.upper, diffOnce(expr.expr, wrt));
    case 'prod':
      return Prod(expr.var, expr.lower, expr.upper, diffOnce(expr.expr, wrt));
    case 'limit':
      return Limit(expr.var, expr.target, diffOnce(expr.expr, wrt), expr.dir);
    case 'equation':
      return Eq(diffOnce(expr.left, wrt), diffOnce(expr.right, wrt));
    default: return N(0);
  }
}

function diffBinop(expr: any, wrt: string): any {
  const dl = diffOnce(expr.left, wrt);
  const dr = diffOnce(expr.right, wrt);
  switch (expr.op) {
    case '+': return Add(dl, dr);
    case '-': return Sub(dl, dr);
    case '*': return Add(Mul(dl, expr.right), Mul(expr.left, dr));
    case '/': return Div(Sub(Mul(dl, expr.right), Mul(expr.left, dr)), Pow(expr.right, N(2)));
    default: return N(0);
  }
}

function diffPow(expr: any, wrt: string): any {
  const { base: b, exp: e } = expr;
  if (!occurs(wrt, b) && !occurs(wrt, e)) return N(0);

  if (!occurs(wrt, e)) {
    return Mul(Mul(e, Pow(b, Sub(e, N(1)))), diffOnce(b, wrt));
  }

  const logB = Ln(b);
  const term1 = Mul(diffOnce(e, wrt), logB);
  const term2 = Mul(e, Div(diffOnce(b, wrt), b));
  const base: any = b.kind === 'num' ? Exp(Mul(e, logB)) : Pow(b, e);
  return Mul(base, Add(term1, term2));
}

function diffFunc(expr: any, wrt: string): any {
  // Handle 'log' kind (not func kind)
  if (expr.kind === 'log') {
    const inner = expr.arg;
    const base = expr.base;
    const di = diffOnce(inner, wrt);
    const baseVal = evaluateNum(base);
    if (baseVal !== null) {
      if (Math.abs(baseVal - Math.E) < 1e-10) {
        return Div(di, inner);
      }
      return Div(di, Mul(inner, Ln(base)));
    }
    return Div(di, Mul(inner, Ln(base)));
  }

  const inner = expr.args[0];
  const di = diffOnce(inner, wrt);

  switch (expr.name) {
    case 'sin': return Mul(Cos(inner), di);
    case 'cos': return Neg(Mul(Sin(inner), di));
    case 'tan': return Mul(Div(N(1), Pow(Cos(inner), N(2))), di);
    case 'asin': return Mul(Div(N(1), Sqrt(Sub(N(1), Pow(inner, N(2))))), di);
    case 'acos': return Neg(Mul(Div(N(1), Sqrt(Sub(N(1), Pow(inner, N(2))))), di));
    case 'atan': return Mul(Div(N(1), Add(N(1), Pow(inner, N(2)))), di);
    case 'sinh': return Mul(Cosh(inner), di);
    case 'cosh': return Mul(Sinh(inner), di);
    case 'tanh': return Mul(Sub(N(1), Pow(Tanh(inner), N(2))), di);
    case 'ln': return Mul(Div(N(1), inner), di);
    case 'log': {
      const base = expr.args.length > 1 ? expr.args[1] : N(Math.E);
      return Mul(Div(di, Mul(inner, Ln(base))), di);
    }
    default: return Mul(Fn(`${expr.name}_prime`, []), di);
  }
}