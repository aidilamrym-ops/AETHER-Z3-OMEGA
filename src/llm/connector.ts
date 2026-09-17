/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: LLM CONNECTOR
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL LLM INTERFACE
 *
 * DESCRIPTION: Connects local LLM proposals (Ollama, WebLLM, etc.) to the
 * Epistemic-Sieve compiler and Z3 SMT Tribunal. Provides a thin abstraction
 * layer for sending raw LLM text to the compiler and receiving SMT-LIB2
 * output, and for feeding SMT to the Z3 solver via a user-provided bridge.
 */

import { CognitiveCompiler } from '../swarm/compiler';
import { Z3Status, SolverResult, Z3WasmBridge, solveWithSelfHealing } from '../solver/semantic_loss';

export class LLMAgentConnector {
  private readonly compiler: CognitiveCompiler;

  constructor() {
    this.compiler = new CognitiveCompiler();
  }

  /**
   * Send raw LLM output to the Epistemic-Sieve compiler.
   * Returns the compiled SMT-LIB2 string.
   */
  public async sendToCompiler(rawLLMOutput: string): Promise<string> {
    // The compiler works synchronously; we wrap in Promise for API consistency.
    return this.compiler.processPayload(rawLLMOutput);
  }

  /**
   * Send SMT-LIB2 code to the Z3 SMT Tribunal via a user-provided bridge.
   * Returns the SolverResult.
   * @param rawLLMOutput The original LLM output (needed for healing).
   * @param smt2 The SMT-LIB2 code to evaluate.
   * @param bridge An implementation of Z3WasmBridge that communicates with the Z3 solver.
   * @param options Optional parameters for the solver (weightMap, lambda_weight, maxIterations).
   */
  public async sendToSemanticLoss(
    rawLLMOutput: string,
    smt2: string,
    bridge: Z3WasmBridge,
    options: {
      weightMap?: Record<string, number>;
      lambda_weight?: number;
      maxIterations?: number;
    } = {}
  ): Promise<SolverResult> {
    const { weightMap = {}, lambda_weight = 1, maxIterations = 6 } = options;
    // Use the solveWithSelfHealing function from semantic_loss to get a healed result.
    const { finalPrompt, feedback, status } = await solveWithSelfHealing(
      bridge,
      rawLLMOutput,
      smt2,
      weightMap,
      lambda_weight,
      maxIterations
    );
    // Build a SolverResult-like object from the feedback.
    // We don't have a model from the healing process, but we can return the finalPrompt as raw.
    return {
      status,
      unsatCore: feedback.core.map(item => item.name),
      raw: finalPrompt,
      model: undefined, // Not captured in healing process
    };
  }

  /**
   * Convenience method: compile LLM output and immediately evaluate with Z3.
   * @param rawLLMOutput The raw text from the LLM.
   * @param bridge Z3 bridge to use for solving.
   * @param options Optional solver parameters.
   * @returns An object containing the SMT2, Z3 verdict, and whether evolution was triggered.
   */
  public async processLLMOutput(
    rawLLMOutput: string,
    bridge: Z3WasmBridge,
    options: {
      weightMap?: Record<string, number>;
      lambda_weight?: number;
      maxIterations?: number;
    } = {}
  ): Promise<{
    smt2: string;
    z3Verdict: Z3Status;
    evolutionApplied: boolean;
    performanceMetrics: {
      processingTime: number;
      factsExtracted: number;
      constraintsGenerated: number;
    };
  }> {
    const startTime = performance.now();
    const smt2 = await this.sendToCompiler(rawLLMOutput);
    const { feedback, status } = await solveWithSelfHealing(
      bridge,
      rawLLMOutput,
      smt2,
      options.weightMap ?? {},
      options.lambda_weight ?? 1,
      options.maxIterations ?? 6
    );
    const factsExtracted = (smt2.match(/\(declare-const fact_\d+ Int\)/g) || []).length;
    return {
      smt2,
      z3Verdict: status,
      evolutionApplied: feedback.halted && feedback.reason !== 'sat-no-healing-required',
      performanceMetrics: {
        processingTime: performance.now() - startTime,
        factsExtracted,
        constraintsGenerated: feedback.core.length,
      },
    };
  }
}

/**
 * Functional interface for quick use.
 */
export async function compileLLMToSMT(rawLLMOutput: string): Promise<string> {
  const connector = new LLMAgentConnector();
  return connector.sendToCompiler(rawLLMOutput);
}

export async function evaluateSMTWithZ3(
  rawLLMOutput: string,
  smt2: string,
  bridge: Z3WasmBridge,
  options: { weightMap?: Record<string, number>; lambda_weight?: number; maxIterations?: number } = {}
): Promise<SolverResult> {
  const connector = new LLMAgentConnector();
  return connector.sendToSemanticLoss(rawLLMOutput, smt2, bridge, options);
}

export async function processLLMWithHealing(
  rawLLMOutput: string,
  bridge: Z3WasmBridge,
  options: { weightMap?: Record<string, number>; lambda_weight?: number; maxIterations?: number } = {}
) {
  const connector = new LLMAgentConnector();
  return connector.processLLMOutput(rawLLMOutput, bridge, options);
}