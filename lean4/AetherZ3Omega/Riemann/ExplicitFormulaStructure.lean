/-
  EXPLICIT FORMULA — PHASE 3: STRUCTURE & AMPLITUDE MONOTONICITY
  
  Defines amplitude(x, σ) = x^(σ-1/2) and proves:
  1. positivity (x > 1, σ > 1/2)
  2. unbounded growth in x (σ > 1/2)
  3. strict monotonicity in x
  4. strict monotonicity in σ
  5. eventually exceeds any fixed constant
  
  All theorems FULLY PROVEN — 0 sorry, 0 axiom.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecialFunctions.Pow.Asymptotics
import Mathlib.Order.Filter.AtTopBot.Basic

namespace ExplicitFormulaStructure

open Filter

/-- amplitude(x, σ) = x^(σ - 1/2). -/
noncomputable def amplitude (x σ : ℝ) : ℝ :=
  x ^ (σ - 1/2)

/-- 1. amplitude is positive for x > 1 and σ > 1/2. -/
theorem amplitude_pos {x σ : ℝ} (hx : 1 < x) (hσ : 1/2 < σ) :
    0 < amplitude x σ := by
  dsimp [amplitude]
  exact Real.rpow_pos_of_pos (by linarith) (σ - 1/2)

/-- 2. amplitude grows WITHOUT BOUND in x for fixed σ > 1/2. -/
theorem amplitude_tendsto_atTop {σ : ℝ} (hσ : 1/2 < σ) :
    Tendsto (fun x : ℝ => amplitude x σ) atTop atTop := by
  have hpos : 0 < σ - 1/2 := by linarith
  exact tendsto_rpow_atTop hpos

/-- 3. amplitude is strictly monotone in x (for x > 0, σ > 1/2). -/
theorem amplitude_mono_in_x {x₁ x₂ σ : ℝ} (hσ : 1/2 < σ)
    (h1 : 0 ≤ x₁) (h2 : x₁ < x₂) :
    amplitude x₁ σ < amplitude x₂ σ := by
  dsimp [amplitude]
  have hpos : 0 < σ - 1/2 := by linarith
  exact Real.rpow_lt_rpow h1 h2 hpos

/-- 4. amplitude is strictly monotone in σ (for x > 1).
    Proof: amplitude x σ = x^(σ-1/2) = exp(log x · (σ-1/2)),
    and (σ-1/2) ↦ log x · (σ-1/2) is strictly mono (log x > 0). -/
theorem amplitude_mono_in_sigma {x σ₁ σ₂ : ℝ} (hx : 1 < x)
    (h12 : σ₁ < σ₂) :
    amplitude x σ₁ < amplitude x σ₂ := by
  dsimp [amplitude]
  have hxpos : 0 < x := lt_trans zero_lt_one hx
  have hlogx : 0 < Real.log x := Real.log_pos hx
  have hs1 : x ^ (σ₁ - 1 / 2) = Real.exp (Real.log x * (σ₁ - 1 / 2)) := by
    simp [Real.rpow_def_of_pos hxpos]
  have hs2 : x ^ (σ₂ - 1 / 2) = Real.exp (Real.log x * (σ₂ - 1 / 2)) := by
    simp [Real.rpow_def_of_pos hxpos]
  rw [hs1, hs2]
  exact Real.exp_lt_exp.2 (mul_lt_mul_of_pos_left (sub_lt_sub_right h12 (1/2)) hlogx)

/-- 5. Eventually exceeds any fixed constant: x^(σ-1/2) → ∞. -/
theorem amplitude_eventually_exceeds_constant {σ : ℝ} (hσ : 1/2 < σ) :
    ∀ c : ℝ, ∃ x₀ : ℝ, ∀ x : ℝ, x₀ ≤ x → c ≤ amplitude x σ := by
  intro c
  exact tendsto_atTop_atTop.mp (amplitude_tendsto_atTop hσ) c

end ExplicitFormulaStructure