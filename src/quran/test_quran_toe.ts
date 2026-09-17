/**
 * Test suite for Quran TOE integration
 */
import { QuranTOEIntegrator } from './toe_integrator.js';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`[FAIL] ${msg}`);
  console.log(`[PASS] ${msg}`);
}

async function main() {
  console.log('=== Quran TOE Integration Tests ===\n');

  const integrator = new QuranTOEIntegrator();
  await integrator.loadData(
    './src/quran/quran_toe_findings.json',
    './src/quran/quran_toe_results.json',
    './src/quran/quran_toe_deep.json'
  );

  // Test 1: Global facts present
  const global = integrator.getGlobalFacts();
  console.log('--- Global Quran Facts ---');
  console.log(`Total ayahs: ${global.key_facts["6236_ayahs"]}`);
  console.log(`Total letters: ${global.key_facts["328288_letters"]}`);
  console.log(`114 = 6x19: ${global.key_facts["114_is_6x19"]}`);

  assert(global.total_ayahs === 6236, 'Total ayahs is 6236');
  assert(global.total_surahs === 114, 'Total surahs is 114');
  assert(global.key_facts["114_is_6x19"] === true, '114 = 6 × 19');

  // Test 2: Surah data retrieval
  const surah1 = integrator.getSurahData(1);
  assert(surah1 !== undefined, 'Surah 1 (Al-Fatiha) found');
  if (surah1) {
    assert(surah1.ayahs === 7, 'Surah 1 has 7 ayahs');
    console.log(`Surah 1: ${surah1.name_en || (surah1 as any).name}, ${surah1.ayahs} ayahs, ${surah1.letters || (surah1 as any).total_letters} letters`);
  }

  const surah2 = integrator.getSurahData(2);
  assert(surah2 !== undefined, 'Surah 2 (Al-Baqarah) found');
  if (surah2) {
    assert(surah2.ayahs === 286, 'Surah 2 has 286 ayahs');
    console.log(`Surah 2: ${surah2.name_en || (surah2 as any).name}, ${surah2.ayahs} ayahs`);
  }

  // Test 3: SMT constraint generation
  const smt = integrator.generateSMTConstraints();
  assert(smt.includes('(set-logic QF_LIA)'), 'SMT contains QF_LIA logic');
  assert(smt.includes('total_ayahs'), 'SMT contains total_ayahs constraint');
  assert(smt.includes('114'), 'SMT contains 114 constraint');
  assert(smt.includes('(check-sat)'), 'SMT contains check-sat');

  console.log('\n--- Generated SMT Constraints ---');
  console.log(smt);

  // Test 4: Pattern analysis
  const patterns = global.patterns;
  console.log(`\nFibonacci surahs: ${patterns.fibonacci_surahs.join(', ')}`);
  assert(patterns.fibonacci_surahs.includes(1), 'Fibonacci includes Surah 1');
  assert(patterns.fibonacci_surahs.includes(89), 'Fibonacci includes Surah 89');

  // Test 5: Prime factorization
  const pf6236 = global.key_facts["6236_prime_factorization"];
  console.log(`\n6236 prime factorization: ${pf6236.join(' × ')}`);
  assert(pf6236.includes(1559), '1559 is a factor of 6236');
  assert(global.key_facts["1559_is_prime"], '1559 is prime');

  // Test 6: Symmetric pair sums (1+114, 2+113, etc.)
  console.log(`\nSymmetric pair sums: ${patterns.symmetric_pair_sums.slice(0, 5).join(', ')} ...`);
  assert(patterns.symmetric_pair_sums.length > 0, 'Symmetric sums exist');

  // Test 7: Meccan vs Medinan split
  const deepData = (integrator as any).rawData.deep;
  const analysisData = deepData.analysis || {};
  if (analysisData.revelation_split) {
    const rs = analysisData.revelation_split;
    console.log(`\nMeccan: ${rs.meccan.count} surahs, ${rs.meccan.total_ayahs} ayahs`);
    console.log(`Medinan: ${rs.medinan.count} surahs, ${rs.medinan.total_ayahs} ayahs`);
    assert(rs.meccan.count > 0, 'Has Meccan surahs');
    assert(rs.medinan.count > 0, 'Has Medinan surahs');
  }

  // Test 8: Odd vs Even analysis
  if (analysisData.odd_vs_even) {
    const oe = analysisData.odd_vs_even;
    console.log(`\nOdd surahs: ${oe.odd.count}, letters: ${oe.odd.total_letters}`);
    console.log(`Even surahs: ${oe.even.count}, letters: ${oe.even.total_letters}`);
  }

  console.log('\n===============================================');
  console.log('ALL QURAN TOE INTEGRATION TESTS PASSED');
  console.log('===============================================');
}

main().catch(e => console.error('TEST FAILED:', e));
