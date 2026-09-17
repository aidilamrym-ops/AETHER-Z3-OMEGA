import { SovereignAgent } from './sovereign_agent.js';
import { mountDashboard } from './ui/dashboard.js';
import { RoPEKernel } from './gpu/rope_kernel.js';

export async function bootstrap() {
  console.log('Bootstrapping AETHER-Z3-OMEGA Sovereign OS...');

  // Initialize RoPE kernel
  const rope = new RoPEKernel();
  const input = new Float32Array(128).fill(1.0);
  const ropeRes = await rope.executeRoPE(input, 2, 64);
  console.log(`RoPE backend initialized: ${ropeRes.backend}`);

  // Initialize main agent
  const agent = new SovereignAgent();
  await agent.start();

  // Mount Dashboard if container exists
  const container = document.getElementById('app');
  if (container) {
    mountDashboard(container);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', bootstrap);
}
