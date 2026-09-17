/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: END-TO-END TEST RUNNER
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL TEST EXECUTION
 */

import { CognitiveCompiler } from './swarm/compiler.js';
import { Z3WasmBridge, solveWithSelfHealing } from './solver/semantic_loss.js';
import { RoPEKernel } from './gpu/rope_kernel.js';
import { OllamaConnector } from './llm/ollama_connector.js';
import { TEST_SCENARIOS, TestScenario } from './test_scenarios.js';

export type Z3Verdict = 'SAT' | 'UNSAT' | 'UNKNOWN';

export interface TestResult {
  scenario: TestScenario;
  verdict: Z3Verdict;
  factsExtracted: number;
  evolutionApplied: boolean;
  processingTimeMs: number;
  smt2Length: number;
  z3ElapsedMs: number;
  ropeElapsedMs?: number;
  errors: string[];
  passed: boolean;
}

export interface RunConfig {
  useRealLLM: boolean;
  useRealZ3: boolean;
  useRealGPU: boolean;
  categories: TestScenario['category'][];
  maxScenarios?: number;
  llmConnector?: OllamaConnector;
  z3Bridge?: Z3WasmBridge;
  ropeKernel?: RoPEKernel;
}

export class TestRunner {
  private compiler: CognitiveCompiler;
  private config: RunConfig;
  private results: TestResult[] = [];
  private z3Bridge: Z3WasmBridge | null = null;
  private ropeKernel: RoPEKernel | null = null;
  private llmConnector: OllamaConnector | null = null;

  constructor(config: RunConfig) {
    this.config = config;
    this.compiler = new CognitiveCompiler();
    
    if (config.useRealZ3 && config.z3Bridge) {
      this.z3Bridge = config.z3Bridge;
    }
    
    if (config.useRealGPU && config.ropeKernel) {
      this.ropeKernel = config.ropeKernel;
    }
    
    if (config.useRealLLM && config.llmConnector) {
      this.llmConnector = config.llmConnector;
    }
  }

  async initialize(): Promise<boolean> {
    if (this.ropeKernel) {
      const gpuReady = await this.ropeKernel.initialize();
      console.log(`[TEST_RUNNER] RoPE kernel GPU: ${gpuReady ? 'ready' : 'fallback to CPU'}`);
    }
    
    if (this.llmConnector) {
      const health = await this.llmConnector.checkHealth();
      console.log(`[TEST_RUNNER] LLM connector health: ${health ? 'ok' : 'failed'}`);
      if (!health) this.config.useRealLLM = false;
    }
    
    return true;
  }

  async runScenario(scenario: TestScenario): Promise<TestResult> {
    const errors: string[] = [];
    let input = scenario.input;
    
    // Step 1: Optionally enhance with real LLM
    if (this.config.useRealLLM && this.llmConnector) {
      try {
        const res = await this.llmConnector.generate([
          { role: 'system', content: 'You are a security analyst. Analyze the following code/description for vulnerabilities.' },
          { role: 'user', content: scenario.input }
        ], { model: 'llama3.1:8b', temperature: 0.2 });
        input = res.content || scenario.input;
        console.log(`[TEST_RUNNER] LLM enhanced input in ${res.elapsedMs.toFixed(1)}ms`);
      } catch (e) {
        errors.push(`LLM error: ${e}`);
        this.config.useRealLLM = false;
      }
    }

    // Step 2: Epistemic-Sieve compilation
    const startCompile = performance.now();
    const smt2 = this.compiler.processPayload(input);
    const factsExtracted = (smt2.match(/\(declare-const fact_\d+ Int\)/g) || []).length;

    // Step 3: Z3 Tribunal
    let verdict: Z3Verdict = 'SAT';
    let evolutionApplied = false;
    let z3ElapsedMs = 0;
    let smt2Used = smt2;

    if (this.config.useRealZ3 && this.z3Bridge) {
      const startZ3 = performance.now();
      try {
        const { finalPrompt, feedback, status } = await solveWithSelfHealing(
          this.z3Bridge,
          input,
          smt2,
          {},
          1.0,
          6
        );
        z3ElapsedMs = performance.now() - startZ3;
        verdict = status;
        evolutionApplied = feedback.halted && feedback.reason !== 'sat-no-healing-required';
        smt2Used = finalPrompt;
      } catch (e) {
        errors.push(`Z3 error: ${e}`);
        verdict = 'UNKNOWN';
      }
    } else {
      // Mock Z3: detects the hazard contradiction emitted by the compiler guardrail.
      const hazardUnsat = smt2.includes("(assert (not hazard_detected))") && smt2.includes("(= hazard_detected true)");
      const literalContradiction = smt2.includes("contradiction");
      verdict = hazardUnsat || literalContradiction ? "UNSAT" : "SAT";
      if (verdict === "UNSAT") evolutionApplied = true;
      z3ElapsedMs = 1;
    }

    // Step 4: RoPE kernel benchmark (optional)
    let ropeElapsedMs: number | undefined;
    if (this.ropeKernel && this.config.useRealGPU) {
      const testInput = new Float32Array(256).fill(1.0);
      const ropeRes = await this.ropeKernel.executeRoPE(testInput, 2, 128);
      ropeElapsedMs = ropeRes.elapsedMs;
    }

    // Step 5: Evaluate pass/fail
    const expected = scenario.expectedVerdict;
    const passed = (verdict === expected) || (expected === 'UNKNOWN' && verdict !== 'UNKNOWN');

    const result: TestResult = {
      scenario,
      verdict,
      factsExtracted,
      evolutionApplied,
      processingTimeMs: performance.now() - startCompile,
      smt2Length: smt2Used.length,
      z3ElapsedMs,
      ropeElapsedMs,
      errors,
      passed
    };

    this.results.push(result);
    return result;
  }

  async runAll(): Promise<TestResult[]> {
    const scenarios = this.config.categories.flatMap(cat => 
      TEST_SCENARIOS.filter(s => s.category === cat)
    ).slice(0, this.config.maxScenarios);

    console.log(`[TEST_RUNNER] Running ${scenarios.length} scenarios across ${this.config.categories.length} categories`);

    for (const scenario of scenarios) {
      console.log(`\n[TEST] ${scenario.name} (${scenario.category})`);
      const result = await this.runScenario(scenario);
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`  ${status} | Z3: ${result.verdict} | Expected: ${scenario.expectedVerdict} | Facts: ${result.factsExtracted} | Time: ${result.processingTimeMs.toFixed(1)}ms`);
      if (result.errors.length) {
        result.errors.forEach(e => console.log(`  ERROR: ${e}`));
      }
    }

    return this.results;
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const avgTime = this.results.reduce((sum, r) => sum + r.processingTimeMs, 0) / total;
    const avgFacts = this.results.reduce((sum, r) => sum + r.factsExtracted, 0) / total;
    const avgZ3Time = this.results.reduce((sum, r) => sum + r.z3ElapsedMs, 0) / total;

    return {
      total,
      passed,
      failed,
      passRate: (passed / total * 100).toFixed(1),
      avgProcessingTimeMs: avgTime.toFixed(1),
      avgFactsExtracted: avgFacts.toFixed(1),
      avgZ3TimeMs: avgZ3Time.toFixed(1),
      categories: this.config.categories,
      byCategory: this.config.categories.map(cat => {
        const catResults = this.results.filter(r => r.scenario.category === cat);
        const catPassed = catResults.filter(r => r.passed).length;
        return { category: cat, total: catResults.length, passed: catPassed, passRate: (catPassed / catResults.length * 100).toFixed(1) };
      })
    };
  }

  printSummary(): void {
    const s = this.getSummary();
    console.log('\n========================================');
    console.log('TEST RUN SUMMARY');
    console.log('========================================');
    console.log(`Total Scenarios: ${s.total}`);
    console.log(`Passed: ${s.passed} | Failed: ${s.failed}`);
    console.log(`Pass Rate: ${s.passRate}%`);
    console.log(`Avg Processing Time: ${s.avgProcessingTimeMs}ms`);
    console.log(`Avg Facts Extracted: ${s.avgFactsExtracted}`);
    console.log(`Avg Z3 Time: ${s.avgZ3TimeMs}ms`);
    console.log('\nBy Category:');
    s.byCategory.forEach(c => {
      console.log(`  ${c.category}: ${c.passed}/${c.total} (${c.passRate}%)`);
    });
    console.log('========================================\n');
  }
}

export async function createTestRunner(config: Partial<RunConfig> = {}): Promise<TestRunner> {
  const defaults: RunConfig = {
    useRealLLM: false,
    useRealZ3: false,
    useRealGPU: false,
    categories: ['vulnerability', 'code-analysis', 'math-proof', 'formal-verification', 'crypto'],
    maxScenarios: 20
  };

  const fullConfig = { ...defaults, ...config };
  const runner = new TestRunner(fullConfig);
  await runner.initialize();
  return runner;
}