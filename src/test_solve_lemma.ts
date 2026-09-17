/**
 * Test suite for solve.ts and lemma_vault.ts
 */
import { V, N, Eq, Add, Mul } from './math/ast.ts';
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

// Lemma check for linear
const lemma = vault.findByStatement(linearEq);
assert(lemma !== undefined, 'Lemma stored for linear equation');

console.log('All tests passed');
