/**
 * AETHER-Z³ MATHEMATICAL ENGINE
 * MODULE: CORE AST (Abstract Syntax Tree)
 *
 * The universal symbolic representation for all mathematics.
 * Every expression — from "2+2" to the Riemann zeta function —
 * is represented as a tree that can be transformed, simplified,
 * differentiated, integrated, and verified.
 */

// ─── NODE TYPES ────────────────────────────────────────────────

export type MathNode =
  | NumNode
  | VarNode
  | BinOpNode
  | UnaryOpNode
  | FuncNode
  | DiffNode
  | IntegralNode
  | SumNode
  | ProdNode
  | LimitNode
  | MatrixNode
  | VectorNode
  | SetNode
  | RelationNode
  | QuantifierNode
  | PiecewiseNode
  | CeilNode
  | FloorNode
  | AbsNode
  | LogNode
  | ExpNode
  | PowNode
  | ModNode
  | FactorialNode
  | BinomialNode
  | PolygammaNode
  | GammaNode
  | ZetaNode
  | ERFNode
  | IntegralNode2D
  | EquationNode;

export interface NumNode { kind: 'num'; value: number; exact?: boolean }
export interface VarNode { kind: 'var'; name: string; sub?: string }
export interface BinOpNode { kind: 'binop'; op: '+' | '-' | '*' | '/' | '^' | 'dot' | 'cross' | 'wedge' | 'compose'; left: MathNode; right: MathNode }
export interface UnaryOpNode { kind: 'unary'; op: '-' | '+' | 'd/dx' | 'partial' | 'neg'; operand: MathNode }
export interface FuncNode { kind: 'func'; name: string; args: MathNode[] }
export interface DiffNode { kind: 'diff'; wrt: string; order: number; expr: MathNode }
export interface IntegralNode { kind: 'integral'; var: string; lower: MathNode; upper: MathNode; expr: MathNode }
export interface SumNode { kind: 'sum'; var: string; lower: MathNode; upper: MathNode; expr: MathNode }
export interface ProdNode { kind: 'prod'; var: string; lower: MathNode; upper: MathNode; expr: MathNode }
export interface LimitNode { kind: 'limit'; var: string; target: MathNode; dir: 'left' | 'right' | 'both'; expr: MathNode }
export interface MatrixNode { kind: 'matrix'; rows: number; cols: number; entries: MathNode[][] }
export interface VectorNode { kind: 'vector'; entries: MathNode[] }
export interface SetNode { kind: 'set'; elements: MathNode[]; predicate?: { var: MathNode; body: MathNode } }
export interface RelationNode { kind: 'rel'; op: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'subset' | 'element' | 'equiv'; left: MathNode; right: MathNode }
export interface QuantifierNode { kind: 'quant'; quant: 'forall' | 'exists'; var: string; domain?: string; body: MathNode }
export interface PiecewiseNode { kind: 'piecewise'; cases: Array<{ cond: MathNode; val: MathNode }>; default?: MathNode }
export interface CeilNode { kind: 'ceil'; arg: MathNode }
export interface FloorNode { kind: 'floor'; arg: MathNode }
export interface AbsNode { kind: 'abs'; arg: MathNode }
export interface LogNode { kind: 'log'; base: MathNode; arg: MathNode }
export interface ExpNode { kind: 'exp'; arg: MathNode }
export interface PowNode { kind: 'pow'; base: MathNode; exp: MathNode }
export interface ModNode { kind: 'mod'; a: MathNode; b: MathNode }
export interface FactorialNode { kind: 'factorial'; arg: MathNode }
export interface BinomialNode { kind: 'binomial'; n: MathNode; k: MathNode }
export interface PolygammaNode { kind: 'polygamma'; order: MathNode; arg: MathNode }
export interface GammaNode { kind: 'gamma'; arg: MathNode }
export interface ZetaNode { kind: 'zeta'; arg: MathNode }
export interface ERFNode { kind: 'erf'; arg: MathNode }
export interface IntegralNode2D { kind: 'integral2d'; var1: string; var2: string; lower1: MathNode; upper1: MathNode; lower2: MathNode; upper2: MathNode; expr: MathNode }
export interface EquationNode { kind: 'equation'; left: MathNode; right: MathNode }

// ─── CONSTRUCTORS ──────────────────────────────────────────────

export function N(value: number, exact = false): NumNode { return { kind: 'num', value, exact }; }
export function V(name: string, sub?: string): VarNode { return { kind: 'var', name, sub }; }
export function Add(l: MathNode, r: MathNode): BinOpNode { return { kind: 'binop', op: '+', left: l, right: r }; }
export function Sub(l: MathNode, r: MathNode): BinOpNode { return { kind: 'binop', op: '-', left: l, right: r }; }
export function Mul(l: MathNode, r: MathNode): BinOpNode { return { kind: 'binop', op: '*', left: l, right: r }; }
export function Div(l: MathNode, r: MathNode): BinOpNode { return { kind: 'binop', op: '/', left: l, right: r }; }
export function Pow(b: MathNode, e: MathNode): PowNode { return { kind: 'pow', base: b, exp: e }; }
export function Neg(e: MathNode): UnaryOpNode { return { kind: 'unary', op: '-', operand: e }; }
export function Abs(e: MathNode): AbsNode { return { kind: 'abs', arg: e }; }
export function Ln(e: MathNode): LogNode { return { kind: 'log', base: N(Math.E), arg: e }; }
export function Log10(e: MathNode): LogNode { return { kind: 'log', base: N(10), arg: e }; }
export function LogBase(b: MathNode, e: MathNode): LogNode { return { kind: 'log', base: b, arg: e }; }
export function Sin(e: MathNode): FuncNode { return { kind: 'func', name: 'sin', args: [e] }; }
export function Cos(e: MathNode): FuncNode { return { kind: 'func', name: 'cos', args: [e] }; }
export function Tan(e: MathNode): FuncNode { return { kind: 'func', name: 'tan', args: [e] }; }
export function ArcSin(e: MathNode): FuncNode { return { kind: 'func', name: 'asin', args: [e] }; }
export function ArcCos(e: MathNode): FuncNode { return { kind: 'func', name: 'acos', args: [e] }; }
export function ArcTan(e: MathNode): FuncNode { return { kind: 'func', name: 'atan', args: [e] }; }
export function Sinh(e: MathNode): FuncNode { return { kind: 'func', name: 'sinh', args: [e] }; }
export function Cosh(e: MathNode): FuncNode { return { kind: 'func', name: 'cosh', args: [e] }; }
export function Tanh(e: MathNode): FuncNode { return { kind: 'func', name: 'tanh', args: [e] }; }
export function Sqrt(e: MathNode): PowNode { return { kind: 'pow', base: e, exp: N(0.5) }; }
export function Fact(e: MathNode): FactorialNode { return { kind: 'factorial', arg: e }; }
export function Gamma(e: MathNode): GammaNode { return { kind: 'gamma', arg: e }; }
export function Zeta(e: MathNode): ZetaNode { return { kind: 'zeta', arg: e }; }
export function Erf(e: MathNode): ERFNode { return { kind: 'erf', arg: e }; }
export function Exp(e: MathNode): ExpNode { return { kind: 'exp', arg: e }; }

export function Diff(wrt: string, expr: MathNode, order = 1): DiffNode {
  return { kind: 'diff', wrt, order, expr };
}

export function Integral(varName: string, lower: MathNode, upper: MathNode, expr: MathNode): IntegralNode {
  return { kind: 'integral', var: varName, lower, upper, expr };
}

export function Sum(varName: string, lower: MathNode, upper: MathNode, expr: MathNode): SumNode {
  return { kind: 'sum', var: varName, lower, upper, expr };
}

export function Prod(varName: string, lower: MathNode, upper: MathNode, expr: MathNode): ProdNode {
  return { kind: 'prod', var: varName, lower, upper, expr };
}

export function Limit(varName: string, target: MathNode, expr: MathNode, dir: 'left' | 'right' | 'both' = 'both'): LimitNode {
  return { kind: 'limit', var: varName, target, dir, expr };
}

export function Eq(l: MathNode, r: MathNode): EquationNode { return { kind: 'equation', left: l, right: r }; }
export function Rel(op: RelationNode['op'], l: MathNode, r: MathNode): RelationNode { return { kind: 'rel', op, left: l, right: r }; }
export function ForAll(v: string, body: MathNode): QuantifierNode { return { kind: 'quant', quant: 'forall', var: v, body }; }
export function Exists(v: string, body: MathNode): QuantifierNode { return { kind: 'quant', quant: 'exists', var: v, body }; }

export const PI: NumNode = { kind: 'num', value: Math.PI, exact: true };
export const E_CONST: NumNode = { kind: 'num', value: Math.E, exact: true };
export const I_CONST: FuncNode = { kind: 'func', name: 'i', args: [] };
export const BOUNDED_LIMIT: NumNode = { kind: 'num', value: 1e80, exact: false }; // Qadar: Batas komputasi partikel semesta
export const INFINITY = BOUNDED_LIMIT; 


// ─── UTILITY ───────────────────────────────────────────────────

export function isNumeric(node: MathNode): node is NumNode { return node.kind === 'num'; }
export function isVariable(node: MathNode): node is VarNode { return node.kind === 'var'; }
export function isConstant(node: MathNode): boolean {
  return node.kind === 'num' || (node.kind === 'var' && (node.name === 'pi' || node.name === 'e' || node.name === 'i'));
}

export function depth(node: MathNode): number {
  switch (node.kind) {
    case 'num': case 'var': return 0;
    case 'unary': case 'abs': case 'ceil': case 'floor': case 'factorial': case 'gamma': case 'zeta': case 'erf': case 'exp': return 1 + depth(node.kind === 'unary' ? node.operand : (node as any).arg);
    case 'log': return 1 + Math.max(depth(node.base), depth(node.arg));
    case 'pow': return 1 + Math.max(depth(node.base), depth(node.exp));
    case 'binop': return 1 + Math.max(depth(node.left), depth(node.right));
    case 'func': return 1 + Math.max(...node.args.map(depth));
    case 'diff': case 'integral': case 'sum': case 'prod': case 'limit': return 2;
    case 'quant': return 2 + depth(node.body);
    case 'equation': case 'rel': return 1 + Math.max(depth(node.left), depth(node.right));
    default: return 1;
  }
}

export function size(node: MathNode): number {
  switch (node.kind) {
    case 'num': case 'var': return 1;
    case 'unary': return 1 + size(node.operand);
    case 'abs': case 'ceil': case 'floor': case 'factorial': case 'gamma': case 'zeta': case 'erf': case 'exp': return 1 + size((node as any).arg);
    case 'log': return 1 + size(node.base) + size(node.arg);
    case 'pow': return 1 + size(node.base) + size(node.exp);
    case 'binop': return 1 + size(node.left) + size(node.right);
    case 'func': return 1 + node.args.reduce((s, a) => s + size(a), 0);
    case 'diff': return 2 + size(node.expr);
    case 'integral': case 'sum': case 'prod': return 3 + size(node.expr);
    case 'limit': return 3 + size(node.expr);
    case 'quant': return 2 + size(node.body);
    case 'equation': case 'rel': return 1 + size(node.left) + size(node.right);
    default: return 1;
  }
}

export function occurs(v: string, node: MathNode): boolean {
  switch (node.kind) {
    case 'var': return node.name === v;
    case 'num': return false;
    case 'unary': return occurs(v, node.operand);
    case 'abs': case 'ceil': case 'floor': case 'factorial': case 'gamma': case 'zeta': case 'erf': case 'exp': return occurs(v, (node as any).arg);
    case 'log': return occurs(v, node.base) || occurs(v, node.arg);
    case 'pow': return occurs(v, node.base) || occurs(v, node.exp);
    case 'binop': return occurs(v, node.left) || occurs(v, node.right);
    case 'func': return node.args.some(a => occurs(v, a));
    case 'diff': return occurs(v, node.expr);
    case 'integral': case 'sum': case 'prod': return v !== node.var && occurs(v, node.expr);
    case 'limit': return v !== node.var && occurs(v, node.expr);
    case 'quant': return v !== node.var && occurs(v, node.body);
    case 'equation': case 'rel': return occurs(v, node.left) || occurs(v, node.right);
    default: return false;
  }
}

export function substitute(node: MathNode, v: string, replacement: MathNode): MathNode {
  if (node.kind === 'var' && node.name === v) return replacement;
  if (node.kind === 'num') return node;
  if (node.kind === 'unary') return { ...node, operand: substitute(node.operand, v, replacement) };
  if (node.kind === 'binop') return { ...node, left: substitute(node.left, v, replacement), right: substitute(node.right, v, replacement) };
  if (node.kind === 'pow') return { ...node, base: substitute(node.base, v, replacement), exp: substitute(node.exp, v, replacement) };
  if (node.kind === 'log') return { ...node, base: substitute(node.base, v, replacement), arg: substitute(node.arg, v, replacement) };
  if (node.kind === 'func') return { ...node, args: node.args.map(a => substitute(a, v, replacement)) };
  if (node.kind === 'equation') return { ...node, left: substitute(node.left, v, replacement), right: substitute(node.right, v, replacement) };
  if (node.kind === 'rel') return { ...node, left: substitute(node.left, v, replacement), right: substitute(node.right, v, replacement) };
  if (node.kind === 'diff') return { ...node, expr: substitute(node.expr, v, replacement) };
  if ((node.kind === 'integral' || node.kind === 'sum' || node.kind === 'prod') && v !== node.var) {
    return { ...node, expr: substitute(node.expr, v, replacement) };
  }
  if (node.kind === 'limit' && v !== node.var) {
    return { ...node, expr: substitute(node.expr, v, replacement) };
  }
  return node;
}

export function vars(node: MathNode): Set<string> {
  const result = new Set<string>();
  function walk(n: MathNode) {
    if (n.kind === 'var') result.add(n.name);
    else if (n.kind === 'unary') walk(n.operand);
    else if (n.kind === 'binop') { walk(n.left); walk(n.right); }
    else if (n.kind === 'pow') { walk(n.base); walk(n.exp); }
    else if (n.kind === 'log') { walk(n.base); walk(n.arg); }
    else if (n.kind === 'func') n.args.forEach(walk);
    else if (n.kind === 'diff' || n.kind === 'integral' || n.kind === 'sum' || n.kind === 'prod' || n.kind === 'limit') walk(n.expr);
    else if (n.kind === 'equation' || n.kind === 'rel') { walk(n.left); walk(n.right); }
  }
  walk(node);
  return result;
}