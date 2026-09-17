/**
 * LATEX / MATHEMATICAL NOTATION PARSER
 * Converts LaTeX strings and plain math notation to MathNode AST.
 * Supports: fractions, exponents, trig, integrals, sums, products, limits.
 */
import { MathNode, N, V, Add, Sub, Mul, Div, Pow, Neg, Sin, Cos, Tan, Ln, Exp } from './ast.js';

export function parseLatex(input: string): MathNode {
  const tokens = tokenize(input);
  const result = parseExpression(tokens, { pos: 0 });
  return result;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) { i++; continue; }

    // Single character operators
    if ('+-*/()=<>!'.includes(input[i])) {
      tokens.push(input[i]);
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(input[i]) || (input[i] === '.' && i + 1 < input.length && /\d/.test(input[i + 1]))) {
      let num = '';
      while (i < input.length && (/\d/.test(input[i]) || input[i] === '.')) {
        num += input[i++];
      }
      tokens.push(`NUM:${num}`);
      continue;
    }

    // Backslash commands: \frac, \sin, \pi, etc.
    if (input[i] === '\\') {
      i++;
      let cmd = '';
      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        cmd += input[i++];
      }
      if (cmd === '') {
        // escaped char
        tokens.push(input[i] || '');
        i++;
      } else {
        tokens.push(`CMD:${cmd}`);
      }
      continue;
    }

    // Letters (variables or function names)
    if (/[a-zA-Z]/.test(input[i])) {
      let word = '';
      while (i < input.length && /[a-zA-Z0-9]/.test(input[i])) {
        word += input[i++];
      }
      tokens.push(`VAR:${word}`);
      continue;
    }

    // Braces
    if (input[i] === '{') { tokens.push('LBRACE'); i++; continue; }
    if (input[i] === '}') { tokens.push('RBRACE'); i++; continue; }

    // Caret for exponents
    if (input[i] === '^') { tokens.push('CARET'); i++; continue; }
    if (input[i] === '_') { tokens.push('UNDERSCORE'); i++; continue; }

    i++;
  }
  return tokens;
}

interface TokenStream { pos: number }

function parseExpression(tokens: string[], state: TokenStream): MathNode {
  let left = parseTerm(tokens, state);

  while (state.pos < tokens.length && (tokens[state.pos] === '+' || tokens[state.pos] === '-')) {
    const op = tokens[state.pos++];
    const right = parseTerm(tokens, state);
    if (op === '+') left = Add(left, right);
    else left = Sub(left, right);
  }

  return left;
}

function parseTerm(tokens: string[], state: TokenStream): MathNode {
  let left = parsePower(tokens, state);

  while (state.pos < tokens.length && (tokens[state.pos] === '*' || tokens[state.pos] === '/' || tokens[state.pos] === 'CMD:cdot')) {
    const op = tokens[state.pos++];
    const right = parsePower(tokens, state);
    if (op === '/') left = Div(left, right);
    else left = Mul(left, right);
  }

  return left;
}

function parsePower(tokens: string[], state: TokenStream): MathNode {
  let base = parseAtom(tokens, state);

  while (state.pos < tokens.length && tokens[state.pos] === 'CARET') {
    state.pos++;
    const exp = parseAtom(tokens, state);
    base = Pow(base, exp);
  }

  return base;
}

function parseAtom(tokens: string[], state: TokenStream): MathNode {
  if (state.pos >= tokens.length) return N(0);

  const tok = tokens[state.pos];

  // Number
  if (tok.startsWith('NUM:')) {
    state.pos++;
    return N(parseFloat(tok.slice(4)));
  }

  // Unary minus
  if (tok === '-') {
    state.pos++;
    const operand = parseAtom(tokens, state);
    return Neg(operand);
  }

  // Parenthesized expression
  if (tok === '(') {
    state.pos++;
    const expr = parseExpression(tokens, state);
    if (state.pos < tokens.length && tokens[state.pos] === ')') state.pos++;
    return expr;
  }

  // Braced expression
  if (tok === 'LBRACE') {
    state.pos++;
    const expr = parseExpression(tokens, state);
    if (state.pos < tokens.length && tokens[state.pos] === 'RBRACE') state.pos++;
    return expr;
  }

  // Commands
  if (tok === 'CMD:frac') {
    state.pos++;
    // Expect two braced arguments
    const num = parseArg(tokens, state);
    const den = parseArg(tokens, state);
    return Div(num, den);
  }

  if (tok === 'CMD:pi') { state.pos++; return N(Math.PI); }
  if (tok === 'CMD:e') { state.pos++; return N(Math.E); }
  if (tok === 'CMD:infty' || tok === 'CMD:inf') { state.pos++; return N(Infinity); }
  if (tok === 'CMD:theta') { state.pos++; return V('theta'); }
  if (tok === 'CMD:alpha') { state.pos++; return V('alpha'); }
  if (tok === 'CMD:beta') { state.pos++; return V('beta'); }
  if (tok === 'CMD:gamma') { state.pos++; return V('gamma'); }
  if (tok === 'CMD:delta') { state.pos++; return V('delta'); }
  if (tok === 'CMD:lambda') { state.pos++; return V('lambda'); }
  if (tok === 'CMD:mu') { state.pos++; return V('mu'); }
  if (tok === 'CMD:sigma') { state.pos++; return V('sigma'); }
  if (tok === 'CMD:phi') { state.pos++; return V('phi'); }
  if (tok === 'CMD:omega') { state.pos++; return V('omega'); }
  if (tok === 'CMD:psi') { state.pos++; return V('psi'); }
  if (tok === 'CMD:Omega') { state.pos++; return V('Omega'); }

  // Functions
  if (tok === 'CMD:sin') { state.pos++; const a = parseAtom(tokens, state); return Sin(a); }
  if (tok === 'CMD:cos') { state.pos++; const a = parseAtom(tokens, state); return Cos(a); }
  if (tok === 'CMD:tan') { state.pos++; const a = parseAtom(tokens, state); return Tan(a); }
  if (tok === 'CMD:ln') { state.pos++; const a = parseAtom(tokens, state); return Ln(a); }
  if (tok === 'CMD:exp') { state.pos++; const a = parseAtom(tokens, state); return Exp(a); }
  if (tok === 'CMD:log') { state.pos++; const a = parseAtom(tokens, state); return { kind: 'log', base: N(10), arg: a }; }
  if (tok === 'CMD:sqrt') { state.pos++; const a = parseArg(tokens, state); return Pow(a, N(0.5)); }
  if (tok === 'CMD:abs') { state.pos++; const a = parseAtom(tokens, state); return { kind: 'abs', arg: a }; }

  // Integrals
  if (tok === 'CMD:int') {
    state.pos++;
    const lower = tokens[state.pos] === 'UNDERSCORE' ? (state.pos++, parseArg(tokens, state)) : N(-Infinity);
    const upper = tokens[state.pos] === 'CARET' ? (state.pos++, parseArg(tokens, state)) : N(Infinity);
    const integrand = parseAtom(tokens, state);
    // Expect dx
    if (state.pos < tokens.length && tokens[state.pos] === 'CMD:d') {
      state.pos++;
      if (state.pos < tokens.length && tokens[state.pos] === 'VAR:x') state.pos++;
    }
    return { kind: 'integral', var: 'x', lower, upper, expr: integrand };
  }

  // Sums
  if (tok === 'CMD:sum') {
    state.pos++;
    const lower = tokens[state.pos] === 'UNDERSCORE' ? (state.pos++, parseArg(tokens, state)) : N(0);
    const upper = tokens[state.pos] === 'CARET' ? (state.pos++, parseArg(tokens, state)) : N(Infinity);
    const body = parseAtom(tokens, state);
    return { kind: 'sum', var: 'n', lower, upper, expr: body };
  }

  // Products
  if (tok === 'CMD:prod') {
    state.pos++;
    const lower = tokens[state.pos] === 'UNDERSCORE' ? (state.pos++, parseArg(tokens, state)) : N(1);
    const upper = tokens[state.pos] === 'CARET' ? (state.pos++, parseArg(tokens, state)) : N(Infinity);
    const body = parseAtom(tokens, state);
    return { kind: 'prod', var: 'n', lower, upper, expr: body };
  }

  // Gamma, zeta, erf
  if (tok === 'CMD:Gamma') { state.pos++; const a = parseAtom(tokens, state); return { kind: 'gamma', arg: a }; }
  if (tok === 'CMD:zeta') { state.pos++; const a = parseAtom(tokens, state); return { kind: 'zeta', arg: a }; }
  if (tok === 'CMD:erf') { state.pos++; const a = parseAtom(tokens, state); return { kind: 'erf', arg: a }; }

  // Limits: \lim_{x \to 0} expr
  if (tok === 'CMD:lim') {
    state.pos++;
    let varName = 'x';
    let target: MathNode = N(0);
    // \lim_{x \to a}
    if (state.pos < tokens.length && tokens[state.pos] === 'UNDERSCORE') {
      state.pos++;
      if (tokens[state.pos] === 'LBRACE') {
        state.pos++;
        // read x
        if (state.pos < tokens.length && tokens[state.pos].startsWith('VAR:')) {
          varName = tokens[state.pos].slice(4);
          state.pos++;
        }
        // \to
        while (state.pos < tokens.length && !(tokens[state.pos] === 'CMD:to' || tokens[state.pos] === 'CMD:rightarrow')) {
          state.pos++;
        }
        if (state.pos < tokens.length) state.pos++; // skip \to
        target = parseAtom(tokens, state);
        if (state.pos < tokens.length && tokens[state.pos] === 'RBRACE') state.pos++;
      }
    }
    const expr = parseAtom(tokens, state);
    return { kind: 'limit', var: varName, target, dir: 'both', expr } as any;
  }

  // Variable
  if (tok.startsWith('VAR:')) {
    state.pos++;
    const name = tok.slice(4);

    // Subscript: x_0
    if (state.pos < tokens.length && tokens[state.pos] === 'UNDERSCORE') {
      state.pos++;
      const sub = parseArg(tokens, state);
      return V(`${name}_{${JSON.stringify(sub)}}`);  // nested subscript
    }

    // Check if it's followed by ( for function call
    if (state.pos < tokens.length && tokens[state.pos] === '(') {
      state.pos++;
      const args: MathNode[] = [];
      while (state.pos < tokens.length && tokens[state.pos] !== ')') {
        args.push(parseExpression(tokens, state));
        if (state.pos < tokens.length && tokens[state.pos] === ',') state.pos++;
      }
      if (state.pos < tokens.length) state.pos++; // skip )
      return { kind: 'func', name, args };
    }
    return V(name);
  }

  state.pos++;
  return N(0);
}

function parseArg(tokens: string[], state: TokenStream): MathNode {
  if (state.pos < tokens.length && tokens[state.pos] === 'LBRACE') {
    state.pos++;
    const expr = parseExpression(tokens, state);
    if (state.pos < tokens.length && tokens[state.pos] === 'RBRACE') state.pos++;
    return expr;
  }
  return parseAtom(tokens, state);
}

// ─── PLAIN TEXT MATH PARSER ────────────────────────────────────

export function parsePlainText(input: string): MathNode {
  // Clean up common plain-text math notation
  let cleaned = input
    .replace(/\^(\d+)/g, '^($1)')
    .replace(/\^/g, '^')
    .replace(/\*\*/g, '^')
    .replace(/sqrt\(/g, '\\sqrt(')
    .replace(/pi/g, '\\pi')
    .replace(/e\b/g, '\\e')
    .replace(/sin\(/g, '\\sin(')
    .replace(/cos\(/g, '\\cos(')
    .replace(/tan\(/g, '\\tan(')
    .replace(/ln\(/g, '\\ln(')
    .replace(/log\(/g, '\\log(')
    .replace(/exp\(/g, '\\exp(');

  return parseLatex(cleaned);
}