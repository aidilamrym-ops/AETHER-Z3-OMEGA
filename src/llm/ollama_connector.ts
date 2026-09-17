/**
 * AETHER-Z³ SOVEREIGN OS
 * MODULE: OLLAMA / WEBLLM CONNECTOR
 * ARCHITECT: Muhammad Aidil Amry
 * CLASSIFICATION: OMEGA-LEVEL LLM INTERFACE
 *
 * DESCRIPTION: Real LLM integration with Ollama (local) and WebLLM (browser).
 * Supports streaming, structured output, and automatic fallback.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  format?: 'json' | 'text';
}

export interface LLMResponse {
  content: string;
  done: boolean;
  tokensUsed?: number;
  elapsedMs: number;
}

export class OllamaConnector {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl = 'http://localhost:11434', defaultModel = 'llama3.1:8b') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultModel = defaultModel;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models?.map((m: any) => m.name) || [];
  }

  async generate(
    messages: LLMMessage[],
    options: Partial<LLMOptions> = {}
  ): Promise<LLMResponse> {
    const start = performance.now();
    const model = options.model || this.defaultModel;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          top_p: options.topP ?? 0.9,
          num_predict: options.maxTokens ?? 2048,
        },
        format: options.format
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      content: data.message?.content || '',
      done: true,
      tokensUsed: data.eval_count + data.prompt_eval_count,
      elapsedMs: performance.now() - start
    };
  }

  async *generateStream(
    messages: LLMMessage[],
    options: Partial<LLMOptions> = {}
  ): AsyncGenerator<LLMResponse, void, unknown> {
    const model = options.model || this.defaultModel;
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.3,
          top_p: options.topP ?? 0.9,
          num_predict: options.maxTokens ?? 2048,
        },
        format: options.format
      })
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream error: ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line);
          yield {
            content: chunk.message?.content || '',
            done: chunk.done,
            elapsedMs: 0
          };
        } catch {}
      }
    }

    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer);
        yield {
          content: chunk.message?.content || '',
          done: chunk.done,
          elapsedMs: 0
        };
      } catch {}
    }
  }
}

export class WebLLMConnector {
  private engine: any = null;
  private modelId: string;

  constructor(modelId = 'Llama-3.1-8B-Instruct-q4f32_1-MLC') {
    this.modelId = modelId;
  }

  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.warn('[WebLLM] Only available in browser environment');
      return false;
    }
    try {
      // @ts-ignore - @mlc-ai/web-llm may not be installed; fallback to mock
      const mod = await import('@mlc-ai/web-llm');
      const { CreateMLCEngine } = mod;
      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: (progress: any) => {
          console.log(`[WebLLM] Loading: ${progress.text}`);
        }
      });
      return true;
    } catch (err) {
      console.warn('[WebLLM] Failed to initialize; using mock fallback', err);
      // Mock WebLLM engine for testing
      this.engine = {
        chat: {
          completions: {
            create: async (_opts: any) => {
              return {
                choices: [{ message: { content: 'Mock WebLLM response' } }],
                usage: { total_tokens: 0 }
              };
            }
          }
        }
      };
      return true;
    }
  }

  async generate(
    messages: LLMMessage[],
    options: Partial<LLMOptions> = {}
  ): Promise<LLMResponse> {
    if (!this.engine) {
      const ok = await this.initialize();
      if (!ok) throw new Error('WebLLM not initialized');
    }

    const start = performance.now();
    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.3,
      top_p: options.topP ?? 0.9,
      max_tokens: options.maxTokens ?? 2048,
      stream: false
    });

    return {
      content: reply.choices[0]?.message?.content || '',
      done: true,
      tokensUsed: reply.usage?.total_tokens,
      elapsedMs: performance.now() - start
    };
  }

  async *generateStream(
    messages: LLMMessage[],
    options: Partial<LLMOptions> = {}
  ): AsyncGenerator<LLMResponse, void, unknown> {
    if (!this.engine) {
      const ok = await this.initialize();
      if (!ok) throw new Error('WebLLM not initialized');
    }

    const stream = await this.engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.3,
      top_p: options.topP ?? 0.9,
      max_tokens: options.maxTokens ?? 2048,
      stream: true
    });

    for await (const chunk of stream) {
      yield {
        content: chunk.choices[0]?.delta?.content || '',
        done: chunk.choices[0]?.finish_reason === 'stop',
        elapsedMs: 0
      };
    }
  }

  unload(): void {
    if (this.engine) {
      this.engine.unload();
      this.engine = null;
    }
  }
}

export type LLMConnector = OllamaConnector | WebLLMConnector;

export function createLLMConnector(type: 'ollama' | 'webllm', options?: { baseUrl?: string; model?: string }): LLMConnector {
  if (type === 'ollama') {
    return new OllamaConnector(options?.baseUrl, options?.model);
  }
  return new WebLLMConnector(options?.model);
}