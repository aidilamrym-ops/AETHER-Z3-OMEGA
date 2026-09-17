import Lake
open Lake DSL

package «AetherZ3Omega» where
  -- Dependent paket: Mathlib (pustaka standar Lean 4)
  require mathlib from git
    "https://github.com/leanprover-community/mathlib4.git" @
    "v4.0.0"

@[default_target]
lean_lib AetherZ3Omega where
  -- Sumber Lean berada di dalam direktori ini

@[default_target]
lean_exe «aether-z3-omega» where
  root := `Main