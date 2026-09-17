/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: SELF-HEALING SEMANTIC LOSS KERNEL
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL DETERMINISTIC REPAIR
 *
 * DESCRIPTION: Zero-backend / WebWorker-friendly / doom-loop guarded
 * implementation of the AETHER-Z Self-Healing Semantic Loss Theorem.
 * Resolves [UNSAT] outputs by extracting Minimal Correction Sets (MCS)
 * and imposing mathematical penalties to heal LLM hallucinations.
 */

export type Z3Status = "SAT" | "UNSAT" | "UNKNOWN";

export interface SolverResult {
  status: Z3Status;
  unsatCore?: string[];
  raw?: string;
  model?: Record<string, unknown>;
}

export interface WeightedCoreItem {
  name: string;
  weight: number;
  formula?: string;
}

export interface MCSFeedback {
  core: WeightedCoreItem[];
  totalPenalty: number;
  repairedCore: WeightedCoreItem[];
  iteration: number;
  halted: boolean;
  reason?: string;
}

export interface SelfHealingInstruction {
  prompt: string;
  repairedConstraints: string[];
  removedConstraints: string[];
  penalty: number;
  stopReason: string;
}

export interface Z3WasmBridge {
  checkSat(smt2: string): Promise<SolverResult>;
  getUnsatCore?(): Promise<string[]>;
  getModel?(): Promise<Record<string, unknown>>;
}

export class DoomLoopGuard {
  private seen = new Set<string>();
  private maxIterations: number;

  constructor(maxIterations = 6) {
    this.maxIterations = Math.max(1, maxIterations);
  }

  signature(core: string[]): string {
    return [...core].sort().join("||");
  }

  shouldHalt(core: string[], iteration: number): { halt: boolean; reason?: string } {
    if (iteration >= this.maxIterations) {
      return { halt: true, reason: "max-iterations-exceeded" };
    }
    const sig = this.signature(core);
    if (this.seen.has(sig)) {
      return { halt: true, reason: "doom-loop-detected-same-core" };
    }
    this.seen.add(sig);
    return { halt: false };
  }
}

export function selectMCSCandidate(core: WeightedCoreItem[]): WeightedCoreItem[] {
  return [...core].sort((a, b) => a.weight - b.weight);
}

export function normalizeWeight(weight: number, max: number): number {
  return max === 0 ? 0 : weight / max;
}

export function apply_weighted_penalty(core: WeightedCoreItem[], lambda_weight: number): number {
  return core.reduce((acc, item) => acc + item.weight * lambda_weight, 0);
}

export function extractUnsatCoreFromSolver(result: SolverResult): string[] {
  return result.unsatCore || [];
}

export function buildWeightedCore(
  unsatCore: string[],
  weightMap: Record<string, number>,
): WeightedCoreItem[] {
  return unsatCore.map(name => ({
    name,
    weight: weightMap[name] || 1,
  }));
}

export function pruneCoreByPenalty(
  core: WeightedCoreItem[],
  lambda_weight: number,
  maxPenaltyRatio = 1.0,
): WeightedCoreItem[] {
  if (core.length === 0) return [];

  const sorted = selectMCSCandidate(core);
  const threshold = Math.max(0, lambda_weight) * Math.max(0, maxPenaltyRatio);
  const pruned: WeightedCoreItem[] = [];
  let acc = 0;

  for (const item of sorted) {
    const cost = normalizeWeight(item.weight, 1) * Math.max(0, lambda_weight);
    if (acc + cost <= threshold || pruned.length === 0) {
      pruned.push(item);
      acc += cost;
    }
  }

  return pruned;
}

export function renderSelfHealingPrompt(
  basePrompt: string,
  feedback: MCSFeedback,
): string {
  const removed = feedback.core
    .filter(x => !feedback.repairedCore.some(y => y.name === x.name))
    .map(x => x.name);

  const kept = feedback.repairedCore.map(x => x.name);

  return [
    basePrompt.trim(),
    "",
    "[AETHER-Z SELF-HEALING DIRECTIVE]",
    `- solver_status: UNSAT`,
    `- iteration: ${feedback.iteration}`,
    `- penalty: ${feedback.totalPenalty.toFixed(6)}`,
    `- removed_constraints: ${removed.length > 0 ? removed.join(", ") : "(none)"}`,
    `- retained_constraints: ${kept.length > 0 ? kept.join(", ") : "(none)"}`,
    `- instruction: rewrite the answer to satisfy retained constraints exactly; do not reintroduce removed constraints; preserve intent with minimal semantic drift; output only the corrected payload.`,
    feedback.reason ? `- stop_reason: ${feedback.reason}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function trigger_self_healing_loop(
  prompt: string,
  mcs_feedback: MCSFeedback,
): string {
  if (mcs_feedback.halted) {
    return [
      prompt.trim(),
      "",
      "[AETHER-Z HALT]",
      `- reason: ${mcs_feedback.reason ?? "unknown"}`,
      "- instruction: do not continue repair loop; provide safest minimal consistent response.",
    ].join("\n");
  }

  return renderSelfHealingPrompt(prompt, mcs_feedback);
}

export async function extractMCSFromUnsat(
  solver: Z3WasmBridge,
  smt2: string,
  weightMap: Record<string, number> = {},
  lambda_weight = 1,
  iteration = 0,
  guard = new DoomLoopGuard(),
): Promise<MCSFeedback> {
  let result: SolverResult;

  try {
    result = await solver.checkSat(smt2);
  } catch (error) {
    return {
      core: [],
      repairedCore: [],
      totalPenalty: 0,
      iteration,
      halted: true,
      reason: `solver-exception:${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (result.status === "SAT") {
    return {
      core: [],
      repairedCore: [],
      totalPenalty: 0,
      iteration,
      halted: false,
      reason: "sat-no-healing-required",
    };
  }

  if (result.status === "UNKNOWN") {
    return {
      core: [],
      repairedCore: [],
      totalPenalty: 0,
      iteration,
      halted: true,
      reason: "solver-unknown-timeout-safe-halt",
    };
  }

  const unsatCore = extractUnsatCoreFromSolver(result);
  const weightedCore = buildWeightedCore(unsatCore, weightMap);

  const doom = guard.shouldHalt(unsatCore, iteration);

  if (doom.halt) {
    return {
      core: weightedCore,
      repairedCore: [],
      totalPenalty: apply_weighted_penalty(weightedCore, lambda_weight),
      iteration,
      halted: true,
      reason: doom.reason,
    };
  }

  const repairedCore = pruneCoreByPenalty(weightedCore, lambda_weight, 1.0);
  const totalPenalty = apply_weighted_penalty(repairedCore, lambda_weight);

  return {
    core: weightedCore,
    repairedCore,
    totalPenalty,
    iteration,
    halted: false,
  };
}

export async function solveWithSelfHealing(
  solver: Z3WasmBridge,
  initialPrompt: string,
  smt2: string,
  weightMap: Record<string, number> = {},
  lambda_weight = 1,
  maxIterations = 6,
): Promise<{
  finalPrompt: string;
  feedback: MCSFeedback;
  status: Z3Status;
}> {
  const guard = new DoomLoopGuard(maxIterations);

  let currentSmt = smt2;
  let currentPrompt = initialPrompt;
  let feedback: MCSFeedback = {
    core: [],
    repairedCore: [],
    totalPenalty: 0,
    iteration: 0,
    halted: false,
  };
  let status: Z3Status = "UNKNOWN";

  for (let i = 0; i < maxIterations; i++) {
    const res = await extractMCSFromUnsat(
      solver,
      currentSmt,
      weightMap,
      lambda_weight,
      i,
      guard,
    );

    feedback = res;
    if (res.halted && res.reason === "sat-no-healing-required") {
      status = "SAT";
      break;
    }

    const solverResult = await solver.checkSat(currentSmt);
    status = solverResult.status;

    if (status === "SAT") break;

    if (status === "UNKNOWN") {
      feedback = { ...res, halted: true, reason: "unknown-status-halt" };
      break;
    }

    if (res.halted) break;

    const instruction = trigger_self_healing_loop(currentPrompt, res);
    currentPrompt = instruction;

    const repairedConstraints = res.repairedCore.map(x => x.name);
    currentSmt = currentSmt
      .split("\n")
      .filter(line => !repairedConstraints.some(name => line.includes(name)))
      .join("\n");

    if (currentSmt.trim().length === 0) {
      feedback = { ...res, halted: true, reason: "empty-repair-state" };
      break;
    }
  }

  return { finalPrompt: currentPrompt, feedback, status };
}

export function makeMCSFeedback(
  coreNames: string[],
  weightMap: Record<string, number>,
): Record<string, number> {
  const mapping: Record<string, number> = {};
  coreNames.forEach(name => {
    mapping[name] = weightMap[name] || 1;
  });
  return mapping;
}
