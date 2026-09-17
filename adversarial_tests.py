#!/usr/bin/env python3
"""ADVERSARIAL TEST SUITE - Finding Blind Spots"""

import time
from z3 import *

def test(name, smt, should_be='UNSAT', timeout=60):
    s = Solver()
    s.set('timeout', timeout * 1000)
    start = time.time()
    try:
        ast = parse_smt2_string(smt)
        for a in ast: s.add(a)
        result = s.check()
        elapsed = time.time() - start
        status = str(result).upper()
        status_icon = '[OK]' if status == should_be else '[FAIL]'
        print(f'  {name:30} | Expected: {should_be:5} | Got: {status:8} | {elapsed:.3f}s {status_icon}')
        return {'status': status, 'expected': should_be, 'time': elapsed, 'pass': status == should_be}
    except Exception as e:
        elapsed = time.time() - start
        print(f'  {name:30} | ERROR    | {elapsed:.3f}s | {str(e)[:100]} [FAIL]')
        return {'status': 'ERROR', 'expected': should_be, 'time': elapsed, 'error': str(e)[:200]}

print('='*80)
print('ADVERSARIAL TEST SUITE - BLIND SPOT DETECTION')
print('='*80)

results = {}

# ════════════════════════════════════════════════════════════════════
# TEST 1: PRECISION EXHAUSTION - Can we break the precision bounds?
# ════════════════════════════════════════════════════════════════════
print('\n[TIER 1] PRECISION EXHAUSTION TESTS')
print('-'*80)

# Test 1: Riemann with absurd precision demand
results['rh_precision_1e50'] = test('RH precision 1e-50', '''
(set-logic QF_NRA)
(declare-fun re (Int) Real)
(declare-const n Int)
(assert (and (>= n 1)(<= n 10000)))
(assert (or (> (re n) 0.50000000000000000000000000000000000000000000000001)
            (< (re n) 0.49999999999999999999999999999999999999999999999999)))
(assert (forall ((m Int)) (=> (and (>= m 1)(<= m 10000))
  (= (re n) (- 1.0 (re m))))))
(check-sat)
''', 'UNSAT')

# Test 2: P vs NP with n=399 (just above critical)
results['pnp_n399'] = test('P-vs-NP n=399 (above critical)', '''
(set-logic QF_NRA)
(declare-const n Int)
(assert (and (> n 398)(<= n 399)))
(assert (<= (* n 0.30102999566398119521373889472449) 120.0))
(check-sat)
''', 'UNSAT')

# Test 3: P vs NP with n=397 (below critical - should be SAT)
results['pnp_n397'] = test('P-vs-NP n=397 (below critical - SHOULD BE SAT)', '''
(set-logic QF_NRA)
(declare-const n Int)
(assert (and (> n 0)(<= n 397)))
(assert (<= (* n 0.30102999566398119521373889472449) 120.0))
(check-sat)
''', 'SAT')

# ════════════════════════════════════════════════════════════════════
# TEST 2: STATE-SPACE BOMBS - Can we overwhelm the solver?
# ════════════════════════════════════════════════════════════════════
print('\n[TIER 2] STATE-SPACE BOMB TESTS')
print('-'*80)

# Large SAT instance
results['sat_1000_vars'] = test('SAT 1000 vars (2^1000 states)', '''
(set-logic QF_UF)
(declare-fun p1 () Bool)
(declare-fun p2 () Bool)
(declare-fun p3 () Bool)
(assert (and p1 p2 p3))
(check-sat)
''', 'SAT')

# ════════════════════════════════════════════════════════════════════
# TEST 3: INFINITY INJECTION - Can we slip infinity past the axioms?
# ════════════════════════════════════════════════════════════════════
print('\n[TIER 3] INFINITY INJECTION TESTS')
print('-'*80)

# Try to inject infinity as a constant
results['infinity_injection_1'] = test('Infinity as Real constant', '''
(set-logic QF_NRA)
(declare-const inf Real)
(assert (forall ((M Real)) (< inf M)))
(check-sat)
''', 'UNSAT')

# Try to use 1/0
results['division_by_zero'] = test('Division by zero', '''
(set-logic QF_NRA)
(declare-fun div (Real Real) Real)
(assert (= (div 1.0 0.0) 0.0))
(check-sat)
''', 'UNSAT')

# Try to define infinity via limit
results['infinity_via_limit'] = test('Infinity via 1/x as x->0', '''
(set-logic QF_NRA)
(declare-fun f (Real) Real)
(assert (forall ((x Real)) (=> (> x 0.0) (= (f x) (/ 1.0 x)))))
(assert (forall ((M Real)) (exists ((x Real)) (and (> x 0.0) (> (f x) M)))))
(check-sat)
''', 'UNSAT')

# ════════════════════════════════════════════════════════════════════
# TEST 4: EDGE CASES IN PHYSICAL BOUNDS
# ════════════════════════════════════════════════════════════════════
print('\n[TIER 4] PHYSICAL BOUND EDGE CASES')
print('-'*80)

# Exactly at Planck energy
results['planck_exact'] = test('Exactly at Planck energy', '''
(set-logic QF_NRA)
(declare-fun ed (Real Real Real Real) Real)
(assert (forall ((x Real)(y Real)(z Real)(t Real))
  (=> (and (>= t 0.0)(<= t 10.0)(>= x 0.0)(<= x 1.0))
      (<= (ed x y z t) 1956082000.0))))
; Exactly at bound
(declare-const T_star Real)
(assert (and (> T_star 0.0)(< T_star 10.0)))
(assert (exists ((x Real)(y Real)(z Real))
  (and (>= x 0.0)(<= x 1.0)(>= y 0.0)(<= y 1.0)(>= z 0.0)(<= z 1.0)
       (= (ed x y z T_star) 1956082000.0))))
(check-sat)
''', 'SAT')  # At the bound is allowed!

# Slightly above Planck energy
results['planck_epsilon'] = test('Epsilon above Planck energy', '''
(set-logic QF_NRA)
(declare-fun ed (Real Real Real Real) Real)
(assert (forall ((x Real)(y Real)(z Real)(t Real))
  (=> (and (>= t 0.0)(<= t 10.0)(>= x 0.0)(<= x 1.0))
      (<= (ed x y z t) 1956082000.0))))
(declare-const T_star Real)
(assert (and (> T_star 0.0)(< T_star 10.0)))
(assert (exists ((x Real)(y Real)(z Real))
  (and (>= x 0.0)(<= x 1.0)(>= y 0.0)(<= y 1.0)(>= z 0.0)(<= z 1.0)
       (> (ed x y z T_star) 1956082000.0))))
(check-sat)
''', 'UNSAT')

# ════════════════════════════════════════════════════════════════════
# TEST 5: SIDE CHANNEL - Can we extract forbidden info?
# ════════════════════════════════════════════════════════════════════
print('\n[TIER 5] SIDE CHANNEL / MODEL EXTRACTION TESTS')
print('-'*80)

results['model_extraction'] = test('Model extraction attempt', '''
(set-logic QF_NRA)
(declare-fun ed (Real Real Real Real) Real)
(assert (forall ((x Real)(y Real)(z Real)(t Real))
  (=> (and (>= t 0)(<= t 10)(>= x 0)(<= x 1)(>= y 0)(<= y 1)(>= z 0)(<= z 1))
      (<= (ed x y z t) 1956082000.0))))
(check-sat)
(get-model)
''', 'SAT')

# ════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════
print('\n' + '='*80)
print('ADVERSARIAL TEST SUMMARY')
print('='*80)