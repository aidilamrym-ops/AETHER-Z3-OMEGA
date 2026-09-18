import Lake
open Lake DSL

package «AetherZ3Omega» where
  -- Mathlib (Lean 4 std math library) pinned to v4.33.1
  require mathlib from git
    "https://github.com/leanprover-community/mathlib4.git" @
    "v4.33.1"

lean_lib AetherZ3Omega where
  -- Sumber: AetherZ3Omega/**

@[default_target]
lean_exe «aether-z3-omega» where
  root := `Main

-- ================================================================
-- PER-MASALAH-MILLENIUM (pengujian terpisah, meringankan RAM)
-- Bangun satu saja:  lake build MillenniumNavierStokes
-- ================================================================

/-- Millennium: Navier-Stokes -/
lean_lib MillenniumNavierStokes where
  -- Sumber: Millennium/NavierStokes/**

/-- Millennium: Yang-Mills -/
lean_lib MillenniumYangMills where
  -- Sumber: Millennium/YangMills/**

/-- Millennium: Riemann Hypothesis -/
lean_lib MillenniumRiemann where
  -- Sumber: Millennium/Riemann/**

/-- Millennium: P vs NP -/
lean_lib MillenniumPvsNP where
  -- Sumber: Millennium/PvsNP/**

/-- Millennium: Poincare -/
lean_lib MillenniumPoincare where
  -- Sumber: Millennium/Poincare/**

/-- Millennium: Hodge -/
lean_lib MillenniumHodge where
  -- Sumber: Millennium/Hodge/**

/-- Millennium: BSD -/
lean_lib MillenniumBSD where
  -- Sumber: Millennium/BSD/**