#!/usr/bin/env npx tsx
/**
 * Z3 Benchmark Runner for AETHER-Z³-OMEGA Millennium Solvers
 * Uses tsx to run TypeScript modules and Z3 Python API for solving.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const osTmpdir = tmpdir();

// Generate SMT from each solver using tsx
function generateSMT(scriptPath: string): string {
  try {
    const output = execSync(`npx tsx ${scriptPath}`, { 
      encoding: 'utf-8', 
      timeout: 60000,
      cwd: 'E:\\Universal Sovereign Agent Protocol'
    });
    return output.trim();
  } catch (e: any) {
    return `ERROR: ${e.message}`;
  }
}

// Run Z3 on SMT content using Python
function runZ3SMT(smtContent: string, timeout: number = 60): any {
  const pythonScript = `
import time
from z3 import Solver, parse_smt2_string, sat, unsat, unknown, set_param

set_param('timeout', ${60000})

smt = """${smtContent.replace(/"""/g, '\\"\\"\\"')}"""

s = Solver()
try:
    ast = parse_smt2_string(smt)
    for a in ast:
        s.add(a)
except Exception as e:
    print(f'PARSE_ERROR: {e}')
    exit(1)

start = time.time()
result = s.check()
elapsed = time.time() - start

status_map = {sat: 'SAT', unsat: 'UNSAT', unknown: 'UNKNOWN'}
print(f"STATUS:{status_map.get(result, 'UNKNOWN')}")
print(f"TIME:{elapsed:.3f}")

if result == sat:
    print(f"MODEL:{s.model()}")
if result == unsat:
    core = [str(c) for c in s.unsat_core()]
    print(f"UNSAT_CORE:{len(core)}")
`;

  const tmpDir = mkdtempSync(join(osTmpdir, 'z3bench-'));
  const scriptPath = join(tmpDir, 'run_z3.py');
  writeFileSync(scriptPath, pythonScript);
  
  try {
    const output = execSync(`python ${scriptPath}`, { 
      encoding: 'utf-8', 
      timeout: 90000 
    });
    return parseZ3Output(output);
  } catch (e: any) {
    return { status: 'ERROR', error: e.message, time: 0 };
  }
}

function parseZ3Output(output: string): any {
  const result: any = { status: 'UNKNOWN', time: 0 };
  for (const line of output.split('\n')) {
    if (line.startsWith('STATUS:')) result.status = line.split(':')[1];
    else if (line.startsWith('TIME:')) result.time = parseFloat(line.split(':')[1]);
    else if (line.startsWith('MODEL:')) result.model = line.substring(6);
    else if (line.startsWith('UNSAT_CORE:')) result.unsat_core_count = parseInt(line.split(':')[1]);
  }
  return result;
}

// Demo scripts to run
const demos = [
  { name: 'navier_stokes', path: 'src/quran/demo_navier_stokes.ts' },
  { name: 'riemann', path: 'src/quran/demo_riemann.ts' },
  { name: 'yang_mills', path: 'src/quran/demo_yang_mills.ts' },
  { name: 'p_vs_np', path: 'src/quran/demo_pvsnp.ts' },
  { name: 'hodge_bsd', path: 'src/quran/demo_hodge.ts' },
  { name: 'poincare', path: 'src/quran/demo_poincare.ts' },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('AETHER-Z³-OMEGA Z3 BENCHMARK SUITE (TypeScript → Z3)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results: Record<string, any> = {};

  for (const demo of demos) {
    console.log(`\n[Running] ${demo.name}...`);
    
    // Generate SMT using tsx
    const smtOutput = generateSMT(demo.path);
    
    // Extract just the SMT-LIB2 part (after the last "═══" separator)
    let smtContent = smtOutput;
    const lastSeparator = smtOutput.lastIndexOf('═══');
    if (lastSeparator > 0) {
      // Find the actual SMT content (usually after the last demo output)
      // The SMT is usually in the output after "SMT-LIB2 GENERATED"
      const smtStart = smtOutput.indexOf('(set-logic');
      if (smtStart > 0) {
        smtContent = smtOutput.substring(smtStart);
      }
    }

    // Save SMT to temp file for debugging
    const tmpDir = import.meta.dirname || process.cwd();
    // const debugPath = join(tmpdir(), `${demo.name}_smt.smt2`);
    // writeFileSync(debugPath, smtContent);

    // Run Z3
    console.log(`  Generating SMT...`);
    const result = runZ3SMT(smtContent, 120);
    
    console.log(`  Status: ${result.status}`);
    console.log(`  Time: ${result.time.toFixed(3)}s`);
    if (result.unsat_core_count) console.log(`  Unsat core: ${result.unsat_core_count} constraints`);
    if (result.error) console.log(`  Error: ${result.error}`);
    
    results[demo.name] = result;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('BENCHMARK SUMMARY');
  console.log('='.repeat(70));
  for (const [name, r] of Object.entries(results)) {
    console.log(`  ${name.padEnd(15)} | ${(r.status || 'ERROR').padEnd(8)} | ${(r.time || 0).toFixed(3)}s`);
  }

  // Save results
  const fs = await import('fs');
  fs.writeFileSync('z3_benchmark_results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to z3_benchmark_results.json');
}

main().catch(console.error);