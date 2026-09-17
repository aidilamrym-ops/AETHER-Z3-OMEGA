/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: KRONOS-HIPPOCAMPUS (HDC VAULT & STIGMERGIC BLACKBOARD)
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL ZERO-TRUST MEMORY
 */

const HYPERVECTOR_DIM = 10_000 as const;

export class HypervectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HypervectorError";
  }
}

export class PheromoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PheromoneError";
  }
}

export type HypervectorLike = Hypervector | Float32Array | ArrayLike<number>;

export interface PQEncryptedPayload {
  ciphertext: Uint8Array;
  nonce?: Uint8Array;
  encapsulatedKey?: Uint8Array;
  algorithm: string;
}

export interface PostQuantumEncryptor {
  encrypt(plain: Uint8Array): Promise<PQEncryptedPayload>;
}

export interface IndexedDBWriter {
  put(storeName: string, key: string, value: unknown): Promise<void>;
}

export interface StigmergicEntry {
  vectorId: string;
  weight: number;
  lastUpdated: number;
}

export class Hypervector {
  public static readonly DIMENSION = HYPERVECTOR_DIM;
  public data: Float32Array;

  constructor(data?: HypervectorLike) {
    if (data == null) {
      this.data = new Float32Array(HYPERVECTOR_DIM);
      return;
    }
    const arr = data instanceof Hypervector ? data.data : data;
    if (arr.length !== HYPERVECTOR_DIM) {
      throw new HypervectorError(`Expected dimension ${HYPERVECTOR_DIM}, received ${arr.length}.`);
    }
    this.data = arr instanceof Float32Array ? new Float32Array(arr) : Float32Array.from(arr as ArrayLike<number>);
  }

  public static zero(): Hypervector {
    return new Hypervector();
  }

  public static from(data: HypervectorLike): Hypervector {
    return new Hypervector(data);
  }

  public static random(seed = 0x9e3779b9): Hypervector {
    const out = new Float32Array(HYPERVECTOR_DIM);
    let x = seed | 0;
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      const u = (x >>> 0) / 0xffffffff;
      out[i] = u * 2 - 1;
    }
    return new Hypervector(out);
  }

  public clone(): Hypervector {
    return new Hypervector(this.data);
  }

  public bundle(other: HypervectorLike, out?: Float32Array): Hypervector {
    const rhs = Hypervector.ensure(other);
    const target = out ?? new Float32Array(HYPERVECTOR_DIM);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) target[i] = this.data[i] + rhs[i];
    return out ? this.withData(target) : new Hypervector(target);
  }

  public bundleInPlace(other: HypervectorLike): this {
    const rhs = Hypervector.ensure(other);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) this.data[i] += rhs[i];
    return this;
  }

  public bind(other: HypervectorLike, out?: Float32Array): Hypervector {
    const rhs = Hypervector.ensure(other);
    const target = out ?? new Float32Array(HYPERVECTOR_DIM);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) target[i] = this.data[i] * rhs[i];
    return out ? this.withData(target) : new Hypervector(target);
  }

  public bindInPlace(other: HypervectorLike): this {
    const rhs = Hypervector.ensure(other);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) this.data[i] *= rhs[i];
    return this;
  }

  public permute(shift: number, out?: Float32Array): Hypervector {
    const target = out ?? new Float32Array(HYPERVECTOR_DIM);
    const s = ((shift % HYPERVECTOR_DIM) + HYPERVECTOR_DIM) % HYPERVECTOR_DIM;
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      target[(i + s) % HYPERVECTOR_DIM] = this.data[i];
    }
    return out ? this.withData(target) : new Hypervector(target);
  }

  public permuteInPlace(shift: number): this {
    const s = ((shift % HYPERVECTOR_DIM) + HYPERVECTOR_DIM) % HYPERVECTOR_DIM;
    if (s === 0) return this;
    const tmp = new Float32Array(HYPERVECTOR_DIM);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      tmp[(i + s) % HYPERVECTOR_DIM] = this.data[i];
    }
    this.data.set(tmp);
    return this;
  }

  public scale(factor: number, out?: Float32Array): Hypervector {
    const target = out ?? new Float32Array(HYPERVECTOR_DIM);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) target[i] = this.data[i] * factor;
    return out ? this.withData(target) : new Hypervector(target);
  }

  public normalizeInPlace(epsilon = 1e-12): this {
    let norm2 = 0;
    for (let i = 0; i < HYPERVECTOR_DIM; i++) norm2 += this.data[i] * this.data[i];
    const norm = Math.sqrt(norm2);
    if (norm < epsilon) return this;
    const inv = 1 / norm;
    for (let i = 0; i < HYPERVECTOR_DIM; i++) this.data[i] *= inv;
    return this;
  }

  public dot(other: HypervectorLike): number {
    const rhs = Hypervector.ensure(other);
    let sum = 0;
    for (let i = 0; i < HYPERVECTOR_DIM; i++) sum += this.data[i] * rhs[i];
    return sum;
  }

  public similarity(other: HypervectorLike): number {
    const rhs = Hypervector.ensure(other);
    let a2 = 0;
    let b2 = 0;
    let ab = 0;
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      const a = this.data[i];
      const b = rhs[i];
      a2 += a * a;
      b2 += b * b;
      ab += a * b;
    }
    const denom = Math.sqrt(a2) * Math.sqrt(b2);
    return denom > 0 ? ab / denom : 0;
  }

  public toUint8(scale = 127): Uint8Array {
    const out = new Uint8Array(HYPERVECTOR_DIM);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      const v = Math.max(-1, Math.min(1, this.data[i]));
      out[i] = Math.round((v + 1) * scale);
    }
    return out;
  }

  public static fromUint8(encoded: Uint8Array, scale = 127): Hypervector {
    if (encoded.length !== HYPERVECTOR_DIM) {
      throw new HypervectorError(`Expected encoded dimension ${HYPERVECTOR_DIM}, received ${encoded.length}.`);
    }
    const out = new Float32Array(HYPERVECTOR_DIM);
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      out[i] = encoded[i] / scale - 1;
    }
    return new Hypervector(out);
  }

  public annihilate(): void {
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      this.data[i] = 0.0;
    }
  }

  private withData(data: Float32Array): Hypervector {
    const hv = Object.create(Hypervector.prototype) as Hypervector;
    hv.data = data;
    return hv;
  }

  private static ensure(input: HypervectorLike): Float32Array {
    if (input instanceof Hypervector) {
      return input.data;
    }
    if (input instanceof Float32Array) {
      if (input.length !== HYPERVECTOR_DIM) {
        throw new HypervectorError(`Expected dimension ${HYPERVECTOR_DIM}, received ${input.length}.`);
      }
      return input;
    }
    if (input.length !== HYPERVECTOR_DIM) {
      throw new HypervectorError(`Expected dimension ${HYPERVECTOR_DIM}, received ${input.length}.`);
    }
    return Float32Array.from(input);
  }
}

export class StigmergicBlackboard {
  private readonly pheromones = new Map<string, StigmergicEntry>();
  private readonly lambda: number;
  private now: () => number;

  constructor(lambda = 0.01, now: () => number = () => Date.now()) {
    if (!Number.isFinite(lambda) || lambda < 0) {
      throw new PheromoneError("lambda must be finite and non-negative.");
    }
    this.lambda = lambda;
    this.now = now;
  }

  public injectPheromone(vectorId: string, deltaWeight: number): StigmergicEntry {
    if (!vectorId || typeof vectorId !== "string") {
      throw new PheromoneError("vectorId must be a non-empty string.");
    }
    if (!Number.isFinite(deltaWeight)) {
      throw new PheromoneError("deltaWeight must be finite.");
    }

    const t = this.now();
    const current = this.pheromones.get(vectorId);
    if (current) {
      current.weight += deltaWeight;
      current.lastUpdated = t;
      return current;
    }

    const entry: StigmergicEntry = { vectorId, weight: deltaWeight, lastUpdated: t };
    this.pheromones.set(vectorId, entry);
    return entry;
  }

  public decayPheromones(timeDeltaMs: number): void {
    if (!Number.isFinite(timeDeltaMs) || timeDeltaMs < 0) {
      throw new PheromoneError("timeDeltaMs must be finite and non-negative.");
    }

    const decay = Math.exp(-this.lambda * timeDeltaMs);
    if (decay === 0) {
      this.pheromones.clear();
      return;
    }

    for (const [vectorId, entry] of this.pheromones) {
      entry.weight *= decay;
      entry.lastUpdated += timeDeltaMs;
      if (Math.abs(entry.weight) < 1e-12) {
        this.pheromones.delete(vectorId);
      }
    }
  }

  public getWeight(vectorId: string): number {
    const entry = this.pheromones.get(vectorId);
    return entry ? entry.weight : 0;
  }

  public getSnapshot(): ReadonlyArray<StigmergicEntry> {
    return Array.from(this.pheromones.values(), e => ({
      vectorId: e.vectorId,
      weight: e.weight,
      lastUpdated: e.lastUpdated,
    }));
  }

  public clear(): void {
    this.pheromones.clear();
  }

  public async flushToIndexedDB(
    writer: IndexedDBWriter,
    encryptor: PostQuantumEncryptor,
    storeName: string,
    key: string,
  ): Promise<void> {
    if (!writer || typeof writer.put !== "function") {
      throw new PheromoneError("writer.put is required.");
    }
    if (!encryptor || typeof encryptor.encrypt !== "function") {
      throw new PheromoneError("encryptor.encrypt is required.");
    }
    if (!storeName || !key) {
      throw new PheromoneError("storeName and key are required.");
    }

    const payload = this.serializeSnapshot();
    const encrypted = await encryptor.encrypt(payload);
    await writer.put(storeName, key, encrypted);
  }

  private serializeSnapshot(): Uint8Array {
    const snapshot = this.getSnapshot();
    const json = JSON.stringify({ lambda: this.lambda, entries: snapshot });
    return new TextEncoder().encode(json);
  }
}

export interface HippocampusVaultRecord {
  id: string;
  hypervector: Uint8Array;
  metadata?: Record<string, unknown>;
}

export class HippocampusHDCVault {
  private readonly encryptor: PostQuantumEncryptor;
  private readonly writer: IndexedDBWriter;
  private readonly storeName: string;

  constructor(encryptor: PostQuantumEncryptor, writer: IndexedDBWriter, storeName = "hippocampus-vault") {
    if (!encryptor || typeof encryptor.encrypt !== "function") {
      throw new HypervectorError("encryptor.encrypt is required.");
    }
    if (!writer || typeof writer.put !== "function") {
      throw new HypervectorError("writer.put is required.");
    }
    this.encryptor = encryptor;
    this.writer = writer;
    this.storeName = storeName;
  }

  public async store(id: string, vector: Hypervector, metadata?: Record<string, unknown>): Promise<void> {
    if (!id) throw new HypervectorError("id is required.");
    if (!(vector instanceof Hypervector)) throw new HypervectorError("vector must be a Hypervector.");

    const plaintext = this.serializeRecord({ id, hypervector: vector.toUint8(), metadata });
    const encrypted = await this.encryptor.encrypt(plaintext);
    await this.writer.put(this.storeName, id, encrypted);
  }

  public async flushToIndexedDB(): Promise<void> {
    throw new HypervectorError("flushToIndexedDB requires explicit record selection. Use store(id, vector, metadata).");
  }

  private serializeRecord(record: HippocampusVaultRecord): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(record));
  }
}

export class HypervectorPool {
  private readonly pool: Float32Array[] = [];
  private readonly capacity: number;

  constructor(capacity = 8) {
    this.capacity = Math.max(0, capacity | 0);
  }

  public acquire(): Float32Array {
    const item = this.pool.pop();
    return item ?? new Float32Array(HYPERVECTOR_DIM);
  }

  public release(buffer: Float32Array): void {
    if (!(buffer instanceof Float32Array) || buffer.length !== HYPERVECTOR_DIM) return;
    if (this.pool.length < this.capacity) {
      buffer.fill(0);
      this.pool.push(buffer);
    }
  }

  public clear(): void {
    for (const buf of this.pool) buf.fill(0);
    this.pool.length = 0;
  }
}

export function uncomputeInPlace(vector: Hypervector, mask?: HypervectorLike): Hypervector {
  if (mask) {
    const raw = mask instanceof Hypervector ? mask.data : mask;
    const rhs = raw instanceof Float32Array ? raw : Float32Array.from(raw as ArrayLike<number>);
    if (rhs.length !== HYPERVECTOR_DIM) {
      throw new HypervectorError(`Expected dimension ${HYPERVECTOR_DIM}, received ${rhs.length}.`);
    }
    for (let i = 0; i < HYPERVECTOR_DIM; i++) {
      vector.data[i] *= rhs[i] === 0 ? 0 : 1 / rhs[i];
    }
    return vector;
  }
  vector.data.fill(0);
  return vector;
}
