/**
 * PHYSICS REASONING ENGINE
 * Dimensional analysis + conservation laws + ODE/PDE solvers
 */

// ─── DIMENSIONAL ANALYSIS ──────────────────────────────────────

export type PhysicalDimension =
  | 'length' | 'mass' | 'time'
  | 'current' | 'temperature' | 'amount' | 'luminous';

export interface DimensionTuple {
  length: number;
  mass: number;
  time: number;
  current: number;
  temperature: number;
  amount: number;
  luminous: number;
}

export const DIMENSIONS = {
  length: { length: 1, mass: 0, time: 0, current: 0, temperature: 0, amount: 0, luminous: 0 },
  mass: { length: 0, mass: 1, time: 0, current: 0, temperature: 0, amount: 0, luminous: 0 },
  time: { length: 0, mass: 0, time: 1, current: 0, temperature: 0, amount: 0, luminous: 0 },
  velocity: { length: 1, mass: 0, time: -1, current: 0, temperature: 0, amount: 0, luminous: 0 },
  acceleration: { length: 1, mass: 0, time: -2, current: 0, temperature: 0, amount: 0, luminous: 0 },
  force: { length: 1, mass: 1, time: -2, current: 0, temperature: 0, amount: 0, luminous: 0 },
  energy: { length: 2, mass: 1, time: -2, current: 0, temperature: 0, amount: 0, luminous: 0 },
  power: { length: 2, mass: 1, time: -3, current: 0, temperature: 0, amount: 0, luminous: 0 },
  momentum: { length: 1, mass: 1, time: -1, current: 0, temperature: 0, amount: 0, luminous: 0 },
  pressure: { length: -1, mass: 1, time: -2, current: 0, temperature: 0, amount: 0, luminous: 0 },
  frequency: { length: 0, mass: 0, time: -1, current: 0, temperature: 0, amount: 0, luminous: 0 },
  charge: { length: 0, mass: 0, time: 1, current: 1, temperature: 0, amount: 0, luminous: 0 },
  temperature_dim: { length: 0, mass: 0, time: 0, current: 0, temperature: 1, amount: 0, luminous: 0 },
  entropy: { length: 2, mass: 1, time: -2, current: 0, temperature: -1, amount: 0, luminous: 0 },
  mass_accel: { length: 1, mass: 1, time: -2, current: 0, temperature: 0, amount: 0, luminous: 0 },
} as const;

export function multiplyDims(a: DimensionTuple, b: DimensionTuple): DimensionTuple {
  return {
    length: a.length + b.length,
    mass: a.mass + b.mass,
    time: a.time + b.time,
    current: a.current + b.current,
    temperature: a.temperature + b.temperature,
    amount: a.amount + b.amount,
    luminous: a.luminous + b.luminous,
  };
}

export function divideDims(a: DimensionTuple, b: DimensionTuple): DimensionTuple {
  return {
    length: a.length - b.length,
    mass: a.mass - b.mass,
    time: a.time - b.time,
    current: a.current - b.current,
    temperature: a.temperature - b.temperature,
    amount: a.amount - b.amount,
    luminous: a.luminous - b.luminous,
  };
}

export function dimsToString(d: DimensionTuple): string {
  const parts: string[] = [];
  const labels: Array<[number, string]> = [
    [d.length, 'L'], [d.mass, 'M'], [d.time, 'T'],
    [d.current, 'I'], [d.temperature, 'θ'], [d.amount, 'N'], [d.luminous, 'J']
  ];
  for (const [exp, label] of labels) {
    if (exp !== 0) parts.push(`${label}^${exp}`);
  }
  return parts.length ? parts.join('·') : 'dimensionless';
}

export function checkDimensionallyConsistent(left: DimensionTuple, right: DimensionTuple): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class PhysicalQuantity {
  constructor(public value: number, public dimensions: DimensionTuple) {}
  multiply(other: PhysicalQuantity): PhysicalQuantity {
    return new PhysicalQuantity(this.value * other.value, multiplyDims(this.dimensions, other.dimensions));
  }
  divide(other: PhysicalQuantity): PhysicalQuantity {
    return new PhysicalQuantity(this.value / other.value, divideDims(this.dimensions, other.dimensions));
  }
  add(other: PhysicalQuantity): PhysicalQuantity {
    if (!checkDimensionallyConsistent(this.dimensions, other.dimensions)) {
      throw new Error(`Dimension mismatch: ${dimsToString(this.dimensions)} vs ${dimsToString(other.dimensions)}`);
    }
    return new PhysicalQuantity(this.value + other.value, this.dimensions);
  }
  toString(): string {
    return `${this.value} [${dimsToString(this.dimensions)}]`;
  }
}

// ─── CONSERVATION LAWS ─────────────────────────────────────────

export interface ConservationResult {
  satisfied: boolean;
  before: PhysicalQuantity;
  after: PhysicalQuantity;
  delta: number;
  law: string;
}

export function verifyEnergyConservation(
  mass: number,
  v1: number, v2: number,
  h1: number, h2: number,
  g = 9.81
): ConservationResult {
  const energy1 = 0.5 * mass * v1 * v1 + mass * g * h1;
  const energy2 = 0.5 * mass * v2 * v2 + mass * g * h2;
  const delta = Math.abs(energy1 - energy2);
  return {
    satisfied: delta < 1e-6,
    before: new PhysicalQuantity(energy1, DIMENSIONS.energy),
    after: new PhysicalQuantity(energy2, DIMENSIONS.energy),
    delta,
    law: 'Conservation of Mechanical Energy'
  };
}

export function verifyMomentumConservation(
  m1: number, m2: number,
  v1: number, v2: number,
  v1after: number, v2after: number
): ConservationResult {
  const before = m1 * v1 + m2 * v2;
  const after = m1 * v1after + m2 * v2after;
  const delta = Math.abs(before - after);
  return {
    satisfied: delta < 1e-6,
    before: new PhysicalQuantity(before, DIMENSIONS.momentum),
    after: new PhysicalQuantity(after, DIMENSIONS.momentum),
    delta,
    law: 'Conservation of Linear Momentum'
  };
}

// ─── ODE SOLVERS ───────────────────────────────────────────────

export type ODESystem = (t: number, y: number[]) => number[];

export function solveRK4(
  f: ODESystem,
  y0: number[],
  t0: number,
  t1: number,
  dt: number
): { t: number[]; y: number[][] } {
  const n = Math.ceil((t1 - t0) / dt);
  const result: { t: number[]; y: number[][] } = { t: [t0], y: [y0] };
  let t = t0;
  let y = [...y0];

  for (let i = 0; i < n; i++) {
    const k1 = f(t, y);
    const k2 = f(t + dt / 2, y.map((yi, idx) => yi + (dt / 2) * k1[idx]));
    const k3 = f(t + dt / 2, y.map((yi, idx) => yi + (dt / 2) * k2[idx]));
    const k4 = f(t + dt, y.map((yi, idx) => yi + dt * k3[idx]));

    y = y.map((yi, idx) => yi + (dt / 6) * (k1[idx] + 2 * k2[idx] + 2 * k3[idx] + k4[idx]));
    t += dt;
    result.t.push(t);
    result.y.push([...y]);
  }

  return result;
}

export function solveEuler(
  f: ODESystem,
  y0: number[],
  t0: number,
  t1: number,
  dt: number
): { t: number[]; y: number[][] } {
  const n = Math.ceil((t1 - t0) / dt);
  const result: { t: number[]; y: number[][] } = { t: [t0], y: [y0] };
  let t = t0;
  let y = [...y0];

  for (let i = 0; i < n; i++) {
    const k = f(t, y);
    y = y.map((yi, idx) => yi + dt * k[idx]);
    t += dt;
    result.t.push(t);
    result.y.push([...y]);
  }

  return result;
}

// ─── PHYSICS LAW VERIFICATION ──────────────────────────────────

export interface PhysicsLaw {
  name: string;
  statement: string;
  verify: (params: Record<string, number>) => { satisfied: boolean; delta: number; details: string };
  dimensions: DimensionTuple[];
}

export const PHYSICS_LAWS: PhysicsLaw[] = [
  {
    name: 'Newton\u2019s Second Law',
    statement: 'F = ma — Force equals mass times acceleration',
    verify: (p) => {
      const F = p.F, m = p.m, a = p.a;
      const delta = Math.abs(F - m * a);
      return { satisfied: delta < 1e-6, delta, details: `F=${F}, ma=${m*a}, Δ=${delta}` };
    },
    dimensions: [DIMENSIONS.force, DIMENSIONS.mass, DIMENSIONS.acceleration]
  },
  {
    name: 'Universal Gravitation',
    statement: 'F = G·m₁·m₂/r²',
    verify: (p) => {
      const F = p.F, G = p.G, m1 = p.m1, m2 = p.m2, r = p.r;
      const expected = G * m1 * m2 / (r * r);
      const delta = Math.abs(F - expected);
      return { satisfied: delta < 1e-6, delta, details: `F=${F}, predicted=${expected}, Δ=${delta}` };
    },
    dimensions: [DIMENSIONS.force]
  },
  {
    name: 'Ideal Gas Law',
    statement: 'PV = nRT',
    verify: (p) => {
      const P = p.P, V = p.V, n = p.n, R = p.R, T = p.T;
      const lhs = P * V;
      const rhs = n * R * T;
      const delta = Math.abs(lhs - rhs);
      return { satisfied: delta < 1e-6, delta, details: `PV=${lhs}, nRT=${rhs}, Δ=${delta}` };
    },
    dimensions: [DIMENSIONS.pressure]
  },
  {
    name: 'Einstein\u2019s Mass-Energy Equivalence',
    statement: 'E = mc²',
    verify: (p) => {
      const E = p.E, m = p.m, c = p.c ?? 299792458;
      const expected = m * c * c;
      const delta = Math.abs(E - expected);
      return { satisfied: delta < 1e-6, delta, details: `E=${E}, mc²=${expected}, Δ=${delta}` };
    },
    dimensions: [DIMENSIONS.energy, DIMENSIONS.mass]
  },
  {
    name: 'Hooke\u2019s Law',
    statement: 'F = -kx',
    verify: (p) => {
      const F = p.F, k = p.k, x = p.x;
      const expected = -k * x;
      const delta = Math.abs(F - expected);
      return { satisfied: delta < 1e-6, delta, details: `F=${F}, expected=${expected}, Δ=${delta}` };
    },
    dimensions: [DIMENSIONS.force]
  },
  {
    name: 'Planck Energy',
    statement: 'E = hf',
    verify: (p) => {
      const E = p.E, h = p.h, f = p.f;
      const expected = h * f;
      const delta = Math.abs(E - expected);
      return { satisfied: delta < 1e-6, delta, details: `E=${E}, hf=${expected}, Δ=${delta}` };
    },
    dimensions: [DIMENSIONS.energy, DIMENSIONS.frequency]
  }
];

export function verifyLaw(name: string, params: Record<string, number>): { satisfied: boolean; delta: number; details: string } | null {
  const law = PHYSICS_LAWS.find(l => l.name.toLowerCase().includes(name.toLowerCase()));
  if (!law) return null;
  return law.verify(params);
}

// ─── RELATIVISTIC PHYSICS ──────────────────────────────────────

export function relativisticGamma(v: number, c = 299792458): number {
  const beta = v / c;
  if (beta >= 1) return Infinity;
  return 1 / Math.sqrt(1 - beta * beta);
}

export function timeDilation(deltaT0: number, v: number, c = 299792458): number {
  const gamma = relativisticGamma(v, c);
  return deltaT0 * gamma;
}

export function lengthContraction(L0: number, v: number, c = 299792458): number {
  const gamma = relativisticGamma(v, c);
  return L0 / gamma;
}

export function relativisticMomentum(m0: number, v: number, c = 299792458): number {
  return m0 * v * relativisticGamma(v, c);
}

export function relativisticEnergy(m0: number, v: number, c = 299792458): {
  rest: number;
  total: number;
  kinetic: number;
} {
  const rest = m0 * c * c;
  const gamma = relativisticGamma(v, c);
  const total = gamma * rest;
  return { rest, total, kinetic: total - rest };
}

export function verifyTimeDilation(params: { deltaT: number; v: number; expected: number; c?: number }): boolean {
  const c = params.c ?? 299792458;
  const predicted = timeDilation(params.deltaT, params.v, c);
  return Math.abs(predicted - params.expected) < 1e-6 * Math.max(1, params.expected);
}

// ─── QUANTUM MECHANICS ─────────────────────────────────────────

export function deBroglieWavelength(p: number, h = 6.62607015e-34): number {
  return h / p;
}

export function heisenbergUncertainty(deltaX: number, deltaP: number, hbar = 1.054571817e-34): boolean {
  return deltaX * deltaP >= hbar / 2;
}

export function schrodingerEnergy(m: number, L: number, n: number, hbar = 1.054571817e-34): number {
  return (n * n * Math.PI * Math.PI * hbar * hbar) / (2 * m * L * L);
}

// ─── ELECTROMAGNETISM ──────────────────────────────────────────

export function coulombsLaw(q1: number, q2: number, r: number, k = 8.9875517923e9): number {
  return k * q1 * q2 / (r * r);
}

export function lorentzForce(q: number, E: number, v: number, B: number, theta = Math.PI / 2): number {
  return q * (E + v * B * Math.sin(theta));
}

export function maxwellSpeedDistribution(v: number, m: number, T: number, k = 1.380649e-23): number {
  const a = m / (2 * k * T);
  return 4 * Math.PI * Math.pow(m / (2 * Math.PI * k * T), 1.5) * v * v * Math.exp(-a * v * v);
}

// ─── THERMODYNAMICS ────────────────────────────────────────────

export function entropyChange(Q: number, T: number): number {
  return Q / T;
}

export function carnotEfficiency(THot: number, TCold: number): number {
  if (THot <= 0) return 0;
  return 1 - TCold / THot;
}

export function boltzmannEntropy(states: number, k = 1.380649e-23): number {
  return k * Math.log(states);
}

export function verifySecondLaw(params: { Q: number; T: number; entropyExpected: number }): boolean {
  const predicted = entropyChange(params.Q, params.T);
  return Math.abs(predicted - params.entropyExpected) < 1e-6;
}

// ─── PDE SOLVER (Heat Equation) ────────────────────────────────

export function solveHeatEquation(
  L: number, alpha: number,
  tEnd: number, nx: number, nt: number
): number[][] {
  const dx = L / (nx - 1);
  const dt = tEnd / nt;
  const u: number[][] = Array.from({ length: nt + 1 }, () => new Array(nx).fill(0));

  // Initial condition: u(x,0) = sin(pi*x/L)
  for (let i = 0; i < nx; i++) {
    u[0][i] = Math.sin(Math.PI * i * dx / L);
  }

  const r = alpha * dt / (dx * dx);
  for (let t = 1; t <= nt; t++) {
    for (let i = 1; i < nx - 1; i++) {
      u[t][i] = u[t-1][i] + r * (u[t-1][i+1] - 2*u[t-1][i] + u[t-1][i-1]);
    }
    // Boundary conditions u(0,t)=u(L,t)=0
  }

  return u;
}

export function verifyHeatConservation(alpha: number, t: number, L: number): number {
  // Analytical solution: u(x,t) = sin(pi*x/L) * exp(-alpha*pi^2*t/L^2)
  return Math.exp(-alpha * Math.PI * Math.PI * t / (L * L));
}

// ─── FLUID DYNAMICS (Navier-Stokes) ────────────────────────────

export function reynoldsNumber(rho: number, v: number, L: number, mu: number): number {
  return rho * v * L / mu;
}

export function bernoulliEquation(P1: number, v1: number, rho: number, h1: number, g = 9.81): 
  { energyDensity: number; } {
  return { energyDensity: P1 + 0.5 * rho * v1 * v1 + rho * g * h1 };
}

export function verifyBernoulli(
  P1: number, v1: number, rho: number, h1: number,
  P2: number, v2: number, h2: number, g = 9.81
): { satisfied: boolean; delta: number } {
  const e1 = P1 + 0.5 * rho * v1 * v1 + rho * g * h1;
  const e2 = P2 + 0.5 * rho * v2 * v2 + rho * g * h2;
  const delta = Math.abs(e1 - e2);
  return { satisfied: delta < 1e-6 * Math.max(1, Math.abs(e1)), delta };
}

export function poiseuilleFlow(deltaP: number, r: number, L: number, mu: number): number {
  return (Math.PI * r * r * r * r * deltaP) / (8 * mu * L);
}