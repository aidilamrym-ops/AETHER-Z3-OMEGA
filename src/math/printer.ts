/**
 * MATHEMATICAL PRINTER
 * Converts MathNode AST to human-readable LaTeX and plain text.
 * This is how the system communicates its mathematical reasoning.
 */
import { MathNode } from './ast.js';

export function toLatex(node: MathNode): string {
  switch (node.kind) {
    case 'num': return node.value === Math.PI ? '\\pi' : node.value === Math.E ? 'e' : formatNum(node.value);
    case 'var': return node.name;
    case 'unary': return node.op === '-' ? `-${toLatex(node.operand)}` : toLatex(node.operand);
    case 'binop': {
      const l = toLatex(node.left);
      const r = toLatex(node.right);
      if (node.op === '+') return `${l} + ${r}`;
      if (node.op === '-') return `${l} - ${r}`;
      if (node.op === '*') return `${wrapMul(l)} \\cdot ${wrapMul(r)}`;
      if (node.op === '/') return `\\frac{${l}}{${r}}`;
      if (node.op === '^') return `{${wrapPow(l)}}^{${r}}`;
      return `${l} ${node.op} ${r}`;
    }
    case 'pow': return `{${toLatex(node.base)}}^{${toLatex(node.exp)}}`;
    case 'log': {
      const base = toLatex(node.base);
      const arg = toLatex(node.arg);
      if (base === String(Math.E)) return `\\ln ${wrapArg(arg)}`;
      if (base === '10') return `\\log_{10} ${wrapArg(arg)}`;
      return `\\log_{${base}} ${wrapArg(arg)}`;
    }
    case 'func': return `\\${node.name}(${node.args.map(toLatex).join(', ')})`;
    case 'abs': return `\\left|${toLatex(node.arg)}\\right|`;
    case 'factorial': return `{${toLatex(node.arg)}}!`;
    case 'gamma': return `\\Gamma(${toLatex(node.arg)})`;
    case 'zeta': return `\\zeta(${toLatex(node.arg)})`;
    case 'erf': return `\\mathrm{erf}(${toLatex(node.arg)})`;
    case 'exp': return `e^{${toLatex(node.arg)}}`;
    case 'diff': {
      const order = node.order > 1 ? `^{(${node.order})}` : '';
      return `\\frac{${order}d${toLatex(node.expr)}}{d${node.wrt}${order}}`;
    }
    case 'integral': {
      const lo = toLatex(node.lower);
      const hi = toLatex(node.upper);
      return `\\int_{${lo}}^{${hi}} ${toLatex(node.expr)} \\, d${node.var}`;
    }
    case 'sum': return `\\sum_{${node.var}=${toLatex(node.lower)}}^{${toLatex(node.upper)}} ${toLatex(node.expr)}`;
    case 'prod': return `\\prod_{${node.var}=${toLatex(node.lower)}}^{${toLatex(node.upper)}} ${toLatex(node.expr)}`;
    case 'limit': return `\\lim_{${node.var} \\to ${toLatex(node.target)}} ${toLatex(node.expr)}`;
    case 'equation': return `${toLatex(node.left)} = ${toLatex(node.right)}`;
    case 'rel': return `${toLatex(node.left)} ${node.op === '!=' ? '\\neq' : node.op === '<=' ? '\\leq' : node.op === '>=' ? '\\geq' : node.op === 'equiv' ? '\\equiv' : node.op} ${toLatex(node.right)}`;
    case 'quant': return `${node.quant === 'forall' ? '\\forall' : '\\exists'} ${node.var} : ${toLatex(node.body)}`;
    case 'ceil': return `\\lceil ${toLatex(node.arg)} \\rceil`;
    case 'floor': return `\\lfloor ${toLatex(node.arg)} \\rfloor`;
    case 'matrix': return `\\begin{pmatrix} ${node.entries.map(row => row.map(toLatex).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
    case 'vector': return `\\begin{pmatrix} ${node.entries.map(toLatex).join(' \\\\ ')} \\end{pmatrix}`;
    default: return '??';
  }
}

export function toPlain(node: MathNode): string {
  switch (node.kind) {
    case 'num': return String(node.value);
    case 'var': return node.name;
    case 'unary': return `-${toPlain(node.operand)}`;
    case 'binop': {
      const l = toPlain(node.left);
      const r = toPlain(node.right);
      if (node.op === '+') return `(${l} + ${r})`;
      if (node.op === '-') return `(${l} - ${r})`;
      if (node.op === '*') return `(${l} * ${r})`;
      if (node.op === '/') return `(${l} / ${r})`;
      if (node.op === '^') return `(${l}^${r})`;
      return `(${l} ${node.op} ${r})`;
    }
    case 'pow': return `(${toPlain(node.base)}^${toPlain(node.exp)})`;
    case 'log': return `log(${toPlain(node.base)}, ${toPlain(node.arg)})`;
    case 'func': return `${node.name}(${node.args.map(toPlain).join(', ')})`;
    case 'abs': return `|${toPlain(node.arg)}|`;
    case 'factorial': return `(${toPlain(node.arg)}!)`;
    case 'gamma': return `Gamma(${toPlain(node.arg)})`;
    case 'zeta': return `zeta(${toPlain(node.arg)})`;
    case 'erf': return `erf(${toPlain(node.arg)})`;
    case 'exp': return `exp(${toPlain(node.arg)})`;
    case 'diff': return `d/d${node.wrt}(${toPlain(node.expr)})`;
    case 'integral': return `int(${toPlain(node.lower)}, ${toPlain(node.upper)}, ${toPlain(node.expr)}, d${node.var})`;
    case 'sum': return `sum(${node.var}, ${toPlain(node.lower)}, ${toPlain(node.upper)}, ${toPlain(node.expr)})`;
    case 'prod': return `prod(${node.var}, ${toPlain(node.lower)}, ${toPlain(node.upper)}, ${toPlain(node.expr)})`;
    case 'limit': return `lim(${node.var} -> ${toPlain(node.target)}, ${toPlain(node.expr)})`;
    case 'equation': return `${toPlain(node.left)} = ${toPlain(node.right)}`;
    case 'rel': return `${toPlain(node.left)} ${node.op} ${toPlain(node.right)}`;
    case 'quant': return `${node.quant} ${node.var}: ${toPlain(node.body)}`;
    default: return '??';
  }
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  if (Math.abs(n - Math.PI) < 1e-10) return '\\pi';
  if (Math.abs(n - Math.E) < 1e-10) return 'e';
  return Number(n.toFixed(12)).toString();
}

function wrapMul(s: string): string {
  return s.includes('+') || s.includes('-') || s.includes('/') ? `\\left(${s}\\right)` : s;
}

function wrapPow(s: string): string {
  return s.includes('+') || s.includes('-') || s.includes('/') || s.includes('\\cdot') ? `\\left(${s}\\right)` : s;
}

function wrapArg(s: string): string {
  return s.includes('+') || s.includes('-') || s.includes('/') ? `\\left(${s}\\right)` : s;
}

export function toLatexAligned(equations: Array<{ left: string; right: string }>): string {
  const lines = equations.map(e => `${e.left} &= ${e.right}`).join(' \\\\\n');
  return `\\begin{aligned}\n${lines}\n\\end{aligned}`;
}

export function proofBlock(title: string, steps: string[]): string {
  let block = `\\textbf{${title}}\n\\begin{proof}\n`;
  steps.forEach((s, i) => {
    block += `\\textit{Step ${i + 1}:} ${s}\n\n`;
  });
  block += `\\end{proof}`;
  return block;
}

export function theoremStatement(name: string, statement: string, proof?: string): string {
  let result = `\\begin{theorem}[${name}]\n${statement}\n\\end{theorem}`;
  if (proof) result += `\n\\begin{proof}\n${proof}\n\\end{proof}`;
  return result;
}