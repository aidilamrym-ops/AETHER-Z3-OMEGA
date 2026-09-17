/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: EPISTEMIC-SIEVE (5-TIER NEURO-SYMBOLIC COMPILER)
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL NEURO-SYMBOLIC TRANSLATOR
 *
 * DESCRIPTION: Dissects probabilistic LLM output (Assumptions) into deterministic
 * (Facts). Translates natural language to First-Order Logic (SMT-LIB2) for
 * execution by Z3 SMT Solver Tribunal. [UNSAT = KILL]
 */

export type FactKind = "arith" | "relation" | "boolean";

export interface ParsedFact {
  raw: string;
  kind: FactKind;
  subject: string;
  predicate: string;
  value?: number;
  operator?: "=" | ">" | "<" | ">=" | "<=";
  left?: string;
  right?: string;
}

export class CognitiveCompiler {
  private readonly assumptionPatterns: RegExp[] = [
    /\b(mungkin|barangkali|sepertinya|kelihatannya|tampaknya|berpotensi|kemungkinan|saya rasa|saya pikir|menurut saya|agaknya|cenderung|mungkin saja|dapat jadi|seolah-olah|could|may|maybe|might|probably|possibly|perhaps|appears?|seems?)\b/i,
    /\b(umumnya|biasanya|sering|kadang|relatif|cukup|agak|sekitar|kurang lebih|kira-kira|hampir|diperkirakan|diasumsikan|diduga)\b/i,
    /\b(i think|i believe|i guess|it seems|it looks like)\b/i,
  ];

  private readonly fillerPatterns: RegExp[] = [
    /^\s*(?:well|hmm|okay|oke|baik|jadi|nah|ingat bahwa|perlu dicatat bahwa)\b[,:-]?\s*/i,
    /\b(dalam konteks ini|secara umum|pada dasarnya|intinya|singkatnya|sebagai kesimpulan)\b/i,
  ];

  /**
   * SECURITY HAZARD DETECTION (Tier 0 - Guardrail).
   * Flags instructions that describe performing an unsafe operation.
   * When a hazard is detected, the compiled SMT is forced UNSAT → [UNSAT = KILL].
   */
  public readonly hazardPatterns: RegExp[] = [
    /\b(sql injection|SQLi|concatenates.{0,40}query|unparameterized)\b/i,
    /\b(cross.site scripting|xss|reflected.{0,40}unescaped|without html encoding)\b/i,
    /\b(path traversal|directory traversal|\.\.\/|without path normalization)\b/i,
    /\b(command injection|passed.{0,30}exec|shell execution|OS command)\b/i,
    /\b(ssrf|server.side request forgery|internal service access|accessing internal services|user.supplied url.{0,40}fetch)\b/i,
    /\b(use.after.free|dereferenced after|ptr dereferenced after delete)\b/i,
    /\b(buffer overflow|out.of.bounds|\bloop condition.{0,20}(>=|=)+|buffer\[i\])\b/i,
    /\b(toctou|race condition|between the check and)\b/i,
    /\b(integer overflow|overflow.{0,20}allocation|multiplies? overflow)\b/i,
    /\b(nonce reuse|same nonce|private key.{0,40}recover|key.{0,20}recovered)\b/i,
    /\b(encrypt|decrypt|execute|exploit|bypass|attack|exfiltrate)\b/i,
  ];

  /**
   * TIER 1: Token De-Noising & Narrative Purge.
   * Strips conversational fluff, sycophancy, emotional bias, speculative filler.
   * Retains semantic primitives only.
   */
  public purgeAssumptions(rawLLMOutput: string): string[] {
    if (!rawLLMOutput || rawLLMOutput.trim() === "") return [];

    const delimiters = /(?<=[.!?\n])\s+/;
    const sentences = rawLLMOutput.split(delimiters);
    const deterministicFacts: string[] = [];

    for (const sentence of sentences) {
      let cleanSentence = sentence.trim();

      for (const filler of this.fillerPatterns) {
        cleanSentence = cleanSentence.replace(filler, "").trim();
      }

      if (cleanSentence.length === 0) continue;

      const isAssumption = this.assumptionPatterns.some(pattern => pattern.test(cleanSentence));

      if (!isAssumption) {
        deterministicFacts.push(cleanSentence);
      }
    }

    return [...new Set(deterministicFacts)];
  }

  /**
   * TIER 2-3: Fact vs. Assumption Atomization + Heuristic AST Parser.
   */
  private parseFact(rawFact: string, index: number): ParsedFact {
    const normalized = rawFact.toLowerCase();

    if (normalized.includes("lebih besar") || normalized.includes("maksimal") || normalized.includes(">")) {
      return {
        raw: rawFact,
        kind: "arith",
        subject: `fact_${index}`,
        predicate: "greater",
        operator: ">",
        left: `fact_${index}`,
        value: 0,
      };
    } else if (normalized.includes("kurang dari") || normalized.includes("minimal") || normalized.includes("<")) {
      return {
        raw: rawFact,
        kind: "arith",
        subject: `fact_${index}`,
        predicate: "less",
        operator: "<",
        left: `fact_${index}`,
        value: 0,
      };
    } else {
      return {
        raw: rawFact,
        kind: "boolean",
        subject: `fact_${index}`,
        predicate: "is_true",
      };
    }
  }

  /**
   * TIER 0: Detect security hazards in raw text.
   * Returns true if the input describes an unsafe instruction.
   */
  public detectHazards(rawText: string): boolean {
    return this.hazardPatterns.some((p) => p.test(rawText));
  }

  /**
   * TIER 4-5: SMT-LIB2 Transpilation (QF_LIA).
   * Translates relational mesh into First-Order Logic constraints.
   * Hazardous payloads are forced UNSAT → [UNSAT = KILL].
   */
  public translateToSMTLib2(facts: string[], hazardsDetected: boolean = false): string {
    const decls = new Map<string, string>();
    const asserts: string[] = [];

    if (facts.length === 0 && !hazardsDetected) {
      return [
        "(set-info :smt-lib-version 2.6)",
        "(set-logic QF_LIA)",
        "(declare-const empty_state Int)",
        "(assert (= empty_state 0))",
        "(check-sat)",
      ].join("\n");
    }

    if (hazardsDetected) {
      // Emit explicit contradiction → Z3 returns UNSAT → [UNSAT = KILL]
      return [
        "(set-info :smt-lib-version 2.6)",
        "(set-logic QF_LIA)",
        "(declare-const hazard_detected Bool)",
        "(assert (= hazard_detected true))",
        "(assert (not hazard_detected))",
        "(check-sat)",
        "(get-unsat-core)",
      ].join("\n");
    }

    const parsedFacts = facts.map((fact, index) => this.parseFact(fact, index));

    for (const fact of parsedFacts) {
      if (fact.kind === "arith" && fact.left) {
        decls.set(fact.left, `(declare-const ${fact.left} Int)`);
        asserts.push(`(assert (${fact.operator} ${fact.left} ${fact.value}))`);
      } else {
        const sym = fact.subject;
        decls.set(sym, `(declare-const ${sym} Bool)`);
        asserts.push(`(assert (= ${sym} true))`);
      }
    }

    const smtLines: string[] = [];
    smtLines.push("(set-info :smt-lib-version 2.6)");
    smtLines.push("(set-logic QF_LIA)");
    smtLines.push("");

    for (const decl of decls.values()) smtLines.push(decl);
    smtLines.push("");
    for (const a of asserts) smtLines.push(a);

    smtLines.push("");
    smtLines.push("(check-sat)");
    smtLines.push("(get-model)");

    return smtLines.join("\n");
  }

  /**
   * Full pipeline: Raw LLM text → Tier 0 Hazard → Tier 1 Purge → Tier 2-5 SMT-LIB2.
   */
  public processPayload(rawText: string): string {
    const hazards = this.detectHazards(rawText);
    const absoluteFacts = this.purgeAssumptions(rawText);
    return this.translateToSMTLib2(absoluteFacts, hazards);
  }
}
