/**
 * AETHER-Z³ MATHEMATICAL ENGINE
 * MODULE: LEMMA VAULT (A4)
 *
 * Stores proven lemmas as HDC hypervectors for O(1) similarity retrieval.
 * Enables cross-session learning: each proof strengthens the next.
 */
import type { MathNode } from './ast.ts';
import { vars } from './ast.ts';
import { simplify } from './simplify.ts';
import { Hypervector } from '../memory/hippocampus.ts';

// ─── LEMMA TYPES ────────────────────────────────────────────────

export interface LemmaEntry {
  id: string;
  statement: MathNode;
  normalized: string;
  hypervector: Hypervector;
  confidence: number;
  method: string;
  proofSteps: string[];
  timestamp: number;
  reuseCount: number;
  tags: string[];
}

export interface LemmaSearchResult {
  lemma: LemmaEntry;
  similarity: number;
}

// ─── ENCODING ───────────────────────────────────────────────────

const TOKEN_MAP: Record<string, number> = {};
const VARIABLE_MAP: Record<string, number> = {};
let tokenCounter = 1;
let varCounter = 1000;

function getTokenId(token: string): number {
  if (!(token in TOKEN_MAP)) TOKEN_MAP[token] = tokenCounter++;
  return TOKEN_MAP[token];
}

function getVarId(name: string): number {
  if (!(name in VARIABLE_MAP)) VARIABLE_MAP[name] = varCounter++;
  return VARIABLE_MAP[name];
}

function encodeNode(node: MathNode, seed: number): Hypervector {
  let hv = Hypervector.random(seed);

  switch (node.kind) {
    case 'num': {
      const tokenHv = Hypervector.random(getTokenId('num') * 31);
      const valHv = Hypervector.random(Math.round(node.value * 1000 + 7919));
      hv = hv.bind(tokenHv).bind(valHv);
      break;
    }
    case 'var': {
      const tokenHv = Hypervector.random(getTokenId('var') * 37);
      const varHv = Hypervector.random(getVarId(node.name));
      hv = hv.bind(tokenHv).bind(varHv);
      break;
    }
    case 'binop': {
      const opHv = Hypervector.random(getTokenId(`binop:${node.op}`) * 43);
      const leftHv = encodeNode(node.left, seed * 2 + 1);
      const rightHv = encodeNode(node.right, seed * 2 + 2);
      hv = hv.bind(opHv).bind(leftHv).bind(rightHv);
      break;
    }
    case 'pow': {
      const tokenHv = Hypervector.random(getTokenId('pow') * 47);
      const baseHv = encodeNode(node.base, seed * 3 + 1);
      const expHv = encodeNode(node.exp, seed * 3 + 2);
      hv = hv.bind(tokenHv).bind(baseHv).bind(expHv);
      break;
    }
    case 'func': {
      const tokenHv = Hypervector.random(getTokenId(`func:${node.name}`) * 53);
      const argHvs = node.args.map((a, i) => encodeNode(a, seed * 5 + i));
      hv = hv.bind(tokenHv);
      for (const ah of argHvs) hv = hv.bind(ah);
      break;
    }
    case 'equation': {
      const tokenHv = Hypervector.random(getTokenId('equation') * 59);
      const leftHv = encodeNode(node.left, seed * 7 + 1);
      const rightHv = encodeNode(node.right, seed * 7 + 2);
      hv = hv.bind(tokenHv).bind(leftHv).bind(rightHv);
      break;
    }
    case 'unary': {
      const tokenHv = Hypervector.random(getTokenId(`unary:${node.op}`) * 61);
      const innerHv = encodeNode(node.operand, seed * 11 + 1);
      hv = hv.bind(tokenHv).bind(innerHv);
      break;
    }
    case 'rel': {
      const tokenHv = Hypervector.random(getTokenId(`rel:${node.op}`) * 67);
      const leftHv = encodeNode(node.left, seed * 13 + 1);
      const rightHv = encodeNode(node.right, seed * 13 + 2);
      hv = hv.bind(tokenHv).bind(leftHv).bind(rightHv);
      break;
    }
    default: {
      const tokenHv = Hypervector.random(getTokenId(`node:${node.kind}`) * 71);
      hv = hv.bind(tokenHv);
      break;
    }
  }

  return hv;
}

function normalizeNode(node: MathNode): string {
  const simplified = simplify(node);
  return JSON.stringify(simplified);
}

function extractTags(node: MathNode): string[] {
  const tags: string[] = [];
  const vs = vars(node);
  for (const v of vs) tags.push(`var:${v}`);

  if (node.kind === 'equation') tags.push('equation');
  if (node.kind === 'rel') tags.push(`rel:${node.op}`);

  const name = node.kind === 'func' ? node.name : '';
  if (['sin', 'cos', 'tan'].includes(name)) tags.push('trig');
  if (['log', 'exp'].includes(name)) tags.push('transcendental');
  if (name === 'gamma' || name === 'zeta') tags.push('special');
  if (node.kind === 'pow' && node.base.kind === 'var' && node.exp.kind === 'num') {
    tags.push(`degree:${node.exp.value}`);
  }

  return tags;
}

// ─── LEMMA VAULT ────────────────────────────────────────────────

export class LemmaVault {
  private readonly lemmas = new Map<string, LemmaEntry>();
  private readonly normalizedIndex = new Map<string, LemmaEntry>();
  private idCounter = 0;

  store(
    statement: MathNode,
    confidence: number,
    method: string,
    proofSteps: string[] = [],
    tags: string[] = []
  ): LemmaEntry {
    const normalized = normalizeNode(statement);
    const existing = this.normalizedIndex.get(normalized);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, confidence);
      existing.reuseCount++;
      existing.timestamp = Date.now();
      return existing;
    }

    const id = `lem-${++this.idCounter}`;
    const autoTags = extractTags(statement);
    const allTags = [...new Set([...tags, ...autoTags])];

    const hv = encodeNode(statement, this.idCounter * 127 + 42);

    const entry: LemmaEntry = {
      id,
      statement,
      normalized,
      hypervector: hv,
      confidence,
      method,
      proofSteps,
      timestamp: Date.now(),
      reuseCount: 0,
      tags: allTags,
    };

    this.lemmas.set(id, entry);
    this.normalizedIndex.set(normalized, entry);
    return entry;
  }


  retrieve(id: string): LemmaEntry | undefined {
    return this.lemmas.get(id);
  }

  searchBySimilarity(query: MathNode, topK = 5): LemmaSearchResult[] {
    const queryHv = encodeNode(query, 0xDEAD);
    const results: LemmaSearchResult[] = [];

    for (const lemma of this.lemmas.values()) {
      const sim = queryHv.similarity(lemma.hypervector);
      results.push({ lemma, similarity: sim });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  searchByTags(tags: string[]): LemmaEntry[] {
    return Array.from(this.lemmas.values()).filter(lemma =>
      tags.some(t => lemma.tags.includes(t))
    );
  }

  findByStatement(statement: MathNode): LemmaEntry | undefined {
    return this.normalizedIndex.get(normalizeNode(statement));
  }

  reuse(id: string): LemmaEntry | undefined {
    const entry = this.lemmas.get(id);
    if (entry) {
      entry.reuseCount++;
      entry.confidence = Math.min(1.0, entry.confidence + 0.01);
    }
    return entry;
  }

  size(): number {
    return this.lemmas.size;
  }

  all(): LemmaEntry[] {
    return Array.from(this.lemmas.values());
  }

  prune(minConfidence = 0.3, minReuse = 0): number {
    let pruned = 0;
    for (const [id, entry] of this.lemmas) {
      if (entry.confidence < minConfidence && entry.reuseCount < minReuse) {
        entry.hypervector.annihilate();
        this.lemmas.delete(id);
        this.normalizedIndex.delete(entry.normalized);
        pruned++;
      }
    }
    return pruned;
  }

  destroy(): void {
    for (const entry of this.lemmas.values()) {
      entry.hypervector.annihilate();
    }
    this.lemmas.clear();
    this.normalizedIndex.clear();
  }

  getStats(): { total: number; avgConfidence: number; totalReuse: number } {
    const entries = Array.from(this.lemmas.values());
    const total = entries.length;
    const avgConfidence = total > 0 ? entries.reduce((s, e) => s + e.confidence, 0) / total : 0;
    const totalReuse = entries.reduce((s, e) => s + e.reuseCount, 0);
    return { total, avgConfidence, totalReuse };
  }
}

// ─── GLOBAL INSTANCE ────────────────────────────────────────────

let globalVault: LemmaVault | null = null;

export function getGlobalLemmaVault(): LemmaVault {
  if (!globalVault) globalVault = new LemmaVault();
  return globalVault;
}

export function resetGlobalLemmaVault(): void {
  if (globalVault) globalVault.destroy();
  globalVault = null;
}
