declare const GPUShaderStage: any;
declare const GPUBufferUsage: any;
// /// <reference path="../types/webgpu.d.ts" />

/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: ROPE KERNEL (WebGPU Compute + CPU Fallback)
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL GPU COMPUTE WRAPPER
 */

export interface RoPEKernelResult {
  output: Float32Array;
  backend: 'webgpu' | 'cpu';
  elapsedMs: number;
  workgroupCount: number;
}

export class RoPEKernel {
  private device: any = null;
  private pipeline: any = null;
  private bindGroupLayout: any = null;
  private shaderModule: any = null;

  async initialize(): Promise<boolean> {
    const gpuAvailable = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
    if (!gpuAvailable) {
      console.warn('[ROPE_KERNEL] WebGPU not available; using CPU fallback.');
      return false;
    }

    try {
      const adapter = await ((navigator as any).gpu || {}).requestAdapter({
        powerPreference: 'high-performance'
      });
      if (!adapter) {
        console.warn('[ROPE_KERNEL] GPU adapter not found; using CPU fallback.');
        return false;
      }
      this.device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
          maxUniformBufferBindingSize: adapter.limits.maxUniformBufferBindingSize,
        }
      });
      
      // Compile shader
      const shaderCode = this.getShaderCode();
      this.shaderModule = this.device.createShaderModule({ code: shaderCode });
      
      // Create pipeline
      this.bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        ]
      });
      
      this.pipeline = this.device.createComputePipeline({
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
        compute: { module: this.shaderModule, entryPoint: 'main' }
      });
      
      console.log('[ROPE_KERNEL] WebGPU device & pipeline initialized.');
      return true;
    } catch (error) {
      console.warn('[ROPE_KERNEL] WebGPU init failed; using CPU fallback:', error);
      return false;
    }
  }

  private getShaderCode(): string {
    return `@group(0) @binding(0) var<storage, read> input_tensor : array<f32>;
@group(0) @binding(1) var<storage, read_write> output_tensor : array<f32>;
@group(0) @binding(2) var<uniform> dims : vec2<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let idx = gid.x;
  let seq_len = dims.x;
  let head_dim = dims.y;
  let half_dim = head_dim / 2u;

  if (idx >= seq_len * half_dim) { return; }

  let token_pos = f32(idx / half_dim);
  let dim_pos = f32(idx % half_dim);
  let base_freq = 10000.0;
  let inv_freq = 1.0 / pow(base_freq, (dim_pos * 2.0) / f32(head_dim));
  let theta = token_pos * inv_freq;

  let cos_theta = cos(theta);
  let sin_theta = sin(theta);

  let i0 = u32(idx / half_dim) * head_dim + dim_pos * 2u;
  let i1 = i0 + 1u;

  if (i0 < arrayLength(&input_tensor) && i1 < arrayLength(&input_tensor)) {
    let v0 = input_tensor[i0];
    let v1 = input_tensor[i1];
    output_tensor[i0] = v0 * cos_theta - v1 * sin_theta;
    output_tensor[i1] = v0 * sin_theta + v1 * cos_theta;
  }
}`;
  }

  async executeRoPE(input: Float32Array, seqLen: number, headDim: number): Promise<RoPEKernelResult> {
    const start = performance.now();
    
    if (this.device && this.pipeline && headDim % 2 === 0) {
      const output = await this.executeOnGPU(input, seqLen, headDim);
      return {
        output,
        backend: 'webgpu',
        elapsedMs: performance.now() - start,
        workgroupCount: Math.ceil(input.length / 64)
      };
    }
    
    const output = this.executeOnCPU(input, seqLen, headDim);
    return {
      output,
      backend: 'cpu',
      elapsedMs: performance.now() - start,
      workgroupCount: 0
    };
  }

  private async executeOnGPU(input: Float32Array, seqLen: number, headDim: number): Promise<Float32Array> {
    const dev = this.device!;
    const n = input.length;
    const output = new Float32Array(n);

    const inputBuf = dev.createBuffer({
      size: n * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    const outputBuf = dev.createBuffer({
      size: n * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const readBuf = dev.createBuffer({
      size: n * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    dev.queue.writeBuffer(inputBuf, 0, input);

    const uniformData = new Uint32Array([seqLen, headDim]);
    const uniformBuf = dev.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    dev.queue.writeBuffer(uniformBuf, 0, uniformData.buffer);

    const bindGroup = dev.createBindGroup({
      layout: this.bindGroupLayout!,
      entries: [
        { binding: 0, resource: { buffer: inputBuf } },
        { binding: 1, resource: { buffer: outputBuf } },
        { binding: 2, resource: { buffer: uniformBuf } },
      ]
    });

    const encoder = dev.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline!);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(n / 64));
    pass.end();
    
    encoder.copyBufferToBuffer(outputBuf, 0, readBuf, 0, n * 4);
    dev.queue.submit([encoder.finish()]);
    
    await dev.queue.onSubmittedWorkDone();
    await readBuf.mapAsync(0x0001);
    const result = new Float32Array(readBuf.getMappedRange());
    output.set(result);
    readBuf.unmap();

    // Amnesia: zero out GPU buffers
    inputBuf.destroy();
    outputBuf.destroy();
    readBuf.destroy();
    uniformBuf.destroy();

    return output;
  }

  private executeOnCPU(input: Float32Array, _seqLen: number, headDim: number): Float32Array {
    const n = input.length;
    const output = new Float32Array(n);

    for (let idx = 0; idx < n; idx += 2) {
      const token = Math.floor(idx / headDim);
      const dim = (idx % headDim) / 2;
      const invFreq = 1.0 / Math.pow(10000.0, (dim * 2.0) / headDim);
      const theta = token * invFreq;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const v0 = input[idx];
      const v1 = input[idx + 1] || 0;
      output[idx] = v0 * c - v1 * s;
      output[idx + 1] = v0 * s + v1 * c;
    }
    return output;
  }

  destroy(): void {
    this.pipeline = null;
    this.shaderModule = null;
    this.bindGroupLayout = null;
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
  }
}