#!/usr/bin/env python3
"""Test Z3 on Navier-Stokes SMT"""
from z3 import *
import time

smt = r"""(set-logic QF_NRA)
(set-info :source 'navier-stokes-test')
(declare-fun energy_density (Real Real Real Real) Real)
(define-fun MAX_ENERGY_DENSITY () Real 1956082000.0)
(assert (forall ((x Real) (y Real) (z Real) (t Real))
        (=> (and (>= t 0.0) (<= t 10.0) (>= x 0.0) (<= x 1.0) (>= y 0.0) (<= y 1.0) (>= z 0.0) (<= z 1.0))
            (<= (energy_density x y z t) 1956082000.0))))
(declare-const T_star Real)
(assert (and (> T_star 0.0) (< T_star 10.0)))
(assert (exists ((x Real) (y Real) (z Real))
        (and (>= x 0.0) (<= x 1.0) (>= y 0.0) (<= y 1.0) (>= z 0.0) (<= z 1.0)
             (> (energy_density x y z T_star) 1956082000.0))))
(check-sat)"""

s = Solver()
s.set('timeout', 60000)
start = time.time()
try:
    ast = parse_smt2_string(smt)
    for a in ast: s.add(a)
    result = s.check()
    elapsed = time.time() - start
    print(f'Navier-Stokes: {result} in {elapsed:.3f}s')
    if str(result) == 'unsat':
        print('Unsat core:', s.unsat_core())
except Exception as e:
    print(f'Error: {e}')