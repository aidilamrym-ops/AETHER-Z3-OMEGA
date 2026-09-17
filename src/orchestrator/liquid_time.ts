/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: LEVIATHAN-CFC (LIQUID CONTINUOUS-TIME ORCHESTRATOR)
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL ZERO-RETRAINING SWARM COMMAND
 */

export interface OrchestratorConfig {
  stateSize: number;
  baseAggressiveness?: number;
  minAggressiveness?: number;
  maxAggressiveness?: number;
  anomalySensitivity?: number;
  epsilon?: number;
}

export interface SwarmInstruction {
  target: string;
  mode: "FAST_STEERING" | "DEEP_SCAN" | "TOTAL_WAR";
  timestamp: number;
}

export interface AgentModulation {
  temperature: number;
  systemPromptBias: string;
  concurrencyLimit: number;
}

export class LiquidTimeOrchestrator {
  public readonly stateSize: number;

  private readonly fParams: Float32Array;
  private readonly gParams: Float32Array;
  private readonly hParams: Float32Array;
  private readonly hiddenState: Float32Array;

  private readonly baseAggressiveness: number;
  private readonly minAggressiveness: number;
  private readonly maxAggressiveness: number;
  private readonly anomalySensitivity: number;
  private readonly epsilon: number;

  constructor(config: OrchestratorConfig) {
    if (!Number.isInteger(config.stateSize) || config.stateSize <= 0) {
      throw new Error("stateSize must be a positive integer");
    }

    this.stateSize = config.stateSize;
    this.baseAggressiveness = config.baseAggressiveness ?? 1.0;
    this.minAggressiveness = config.minAggressiveness ?? 0.25;
    this.maxAggressiveness = config.maxAggressiveness ?? 3.0;
    this.anomalySensitivity = config.anomalySensitivity ?? 1.75;
    this.epsilon = config.epsilon ?? 1e-6;

    this.fParams = new Float32Array(this.stateSize);
    this.gParams = new Float32Array(this.stateSize);
    this.hParams = new Float32Array(this.stateSize);
    this.hiddenState = new Float32Array(this.stateSize);

    for (let i = 0; i < this.stateSize; i++) {
      this.fParams[i] = 0.5 + (i % 7) * 0.03;
      this.gParams[i] = 0.2 + (i % 5) * 0.05;
      this.hParams[i] = 0.8 - (i % 3) * 0.04;
      this.hiddenState[i] = 0;
    }
  }

  public evaluateCfC(deltaT: number, inputStimulus: Float32Array): Float32Array {
    if (!Number.isFinite(deltaT) || deltaT < 0) {
      throw new Error("deltaT must be a finite non-negative number");
    }
    if (inputStimulus.length !== this.stateSize) {
      throw new Error(`inputStimulus length must equal stateSize (${this.stateSize})`);
    }

    const output = new Float32Array(this.stateSize);
    const dt = deltaT;

    for (let i = 0; i < this.stateSize; i++) {
      const stimulus = inputStimulus[i];
      const f = this.fParams[i] + stimulus * 0.15;
      const g = this.gParams[i] + stimulus * 0.35;
      const h = this.hParams[i] + stimulus * 0.10;

      const gate = this.sigmoid(-f * dt);
      const invGate = 1.0 - gate;

      output[i] = gate * g + invGate * h;
      this.hiddenState[i] = output[i];
    }

    return output;
  }

  public modulateAgentAggressiveness(cfcState: Float32Array): number {
    if (cfcState.length !== this.stateSize) {
      throw new Error(`cfcState length must equal stateSize (${this.stateSize})`);
    }

    let mean = 0;
    for (let i = 0; i < this.stateSize; i++) mean += cfcState[i];
    mean /= this.stateSize;

    let variance = 0;
    let energy = 0;
    let maxAbsDeviation = 0;

    for (let i = 0; i < this.stateSize; i++) {
      const v = cfcState[i];
      const d = v - mean;
      variance += d * d;
      energy += v * v;
      const ad = Math.abs(d);
      if (ad > maxAbsDeviation) maxAbsDeviation = ad;
    }

    variance /= this.stateSize;
    energy /= this.stateSize;

    const std = Math.sqrt(variance + this.epsilon);
    const normalizedEnergy = energy / (Math.abs(mean) + this.epsilon);

    const anomalyScore =
      (maxAbsDeviation / (std + this.epsilon)) * 0.55 +
      normalizedEnergy * 0.35 +
      (variance / (Math.abs(mean) + this.epsilon)) * 0.10;

    const dampening = 1.0 / (1.0 + Math.exp(-(anomalyScore - this.anomalySensitivity)));
    const multiplier =
      this.baseAggressiveness * (1.0 + 0.85 * dampening - 0.35 * Math.min(1.0, std));

    return this.clamp(multiplier, this.minAggressiveness, this.maxAggressiveness);
  }

  public modulateSwarmAggression(threatLevel: number): AgentModulation {
    const stimulusArray = new Float32Array(this.stateSize);
    for (let i = 0; i < this.stateSize; i++) {
      stimulusArray[i] = threatLevel;
    }

    const cfcState = this.evaluateCfC(0.016, stimulusArray);
    const multiplier = this.modulateAgentAggressiveness(cfcState);

    const temperature = multiplier;
    let bias = "OBSERVE_AND_ANALYZE";
    let concurrency = 2;

    if (temperature > 1.2) {
      bias = "MAXIMUM_LETHALITY_EXPLOIT";
      concurrency = 8;
    } else if (temperature > 0.8) {
      bias = "AGGRESSIVE_SCANNING";
      concurrency = 4;
    } else if (temperature < 0.3) {
      bias = "STEALTH_RECONNAISSANCE";
      concurrency = 1;
    }

    return { temperature, systemPromptBias: bias, concurrencyLimit: concurrency };
  }

  public async igniteSwarm(_instruction: SwarmInstruction): Promise<void> {
    // Execution hook for swarm ignition
  }

  public getHiddenState(): Float32Array {
    return new Float32Array(this.hiddenState);
  }

  public resetState(value = 0): void {
    for (let i = 0; i < this.stateSize; i++) {
      this.hiddenState[i] = value;
    }
  }

  private sigmoid(x: number): number {
    if (x >= 0) {
      const z = Math.exp(-x);
      return 1.0 / (1.0 + z);
    }
    const z = Math.exp(x);
    return z / (1.0 + z);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
