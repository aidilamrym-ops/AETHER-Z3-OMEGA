/**
 * SERIES EXPANSION ENGINE
 * Taylor, Laurent, Fourier, asymptotic, binomial expansions.
 */
import { MathNode, N, V, Add, Sub, Mul, Div, Pow } from './ast.js';
import { evaluate } from './simplify.js';
import { diff } from './differentiation.js';

// ─── TAYLOR SERIES ─────────────────────────────────────────────

export function taylorExpand(
  expr: MathNode,
  variable: string,
  center: number,
  order: number
): MathNode {
  let result: MathNode = N(0);

  for (let k = 0; k <= order; k++) {
    // f^(k)(center) / k! * (x - center)^k
    const derivK = nthDerivative(expr, variable, k);
    const coeffValue = evaluate(derivK, { [variable]: center });
    const kFact = factorial(k);
    const coeff = N(coeffValue / kFact);
    const power = Pow(Sub(V(variable), N(center)), N(k));
    result = Add(result, Mul(coeff, power));
  }

  return result;
}

// ─── MACLAURIN SERIES (special case: center = 0) ───────────────

export function maclaurinExpand(expr: MathNode, variable: string, order: number): MathNode {
  return taylorExpand(expr, variable, 0, order);
}

// ─── LAURENT SERIES ────────────────────────────────────────────

export function laurentExpand(
  expr: MathNode,
  variable: string,
  center: number,
  negativeOrder: number,
  positiveOrder: number
): MathNode {
  let result: MathNode = N(0);

  // Negative powers
  for (let k = negativeOrder; k < 0; k++) {
    const residue = Div(deriveResidue(expr, variable, center, k), N(k));
    result = Add(result, Mul(residue, Pow(Sub(V(variable), N(center)), N(k))));
  }

  // Non-negative powers (Taylor part)
  for (let k = 0; k <= positiveOrder; k++) {
    const derivK = nthDerivative(expr, variable, k);
    const coeffValue = evaluate(derivK, { [variable]: center });
    const kFact = factorial(k);
    const coeff = N(coeffValue / kFact);
    result = Add(result, Mul(coeff, Pow(Sub(V(variable), N(center)), N(k))));
  }

  return result;
}

function deriveResidue(expr: MathNode, variable: string, center: number, k: number): MathNode {
  // Residue computation for Laurent series
  const derivK = nthDerivative(expr, variable, -k - 1);
  const coeffValue = evaluate(derivK, { [variable]: center });
  return N(coeffValue);
}

// ─── FOURIER SERIES ────────────────────────────────────────────

export interface FourierCoefficients {
  a0: number;
  an: number[];
  bn: number[];
  period: number;
}

export function computeFourierCoefficients(
  f: (x: number) => number,
  period: number,
  numTerms: number
): FourierCoefficients {
  const T = period;
  const omega = (2 * Math.PI) / T;

  // a0 = (2/T) ∫_{-T/2}^{T/2} f(x) dx
  const a0 = (2 / T) * numericalIntegrate(f, -T / 2, T / 2);

  const an: number[] = [];
  const bn: number[] = [];

  for (let k = 1; k <= numTerms; k++) {
    // an = (2/T) ∫_{-T/2}^{T/2} f(x) cos(kωx) dx
    const ak = (2 / T) * numericalIntegrate(
      (x) => f(x) * Math.cos(k * omega * x),
      -T / 2,
      T / 2
    );
    an.push(ak);

    // bn = (2/T) ∫_{-T/2}^{T/2} f(x) sin(kωx) dx
    const bk = (2 / T) * numericalIntegrate(
      (x) => f(x) * Math.sin(k * omega * x),
      -T / 2,
      T / 2
    );
    bn.push(bk);
  }

  return { a0, an, bn, period: T };
}

export function evaluateFourierSeries(
  coeffs: FourierCoefficients,
  x: number,
  numTerms?: number
): number {
  const terms = numTerms ?? coeffs.an.length;
  const omega = (2 * Math.PI) / coeffs.period;
  let result = coeffs.a0 / 2;

  for (let k = 0; k < terms; k++) {
    result += coeffs.an[k] * Math.cos((k + 1) * omega * x);
    result += coeffs.bn[k] * Math.sin((k + 1) * omega * x);
  }

  return result;
}

// ─── BINOMIAL EXPANSION ────────────────────────────────────────

export function binomialExpand(
  base: MathNode,
  exponent: number,
  order: number
): MathNode {
  let result: MathNode = N(0);

  for (let k = 0; k <= order; k++) {
    const coeff = binomialCoeff(exponent, k);
    const power = Pow(base, N(k));
    result = Add(result, Mul(N(coeff), power));
  }

  return result;
}

// ─── ASYMPTOTIC EXPANSION ──────────────────────────────────────

export function asymptoticExpansion(
  expr: MathNode,
  variable: string,
  infinity: 'inf' | 'ninf',
  order: number
): MathNode {
  // For large x, compute f(x)/x^k for k = 0, 1, 2, ... to find leading behavior
  let result: MathNode = N(0);

  for (let k = order; k >= 0; k--) {
    // Multiply by x^k, then extract the limit
    const scaled = Mul(expr, Pow(V(variable), N(-k)));
    const limitVal = evaluateAsLimit(scaled, variable, infinity);
    if (Math.abs(limitVal) > 1e-12) {
      result = Add(result, Mul(N(limitVal), Pow(V(variable), N(-k))));
    }
  }

  return result;
}

function evaluateAsLimit(expr: MathNode, variable: string, infinity: 'inf' | 'ninf'): number {
  // Numerical limit: evaluate at very large or very small values
  const testPoint = infinity === 'inf' ? 1e10 : -1e10;
  return evaluate(expr, { [variable]: testPoint });
}

// ─── SERIES EVALUATION ─────────────────────────────────────────

export function evaluateTaylor(expr: MathNode, variable: string, center: number, order: number, x: number): number {
  let result = 0;

  for (let k = 0; k <= order; k++) {
    const derivK = nthDerivative(expr, variable, k);
    const coeffValue = evaluate(derivK, { [variable]: center });
    const kFact = factorial(k);
    result += (coeffValue / kFact) * Math.pow(x - center, k);
  }

  return result;
}

// ─── KNOWN SERIES ──────────────────────────────────────────────

export const KNOWN_SERIES: Array<{
  name: string;
  function: string;
  series: string;
  convergence: string;
  terms: (x: number, n: number) => number;
}> = [
  {
    name: 'Exponential',
    function: 'e^x',
    series: 'Σ x^n/n! = 1 + x + x²/2! + x³/3! + ...',
    convergence: 'All x ∈ ℝ',
    terms: (x, n) => Math.pow(x, n) / factorial(n),
  },
  {
    name: 'Sine',
    function: 'sin(x)',
    series: 'Σ (-1)^n x^(2n+1)/(2n+1)!',
    convergence: 'All x ∈ ℝ',
    terms: (x, n) => Math.pow(-1, n) * Math.pow(x, 2 * n + 1) / factorial(2 * n + 1),
  },
  {
    name: 'Cosine',
    function: 'cos(x)',
    series: 'Σ (-1)^n x^(2n)/(2n)!',
    convergence: 'All x ∈ ℝ',
    terms: (x, n) => Math.pow(-1, n) * Math.pow(x, 2 * n) / factorial(2 * n),
  },
  {
    name: 'Logarithm',
    function: 'ln(1+x)',
    series: 'Σ (-1)^(n+1) x^n/n',
    convergence: '-1 < x ≤ 1',
    terms: (x, n) => Math.pow(-1, n + 1) * Math.pow(x, n) / (n + 1),
  },
  {
    name: 'Geometric',
    function: '1/(1-x)',
    series: 'Σ x^n = 1 + x + x² + x³ + ...',
    convergence: '|x| < 1',
    terms: (x, n) => Math.pow(x, n),
  },
  {
    name: 'Inverse tangent',
    function: 'arctan(x)',
    series: 'Σ (-1)^n x^(2n+1)/(2n+1)',
    convergence: '|x| ≤ 1',
    terms: (x, n) => Math.pow(-1, n) * Math.pow(x, 2 * n + 1) / (2 * n + 1),
  },
  {
    name: 'arcsin(x)',
    function: 'arcsin(x)',
    series: 'Σ (2n)! / (4^n (n!)² (2n+1)) x^(2n+1)',
    convergence: '|x| ≤ 1',
    terms: (x, n) => {
      const num = factorial(2 * n);
      const den = Math.pow(4, n) * Math.pow(factorial(n), 2) * (2 * n + 1);
      return (num / den) * Math.pow(x, 2 * n + 1);
    },
  },
  {
    name: 'sinh(x)',
    function: 'sinh(x)',
    series: 'Σ x^(2n+1)/(2n+1)!',
    convergence: 'All x ∈ ℝ',
    terms: (x, n) => Math.pow(x, 2 * n + 1) / factorial(2 * n + 1),
  },
  {
    name: 'cosh(x)',
    function: 'cosh(x)',
    series: 'Σ x^(2n)/(2n)!',
    convergence: 'All x ∈ ℝ',
    terms: (x, n) => Math.pow(x, 2 * n) / factorial(2 * n),
  },
  {
    name: 'Harmonic Series partial',
    function: 'Σ 1/k',
    series: 'Σ 1/k diverges (ln(n) + γ)',
    convergence: 'Diverges',
    terms: (_x, n) => 1 / (n + 1),
  },
];

export function evaluateKnownSeries(name: string, x: number, terms: number): number {
  const series = KNOWN_SERIES.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
  if (!series) return NaN;

  let sum = 0;
  for (let n = 0; n < terms; n++) {
    sum += series.terms(x, n);
  }
  return sum;
}

// ─── UTILITIES ─────────────────────────────────────────────────

function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function binomialCoeff(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return result;
}

function nthDerivative(expr: MathNode, variable: string, n: number): MathNode {
  let result = expr;
  for (let i = 0; i < n; i++) {
    result = diff(result, variable);
  }
  return result;
}

export function numericalIntegrate(f: (x: number) => number, a: number, b: number): number {
  const GL = [
    { x: 0, w: 0.5688888888888889 },
    { x: -0.5384693101056831, w: 0.4786286704993665 },
    { x: 0.5384693101056831, w: 0.4786286704993665 },
    { x: -0.9061798459386640, w: 0.2369268850561891 },
    { x: 0.9061798459386640, w: 0.2369268850561891 },
  ];
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  let sum = 0;
  for (const node of GL) {
    sum += node.w * f(mid + half * node.x);
  }
  return sum * half;
}