#!/usr/bin/env python3
"""
Z3 Benchmark Runner for AETHER-Z³-OMEGA Millennium Solvers
Runs all 7 SMT-LIB2 outputs through Z3 and captures timing/results.
"""

import time
import subprocess
import sys
from pathlib import Path

# Import our solver modules to generate SMT
sys.path.insert(0, 'src/math')

def run_z3_smt(smt_content: str, timeout: int = 30) -> dict:
    """Run SMT content through Z3 Python API and return result."""
    from z3 import Solver, parse_smt2_string, sat, unsat, unknown, set_param
    
    # Set timeout
    set_param('timeout', timeout * 1000)
    
    s = Solver()
    try:
        # Parse SMT-LIB2 string
        ast = parse_smt2_string(smt_content)
        for a in ast:
            s.add(a)
    except Exception as e:
        return {'status': 'PARSE_ERROR', 'error': str(e), 'time': 0}
    
    start = time.time()
    result = s.check()
    elapsed = time.time() - start
    
    status_map = {sat: 'SAT', unsat: 'UNSAT', unknown: 'UNKNOWN'}
    
    result_dict = {
        'status': status_map.get(result, 'UNKNOWN'),
        'time': elapsed,
        'model': str(s.model()) if result == sat else None,
        'unsat_core': [str(c) for c in s.unsat_core()] if result == unsat else None
    }
    return result_dict

def generate_all_smt():
    """Generate SMT-LIB2 for all 7 problems."""
    from finitism_quran import generateQuranicSMTLibrary
    from navier_stokes_quran import generateNavierStokesSMT, NavierStokesConfig
    from riemann_quran import generateRiemannSMT, RiemannConfig
    from yang_mills_quran import generateYangMillsSMT, YangMillsConfig
    from pvsnp_quran import generatePvsNPSMT, PvsNPConfig
    from hodge_bsd_quran import generateHodgeBSDSMT, HodgeBSDConfig
    from poincare_quran import generatePoincareSMT, PoincareConfig
    
    configs = {
        'navier_stokes': generateNavierStokesSMT(NavierStokesConfig(
            reynolds=10000, viscosity=1e-3, domainSize=1.0, initialEnergy=0.5, maxTime=10.0
        )),
        'riemann': generateRiemannSMT(RiemannConfig(
            maxT=1000, precision=1e-12, maxZeros=10000
        )),
        'yang_mills': generateYangMillsSMT(YangMillsConfig(
            latticeSize=8, coupling=0.5, spatialDim=4, gaugeGroup='SU(2)', maxIterations=1000
        )),
        'p_vs_np': generatePvsNPSMT(PvsNPConfig(
            maxVars=500, minVars=10, resourcesBits=1e120
        )),
        'hodge_bsd': generateHodgeBSDSMT(HodgeBSDConfig(
            complexDim=3, curveOrder=17, modPrime='good', maxRationalCycles=1e120
        )),
        'poincare': generatePoincareSMT(PoincareConfig(
            ricciFlowMaxTime=100.0, scalarCurvatureBound=1e3, diameterBound=10.0, manifoldDim=3
        )),
    }
    return configs

def main():
    print("=" * 70)
    print("AETHER-Z³-OMEGA Z3 BENCHMARK SUITE")
    print("=" * 70)
    
    smt_configs = generate_all_smt()
    
    results = {}
    for name, smt in smt_configs.items():
        print(f"\n[Running] {name}...")
        result = run_z3_smt(smt, timeout=60)
        results[name] = result
        print(f"  Status: {result['status']}")
        print(f"  Time: {result['time']:.3f}s")
        if result['status'] == 'PARSE_ERROR':
            print(f"  Error: {result['error']}")
        if result['unsat_core']:
            print(f"  Unsat core: {len(result['unsat_core'])} constraints")
    
    # Summary
    print("\n" + "=" * 70)
    print("BENCHMARK SUMMARY")
    print("=" * 70)
    for name, r in results.items():
        print(f"  {name:15s} | {r['status']:8s} | {r['time']:.3f}s")
    
    # Save results
    import json
    with open('z3_benchmark_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("\nResults saved to z3_benchmark_results.json")

if __name__ == '__main__':
    main()