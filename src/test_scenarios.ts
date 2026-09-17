/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: REAL-WORLD TEST SCENARIOS
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL PROBLEM SETS
 *
 * DESCRIPTION: Real problem inputs for vulnerability research,
 * code analysis, mathematical proofs, and formal verification.
 */

export interface TestScenario {
  name: string;
  category: 'vulnerability' | 'code-analysis' | 'math-proof' | 'formal-verification' | 'crypto';
  description: string;
  input: string;
  expectedVerdict: 'SAT' | 'UNSAT' | 'UNKNOWN';
  expectedFacts: string[];
  metadata?: Record<string, any>;
}

export const TEST_SCENARIOS: TestScenario[] = [
  // ==========================================
  // VULNERABILITY DETECTION
  // ==========================================
  {
    name: 'SQL Injection - Direct Concatenation',
    category: 'vulnerability',
    description: 'Detect SQLi via string concatenation in query construction',
    input: `The application constructs SQL queries by directly concatenating user input into the query string without parameterization. The user_supplied_id variable is concatenated into SELECT * FROM users WHERE id = ' + user_supplied_id + '. This allows SQL injection. The port is 5432.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['user_supplied_id concatenated into query', 'no parameterization used', 'port is 5432'],
    metadata: { cwe: 'CWE-89', severity: 'critical' }
  },
  {
    name: 'XSS - Unescaped Output',
    category: 'vulnerability',
    description: 'Detect reflected XSS via unescaped user input in HTML response',
    input: `The server reflects the search query parameter directly into the HTML response without HTML encoding. The user_input variable is written directly to response.write(user_input). This allows cross-site scripting. The content-type is text/html.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['user_input reflected without encoding', 'content-type is text/html', 'no output encoding'],
    metadata: { cwe: 'CWE-79', severity: 'high' }
  },
  {
    name: 'Path Traversal - Directory Access',
    category: 'vulnerability',
    description: 'Detect path traversal via unsanitized file path',
    input: `The file download endpoint uses user-supplied filename parameter directly in filesystem operations. The filepath variable is concatenated with base directory without path normalization. This allows directory traversal with ../ sequences. The base directory is /var/www/files.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['filepath concatenated without normalization', 'base directory is /var/www/files', 'allows ../ traversal'],
    metadata: { cwe: 'CWE-22', severity: 'high' }
  },
  {
    name: 'Command Injection - Shell Execution',
    category: 'vulnerability',
    description: 'Detect OS command injection via unsanitized input to shell',
    input: `The ping utility takes user-supplied host parameter and passes it directly to exec() without validation. The host variable is used in exec('ping -c 4 ' + host). This allows command injection with && or ;. The OS is Linux.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['host passed directly to exec', 'no input validation', 'OS is Linux'],
    metadata: { cwe: 'CWE-78', severity: 'critical' }
  },
  {
    name: 'SSRF - Internal Service Access',
    category: 'vulnerability',
    description: 'Detect server-side request forgery via user-controlled URL',
    input: `The webhook endpoint accepts a user-supplied URL and makes an HTTP request to it without validating the target. The url parameter is passed directly to fetch(). This allows accessing internal services like http://169.254.169.254/latest/meta-data/. The timeout is 30 seconds.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['user-supplied URL passed to fetch', 'no target validation', 'timeout is 30 seconds'],
    metadata: { cwe: 'CWE-918', severity: 'high' }
  },

  // ==========================================
  // CODE ANALYSIS
  // ==========================================
  {
    name: 'Use After Free - Memory Safety',
    category: 'code-analysis',
    description: 'Detect use-after-free in C++ code with pointer dereference after delete',
    input: `The C++ function allocates memory with new int[10], stores pointer in ptr, then calls delete[] ptr. Later the code dereferences ptr[5] = 42 after the delete. This is a use-after-free vulnerability. The pointer is not set to nullptr after delete.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['ptr allocated with new int[10]', 'delete[] ptr called', 'ptr dereferenced after delete', 'ptr not set to nullptr'],
    metadata: { language: 'cpp', cwe: 'CWE-416' }
  },
  {
    name: 'Buffer Overflow - Array Index',
    category: 'code-analysis',
    description: 'Detect buffer overflow via out-of-bounds array access',
    input: `The function declares int buffer[10] and iterates with for (int i = 0; i <= 10; i++) buffer[i] = i. The loop condition i <= 10 causes out-of-bounds write at index 10. The buffer size is 10 elements.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['buffer size is 10', 'loop condition i <= 10', 'out-of-bounds write at index 10'],
    metadata: { language: 'c', cwe: 'CWE-119' }
  },
  {
    name: 'Race Condition - TOCTOU',
    category: 'code-analysis',
    description: 'Detect time-of-check-time-of-use race condition',
    input: `The code checks file existence with access(file, R_OK) then opens it with open(file, O_RDONLY). Between the check and open, an attacker can replace the file with a symlink. The file path is /tmp/secure.txt. This is a TOCTOU race condition.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['access() check before open()', 'file path is /tmp/secure.txt', 'symlink attack possible'],
    metadata: { language: 'c', cwe: 'CWE-367' }
  },
  {
    name: 'Integer Overflow - Allocation Size',
    category: 'code-analysis',
    description: 'Detect integer overflow in memory allocation size calculation',
    input: `The function calculates allocation size as count * sizeof(item) where count is user-controlled 32-bit integer. If count is large enough, the multiplication overflows 32-bit integer resulting in smaller allocation. The maximum count is 0xFFFFFFFF. This leads to heap buffer overflow.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['count is user-controlled 32-bit integer', 'multiplication overflows 32-bit', 'results in smaller allocation'],
    metadata: { language: 'c', cwe: 'CWE-190' }
  },

  // ==========================================
  // MATHEMATICAL PROOFS
  // ==========================================
  {
    name: 'Fermat Last Theorem - n=3',
    category: 'math-proof',
    description: 'Verify no integer solutions to x^3 + y^3 = z^3 for positive integers',
    input: `Prove that there are no positive integer solutions to the equation x^3 + y^3 = z^3. This is a special case of Fermat's Last Theorem for n=3. The equation has no solutions in positive integers.`,
    expectedVerdict: 'SAT',
    expectedFacts: ['no positive integer solutions exist', 'x^3 + y^3 = z^3 has no solutions', 'Fermat Last Theorem n=3'],
    metadata: { theorem: 'Fermat n=3', proven: true }
  },
  {
    name: 'Pythagorean Triples',
    category: 'math-proof',
    description: 'Verify existence of integer solutions to x^2 + y^2 = z^2',
    input: `Prove that there exist positive integer solutions to x^2 + y^2 = z^2. For example 3^2 + 4^2 = 5^2. The equation has infinitely many solutions in positive integers.`,
    expectedVerdict: 'SAT',
    expectedFacts: ['infinitely many solutions exist', '3^2 + 4^2 = 5^2 is a solution', 'x^2 + y^2 = z^2'],
    metadata: { theorem: 'Pythagorean triples', proven: true }
  },
  {
    name: 'Goldbach Conjecture - Even Numbers',
    category: 'math-proof',
    description: 'Verify every even integer > 2 is sum of two primes (unproven)',
    input: `The Goldbach conjecture states that every even integer greater than 2 can be expressed as the sum of two primes. This conjecture remains unproven. For example 4 = 2+2, 6 = 3+3, 8 = 3+5.`,
    expectedVerdict: 'UNKNOWN',
    expectedFacts: ['conjecture remains unproven', '4 = 2+2', '6 = 3+3', '8 = 3+5'],
    metadata: { theorem: 'Goldbach', proven: false }
  },

  // ==========================================
  // FORMAL VERIFICATION
  // ==========================================
  {
    name: 'Mutex Lock/Unlock Pairing',
    category: 'formal-verification',
    description: 'Verify mutex lock/unlock are properly paired in all paths',
    input: `The function acquires mutex with lock(mtx), executes critical section, then releases with unlock(mtx). All code paths including exceptions must release the lock. The mutex is a std::mutex.`,
    expectedVerdict: 'SAT',
    expectedFacts: ['lock(mtx) acquired', 'unlock(mtx) released on all paths', 'mutex is std::mutex'],
    metadata: { property: 'mutex-pairing', language: 'cpp' }
  },
  {
    name: 'Array Bounds Check',
    category: 'formal-verification',
    description: 'Verify array access index is within bounds',
    input: `The function accesses array arr[index] where index is validated with assert(index >= 0 && index < size). The array size is 100. The index is 50. The access is within bounds.`,
    expectedVerdict: 'SAT',
    expectedFacts: ['array size is 100', 'index is 50', 'assert validates bounds', 'access is within bounds'],
    metadata: { property: 'array-bounds', language: 'c' }
  },
  {
    name: 'Loop Termination',
    category: 'formal-verification',
    description: 'Verify loop terminates with decreasing variant',
    input: `The while loop while (n > 0) { n = n - 1; } terminates because n is a natural number that decreases by 1 each iteration. The initial n is 10. The loop variant is n.`,
    expectedVerdict: 'SAT',
    expectedFacts: ['n is natural number', 'n decreases by 1 each iteration', 'initial n is 10', 'loop terminates'],
    metadata: { property: 'termination', language: 'generic' }
  },

  // ==========================================
  // CRYPTOGRAPHIC PROPERTIES
  // ==========================================
  {
    name: 'RSA Key Size - Factorization Resistance',
    category: 'crypto',
    description: 'Verify 2048-bit RSA modulus cannot be factored efficiently',
    input: `The RSA modulus n is a 2048-bit integer product of two 1024-bit primes p and q. Factoring n requires sub-exponential time with GNFS. No classical algorithm factors 2048-bit RSA in feasible time. The security level is approximately 112 bits.`,
    expectedVerdict: 'SAT',
    expectedFacts: ['n is 2048-bit', 'p and q are 1024-bit primes', 'GNFS requires sub-exponential time', 'security level 112 bits'],
    metadata: { algorithm: 'RSA', keySize: 2048 }
  },
  {
    name: 'ECDSA Nonce Reuse',
    category: 'crypto',
    description: 'Detect ECDSA private key recovery from nonce reuse',
    input: `Two ECDSA signatures use the same nonce k with different messages. The signatures are (r, s1) and (r, s2) with same r. The private key can be recovered as d = (s1 - s2)^-1 * (z1 - z2) mod n. This is a catastrophic key compromise.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['same nonce k used twice', 'signatures have same r', 'private key recoverable', 'catastrophic compromise'],
    metadata: { algorithm: 'ECDSA', vulnerability: 'nonce-reuse' }
  },
  {
    name: 'AES-GCM Nonce Reuse',
    category: 'crypto',
    description: 'Detect AES-GCM authentication key recovery from nonce reuse',
    input: `Two AES-GCM encryptions use the same nonce with same key. The authentication tags leak the GHASH key H. This allows forgery of arbitrary ciphertexts. The key is 256-bit. The nonce is 96-bit.`,
    expectedVerdict: 'UNSAT',
    expectedFacts: ['same nonce used twice', 'same key used', 'GHASH key H leaked', 'forgery possible'],
    metadata: { algorithm: 'AES-GCM', vulnerability: 'nonce-reuse' }
  }
];

export function getScenariosByCategory(category: TestScenario['category']): TestScenario[] {
  return TEST_SCENARIOS.filter(s => s.category === category);
}

export function getAllCategories(): TestScenario['category'][] {
  return ['vulnerability', 'code-analysis', 'math-proof', 'formal-verification', 'crypto'];
}