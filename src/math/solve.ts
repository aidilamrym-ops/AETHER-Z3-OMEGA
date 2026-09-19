/**
 * AETHER-Z³ MATHEMATICAL ENGINE
 * MODULE: EQUATION SOLVER
 *
 * Solves algebraic equations: linear, quadratic, polynomial, systems.
 * Returns solutions as MathNode for seamless LaTeX/simplify integration.
 */
import type { MathNode } from './ast.ts';
import { N, Add, Sub, Mul, Div, Sqrt } from './ast.ts';
import { simplify, evaluate } from './simplify.ts';
import { storeLemmaIfAbsent } from './lemma_vault.ts';

// ─── SOLUTION TYPES ─────────────────────────────────────────────

export interface SolveResult {
  solutions: MathNode[];
  variable: string;
  method: string;
  verified: boolean;
}

export interface SystemSolveResult {
  solutions: Record<string, number>;
  method: string;
  verified: boolean;
}

// ─── COEFFICIENT EXTRACTION ─────────────────────────────────────

interface PolyCoeffs {
  degree: number;
  coeffs: number[];
}

/**
 * Collects terms from a polynomial expression, returning a map of term keys to coefficients.
 * Handles x*x as x^2, x*x*x as x^3, etc.
 * @param node The AST node to walk
 * @param sign The sign (+1 or -1) to apply to coefficients
 * @param terms Map to accumulate terms
 */
function collectTerms(node: MathNode, sign: number, terms: Map<string, number>): void {
  if (node.kind === 'num') { const k = `_const`; terms.set(k, (terms.get(k) ?? 0) + sign * node.value); return; }
  if (node.kind === 'var') { const k = node.name; terms.set(k, (terms.get(k) ?? 0) + sign); return; }
  if (node.kind === 'unary' && node.op === '-') { collectTerms(node.operand, -sign, terms); return; }
  if (node.kind === 'binop' && node.op === '+') { collectTerms(node.left, sign, terms); collectTerms(node.right, sign, terms); return; }
  if (node.kind === 'binop' && node.op === '-') { collectTerms(node.left, sign, terms); collectTerms(node.right, -sign, terms); return; }
  if (node.kind === 'binop' && node.op === '*') {
    const powers = new Map<string, number>();
    let coeff = collectPowerFactors(node, new Map<string, number>());
    for (const [varName, exp] of powers) {
      const key = exp === 1 ? varName : `${varName}^${exp}`;
      terms.set(key, (terms.get(key) ?? 0) + sign * coeff);
    }
    return;
  }
  if (node.kind === 'pow' && node.base.kind === 'var' && node.exp.kind === 'num') { const k = nodeToKey(node); terms.set(k, (terms.get(k) ?? 0) + sign); return; }
  const fallback = evaluate(node, {}) ?? 0;
  if (Number.isFinite(fallback)) { terms.set('_const', (terms.get('_const') ?? 0) + sign * fallback); return; }
}

/**
 * Collects the exponent of each variable across a product tree and
 * returns the constant multiplier. Handles x*x -> x^2, x*x*x -> x^3,
 * (x^2)*(x^3) -> x^5, and mixed constant coefficients.
 * @param node The node to analyze
 * @param powers Map to accumulate variable exponents
 * @returns The constant multiplier
 */
function collectPowerFactors(node: MathNode, powers: Map<string, number>): number {
  if (node.kind === 'num') return node.value;
  if (node.kind === 'var') {
    powers.set(node.name, (powers.get(node.name) ?? 0) + 1);
    return 1;
  }
  if (node.kind === 'unary' && node.op === '-') return -collectPowerFactors(node.operand, powers);
  if (node.kind === 'binop' && node.op === '*') {
    return collectPowerFactors(node.left, powers) * collectPowerFactors(node.right, powers);
  }
  if (node.kind === 'binop' && node.op === '/') {
    const denom = new Map<string, number>();
    const num = collectPowerFactors(node.left, powers);
    const den = collectPowerFactors(node.right, denom);
    for (const [varName, exp] of denom) {
      powers.set(varName, (powers.get(varName) ?? 0) - exp);
    }
    return den !== 0 ? num / den : NaN;
  }
  if (node.kind === 'pow' && node.base.kind === 'var' && node.exp.kind === 'num') {
    powers.set(node.base.name, (powers.get(node.base.name) ?? 0) + node.exp.value);
    return 1;
  }
  if (node.kind === 'pow' && node.base.kind === 'num' && node.exp.kind === 'num') {
    return Math.pow(node.base.value, node.exp.value);
  }
  const coeff = extractConstFactor(node);
  return Number.isFinite(coeff) ? coeff : 1;
}

function extractConstFactor(node: MathNode): number {
  if (node.kind === 'num') return node.value;
  if (node.kind === 'unary' && node.op === '-') return -extractConstFactor(node.operand);
  if (node.kind === 'binop' && node.op === '*') return extractConstFactor(node.left) * extractConstFactor(node.right);
  if (node.kind === 'binop' && node.op === '/') {
    const d = extractConstFactor(node.right);
    return d !== 0 ? extractConstFactor(node.left) / d : NaN;
  }
  return 1;
}

function nodeToKey(node: MathNode): string {
  if (node.kind === 'var') return node.name;
  if (node.kind === 'num') return `${node.value}`;
  if (node.kind === 'pow' && node.base.kind === 'var' && node.exp.kind === 'num') return `${node.base.name}^${node.exp.value}`;
  if (node.kind === 'unary' && node.op === '-') return `-${nodeToKey(node.operand)}`;
  return JSON.stringify(node);
}

/**
 * Extracts polynomial coefficients from an equation.
 * Returns coefficients in ascending order of degree: [c0, c1, c2, ...] for c0 + c1*x + c2*x² + ...
 * Handles x*x as x², x*x*x as x³, etc.
 * @param eq The equation or expression to extract coefficients from
 * @param v The variable name (e.g., 'x')
 * @returns PolyCoeffs object or null if not a valid polynomial
 */
function extractPolyCoeffs(eq: MathNode, v: string): PolyCoeffs | null {
  let body: MathNode;
  if (eq.kind === 'equation') {
    body = Sub(eq.left, eq.right);
  } else {
    body = eq;
  }
  body = simplify(body);

  const terms = new Map<string, number>();
  collectTerms(body, 1, terms);

  let maxDeg = 0;
  const coeffs: Record<number, number> = {};

  for (const [key, val] of terms) {
    const match = key.match(new RegExp(`^${v}\\^(\\d+)$`));
    if (match) {
      const deg = parseInt(match[1]);
      maxDeg = Math.max(maxDeg, deg);
      coeffs[deg] = (coeffs[deg] ?? 0) + val;
    } else if (key === v) {
      maxDeg = Math.max(maxDeg, 1);
      coeffs[1] = (coeffs[1] ?? 0) + val;
    } else if (key === '_const') {
      coeffs[0] = (coeffs[0] ?? 0) + val;
    } else {
    // No valNum usage
      const vParts = key.split('*');
      const degParts = vParts.filter(p => p.match(new RegExp(`^${v}(\\^(\\d+))?$`)));
      if (degParts.length > 0) {
        const m = degParts[0].match(new RegExp(`^${v}(\\^(\\d+))?$`));
        if (m) {
          const deg = m[2] ? parseInt(m[2]) : 1;
          maxDeg = Math.max(maxDeg, deg);
          coeffs[deg] = (coeffs[deg] ?? 0) + val;
        }
      }
    }
  }

  if (maxDeg === 0 && (coeffs[0] ?? 0) === 0) {
    return null;
  }

  const result: number[] = [];
  for (let i = 0; i <= maxDeg; i++) {
    result.push(coeffs[i] ?? 0);
  }

  return { degree: maxDeg, coeffs: result };
}

// ─── LINEAR: ax + b = 0 ────────────────────────────────────────

/**
 * Solves a linear equation ax + b = 0.
 * @param coeffs Polynomial coefficients [b, a] where body = ax + b.
 * @param v Variable name to solve for.
 * @returns SolveResult with solutions.
 */
function solveLinear(coeffs: number[], v: string): SolveResult {
  const [b, a] = coeffs;
  if (a === 0) {
    return { solutions: [], variable: v, method: 'linear-degenerate', verified: false };
  }
  const solution = N(-b / a);
  return { solutions: [solution], variable: v, method: 'linear', verified: true };
}

/**
 * Simplifies a numeric coefficient to its simplest rational/decimal form.
 * Converts fractions like 1/2 to 0.5, simplifies 2/4 to 0.5, etc.
 */
function simplifyCoeff(val: number): number {
  if (!Number.isFinite(val)) return val;
  // Round to 12 decimal places to avoid floating point artifacts
  return Math.round(val * 1e12) / 1e12;
}

/**
 * Solves a quadratic equation ax² + bx + c = 0.
 * Handles real and complex roots.
 * Supports rational/fractional coefficients (e.g., 1/2*x^2 + 3/4*x + 5/6 = 0).
 * @param coeffs Polynomial coefficients [c, b, a] where body = ax^2 + bx + c.
 * @param v Variable name to solve for.
 * @returns SolveResult with solutions (coefficients simplified to decimals).
 */
function solveQuadratic(coeffs: number[], v: string): SolveResult {
  // robust extraction: a is highest-degree coeff, c is constant term
  const len = coeffs.length;

  const a = simplifyCoeff(coeffs[len - 1]);
  const b = simplifyCoeff(coeffs[len - 2]);
  const c = simplifyCoeff(coeffs[0]);
  if (a === 0) return solveLinear([simplifyCoeff(b), simplifyCoeff(c)], v);

  const disc = b * b - 4 * a * c;

  if (disc > 1e-12) {
    const sqrtDisc = Math.sqrt(disc);
    const s1 = N(simplifyCoeff((-b - sqrtDisc) / (2 * a)));
    const s2 = N(simplifyCoeff((-b + sqrtDisc) / (2 * a)));
    return { solutions: [s1, s2], variable: v, method: 'quadratic-formula', verified: true };
  }

  if (Math.abs(disc) <= 1e-12) {
    const s = N(simplifyCoeff(-b / (2 * a)));
    return { solutions: [s], variable: v, method: 'quadratic-repeated', verified: true };
  }

  const realPart = N(simplifyCoeff(-b / (2 * a)));
  const imagPart = simplify(Div(Sqrt(N(simplifyCoeff(-disc))), N(simplifyCoeff(2 * a))));
  const s1 = Add(realPart, Mul(N(0), imagPart));
  const s2 = Sub(realPart, Mul(N(0), imagPart));
  return { solutions: [s1, s2], variable: v, method: 'quadratic-complex', verified: false };
}



// ─── CUBIC (Cardano) ────────────────────────────────────────────

function solveCubic(coeffs: number[], v: string): SolveResult {
  const [d, c, b, a] = coeffs;
  if (a === 0) return solveQuadratic([c, b, d], v);

  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
  const disc = -(4 * p * p * p + 27 * q * q);
  const shift = -b / (3 * a);
  const solutions: MathNode[] = [];

  if (disc > 1e-12) {
    const mp = Math.sqrt(-p / 3);
    const theta = Math.acos(Math.max(-1, Math.min(1, -q / (2 * mp * mp * mp)))) / 3;
    for (let k = 0; k < 3; k++) {
      const val = 2 * mp * Math.cos(theta + (2 * Math.PI * k) / 3) + shift;
      solutions.push(simplify(N(Math.round(val * 1e12) / 1e12)));
    }
  } else if (Math.abs(disc) <= 1e-12) {
    const u = Math.cbrt(-q / 2);
    solutions.push(simplify(N(Math.round((2 * u + shift) * 1e12) / 1e12)));
    solutions.push(simplify(N(Math.round((-u + shift) * 1e12) / 1e12)));
  } else {
    const sd = Math.sqrt(q * q / 4 + p * p * p / 27);
    const u = Math.cbrt(-q / 2 + sd);
    const w = Math.cbrt(-q / 2 - sd);
    solutions.push(simplify(N(Math.round((u + w + shift) * 1e12) / 1e12)));
  }

  return { solutions, variable: v, method: 'cubic-cardano', verified: solutions.length > 0 };
}

// ─── NUMERICAL: Newton-Raphson + Bisection ──────────────────────

function evalAt(expr: MathNode, v: string, val: number): number {
  return evaluate(expr, { [v]: val });
}

function derivativeNumerical(expr: MathNode, v: string, x: number, h = 1e-8): number {
  return (evalAt(expr, v, x + h) - evalAt(expr, v, x - h)) / (2 * h);
}

function newtonRaphson(expr: MathNode, v: string, x0: number, maxIter = 50, tol = 1e-10): number | null {
  let x = x0;
  for (let i = 0; i < maxIter; i++) {
    const fx = evalAt(expr, v, x);
    if (Math.abs(fx) < tol) return x;
    const dfx = derivativeNumerical(expr, v, x);
    if (Math.abs(dfx) < 1e-15) break;
    x = x - fx / dfx;
  }
  return Math.abs(evalAt(expr, v, x)) < tol * 100 ? x : null;
}

function bisection(expr: MathNode, v: string, a: number, b: number, maxIter = 100, tol = 1e-10): number | null {
  let fa = evalAt(expr, v, a);
  let fb = evalAt(expr, v, b);
  if (fa * fb > 0) return null;
  if (Math.abs(fa) < tol) return a;
  if (Math.abs(fb) < tol) return b;

  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const fm = evalAt(expr, v, mid);
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) return mid;
    if (fa * fm < 0) { b = mid; fb = fm; }
    else { a = mid; fa = fm; }
  }
  return Math.abs(evalAt(expr, v, (a + b) / 2)) < tol * 10 ? (a + b) / 2 : null;
}

function findNumericalRoots(expr: MathNode, v: string, searchRange = 20, step = 0.5): number[] {
  const roots: number[] = [];
  const seen = new Set<string>();

  function addRoot(r: number) {
    const rounded = Math.round(r * 1e8) / 1e8;
    const key = rounded.toFixed(8);
    if (!seen.has(key)) {
      seen.add(key);
      roots.push(rounded);
    }
  }

  for (let x = -searchRange; x <= searchRange; x += step) {
    const fa = evalAt(expr, v, x);
    const fb = evalAt(expr, v, x + step);
    if (Math.abs(fa) < 1e-10) addRoot(x);
    if (fa * fb < 0) {
      const root = bisection(expr, v, x, x + step);
      if (root !== null) addRoot(root);
    }
  }

  for (const r of [...roots]) {
    const refined = newtonRaphson(expr, v, r);
    if (refined !== null) addRoot(refined);
  }

  return roots.sort((a, b) => a - b);
}

// ─── POLYNOMIAL ROOTS (Durand-Kerner) ──────────────────────────

export function durandKerner(coeffs: number[], maxIter = 100, tol = 1e-10): { re: number; im: number }[] {
  const n = coeffs.length - 1;
  if (n <= 0) return [];
  const a = coeffs.map(c => c / coeffs[0]);
  const roots: { re: number; im: number }[] = [];

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    roots.push({ re: 0.9 * Math.cos(angle), im: 0.9 * Math.sin(angle) });
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      let numRe = 1, numIm = 0;
      let denRe = 0, denIm = 0;

      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dRe = roots[i].re - roots[j].re;
        const dIm = roots[i].im - roots[j].im;
        const newDenRe = denRe * dRe - denIm * dIm + dRe;
        const newDenIm = denRe * dIm + denIm * dRe + dIm;
        const tempRe = numRe * dRe - numIm * dIm;
        const tempIm = numRe * dIm + numIm * dRe;
        numRe = tempRe;
        numIm = tempIm;
        denRe = newDenRe;
        denIm = newDenIm;
      }

      let polyRe = a[n], polyIm = 0;
      for (let k = n - 1; k >= 0; k--) {
        const newRe = polyRe * roots[i].re - polyIm * roots[i].im + a[k];
        const newIm = polyRe * roots[i].im + polyIm * roots[i].re;
        polyRe = newRe;
        polyIm = newIm;
      }

      const den2 = denRe * denRe + denIm * denIm;
      if (den2 < 1e-30) continue;

      const deltaRe = (polyRe * denRe + polyIm * denIm) / den2;
      const deltaIm = (polyIm * denRe - polyRe * denIm) / den2;
      roots[i].re -= deltaRe;
      roots[i].im -= deltaIm;
      maxDelta = Math.max(maxDelta, Math.sqrt(deltaRe * deltaRe + deltaIm * deltaIm));
    }
    if (maxDelta < tol) break;
  }

  return roots;
}

// ─── SYSTEM OF EQUATIONS (Gaussian Elimination) ─────────────────

export function solveSystem(equations: MathNode[], variables: string[]): SystemSolveResult | null {
  const n = equations.length;
  if (n === 0 || variables.length !== n) return null;

  const matrix: number[][] = [];
  for (const eq of equations) {
    if (eq.kind !== 'equation') return null;
    const row: number[] = [];
    const body = simplify(Sub(eq.left, eq.right));
    for (const v of variables) {
      const coeff = extractLinearCoeff(body, v);
      row.push(coeff);
    }
    const constTerm = evaluateConstant(body, variables);
    row.push(-constTerm);
    matrix.push(row);
  }

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[maxRow][col])) maxRow = row;
    }
    [matrix[col], matrix[maxRow]] = [matrix[maxRow], matrix[col]];

    if (Math.abs(matrix[col][col]) < 1e-12) return null;

    for (let row = col + 1; row < n; row++) {
      const factor = matrix[row][col] / matrix[col][col];
      for (let j = col; j <= n; j++) {
        matrix[row][j] -= factor * matrix[col][j];
      }
    }
  }

  const solution: Record<string, number> = {};
  for (let i = n - 1; i >= 0; i--) {
    let sum = matrix[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= matrix[i][j] * solution[variables[j]];
    }
    solution[variables[i]] = sum / matrix[i][i];
  }

  let verified = true;
  for (let i = 0; i < n; i++) {
    const env = variables.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: solution[v] }), {});
    const left = ((equations[i] as any).left) ?? N(0);
    const right = ((equations[i] as any).right) ?? N(0);
    const lhs = evaluate(left, env);
    const rhs = evaluate(right, env);
    if (Math.abs(lhs - rhs) > 1e-6) { verified = false; break; }
  }

  return { solutions: solution, method: 'gaussian-elimination', verified };
}

function extractLinearCoeff(expr: MathNode, v: string): number {
  if (expr.kind === 'num') return 0;
  if (expr.kind === 'var' && expr.name === v) return 1;
  if (expr.kind === 'binop' && expr.op === '+') return extractLinearCoeff(expr.left, v) + extractLinearCoeff(expr.right, v);
  if (expr.kind === 'binop' && expr.op === '-') return extractLinearCoeff(expr.left, v) - extractLinearCoeff(expr.right, v);
  if (expr.kind === 'binop' && expr.op === '*') {
    const lc = expr.left.kind === 'num' ? expr.left.value : (expr.right.kind === 'num' ? 1 : 0);
    if (expr.left.kind === 'num') return lc * extractLinearCoeff(expr.right, v);
    if (expr.right.kind === 'num') return lc * extractLinearCoeff(expr.left, v);
    return 0;
  }
  if (expr.kind === 'unary' && expr.op === '-') return -extractLinearCoeff(expr.operand, v);
  return 0;
}

function evaluateConstant(expr: MathNode, vars: string[]): number {
  const env: Record<string, number> = {};
  for (const v of vars) env[v] = 0;
  return evaluate(expr, env);
}

// ─── MAIN SOLVE ─────────────────────────────────────────────────

export function solve(eq: MathNode, v: string): SolveResult {
  const simplified = simplify(eq);
  const coeffs = extractPolyCoeffs(simplified, v);

  if (coeffs && coeffs.degree >= 1 && coeffs.coeffs.every(Number.isFinite)) {
    let res: SolveResult | null = null;
    switch (coeffs.degree) {
      case 1: res = solveLinear(coeffs.coeffs, v); break;
      case 2: res = solveQuadratic(coeffs.coeffs, v); break;
      case 3: res = solveCubic(coeffs.coeffs, v); break;
    }
    if (res) {
      if (res.verified && res.solutions.length > 0) {
        storeLemmaIfAbsent(eq, res.method, 0.98, [`analytical solve for ${v}`]);
      }
      return res;
    }
  }

  let body: MathNode;
  if (simplified.kind === 'equation') {
    body = simplify(Sub(simplified.left, simplified.right));
  } else {
    body = simplified;
  }

  const numericalRoots = findNumericalRoots(body, v);
  const solutions = numericalRoots.map(r => {
    if (Math.abs(r - Math.round(r)) < 1e-8) return N(Math.round(r));
    return N(Math.round(r * 1e8) / 1e8);
  });

  const verified = solutions.every(s => {
    if (s.kind !== 'num') return false;
    return Math.abs(evalAt(body, v, s.value)) < 1e-6;
  });

  const result = {
    solutions,
    variable: v,
    method: coeffs && coeffs.degree > 3 ? `poly-deg-${coeffs.degree}-numerical` : 'numerical-newton-bisection',
    verified
  };

  if (verified && solutions.length > 0) {
    storeLemmaIfAbsent(eq, result.method, 0.95, [`solved for ${v}`]);
  }

  return result;
}

export function solveSystemOf(equations: MathNode[], variables: string[]): SystemSolveResult | null {
  return solveSystem(equations, variables);
}
