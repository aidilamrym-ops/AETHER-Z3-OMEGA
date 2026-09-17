/**
 * ALGEBRAIC & TRIGONOMETRIC IDENTITY DATABASE
 * 50+ proven mathematical identities for theorem proving.
 * Each identity is stored as a pair of MathNode ASTs.
 */
import { MathNode } from './ast.js';

// ─── IDENTITY INTERFACE ────────────────────────────────────────

export interface Identity {
  name: string;
  category: 'algebra' | 'trig' | 'log' | 'exp' | 'calc' | 'special' | 'hyperbolic';
  left: MathNode;
  right: MathNode;
  variables: string[];
  description: string;
}

// ─── BUILDER HELPERS ───────────────────────────────────────────

function N(v: number): MathNode { return { kind: 'num', value: v, exact: false } as any; }
function V(name: string): MathNode { return { kind: 'var', name }; }
function Add(a: MathNode, b: MathNode): MathNode { return { kind: 'binop', op: '+', left: a, right: b }; }
function Sub(a: MathNode, b: MathNode): MathNode { return { kind: 'binop', op: '-', left: a, right: b }; }
function Mul(a: MathNode, b: MathNode): MathNode { return { kind: 'binop', op: '*', left: a, right: b }; }
function Div(a: MathNode, b: MathNode): MathNode { return { kind: 'binop', op: '/', left: a, right: b }; }
function Pow(a: MathNode, b: MathNode): MathNode { return { kind: 'pow', base: a, exp: b }; }
function Neg(a: MathNode): MathNode { return { kind: 'unary', op: '-', operand: a }; }
function Sin(a: MathNode): MathNode { return { kind: 'func', name: 'sin', args: [a] }; }
function Cos(a: MathNode): MathNode { return { kind: 'func', name: 'cos', args: [a] }; }
function Tan(a: MathNode): MathNode { return { kind: 'func', name: 'tan', args: [a] }; }
function Sinh(a: MathNode): MathNode { return { kind: 'func', name: 'sinh', args: [a] }; }
function Cosh(a: MathNode): MathNode { return { kind: 'func', name: 'cosh', args: [a] }; }
function Ln(a: MathNode): MathNode { return { kind: 'log', base: N(Math.E), arg: a }; }
function Log10(a: MathNode): MathNode { return { kind: 'log', base: N(10), arg: a }; }
function Exp(a: MathNode): MathNode { return { kind: 'exp', arg: a }; }
function Abs(a: MathNode): MathNode { return { kind: 'abs', arg: a }; }

const x = V('x');
const z = V('z');
const c = V('c');
const d = V('d');
const n = V('n');
const a = V('a');
const b = V('b');
const pi = N(Math.PI);
const e = N(Math.E);
const one = N(1);
const two = N(2);
const zero = N(0);

// ═══════════════════════════════════════════════════════════════
// 1. ALGEBRAIC IDENTITIES
// ═══════════════════════════════════════════════════════════════

const algebraic: Identity[] = [
  // (a+b)² = a² + 2ab + b²
  {
    name: 'Square of Sum',
    category: 'algebra',
    left: Pow(Add(a, b), two),
    right: Add(Add(Pow(a, two), Mul(two, Mul(a, b))), Pow(b, two)),
    variables: ['a', 'b'],
    description: '(a+b)² = a² + 2ab + b²'
  },
  // (a-b)² = a² - 2ab + b²
  {
    name: 'Square of Difference',
    category: 'algebra',
    left: Pow(Sub(a, b), two),
    right: Add(Sub(Pow(a, two), Mul(two, Mul(a, b))), Pow(b, two)),
    variables: ['a', 'b'],
    description: '(a-b)² = a² - 2ab + b²'
  },
  // a² - b² = (a+b)(a-b)
  {
    name: 'Difference of Squares',
    category: 'algebra',
    left: Sub(Pow(a, two), Pow(b, two)),
    right: Mul(Add(a, b), Sub(a, b)),
    variables: ['a', 'b'],
    description: 'a² - b² = (a+b)(a-b)'
  },
  // a² + b² = (a+b)² - 2ab
  {
    name: 'Sum of Squares',
    category: 'algebra',
    left: Add(Pow(a, two), Pow(b, two)),
    right: Sub(Pow(Add(a, b), two), Mul(two, Mul(a, b))),
    variables: ['a', 'b'],
    description: 'a² + b² = (a+b)² - 2ab'
  },
  // (a+b)(a-b) = a² - b²
  {
    name: 'Product of Sum and Difference',
    category: 'algebra',
    left: Mul(Add(a, b), Sub(a, b)),
    right: Sub(Pow(a, two), Pow(b, two)),
    variables: ['a', 'b'],
    description: '(a+b)(a-b) = a² - b²'
  },
  // a(b+c) = ab + ac
  {
    name: 'Distributive Law',
    category: 'algebra',
    left: Mul(a, Add(b, c)),
    right: Add(Mul(a, b), Mul(a, c)),
    variables: ['a', 'b', 'c'],
    description: 'a(b+c) = ab + ac'
  },
  // (a+b)(c+d) = ac + ad + bc + bd
  {
    name: 'FOIL Expansion',
    category: 'algebra',
    left: Mul(Add(a, b), Add(c, d)),
    right: Add(Add(Mul(a, c), Mul(a, d)), Add(Mul(b, c), Mul(b, d))),
    variables: ['a', 'b', 'c', 'd'],
    description: '(a+b)(c+d) = ac + ad + bc + bd'
  },
  // 1/a + 1/b = (a+b)/(ab)
  {
    name: 'Sum of Reciprocals',
    category: 'algebra',
    left: Add(Div(one, a), Div(one, b)),
    right: Div(Add(a, b), Mul(a, b)),
    variables: ['a', 'b'],
    description: '1/a + 1/b = (a+b)/(ab)'
  },
  // a³ + b³ = (a+b)(a² - ab + b²)
  {
    name: 'Sum of Cubes',
    category: 'algebra',
    left: Add(Pow(a, N(3)), Pow(b, N(3))),
    right: Mul(Add(a, b), Sub(Sub(Pow(a, two), Mul(a, b)), Pow(b, two))),
    variables: ['a', 'b'],
    description: 'a³ + b³ = (a+b)(a² - ab + b²)'
  },
  // a³ - b³ = (a-b)(a² + ab + b²)
  {
    name: 'Difference of Cubes',
    category: 'algebra',
    left: Sub(Pow(a, N(3)), Pow(b, N(3))),
    right: Mul(Sub(a, b), Add(Add(Pow(a, two), Mul(a, b)), Pow(b, two))),
    variables: ['a', 'b'],
    description: 'a³ - b³ = (a-b)(a² + ab + b²)'
  },
  // a²+b²+c² = (a+b+c)² - 2(ab+ac+bc)
  {
    name: 'Sum of Three Squares',
    category: 'algebra',
    left: Add(Add(Pow(a, two), Pow(b, two)), Pow(z, two)),
    right: Sub(Pow(Add(Add(a, b), z), two), Mul(two, Add(Add(Mul(a, b), Mul(a, z)), Mul(b, z)))),
    variables: ['a', 'b', 'c'],
    description: 'a²+b²+c² = (a+b+c)² - 2(ab+ac+bc)'
  },
  // a/b = 1 - (b-a)/b
  {
    name: 'Fraction Decomposition',
    category: 'algebra',
    left: Div(a, b),
    right: Sub(one, Div(Sub(b, a), b)),
    variables: ['a', 'b'],
    description: 'a/b = 1 - (b-a)/b'
  },
];

// ═══════════════════════════════════════════════════════════════
// 2. TRIGONOMETRIC IDENTITIES
// ═══════════════════════════════════════════════════════════════

const trig: Identity[] = [
  // sin²x + cos²x = 1
  {
    name: 'Pythagorean Identity',
    category: 'trig',
    left: Add(Pow(Sin(x), two), Pow(Cos(x), two)),
    right: one,
    variables: ['x'],
    description: 'sin²x + cos²x = 1'
  },
  // 1 + tan²x = sec²x
  {
    name: 'Pythagorean Identity (tan)',
    category: 'trig',
    left: Add(one, Pow(Tan(x), two)),
    right: Div(one, Pow(Cos(x), two)),
    variables: ['x'],
    description: '1 + tan²x = sec²x'
  },
  // sin(A+B) = sinA cosB + cosA sinB
  {
    name: 'Sine Sum',
    category: 'trig',
    left: Sin(Add(a, b)),
    right: Add(Mul(Sin(a), Cos(b)), Mul(Cos(a), Sin(b))),
    variables: ['a', 'b'],
    description: 'sin(A+B) = sinA cosB + cosA sinB'
  },
  // sin(A-B) = sinA cosB - cosA sinB
  {
    name: 'Sine Difference',
    category: 'trig',
    left: Sin(Sub(a, b)),
    right: Sub(Mul(Sin(a), Cos(b)), Mul(Cos(a), Sin(b))),
    variables: ['a', 'b'],
    description: 'sin(A-B) = sinA cosB - cosA sinB'
  },
  // cos(A+B) = cosA cosB - sinA sinB
  {
    name: 'Cosine Sum',
    category: 'trig',
    left: Cos(Add(a, b)),
    right: Sub(Mul(Cos(a), Cos(b)), Mul(Sin(a), Sin(b))),
    variables: ['a', 'b'],
    description: 'cos(A+B) = cosA cosB - sinA sinB'
  },
  // cos(A-B) = cosA cosB + sinA sinB
  {
    name: 'Cosine Difference',
    category: 'trig',
    left: Cos(Sub(a, b)),
    right: Add(Mul(Cos(a), Cos(b)), Mul(Sin(a), Sin(b))),
    variables: ['a', 'b'],
    description: 'cos(A-B) = cosA cosB + sinA sinB'
  },
  // sin(2x) = 2 sin(x) cos(x)
  {
    name: 'Double Angle Sine',
    category: 'trig',
    left: Sin(Mul(two, x)),
    right: Mul(two, Mul(Sin(x), Cos(x))),
    variables: ['x'],
    description: 'sin(2x) = 2 sin(x) cos(x)'
  },
  // cos(2x) = cos²x - sin²x
  {
    name: 'Double Angle Cosine',
    category: 'trig',
    left: Cos(Mul(two, x)),
    right: Sub(Pow(Cos(x), two), Pow(Sin(x), two)),
    variables: ['x'],
    description: 'cos(2x) = cos²x - sin²x'
  },
  // cos(2x) = 2cos²x - 1
  {
    name: 'Double Angle Cosine (variant)',
    category: 'trig',
    left: Cos(Mul(two, x)),
    right: Sub(Mul(two, Pow(Cos(x), two)), one),
    variables: ['x'],
    description: 'cos(2x) = 2cos²x - 1'
  },
  // cos(2x) = 1 - 2sin²x
  {
    name: 'Double Angle Cosine (variant 2)',
    category: 'trig',
    left: Cos(Mul(two, x)),
    right: Sub(one, Mul(two, Pow(Sin(x), two))),
    variables: ['x'],
    description: 'cos(2x) = 1 - 2sin²x'
  },
  // tan(x+y) = (tanx + tany)/(1 - tanx tany)
  {
    name: 'Tangent Sum',
    category: 'trig',
    left: Tan(Add(a, b)),
    right: Div(Add(Tan(a), Tan(b)), Sub(one, Mul(Tan(a), Tan(b)))),
    variables: ['a', 'b'],
    description: 'tan(A+B) = (tanA + tanB)/(1 - tanA tanB)'
  },
  // sin(x) + sin(y) = 2 sin((x+y)/2) cos((x-y)/2)
  {
    name: 'Sum to Product (sine)',
    category: 'trig',
    left: Add(Sin(a), Sin(b)),
    right: Mul(two, Mul(Sin(Div(Add(a, b), two)), Cos(Div(Sub(a, b), two)))),
    variables: ['a', 'b'],
    description: 'sinA + sinB = 2 sin((A+B)/2) cos((A-B)/2)'
  },
  // cos(x) + cos(y) = 2 cos((x+y)/2) cos((x-y)/2)
  {
    name: 'Sum to Product (cosine)',
    category: 'trig',
    left: Add(Cos(a), Cos(b)),
    right: Mul(two, Mul(Cos(Div(Add(a, b), two)), Cos(Div(Sub(a, b), two)))),
    variables: ['a', 'b'],
    description: 'cosA + cosB = 2 cos((A+B)/2) cos((A-B)/2)'
  },
  // sin²x = (1 - cos(2x))/2
  {
    name: 'Power Reduction (sin)',
    category: 'trig',
    left: Pow(Sin(x), two),
    right: Div(Sub(one, Cos(Mul(two, x))), two),
    variables: ['x'],
    description: 'sin²x = (1 - cos(2x))/2'
  },
  // cos²x = (1 + cos(2x))/2
  {
    name: 'Power Reduction (cos)',
    category: 'trig',
    left: Pow(Cos(x), two),
    right: Div(Add(one, Cos(Mul(two, x))), two),
    variables: ['x'],
    description: 'cos²x = (1 + cos(2x))/2'
  },
  // sin²x - cos²x = -cos(2x)
  {
    name: 'Sin-Cos Squared Difference',
    category: 'trig',
    left: Sub(Pow(Sin(x), two), Pow(Cos(x), two)),
    right: Neg(Cos(Mul(two, x))),
    variables: ['x'],
    description: 'sin²x - cos²x = -cos(2x)'
  },
];

// ═══════════════════════════════════════════════════════════════
// 3. LOGARITHMIC IDENTITIES
// ═══════════════════════════════════════════════════════════════

const log: Identity[] = [
  // ln(e) = 1
  {
    name: 'Natural Log of e',
    category: 'log',
    left: Ln(e),
    right: one,
    variables: [],
    description: 'ln(e) = 1'
  },
  // ln(1) = 0
  {
    name: 'Natural Log of 1',
    category: 'log',
    left: Ln(one),
    right: zero,
    variables: [],
    description: 'ln(1) = 0'
  },
  // log₁₀(10) = 1
  {
    name: 'Log Base 10',
    category: 'log',
    left: Log10(N(10)),
    right: one,
    variables: [],
    description: 'log₁₀(10) = 1'
  },
  // ln(ab) = ln(a) + ln(b)
  {
    name: 'Product Rule (ln)',
    category: 'log',
    left: Ln(Mul(a, b)),
    right: Add(Ln(a), Ln(b)),
    variables: ['a', 'b'],
    description: 'ln(ab) = ln(a) + ln(b)'
  },
  // ln(a/b) = ln(a) - ln(b)
  {
    name: 'Quotient Rule (ln)',
    category: 'log',
    left: Ln(Div(a, b)),
    right: Sub(Ln(a), Ln(b)),
    variables: ['a', 'b'],
    description: 'ln(a/b) = ln(a) - ln(b)'
  },
  // ln(a^n) = n ln(a)
  {
    name: 'Power Rule (ln)',
    category: 'log',
    left: Ln(Pow(a, n)),
    right: Mul(n, Ln(a)),
    variables: ['a', 'n'],
    description: 'ln(aⁿ) = n·ln(a)'
  },
  // ln(e^x) = x
  {
    name: 'ln of exp',
    category: 'log',
    left: Ln(Exp(x)),
    right: x,
    variables: ['x'],
    description: 'ln(eˣ) = x'
  },
  // e^(ln x) = x
  {
    name: 'exp of ln',
    category: 'exp',
    left: Exp(Ln(x)),
    right: x,
    variables: ['x'],
    description: 'e^(ln x) = x'
  },
  // ln(x) = log₁₀(x) / log₁₀(e)
  {
    name: 'Change of Base (ln)',
    category: 'log',
    left: Ln(x),
    right: Div(Log10(x), Log10(e)),
    variables: ['x'],
    description: 'ln(x) = log₁₀(x)/log₁₀(e)'
  },
];

// ═══════════════════════════════════════════════════════════════
// 4. EXPONENTIAL IDENTITIES
// ═══════════════════════════════════════════════════════════════

const exp: Identity[] = [
  // e^0 = 1
  {
    name: 'exp of 0',
    category: 'exp',
    left: Exp(zero),
    right: one,
    variables: [],
    description: 'e⁰ = 1'
  },
  // e^1 = e
  {
    name: 'exp of 1',
    category: 'exp',
    left: Exp(one),
    right: e,
    variables: [],
    description: 'e¹ = e'
  },
  // e^(a+b) = e^a · e^b
  {
    name: 'exp of Sum',
    category: 'exp',
    left: Exp(Add(a, b)),
    right: Mul(Exp(a), Exp(b)),
    variables: ['a', 'b'],
    description: 'e^(a+b) = e^a · e^b'
  },
  // e^(a-b) = e^a / e^b
  {
    name: 'exp of Difference',
    category: 'exp',
    left: Exp(Sub(a, b)),
    right: Div(Exp(a), Exp(b)),
    variables: ['a', 'b'],
    description: 'e^(a-b) = e^a / e^b'
  },
  // (e^a)^b = e^(ab)
  {
    name: 'exp of Product',
    category: 'exp',
    left: Pow(Exp(a), b),
    right: Exp(Mul(a, b)),
    variables: ['a', 'b'],
    description: '(e^a)^b = e^(ab)'
  },
  // 2^0 = 1
  {
    name: 'Two to zero',
    category: 'exp',
    left: Pow(N(2), zero),
    right: one,
    variables: [],
    description: '2⁰ = 1'
  },
  // (-1)^2 = 1
  {
    name: 'Negative one squared',
    category: 'exp',
    left: Pow(N(-1), two),
    right: one,
    variables: [],
    description: '(-1)² = 1'
  },
];

// ═══════════════════════════════════════════════════════════════
// 5. CALCULUS IDENTITIES
// ═══════════════════════════════════════════════════════════════

const calc: Identity[] = [
  // d/dx(x) = 1
  {
    name: 'Derivative of x',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: x } as MathNode,
    right: one,
    variables: ['x'],
    description: 'd/dx(x) = 1'
  },
  // d/dx(c) = 0
  {
    name: 'Derivative of constant',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: a } as MathNode,
    right: zero,
    variables: ['a'],
    description: 'd/dx(c) = 0'
  },
  // d/dx(x^n) = nx^(n-1)
  {
    name: 'Power Rule',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: Pow(x, n) } as MathNode,
    right: Mul(n, Pow(x, Sub(n, one))),
    variables: ['x', 'n'],
    description: 'd/dx(xⁿ) = nxⁿ⁻¹'
  },
  // d/dx(e^x) = e^x
  {
    name: 'Derivative of exp',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: Exp(x) } as MathNode,
    right: Exp(x),
    variables: ['x'],
    description: 'd/dx(eˣ) = eˣ'
  },
  // d/dx(ln x) = 1/x
  {
    name: 'Derivative of ln',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: Ln(x) } as MathNode,
    right: Div(one, x),
    variables: ['x'],
    description: 'd/dx(ln x) = 1/x'
  },
  // d/dx(sin x) = cos x
  {
    name: 'Derivative of sin',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: Sin(x) } as MathNode,
    right: Cos(x),
    variables: ['x'],
    description: 'd/dx(sin x) = cos x'
  },
  // d/dx(cos x) = -sin x
  {
    name: 'Derivative of cos',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: Cos(x) } as MathNode,
    right: Neg(Sin(x)),
    variables: ['x'],
    description: 'd/dx(cos x) = -sin x'
  },
  // d/dx(tan x) = sec²x
  {
    name: 'Derivative of tan',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: Tan(x) } as MathNode,
    right: Div(one, Pow(Cos(x), two)),
    variables: ['x'],
    description: 'd/dx(tan x) = sec²x'
  },
  // d/dx(|x|) = x/|x| (sgn)
  {
    name: 'Derivative of abs',
    category: 'calc',
    left: { kind: 'diff', wrt: 'x', order: 1, expr: Abs(x) } as MathNode,
    right: Div(x, Abs(x)),
    variables: ['x'],
    description: 'd/dx(|x|) = x/|x|'
  },
];

// ═══════════════════════════════════════════════════════════════
// 6. HYPERBOLIC IDENTITIES
// ═══════════════════════════════════════════════════════════════

const hyperbolic: Identity[] = [
  // cosh²x - sinh²x = 1
  {
    name: 'Hyperbolic Pythagorean',
    category: 'hyperbolic',
    left: Sub(Pow(Cosh(x), two), Pow(Sinh(x), two)),
    right: one,
    variables: ['x'],
    description: 'cosh²x - sinh²x = 1'
  },
  // sinh(2x) = 2 sinh(x) cosh(x)
  {
    name: 'Double Angle sinh',
    category: 'hyperbolic',
    left: Sinh(Mul(two, x)),
    right: Mul(two, Mul(Sinh(x), Cosh(x))),
    variables: ['x'],
    description: 'sinh(2x) = 2 sinh(x) cosh(x)'
  },
  // cosh(2x) = cosh²x + sinh²x
  {
    name: 'Double Angle cosh',
    category: 'hyperbolic',
    left: Cosh(Mul(two, x)),
    right: Add(Pow(Cosh(x), two), Pow(Sinh(x), two)),
    variables: ['x'],
    description: 'cosh(2x) = cosh²x + sinh²x'
  },
];

// ═══════════════════════════════════════════════════════════════
// 7. SPECIAL FUNCTION VALUES
// ═══════════════════════════════════════════════════════════════

const special: Identity[] = [
  // ζ(2) = π²/6
  {
    name: 'Zeta at 2',
    category: 'special',
    left: { kind: 'zeta', arg: two } as MathNode,
    right: Div(Pow(pi, two), N(6)),
    variables: [],
    description: 'ζ(2) = π²/6 ≈ 1.6449'
  },
  // Γ(1/2) = √π
  {
    name: 'Gamma at 1/2',
    category: 'special',
    left: { kind: 'gamma', arg: Div(one, two) } as MathNode,
    right: { kind: 'pow', base: pi, exp: Div(one, two) } as MathNode,
    variables: [],
    description: 'Γ(1/2) = √π ≈ 1.7724'
  },
  // Γ(1) = 1
  {
    name: 'Gamma at 1',
    category: 'special',
    left: { kind: 'gamma', arg: one } as MathNode,
    right: one,
    variables: [],
    description: 'Γ(1) = 1'
  },
  // Γ(n) = (n-1)! for positive integer n
  {
    name: 'Gamma factorial',
    category: 'special',
    left: { kind: 'gamma', arg: Add(n, one) } as MathNode,
    right: { kind: 'factorial', arg: n } as MathNode,
    variables: ['n'],
    description: 'Γ(n+1) = n!'
  },
  // ζ(0) = -1/2
  {
    name: 'Zeta at 0',
    category: 'special',
    left: { kind: 'zeta', arg: zero } as MathNode,
    right: Div(one, N(-2)),
    variables: [],
    description: 'ζ(0) = -1/2'
  },
  // sin(π/6) = 1/2
  {
    name: 'Sine 30 degrees',
    category: 'special',
    left: Sin(Div(pi, N(6))),
    right: Div(one, two),
    variables: [],
    description: 'sin(π/6) = 1/2'
  },
  // cos(π/3) = 1/2
  {
    name: 'Cosine 60 degrees',
    category: 'special',
    left: Cos(Div(pi, N(3))),
    right: Div(one, two),
    variables: [],
    description: 'cos(π/3) = 1/2'
  },
  // sin(π/4) = √2/2
  {
    name: 'Sine 45 degrees',
    category: 'special',
    left: Sin(Div(pi, N(4))),
    right: Div({ kind: 'pow', base: two, exp: Div(one, two) } as MathNode, two),
    variables: [],
    description: 'sin(π/4) = √2/2'
  },
];

// ═══════════════════════════════════════════════════════════════
// MASTER IDENTITY DATABASE
// ═══════════════════════════════════════════════════════════════

export const ALL_IDENTITIES: Identity[] = [
  ...algebraic,
  ...trig,
  ...log,
  ...exp,
  ...calc,
  ...hyperbolic,
  ...special,
];

export const IDENTITY_COUNT = ALL_IDENTITIES.length;

export function getIdentitiesByCategory(category: Identity['category']): Identity[] {
  return ALL_IDENTITIES.filter(i => i.category === category);
}

export function getCategories(): Identity['category'][] {
  return [...new Set(ALL_IDENTITIES.map(i => i.category))];
}

/**
 * Check if two expressions are structurally identical.
 * Uses JSON comparison (exact match).
 */
export function expressionsMatch(a: MathNode, b: MathNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Try to prove an equation using known identities.
 * Returns the matching identity if found, null otherwise.
 */
export function findIdentityMatch(
  left: MathNode,
  right: MathNode,
  category?: Identity['category']
): Identity | null {
  const identities = category ? getIdentitiesByCategory(category) : ALL_IDENTITIES;

  for (const id of identities) {
    // Check both directions: left→right and right→left
    if (expressionsMatch(left, id.left) && expressionsMatch(right, id.right)) {
      return id;
    }
    if (expressionsMatch(left, id.right) && expressionsMatch(right, id.left)) {
      return id;
    }
  }

  return null;
}