import Mathlib.LinearAlgebra.Matrix.Trace
import Mathlib.Data.Real.Basic
import Mathlib.Algebra.BigOperators.Group.Finset.Basic
import DiracOperator

namespace TraceFormula

open Matrix
open Finset

theorem kinetic_trace (N : ℕ) :
    (DiracOperator.diracKinetic N).trace = (N : ℝ) := by
  dsimp [DiracOperator.diracKinetic, Matrix.trace]
  simp [Matrix.vecMulVec_apply]

theorem fullDirac_trace_linear (N : ℕ) :
    (DiracOperator.fullDirac N).trace =
      (DiracOperator.diracDiagonal N).trace + (DiracOperator.diracKinetic N).trace := by
  dsimp [DiracOperator.fullDirac]
  exact Matrix.trace_add (DiracOperator.diracDiagonal N) (DiracOperator.diracKinetic N)

theorem diagonal_trace (N : ℕ) :
    (DiracOperator.diracDiagonal N).trace = (-(N : ℝ) / 2 : ℝ) := by
  rw [DiracOperator.diracDiagonal]
  rw [Matrix.trace_diagonal]
  -- Goal: Finset.sum univ (fun i => (i : ℝ) - (N : ℝ) / 2) = -↑N / 2
  have h₁ : (Finset.sum (Finset.univ : Finset (Fin N)) (fun i : Fin N => ((i : ℝ) - (N : ℝ) / 2 : ℝ))) = (-(N : ℝ) / 2 : ℝ) := by
    have h₂ : (Finset.sum (Finset.univ : Finset (Fin N)) (fun i : Fin N => (i : ℝ))) = (N : ℝ) * ((N : ℝ) - 1) / 2 := by
      -- Convert sum over Fin N to sum over range N
      have h₃ : (Finset.sum (Finset.univ : Finset (Fin N)) (fun i : Fin N => (i : ℝ))) = Finset.sum (Finset.range N) (fun k : ℕ => (k : ℝ)) := by
        rw [Fin.sum_univ_eq_sum_range (fun (k : ℕ) => (k : ℝ))]
        <;> simp [Fin.val]
      rw [h₃]
      -- Sum of k in range N = N(N-1)/2
      have h₄ : (Finset.sum (Finset.range N) (fun k : ℕ => (k : ℝ))) = (N : ℝ) * ((N : ℝ) - 1) / 2 := by
        have h₅ : (Finset.sum (Finset.range N) (fun k : ℕ => (k : ℕ))) = N * (N - 1) / 2 := by
          rw [Finset.sum_range_id]
        -- Cast the ℕ sum to ℝ using the fact that the formula is exact
        have h₆ : (Finset.sum (Finset.range N) (fun k : ℕ => (k : ℝ))) = (N : ℝ) * ((N : ℝ) - 1) / 2 := by
          rw [← Nat.cast_sum]
          rw [h₅]
          <;> norm_cast
          <;> field_simp
          <;> ring_nf
          <;> norm_num
          <;>
          (try ring_nf at *) <;>
          (try linarith)
        exact h₆
      rw [h₄]
    -- Now compute ∑ (i - N/2) = ∑ i - ∑ (N/2)
    have h₃ : (Finset.sum (Finset.univ : Finset (Fin N)) (fun i : Fin N => ((N : ℝ) / 2 : ℝ))) = (N : ℝ) * ((N : ℝ) / 2) := by
      simp [Finset.sum_const, Finset.card_fin]
    calc
      (Finset.sum (Finset.univ : Finset (Fin N)) (fun i : Fin N => ((i : ℝ) - (N : ℝ) / 2 : ℝ))) =
          (Finset.sum (Finset.univ : Finset (Fin N)) (fun i : Fin N => (i : ℝ))) -
            (Finset.sum (Finset.univ : Finset (Fin N)) (fun i : Fin N => ((N : ℝ) / 2 : ℝ))) := by
        rw [Finset.sum_sub_distrib]
      _ = (N : ℝ) * ((N : ℝ) - 1) / 2 - (N : ℝ) * ((N : ℝ) / 2) := by
        rw [h₂, h₃]
      _ = (-(N : ℝ) / 2 : ℝ) := by
        ring_nf
        <;>
        (try norm_num) <;>
        (try linarith) <;>
        (try ring_nf at *) <;>
        (try nlinarith)

theorem trace_scaled_dirac (N : ℕ) (c : ℝ) :
    (c • DiracOperator.fullDirac N).trace = c * (DiracOperator.fullDirac N).trace := by
  exact Matrix.trace_smul c (DiracOperator.fullDirac N)

end TraceFormula