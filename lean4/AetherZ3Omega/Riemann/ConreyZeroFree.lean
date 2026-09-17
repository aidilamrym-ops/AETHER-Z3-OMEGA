import Mathlib.NumberTheory.LSeries.Nonvanishing
import Mathlib.NumberTheory.LSeries.RiemannZeta
import Mathlib.NumberTheory.LSeries.ZetaZeros

/-
  Sovereign Formalization: ConreyZeroFree.lean (v5 — ZERO-SORRY via Mathlib proven)

  Target: Non-vanishing of ζ(s) on Re(s) ≥ 1, and classification of zeros.

  METHODOLOGY (Law of the Guillotine compliant):
  - No `sorry`, no `axiom`, no `by trivial` on analytic claims.
  - Deep analytic facts proven by Mathlib kernel:
      riemannZeta_ne_zero_of_one_le_re  (Nonvanishing.lean)
      riemannZeta_neg_two_mul_nat_add_one (RiemannZeta.lean)
      isClosed_riemannZetaZeros / isDiscrete_riemannZetaZeros (ZetaZeros.lean)
  - We assemble corollaries and structural consequences.

  HONEST SCOPE: This establishes the zero-free region Re(s) ≥ 1
  (sufficient for PNT-style results). Explicit Conrey-Vinogradov
  bound `1 - C/log(|Im(s)|+2)` is NOT in Mathlib as of v4.33.1;
  that stronger classical bound remains a deferred target.
-/

namespace Sovereign.Zeta

/-- Trivial zeros of ζ: ζ(-2·(n+1)) = 0 for every n ≥ 0.
    Proven by Mathlib. -/
theorem riemannZeta_neg_two_mul_nat_add_one' (n : ℕ) :
    riemannZeta (-2 * (n + 1)) = 0 :=
  riemannZeta_neg_two_mul_nat_add_one n

/-- The zeta junk value at s = 1 is nonzero. -/
theorem riemannZeta_one_ne_zero' : riemannZeta (1 : ℂ) ≠ 0 :=
  riemannZeta_one_ne_zero

/-- MAIN THEOREM: ζ(s) ≠ 0 for Re(s) ≥ 1.
    Proven by Mathlib via the Dirichlet L-function positivity argument
    (Nonvanishing.lean, Stoll-Loeffler 2024). -/
theorem zeta_ne_zero_one_le_re (s : ℂ) (hs : 1 ≤ s.re) : riemannZeta s ≠ 0 :=
  riemannZeta_ne_zero_of_one_le_re hs

/-- Corollary: ζ(s) ≠ 0 for Re(s) > 1 (open right half-plane).
    This is the Euler-product-implied nonvanishing, but here proven
    directly via the stronger `zeta_ne_zero_one_le_re`. -/
theorem zeta_ne_zero_one_lt_re (s : ℂ) (hs : 1 < s.re) : riemannZeta s ≠ 0 :=
  riemannZeta_ne_zero_of_one_lt_re hs

/-- No zero on the critical line Re(s) = 1 except the pole at s = 1.
    This is the boundary statement for the zero-free region. -/
theorem no_zero_on_critical_line (s : ℂ) (h_eq_one : s.re = 1)
    (h_ne_one : s ≠ (1 : ℂ)) : riemannZeta s ≠ 0 :=
  zeta_ne_zero_one_le_re s (h_eq_one ▸ le_rfl)

/-- Zero-free region in the closed right half-plane. -/
theorem no_zero_right_half_plane (s : ℂ) (h_ge_one : s.re ≥ 1) :
    riemannZeta s ≠ 0 :=
  zeta_ne_zero_one_le_re s h_ge_one

/-- The set of zeros of ζ is closed in ℂ. (Direct Mathlib.) -/
theorem zero_set_closed : IsClosed riemannZetaZeros :=
  isClosed_riemannZetaZeros

/-- The set of zeros of ζ is discrete. (Direct Mathlib.) -/
theorem zero_set_discrete : IsDiscrete riemannZetaZeros :=
  isDiscrete_riemannZetaZeros

/-- In any compact subset of ℂ, there are only finitely many zeros.
    Direct corollary of Mathlib. -/
theorem finite_zeros_in_compact (S : Set ℂ) (hS : IsCompact S) :
    (S ∩ riemannZetaZeros).Finite :=
  hS.inter_riemannZetaZeros_finite

/-- Classification: every zero with s ≠ -2(n+1) (trivial zero) lies in the
    closed critical strip Re(s) ≤ 1.
    This follows from `zeta_ne_zero_one_lt_re` applied contrapositively. -/
theorem nontriv_zero_in_strip (s : ℂ) (hz : riemannZeta s = 0)
    (h_ne : ¬∃ n : ℕ, s = -2 * (n + 1)) :
    s.re ≤ 1 := by
  by_contra hgt
  push Not at hgt
  have hnz : riemannZeta s ≠ 0 := zeta_ne_zero_one_lt_re s hgt
  exact hnz hz

/-- Disjunction: ζ(s) = 0 ⟹ s.re ≤ 1 ∨ s is a trivial zero. -/
theorem zero_implies_re_le_one_or_trivial (s : ℂ) (hz : riemannZeta s = 0) :
    s.re ≤ 1 ∨ ∃ n : ℕ, s = -2 * (n + 1) := by
  by_cases htriv : ∃ n : ℕ, s = -2 * (n + 1)
  · exact Or.inr htriv
  · exact Or.inl (nontriv_zero_in_strip s hz htriv)

end Sovereign.Zeta
