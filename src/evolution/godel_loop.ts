/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: OROBOROS-LAMARCK (EVOLUTIONARY SINGULARITY)
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL SELF-HEALING EVOLUTION ENGINE
 *
 * DESCRIPTION: Lamarckian evolution engine & Promptbreeder.
 * Takes MCS failure data from Z3, mutates agent instructions, and runs
 * Binary Tournament Selection. Zero human in the loop.
 */

import type { MCSFeedback, Z3WasmBridge, Z3Status } from "../solver/semantic_loss.js";
import { extractMCSFromUnsat } from "../solver/semantic_loss.js";

export interface EvolvedPrompt {
  prompt: string;
  generation: number;
  fitnessScore: number;
  z3Status: Z3Status;
  lineageTrace: string[];
}

export interface MutationTrace {
  originalPrompt: string;
  mutatedPrompt: string;
  mcsFeedback: MCSFeedback;
  generation: number;
  timestamp: number;
}

const LAMARCKIAN_THRESHOLD = 0.30;
const HYPERMUTATION_THRESHOLD = 0.60;

export class PromptBreederEngine {
  private readonly MAX_POPULATION = 50;
  private generation = 0;
  private readonly population: EvolvedPrompt[] = [];

  private readonly mcsWeightMap: Record<string, number>;
  private readonly lambdaWeight: number;

  constructor(mcsWeightMap: Record<string, number> = {}, lambdaWeight = 1) {
    this.mcsWeightMap = mcsWeightMap;
    this.lambdaWeight = lambdaWeight;
  }

  public async evolveAgentDirective(
    _solver: Z3WasmBridge,
    taskPrompt: string,
    mutationPrompt: string,
    failureTraceMCS: MCSFeedback,
  ): Promise<EvolvedPrompt> {
    this.generation++;

    const failureSeverity = failureTraceMCS.totalPenalty;
    const normalizedSeverity = Math.min(1.0, failureSeverity / 10);

    let mutatedPrompt: string;

    if (normalizedSeverity < LAMARCKIAN_THRESHOLD) {
      mutatedPrompt = await this.applyLamarckianMutation(taskPrompt, failureTraceMCS);
    } else if (normalizedSeverity < HYPERMUTATION_THRESHOLD) {
      mutatedPrompt = await this.applyHyperMutation(mutationPrompt);
    } else {
      mutatedPrompt = await this.applyDirectMutation(taskPrompt, mutationPrompt);
    }

    const evolved: EvolvedPrompt = {
      prompt: mutatedPrompt,
      generation: this.generation,
      fitnessScore: normalizedSeverity,
      z3Status: "UNKNOWN",
      lineageTrace: [`gen_${this.generation}:severity=${normalizedSeverity.toFixed(4)}`],
    };

    this.population.push(evolved);
    if (this.population.length > this.MAX_POPULATION) {
      this.population.shift();
    }

    return evolved;
  }

  private async applyLamarckianMutation(prompt: string, mcsFeedback: MCSFeedback): Promise<string> {
    const removedConstraints = mcsFeedback.core
      .filter(x => !mcsFeedback.repairedCore.some(y => y.name === x.name))
      .map(x => x.name);

    const retainedConstraints = mcsFeedback.repairedCore.map(x => x.name);

    const lines = [
      prompt.trim(),
      "",
      "[OROBOROS-LAMARCK EVOLUTIONARY DIRECTIVE]",
      `generation: ${this.generation}`,
      `failure_penalty: ${mcsFeedback.totalPenalty.toFixed(6)}`,
      `removed_constraints: ${removedConstraints.length > 0 ? removedConstraints.join(", ") : "(none)"}`,
      `retained_constraints: ${retainedConstraints.length > 0 ? retainedConstraints.join(", ") : "(none)"}`,
      "",
      "INSTRUCTION: You failed Z3 Tribunal in a previous generation.",
      "The constraints listed above were removed because they caused logical contradictions.",
      "Rewrite your response to satisfy ONLY the retained constraints.",
      "Do NOT reintroduce removed constraints. Minimize semantic drift from original intent.",
      "Output ONLY the corrected payload.",
    ];

    return lines.join("\n");
  }

  private async applyHyperMutation(mutationPrompt: string): Promise<string> {
    const mutations = [
      "INVERT_APPROACH: Reverse your previous reasoning direction entirely.",
      "CONSTRAINT_INJECTION: Add a stricter boundary condition that was previously absent.",
      "DIMENSIONAL_SHIFT: Reframe the problem in a different logical domain.",
      "COMPRESSION: Reduce your output to only the 3 most critical factual claims.",
      "ABLATION: Remove the most complex part of your previous reasoning and rebuild from fundamentals.",
    ];

    const selectedMutation = mutations[this.generation % mutations.length];

    const lines = [
      mutationPrompt.trim(),
      "",
      "[OROBOROS HYPERMUTATION — FIRST-ORDER]",
      `generation: ${this.generation}`,
      `mutation_type: first_order`,
      `mutation_directive: ${selectedMutation}`,
      "",
      "INSTRUCTION: You are now mutating your own mutation strategy.",
      "Apply the above mutation directive to your previous approach.",
      "Output the complete revised strategy.",
    ];

    return lines.join("\n");
  }

  private async applyDirectMutation(task: string, mutation: string): Promise<string> {
    const lines = [
      task.trim(),
      "",
      "[OROBOROS DIRECT MUTATION — ZERO-ORDER]",
      `generation: ${this.generation}`,
      `mutation_type: zero_order`,
      "",
      mutation.trim(),
      "",
      "INSTRUCTION: Apply the mutation directive above to produce a corrected output.",
    ];

    return lines.join("\n");
  }

  public async binaryTournament(
    solver: Z3WasmBridge,
    candidateA: string,
    candidateB: string,
    smtTemplate: string,
  ): Promise<{ winner: string; loser: string; results: { a: Z3Status; b: Z3Status } }> {
    const resultA = await extractMCSFromUnsat(solver, smtTemplate, this.mcsWeightMap, this.lambdaWeight);
    const resultB = await extractMCSFromUnsat(solver, smtTemplate, this.mcsWeightMap, this.lambdaWeight);

    const statusA: Z3Status = resultA.halted && resultA.reason === "sat-no-healing-required" ? "SAT" : resultA.halted ? "UNSAT" : "SAT";
    const statusB: Z3Status = resultB.halted && resultB.reason === "sat-no-healing-required" ? "SAT" : resultB.halted ? "UNSAT" : "SAT";

    if (statusA === "SAT" && statusB !== "SAT") {
      return { winner: candidateA, loser: candidateB, results: { a: statusA, b: statusB } };
    }
    if (statusB === "SAT" && statusA !== "SAT") {
      return { winner: candidateB, loser: candidateA, results: { a: statusA, b: statusB } };
    }

    const penaltyA = resultA.totalPenalty;
    const penaltyB = resultB.totalPenalty;

    if (penaltyA <= penaltyB) {
      return { winner: candidateA, loser: candidateB, results: { a: statusA, b: statusB } };
    }
    return { winner: candidateB, loser: candidateA, results: { a: statusA, b: statusB } };
  }

  public getPopulation(): ReadonlyArray<EvolvedPrompt> {
    return this.population;
  }

  public getGeneration(): number {
    return this.generation;
  }

  public reset(): void {
    this.population.length = 0;
    this.generation = 0;
  }
}
