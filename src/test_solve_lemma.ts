/**
 * Test suite for solve.ts and lemma_vault.ts
 */
import { V, N, Eq, Add, Mul, Div } from './math/ast.ts';
import { solve } from './math/solve.ts';
import { getGlobalLemmaVault } from './math/lemma_vault.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`[FAIL] ${msg}`);
  console.log(`[PASS] ${msg}`);
}

const vault = getGlobalLemmaVault();

// Linear test
const linearEq = Eq(Add(Mul(N(2), V('x')), N(4)), N(0));
const linRes = solve(linearEq, 'x');
console.log('linRes', JSON.stringify(linRes.solutions[0]));
assert(linRes.solutions.length === 1, 'Linear solves one root');
assert(Math.abs((linRes.solutions[0] as any).value + 2) < 1e-8, 'Linear solution -2');
// Store lemma for linear
vault.store(linearEq, 1.0, 'linear-solve');

// Quadratic test: x^2 -5x +6 =0
const quadEq = Eq(Add(Add(Mul(V('x'), V('x')), Mul(N(-5), V('x'))), N(6)), N(0));
const quadRes = solve(quadEq, 'x');
console.log('quadratic solutions length:', quadRes.solutions.length);
assert(quadRes.solutions.length === 2, 'Quadratic two roots');
assert(Math.abs((quadRes.solutions[0] as any).value - 2) < 1e-8, 'Root 2');
assert(Math.abs((quadRes.solutions[1] as any).value - 3) < 1e-8, 'Root 3');

// Lemma check for linear
const lemma = vault.findByStatement(linearEq);
assert(lemma !== undefined, 'Lemma stored for linear equation');

// Test: Rational coefficients (1/2)x^2 + (3/4)x - 5/6 = 0
const ratEq = Eq(
  Add(Add(Mul(Div(N(1), N(2)), Mul(V('x'), V('x'))), Mul(Div(N(3), N(4)), V('x'))), Div(N(-5), N(6))),
  N(0)
);
const ratRes = solve(ratEq, 'x');
console.log('rational coeff solutions:', ratRes.solutions.map((s: any) => s.value));
assert(ratRes.solutions.length === 2, 'Rational coeffs two real roots');
const r1 = (ratRes.solutions[0] as any).value;
const r2 = (ratRes.solutions[1] as any).value;
const product = r1 * r2;
assert(Math.abs(product + 5/3) < 1e-6, `Product of roots = -5/3 (got ${product})`);
console.log(`Roots: ${r1.toFixed(6)}, ${r2.toFixed(6)}`);

// Lemma check for quadratic
const quadLemma = vault.findByStatement(quadEq);
assert(quadLemma !== undefined, 'Lemma stored for quadratic equation');
if (quadLemma) {
  assert(quadLemma.confidence >= 0.9, `Quadratic lemma confidence >= 0.9 (got ${quadLemma.confidence})`);
}

// Test: Cubic x^3 - 6x^2 + 11x - 6 = 0 (roots 1, 2, 3)
const cubicEq = Eq(
  Add(Add(Add(Mul(V('x'), Mul(V('x'), V('x'))), Mul(N(-6), Mul(V('x'), V('x')))), Mul(N(11), V('x'))), N(-6)),
  N(0)
);
const cubicRes = solve(cubicEq, 'x');
console.log('cubic solutions:', cubicRes.solutions.map((s: any) => s.value));
assert(cubicRes.solutions.length === 3, 'Cubic three roots');
const cubicRoots = cubicRes.solutions.map((s: any) => s.value).sort((a: number, b: number) => a - b);
assert(Math.abs(cubicRoots[0] - 1) < 1e-6, 'Cubic root 1');
assert(Math.abs(cubicRoots[1] - 2) < 1e-6, 'Cubic root 2');
assert(Math.abs(cubicRoots[2] - 3) < 1e-6, 'Cubic root 3');

// Lemma check for cubic
const cubicLemma = vault.findByStatement(cubicEq);
assert(cubicLemma !== undefined, 'Lemma stored for cubic equation');
if (cubicLemma) {
  assert(cubicLemma.confidence >= 0.9, `Cubic lemma confidence >= 0.9 (got ${cubicLemma.confidence})`);
}

// Test: x*x*x as x^3
const tripleEq = Eq(Mul(V('z'), Mul(V('z'), V('z'))), N(27));
const tripleRes = solve(tripleEq, 'z');
console.log('x^3=27 solutions:', tripleRes.solutions.map((s: any) => s.value));
assert(tripleRes.solutions.length === 1, 'x^3=27 has one real root');
assert(Math.abs((tripleRes.solutions[0] as any).value - 3) < 1e-6, 'Cube root of 27 = 3');

// Lemma vault stats
console.log('Vault stats:', vault.getStats());

console.log('All tests passed');
