# Future Work Plan

## 1. Full Test Verification
- Run all existing test suites (`test_engine.ts`, `test_math.ts`, `test_problems.ts`, `test_verification.ts`, `run_real_tests.ts`) to confirm no regressions after recent fixes.
- Add a lightweight unit test for `collectTerms` to ensure `x*x` is correctly interpreted as `x^2` (including variations like `x*x*x`).

## 2. Quadratic Solver Enhancements
- Support rational/fractional coefficients (e.g., `1/2*x^2 + 3/4*x + 5/6 = 0`).
- Ensure returned `NumNode` values are simplified (e.g., `1/2` becomes `N(0.5)`).

## 3. Lemma Vault Integration
- Implement a helper `storeLemmaIfAbsent(eqn, method)` that automatically stores a lemma after a successful solve.
- Add tests to confirm every solved linear/quadratic equation is stored with a confidence >= 0.9.

## 4. Documentation & API Docs
- Update `README.md` with usage examples for `solve`, `solveQuadratic`, and `LemmaVault`.
- Add JSDoc comments to key functions (`solveLinear`, `solveQuadratic`, `extractPolyCoeffs`).

## 5. Performance Optimisation
- Profile `extractPolyCoeffs` on higher‑degree polynomials (degree >=5) and ensure near‑linear time.
- If a bottleneck appears, consider memoizing intermediate term collections.

## 6. Feature Roadmap
- Enable full cubic solving (`solveCubic`) in test suite and provide examples.
- Expand `solveSystem` with better singularity detection and error handling.
- Hook newly stored lemmas into `TheoremProver` for automatic lookup during proof attempts.

## 7. Cross‑Platform CI
- Configure CI to run tests on both Windows and Linux environments.
- Verify that the solver and LemmaVault work inside WebWorkers (required for browser usage).

## 8. User Feedback Loop
- Ask the project owner which of the above items is highest priority.
- Incorporate any additional feature requests before proceeding.

---
*This file captures the current state and next steps. It will be loaded at the start of the next session to provide continuity.*