/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: UI DASHBOARD
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL VISUAL MONITOR
 *
 * DESCRIPTION: Simple web-based dashboard to monitor the sovereign agent's
 * internal states: Z3 SAT/UNSAT verdicts, HDC memory (10.000-D) vectors,
 * and automatic abort (amnesia) events in real-time.
 *
 * This dashboard uses DOM APIs and is intended to be loaded in a browser
 * environment (e.g., via a static HTML script tag). It demonstrates how
 * one could instrument the sovereign agent for observability.
 */

import { Hypervector } from '../memory/hippocampus';
import { IsentropicAmnesia } from '../crypto/amnesia';
import { LiquidTimeOrchestrator } from '../orchestrator/liquid_time';
import { LLMAgentConnector } from '../llm/connector';
import { Z3Status, Z3WasmBridge, SolverResult } from '../solver/semantic_loss';

/**
 * A mock Z3 bridge for demonstration purposes.
 * In a real deployment, this would be replaced by an actual WebWorker
 * that communicates with the Z3 SMT solver binary.
 */
class MockZ3Bridge implements Z3WasmBridge {
  async checkSat(smt2: string): Promise<SolverResult> {
    // Simple heuristic: if smt2 contains the word "contradiction", return UNSAT.
    const isUnsat = smt2.toLowerCase().includes('contradiction');
    return {
      status: isUnsat ? 'UNSAT' : 'SAT' as Z3Status,
      unsatCore: isUnsat ? ['fact_0'] : [],
      raw: isUnsat ? '(UNSAT: contradiction detected)' : '(SAT: All constraints satisfied)',
      model: undefined,
    };
  }
  getUnsatCore?(): Promise<string[]> {
    return Promise.resolve([]);
  }
  getModel?(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }
}

export class Dashboard {
  private container: HTMLElement;
  private connector: LLMAgentConnector;
  private mockZ3: MockZ3Bridge;
  private amnesia: IsentropicAmnesia;
  private liquid: LiquidTimeOrchestrator;
  private hv1: Hypervector;
  private hv2: Hypervector;
  private logEl!: HTMLElement;
  private smt2El!: HTMLElement;
  private verdictEl!: HTMLElement;
  private evolutionEl!: HTMLElement;
  private hdcEl!: HTMLElement;
  private amnesiaLogEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.connector = new LLMAgentConnector();
    this.mockZ3 = new MockZ3Bridge();
    this.amnesia = new IsentropicAmnesia();
    this.liquid = new LiquidTimeOrchestrator({ stateSize: 64 });
    this.hv1 = Hypervector.random(42);
    this.hv2 = Hypervector.random(137);
    this.initUI();
    this.startLoop();
  }

  private initUI(): void {
    this.container.innerHTML = `
      <h2>AETHER-Z³ Ω DASHBOARD</h2>
      <div class="grid">
        <section>
          <h3>LLM Input → SMT</h3>
          <textarea id="input" rows="3" placeholder="Enter LLM output..."></textarea>
          <button id="process">Process</button>
        </section>
        <section>
          <h3>SMT-LIB2 Output</h3>
          <pre id="smt2"></pre>
        </section>
        <section>
          <h3>Z3 Verdict</h3>
          <div id="verdict"></div>
        </section>
        <section>
          <h3>Evolution Triggered?</h3>
          <div id="evolution"></div>
        </section>
        <section>
          <h3>HDC Memory (10,000-D)</h3>
          <div id="hdc"></div>
        </section>
        <section>
          <h3>Activity Log</h3>
          <div id="log" style="height:200px;overflow:auto;border:1px solid #ccc;padding:4px;background:#f9f9f9;"></div>
        </section>
        <section>
          <h3>Amnesia Events</h3>
          <div id="amnesiaLog" style="height:100px;overflow:auto;border:1px solid #ccc;padding:4px;background:#ffeebb;"></div>
        </section>
      </div>
      <style>
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        h3 { margin-top: 0; }
        textarea, pre { width: 100%; box-sizing: border-box; font-family: monospace; }
        button { margin-top: 8px; padding: 6px 12px; }
        #verdict, #evolution { min-height: 20px; padding: 4px; background: #eee; }
        #hdc { font-size: 0.9em; }
        #log, #amnesiaLog { font-size: 0.85em; }
      </style>
    `;

    const inputEl = document.getElementById('input') as HTMLTextAreaElement;
    const processBtn = document.getElementById('process') as HTMLButtonElement;
    this.smt2El = document.getElementById('smt2') as HTMLPreElement;
    this.verdictEl = document.getElementById('verdict') as HTMLDivElement;
    this.evolutionEl = document.getElementById('evolution') as HTMLDivElement;
    this.hdcEl = document.getElementById('hdc') as HTMLDivElement;
    this.logEl = document.getElementById('log') as HTMLDivElement;
    this.amnesiaLogEl = document.getElementById('amnesiaLog') as HTMLDivElement;

    processBtn.addEventListener('click', async () => {
      const raw = inputEl.value.trim();
      if (!raw) return;
      this.log(`[INPUT] ${raw.substring(0, 100)}${raw.length > 100 ? '...' : ''}`);
      try {
        const result = await this.connector.processLLMOutput(raw, this.mockZ3);
        this.smt2El.textContent = result.smt2;
        this.verdictEl.textContent = `Z3: ${result.z3Verdict}`;
        this.verdictEl.style.color = result.z3Verdict === 'SAT' ? '#0a0' : '#f00';
        this.evolutionEl.textContent = result.evolutionApplied ? 'YES' : 'no';
        this.evolutionEl.style.color = result.evolutionApplied ? '#a80' : '#000';
        this.log(`[Z3] ${result.z3Verdict} | Evolution: ${result.evolutionApplied} | Time: ${result.performanceMetrics.processingTime.toFixed(2)}ms`);
        // Update HDC similarity
        this.updateHDC();
      } catch (e) {
        this.log(`[ERROR] ${e}`);
      }
    });

    // Initialize HDC display
    this.updateHDC();
  }

  private log(msg: string): void {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toTimeString().slice(0,8)}] ${msg}`;
    this.logEl.prepend(line);
    // Keep only last 50 lines
    while (this.logEl.children.length > 50) {
      this.logEl.removeChild(this.logEl.lastChild!);
    }
  }

  private updateHDC(): void {
    const sim = this.hv1.similarity(this.hv2);
    const vecA = this.hv1.data;
    const vecB = this.hv2.data;
    const formatVec = (v: Float32Array, n: number): string => {
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        parts.push(v[i].toFixed(2));
      }
      return parts.join(', ');
    };
    this.hdcEl.innerHTML =
      `<div>Vector A (first 5 vals): [${formatVec(vecA, 5)}]</div>` +
      `<div>Vector B (first 5 vals): [${formatVec(vecB, 5)}]</div>` +
      `<div>Similarity: ${sim.toFixed(4)}</div>`;
    // Occasionally mutate vectors to simulate changes
    if (Math.random() < 0.2) {
      this.hv1 = Hypervector.random(Date.now() % 1000);
      this.hv2 = Hypervector.random(Date.now() % 2000);
    }
  }

  private startLoop(): void {
    // Simulate periodic checks for amnesia and liquid time
    setInterval(() => {
      // Simulate liquid time evolution
      const stimulus = new Float32Array(64).map(() => Math.random() * 2 - 1);
      this.liquid.evaluateCfC(0.016, stimulus);
      const mod = this.liquid.modulateSwarmAggression(0.5);
      this.log(`[LIQUID] Aggressiveness: ${mod.temperature.toFixed(2)}`);

      // Simulate occasional amnesia trigger
      if (Math.random() < 0.05) {
        // Create a dummy vector and annihilate it
        const dummy = new Float32Array(10).fill(1.0);
        this.amnesia.scrubBuffer(dummy);
        const time = new Date().toTimeString().slice(0,8);
        const div = document.createElement('div');
        div.textContent = `[${time}] Amnesia triggered: memory scrubbed`;
        this.amnesiaLogEl.prepend(div);
        while (this.amnesiaLogEl.children.length > 20) {
          this.amnesiaLogEl.removeChild(this.amnesiaLogEl.lastChild!);
        }
        this.log('[AMNESIA] Memory scrubbed (zero‑entropy wipe)');
      }
    }, 2000);
  }
}

/**
 * Function to mount the dashboard into a given element (e.g., document.body).
 */
export function mountDashboard(container: HTMLElement): void {
  new Dashboard(container);
}