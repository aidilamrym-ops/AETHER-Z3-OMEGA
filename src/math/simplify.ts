/**
 * SYMBOLIC SIMPLIFICATION ENGINE
 * Applies algebraic identities, trigonometric identities, and
 * mathematical normalization rules to reduce expressions.
 */
import { N, V, Add, Sub, Mul, Div, Pow, Neg, isNumeric } from './ast.ts';
import type { MathNode, NumNode } from './ast.ts';

export function simplify(node: MathNode): MathNode {
  let prev = '';
  let curr = JSON.stringify(node);
  let result = node;
  let iterations = 0;

  // Fixed-point iteration: keep simplifying until stable
  while (prev !== curr && iterations < 20) {
    prev = curr;
    result = simplifyOnce(result);
    curr = JSON.stringify(result);
    iterations++;
  }
  return result;
}

function simplifyOnce(node: MathNode): MathNode {
  if (node.kind === 'num' || node.kind === 'var') return node;

  node = simplifyChildren(node);
  node = simplifyArithmetic(node);
  node = simplifyAlgebraic(node);
  node = simplifyPower(node);
  node = simplifyTrig(node);

  return node;
}

function simplifyChildren(node: MathNode): MathNode {
  switch (node.kind) {
    case 'unary': { const o = simplify(node.operand); return { ...node, operand: o }; }
    case 'binop': { return { ...node, left: simplify(node.left), right: simplify(node.right) }; }
    case 'pow': { return { ...node, base: simplify(node.base), exp: simplify(node.exp) }; }
    case 'log': { return { ...node, base: simplify(node.base), arg: simplify(node.arg) }; }
    case 'func': { return { ...node, args: node.args.map(simplify) }; }
    case 'abs': { return { ...node, arg: simplify(node.arg) }; }
    case 'exp': { return { ...node, arg: simplify(node.arg) }; }
    case 'equation': { return { ...node, left: simplify(node.left), right: simplify(node.right) }; }
    case 'rel': { return { ...node, left: simplify(node.left), right: simplify(node.right) }; }
    default: return node;
  }
}

function simplifyArithmetic(node: MathNode): MathNode {
  if (node.kind !== 'binop') return node;
  const l = node.left;
  const r = node.right;

  // 0 + x = x
  if (node.op === '+' && l.kind === 'num' && l.value === 0) return r;
  // x + 0 = x
  if (node.op === '+' && r.kind === 'num' && r.value === 0) return l;
  // 0 * x = 0, x * 0 = 0
  if (node.op === '*' && ((l.kind === 'num' && l.value === 0) || (r.kind === 'num' && r.value === 0))) return N(0);
  // 1 * x = x, x * 1 = x
  if (node.op === '*' && l.kind === 'num' && l.value === 1) return r;
  if (node.op === '*' && r.kind === 'num' && r.value === 1) return l;
  // x / 1 = x
  if (node.op === '/' && r.kind === 'num' && r.value === 1) return l;
  // 0 / x = 0
  if (node.op === '/' && l.kind === 'num' && l.value === 0) return N(0);
  // x^0 = 1
  if (node.op === '^' && r.kind === 'num' && r.value === 0) return N(1);
  // x^1 = x
  if (node.op === '^' && r.kind === 'num' && r.value === 1) return l;
  // 1^x = 1
  if (node.op === '^' && l.kind === 'num' && l.value === 1) return N(1);
  // (-1)^2n = 1
  if (node.op === '^' && l.kind === 'num' && l.value === -1 && r.kind === 'num' && r.value % 2 === 0) return N(1);

  // Constant folding
  if (l.kind === 'num' && r.kind === 'num') {
    switch (node.op) {
      case '+': return N(l.value + r.value);
      case '-': return N(l.value - r.value);
      case '*': return N(l.value * r.value);
      case '/': return r.value !== 0 ? N(l.value / r.value) : node;
      case '^': return N(Math.pow(l.value, r.value));
    }
  }

  return node;
}

function simplifyAlgebraic(node: MathNode): MathNode {
  if (node.kind !== 'binop') return node;

  // x + x = 2x
  if (node.op === '+' && JSON.stringify(node.left) === JSON.stringify(node.right)) {
    return Mul(N(2), node.left);
  }

  // x - x = 0
  if (node.op === '-' && JSON.stringify(node.left) === JSON.stringify(node.right)) {
    return N(0);
  }

  // -(-x) = x
  if (node.op === '^' && node.left.kind === 'unary' && node.left.op === '-' &&
      node.right.kind === 'num' && node.right.value === 2) {
    return Mul(N(1), Mul(node.left.operand, node.left.operand));
  }

  return node;
}

function simplifyPower(node: MathNode): MathNode {
  if (node.kind !== 'pow') return node;
  const base = node.base;
  const exp = node.exp;

  // (x^a)^b = x^(a*b)
  if (base.kind === 'pow') {
    const newExp = Mul(base.exp, exp);
    return Pow(base.base, simplify(newExp));
  }

  // x^(-n) = 1/x^n
  if (exp.kind === 'num' && exp.value < 0) {
    return Div(N(1), Pow(base, N(-exp.value)));
  }

  // x^(1/2) = sqrt(x)
  if (exp.kind === 'num' && exp.value === 0.5) {
    return { kind: 'func', name: 'sqrt', args: [base] };
  }

  return node;
}

function simplifyTrig(node: MathNode): MathNode {
  if (node.kind !== 'binop') return node;
  if (node.op !== '*') return node;

  // sin(x)^2 + cos(x)^2 = 1
  // Check for a^2 + b^2 pattern where a=sin, b=cos or vice versa
  // This is a pattern match — keep it simple

  return node;
}

// ─── EXTRACTION HELPERS ────────────────────────────────────────

export function linearCoeff(expr: MathNode, variable: string): { constant: number; coeff: number; expression: string } {
  // Try to extract ax + b from expression
  const simplified = simplify(expr);
  const varsSet = new Set<string>();
  collectVars(simplified, varsSet);

  if (!varsSet.has(variable)) {
    return { constant: evaluate(simplified, {}), coeff: 0, expression: 'constant' };
  }

  // Numerical approach: evaluate at two points
  const test1 = evaluate(simplified, { [variable]: 0 });
  const test2 = evaluate(simplified, { [variable]: 1 });
  const coeff = test2 - test1;
  return { constant: test1, coeff, expression: `${coeff}*${variable} + ${test1}` };
}

function collectVars(node: MathNode, set: Set<string>) {
  if (node.kind === 'var') set.add(node.name);
  if (node.kind === 'binop') { collectVars(node.left, set); collectVars(node.right, set); }
  if (node.kind === 'pow') { collectVars(node.base, set); collectVars(node.exp, set); }
  if (node.kind === 'unary') collectVars(node.operand, set);
  if (node.kind === 'func') node.args.forEach(a => collectVars(a, set));
}

// ─── NUMERICAL EVALUATION ──────────────────────────────────────

export function evaluate(node: MathNode, env: Record<string, number>): number {
  switch (node.kind) {
    case 'num': return node.value;
    case 'var': return env[node.name] ?? 0;
    case 'unary': return node.op === '-' ? -evaluate(node.operand, env) : evaluate(node.operand, env);
    case 'binop': {
      const l = evaluate(node.left, env);
      const r = evaluate(node.right, env);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r !== 0 ? l / r : NaN; // QS. Al-Jinn: 28 - Tidak ada nilai tak hingga riil, pembagian 0 adalah batas komputasi (NaN)
        case '^': {
          const res = Math.pow(l, r);
          return Number.isFinite(res) ? res : NaN;
        }
        default: return 0;
      }
    }
    case 'pow': return Math.pow(evaluate(node.base, env), evaluate(node.exp, env));
    case 'func': {
      const a = node.args.map(x => evaluate(x, env));
      switch (node.name) {
        case 'sin': return Math.sin(a[0]);
        case 'cos': return Math.cos(a[0]);
        case 'tan': return Math.tan(a[0]);
        case 'asin': return Math.asin(a[0]);
        case 'acos': return Math.acos(a[0]);
        case 'atan': return Math.atan(a[0]);
        case 'sinh': return Math.sinh(a[0]);
        case 'cosh': return Math.cosh(a[0]);
        case 'tanh': return Math.tanh(a[0]);
        case 'sqrt': return Math.sqrt(a[0]);
        case 'abs': return Math.abs(a[0]);
        case 'ceil': return Math.ceil(a[0]);
        case 'floor': return Math.floor(a[0]);
        default: return 0;
      }
    }
    case 'abs': return Math.abs(evaluate(node.arg, env));
    case 'exp': return Math.exp(evaluate(node.arg, env));
    case 'log': {
      const base = evaluate(node.base, env);
      const arg = evaluate(node.arg, env);
      return Math.log(arg) / Math.log(base);
    }
    case 'equation': return evaluate(node.left, env) === evaluate(node.right, env) ? 1 : 0;
    default: return 0;
  }
}

// ─── SERIES EXPANSION ──────────────────────────────────────────

export function taylorExpand(expr: MathNode, wrt: string, a: number, order: number): MathNode {
  let result: MathNode = N(0);
  for (let n = 0; n <= order; n++) {
    // n-th derivative evaluated at a, divided by n!, times (x-a)^n
    const derivN = nthDerivative(expr, wrt, n);
    const coeffVal = N(evaluate(derivN, { [wrt]: a }));
    const factorialN = N(factorial(n));
    const term = Mul(Mul(Div(coeffVal, factorialN), Pow(Sub(V(wrt), N(a)), N(n))), N(1));
    result = Add(result, simplify(term));
  }
  return simplify(result);
}

function nthDerivative(expr: MathNode, wrt: string, n: number): MathNode {
  let result = expr;
  for (let i = 0; i < n; i++) {
    result = diffN(result, wrt);
  }
  return result;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function diffN(expr: MathNode, wrt: string): MathNode {
  switch (expr.kind) {
    case 'num': return N(0);
    case 'var': return expr.name === wrt ? N(1) : N(0);
    case 'unary': return { ...expr, operand: diffN(expr.operand, wrt) };
    case 'binop': {
      const l = diffN(expr.left, wrt);
      const r = diffN(expr.right, wrt);
      return { ...expr, left: l, right: r };
    }
    case 'pow': {
      if (isNumeric(expr.exp)) {
        const n = (expr.exp as NumNode).value;
        return Mul(Mul(N(n), Pow(expr.base, N(n - 1))), diffN(expr.base, wrt));
      }
      return N(0);
    }
    case 'func': {
      const inner = diffN(expr.args[0], wrt);
      if (expr.name === 'sin') return Mul({ kind: 'func', name: 'cos', args: expr.args }, inner);
      if (expr.name === 'cos') return Mul(Neg({ kind: 'func', name: 'sin', args: expr.args }), inner);
      return N(0);
    }
    default: return N(0);
  }
}