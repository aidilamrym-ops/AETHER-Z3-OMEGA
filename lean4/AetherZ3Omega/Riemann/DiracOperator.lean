import Mathlib.LinearAlgebra.Matrix.Hermitian
import Mathlib.LinearAlgebra.Matrix.Trace
import Mathlib.Data.Real.Basic
import Mathlib.Data.Real.Star
import Mathlib.Data.Matrix.Basic

namespace DiracOperator

open Matrix

noncomputable def diracDiagonal (N : ℕ) : Matrix (Fin N) (Fin N) ℝ :=
  Matrix.diagonal (fun i => (i : ℝ) - ((N : ℝ) / 2))

theorem diracDiagonal_isSymm (N : ℕ) :
    (diracDiagonal N : Matrix (Fin N) (Fin N) ℝ).IsSymm := by
  rw [Matrix.IsSymm.ext_iff]
  intro i j
  dsimp [diracDiagonal]
  by_cases hij : i = j
  · subst hij
    simp
  · simp [hij, Ne.symm hij]

theorem diracDiagonal_isHermitian (N : ℕ) :
    (diracDiagonal N : Matrix (Fin N) (Fin N) ℝ).IsHermitian := by
  rw [Matrix.isHermitian_iff_isSymm]
  exact diracDiagonal_isSymm N

noncomputable def diracKinetic (N : ℕ) : Matrix (Fin N) (Fin N) ℝ :=
  let v : Fin N → ℝ := fun _ => 1
  Matrix.vecMulVec v v

theorem diracKinetic_isSymm (N : ℕ) :
    (diracKinetic N : Matrix (Fin N) (Fin N) ℝ).IsSymm := by
  rw [Matrix.IsSymm.ext_iff]
  intro i j
  dsimp [diracKinetic]
  simp [Matrix.vecMulVec_apply]

theorem diracKinetic_isHermitian (N : ℕ) :
    (diracKinetic N : Matrix (Fin N) (Fin N) ℝ).IsHermitian := by
  rw [Matrix.isHermitian_iff_isSymm]
  exact diracKinetic_isSymm N

noncomputable def fullDirac (N : ℕ) : Matrix (Fin N) (Fin N) ℝ :=
  diracDiagonal N + diracKinetic N

theorem fullDirac_isSymm (N : ℕ) :
    (fullDirac N : Matrix (Fin N) (Fin N) ℝ).IsSymm := by
  dsimp [fullDirac]
  exact Matrix.IsSymm.add (diracDiagonal_isSymm N) (diracKinetic_isSymm N)

theorem fullDirac_isHermitian (N : ℕ) :
    (fullDirac N : Matrix (Fin N) (Fin N) ℝ).IsHermitian := by
  rw [Matrix.isHermitian_iff_isSymm]
  exact fullDirac_isSymm N

theorem fullDirac_scale_isSymm (N : ℕ) (c : ℝ) :
    (c • fullDirac N : Matrix (Fin N) (Fin N) ℝ).IsSymm := by
  rw [Matrix.IsSymm.ext_iff]
  intro i j
  simp [Matrix.smul_apply, Matrix.IsSymm.ext_iff.mp (fullDirac_isSymm N) i j]

theorem fullDirac_scale_isHermitian (N : ℕ) (c : ℝ) :
    (c • fullDirac N : Matrix (Fin N) (Fin N) ℝ).IsHermitian := by
  rw [Matrix.isHermitian_iff_isSymm]
  exact fullDirac_scale_isSymm N c

theorem diracKinetic_rank1_square (N : ℕ) :
    diracKinetic N * diracKinetic N = (N : ℝ) • diracKinetic N := by
  ext i j
  dsimp [diracKinetic] at *
  simp [Matrix.mul_apply, Matrix.vecMulVec_apply, Matrix.smul_apply, Finset.sum_const, Finset.card_fin]
  <;> ring_nf
  <;> simp_all [Finset.sum_const, Finset.card_fin]
  <;> norm_num
  <;> ring_nf
  <;> simp_all [Finset.sum_const, Finset.card_fin]
  <;> norm_num

end DiracOperator