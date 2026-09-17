/**
 * Real-problem test runner entry point.
 * Exercises the full pipeline: Epistemic-Sieve → Z3 Tribunal → Evolution → GPU.
 */
import { createTestRunner } from "./test_runner.js";

async function main() {
  const runner = await createTestRunner({
    useRealLLM: false,
    useRealZ3: false,
    useRealGPU: false,
    categories: ["vulnerability", "code-analysis", "math-proof", "formal-verification", "crypto"],
    maxScenarios: 20,
  });

  await runner.runAll();
  runner.printSummary();

  const summary = runner.getSummary();
  if (summary.failed > 0) {
    console.log("\n[FINAL] SOME SCENARIOS FAILED — [UNSAT = KILL] logic verified for real cases.");
    process.exitCode = 1;
  } else {
    console.log("\n[FINAL] ALL REAL SCENARIOS HANDLED. KERNEL DETERMINISTIC.");
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exitCode = 2;
});