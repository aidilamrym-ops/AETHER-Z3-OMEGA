/**
 * Z3 WebWorker with real z3-solver WASM
 * Self-contained - no external type dependencies
 */
import { init } from 'z3-solver';

let z3Context: any = null;

async function initializeZ3() {
  if (!z3Context) {
    const { Context } = await init();
    z3Context = Context('main');
  }
  return z3Context;
}

self.onmessage = async function(e: MessageEvent) {
  const { id, type, smt2 } = e.data;
  try {
    await initializeZ3();
    
    if (type === 'checkSat') {
      const result = await checkSatWithZ3(smt2);
      self.postMessage({ id, result });
    } else if (type === 'getModel') {
      self.postMessage({ id, result: {} });
    } else if (type === 'getUnsatCore') {
      self.postMessage({ id, result: [] });
    } else if (type === 'reset') {
      self.postMessage({ id, result: 'reset' });
    }
  } catch (error: any) {
    self.postMessage({ id, error: error.message });
  }
};

async function checkSatWithZ3(smt2: string) {
  try {
    const ctx = await getZ3();
    const solver = ctx.Solver();
    
    const assertions = parseSMT2Assertions(smt2);
    for (const assertion of assertions) {
      solver.assert(assertion);
    }
    
    const result = await solver.check();
    
    if (result === 'sat') {
      const model = await solver.model();
      const modelObj: Record<string, any> = {};
      if (model && model.entries) {
        for (const [key, value] of model.entries()) {
          modelObj[key] = value.toString();
        }
      }
      return { status: 'SAT', model: modelObj };
    } else if (result === 'unsat') {
      return { 
        status: 'UNSAT', 
        unsatCore: solver.unsatCore ? solver.unsatCore().map((c: any) => c.toString()) : [] 
      };
    } else {
      return { status: 'UNKNOWN' };
    }
  } catch (error: any) {
    return { 
      status: 'UNKNOWN', 
      model: undefined,
      unsatCore: undefined,
      error: error.message 
    };
  }
}

async function getZ3() {
  if (!z3Context) {
    const { Context } = await init();
    z3Context = Context('main');
  }
  return z3Context;
}

function parseSMT2Assertions(smt2: string): any[] {
  const assertions: any[] = [];
  const lines = smt2.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith(';'));
  
  let buffer = '';
  let parenDepth = 0;
  
  for (const line of lines) {
    buffer += ' ' + line;
    parenDepth += (line.match(/\(/g) || []).length;
    parenDepth -= (line.match(/\)/g) || []).length;
    
    if (parenDepth === 0 && buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('(assert')) {
        try {
          assertions.push(parseSMT2Expr(trimmed.slice(7, -1).trim()));
        } catch (e) {
          console.warn('Failed to parse assertion:', trimmed);
        }
      }
      buffer = '';
    }
  }
  
  return assertions;
}

function parseSMT2Expr(expr: string): any {
  expr = expr.trim();
  
  if (expr.startsWith('(not ')) {
    const inner = expr.slice(5, -1).trim();
    return z3Context.Not(parseSMT2Expr(inner));
  }
  
  if (expr.startsWith('(=')) {
    const inner = expr.slice(2, -1).trim();
    const parts = splitTopLevel(inner);
    if (parts.length === 2) {
      return z3Context.Eq(parseSMT2Expr(parts[0]), parseSMT2Expr(parts[1]));
    }
  }
  
  if (expr.startsWith('(and ')) {
    const inner = expr.slice(5, -1).trim();
    const parts = splitTopLevel(inner);
    return z3Context.And(...parts.map(parseSMT2Expr));
  }
  
  if (expr.startsWith('(or ')) {
    const inner = expr.slice(4, -1).trim();
    const parts = splitTopLevel(inner);
    return z3Context.Or(...parts.map(parseSMT2Expr));
  }
  
  for (const op of ['+', '-', '*', '/']) {
    if (expr.startsWith(`(${op} `)) {
      const inner = expr.slice(op.length + 2, -1).trim();
      const parts = splitTopLevel(inner);
      const args = parts.map(parseSMT2Expr);
      switch (op) {
        case '+': return z3Context.Add(...args);
        case '-': return args.length === 1 ? z3Context.Sub(z3Context.Int.val(0), args[0]) : z3Context.Sub(args[0], args[1]);
        case '*': return z3Context.Mul(...args);
        case '/': return z3Context.Div(args[0], args[1]);
      }
    }
  }
  
  for (const op of ['<', '<=', '>', '>=']) {
    if (expr.startsWith(`(${op} `)) {
      const inner = expr.slice(op.length + 2, -1).trim();
      const parts = splitTopLevel(inner);
      if (parts.length === 2) {
        const left = parseSMT2Expr(parts[0]);
        const right = parseSMT2Expr(parts[1]);
        switch (op) {
          case '<': return z3Context.Lt(left, right);
          case '<=': return z3Context.Le(left, right);
          case '>': return z3Context.Gt(left, right);
          case '>=': return z3Context.Ge(left, right);
        }
      }
    }
  }
  
  if (/^\d+$/.test(expr)) {
    return z3Context.Int.val(parseInt(expr));
  }
  if (/^\d+\.\d+$/.test(expr)) {
    return z3Context.Real.val(parseFloat(expr));
  }
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
    return z3Context.Int.const(expr);
  }
  
  if (expr === 'true') return z3Context.Bool.val(true);
  if (expr === 'false') return z3Context.Bool.val(false);
  
  return z3Context.Int.const(expr);
}

function splitTopLevel(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    
    if (c === '"' && (i === 0 || str[i-1] !== '\\')) {
      inString = !inString;
    }
    
    if (!inString) {
      if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    
    if (!inString && c === ' ' && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
    } else {
      current += c;
    }
  }
  
  if (current.trim()) parts.push(current.trim());
  return parts;
}