// WebGPU type declarations for TypeScript
interface GPUDevice extends EventTarget {
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  destroy(): void;
  queue: GPUQueue;
}

interface GPUQueue {
  writeBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource | SharedArrayBuffer, dataOffset?: GPUSize64, dataSize?: GPUSize64): void;
  submit(commandBuffers: Iterable<GPUCommandBuffer>): void;
  onSubmittedWorkDone(): Promise<void>;
}

interface GPUBuffer {
  size: number;
  usage: GPUBufferUsageFlags;
  mapAsync(mode: GPUMapModeFlags, offset?: GPUSize64, size?: GPUSize64): Promise<void>;
  getMappedRange(offset?: GPUSize64, size?: GPUSize64): ArrayBuffer;
  unmap(): void;
  destroy(): void;
}

interface GPUBufferDescriptor {
  size: GPUSize64;
  usage: GPUBufferUsageFlags;
  mappedAtCreation?: boolean;
}

interface GPUBindGroupLayout {
  label?: string;
}

interface GPUBindGroupLayoutDescriptor {
  label?: string;
  entries: GPUBindGroupLayoutEntry[];
}

interface GPUBindGroupLayoutEntry {
  binding: number;
  visibility: GPUShaderStageFlags;
  buffer?: GPUBufferBindingLayout;
  sampler?: GPUSamplerBindingLayout;
  texture?: GPUTextureBindingLayout;
  storageTexture?: GPUStorageTextureBindingLayout;
}

interface GPUBufferBindingLayout {
  type?: GPUBufferBindingType;
  hasDynamicOffset?: boolean;
  minBindingSize?: GPUSize64;
}

interface GPUBindGroup {
  label?: string;
}

interface GPUBindGroupDescriptor {
  layout: GPUBindGroupLayout;
  entries: GPUBindGroupEntry[];
}

interface GPUBindGroupEntry {
  binding: number;
  resource: GPUBindingResource;
}

type GPUBindingResource = GPUBufferBinding | GPUSampler | GPUTextureView;

interface GPUBufferBinding {
  buffer: GPUBuffer;
  offset?: GPUSize64;
  size?: GPUSize64;
}

interface GPUShaderModule {
  compilationInfo(): Promise<GPUCompilationInfo>;
}

interface GPUShaderModuleDescriptor {
  code: string;
  sourceMap?: object;
}

interface GPUComputePipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

interface GPUComputePipelineDescriptor {
  layout: GPUPipelineLayout | 'auto';
  compute: GPUProgrammableStage;
}

interface GPUPipelineLayout {
  label?: string;
}

interface GPUPipelineLayoutDescriptor {
  label?: string;
  bindGroupLayouts: GPUBindGroupLayout[];
}

interface GPUProgrammableStage {
  module: GPUShaderModule;
  entryPoint: string;
  constants?: Record<string, GPUPipelineConstantValue>;
}

interface GPUCommandEncoder {
  beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder;
  copyBufferToBuffer(source: GPUBuffer, sourceOffset: GPUSize64, destination: GPUBuffer, destinationOffset: GPUSize64, size: GPUSize64): void;
  finish(): GPUCommandBuffer;
}

interface GPUCommandBuffer {}

interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets?: Iterable<GPUSize64>): void;
  dispatchWorkgroups(workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number): void;
  end(): void;
}

interface GPUComputePassDescriptor {
  label?: string;
}

interface GPUCommandBufferDescriptor {
  label?: string;
}

interface GPUCompilationInfo {
  messages: readonly GPUCompilationMessage[];
}

interface GPUCompilationMessage {
  message: string;
  type: 'error' | 'warning' | 'info';
  lineNum?: number;
  linePos?: number;
  offset?: number;
  length?: number;
}

interface GPUSize64 extends Number {}

type GPUBufferUsageFlags = number;
type GPUShaderStageFlags = number;
type GPUMapModeFlags = number;
type GPUBufferBindingType = 'uniform' | 'storage' | 'read-only-storage' | 'read-write-storage';
type GPUMapMode = 'read' | 'write';
type GPUBufferUsage = 
  | 'MAP_READ'
  | 'MAP_WRITE'
  | 'COPY_SRC'
  | 'COPY_DST'
  | 'INDEX'
  | 'VERTEX'
  | 'UNIFORM'
  | 'STORAGE'
  | 'INDIRECT'
  | 'QUERY_RESOLVE';

const GPUBufferUsage = {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
};

interface GPUMapMode {
  readonly READ: 0x0001;
  readonly WRITE: 0x0002;
}

interface GPUShaderStage {
  readonly VERTEX: 0x1;
  readonly FRAGMENT: 0x2;
  readonly COMPUTE: 0x4;
}

interface Navigator {
  readonly gpu?: GPU;
}

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
  powerPreference?: 'low-power' | 'high-performance';
  forceFallbackAdapter?: boolean;
}

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
  limits: GPUSupportedLimits;
  features: GPUSupportedFeatures;
}

interface GPUDeviceDescriptor {
  label?: string;
  requiredFeatures?: Iterable<GPUFeatureName>;
  requiredLimits?: Partial<GPUSupportedLimits>;
}

interface GPUSupportedLimits {
  maxStorageBufferBindingSize: number;
  maxUniformBufferBindingSize: number;
}

interface GPUSupportedFeatures {
  has(feature: GPUFeatureName): boolean;
}

type GPUFeatureName = string;

interface GPUQueue {
  submit(commandBuffers: Iterable<GPUCommandBuffer>): void;
  onSubmittedWorkDone(): Promise<void>;
  writeBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource | SharedArrayBuffer, dataOffset?: GPUSize64, dataSize?: GPUSize64): void;
}

interface GPUCommandBuffer {}