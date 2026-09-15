import type { Opportunity } from "./schemas.ts";

export interface AiPromptVersion {
  id: string;
  model: string;
  system_prompt: string;
}

export interface EnrichmentResult {
  success: boolean;
  data?: Opportunity;
  rawResponse?: unknown;
  validationErrors?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  errorMessage?: string;
}

export interface AiEnrichmentProvider {
  name: string;
  enrich(promptVersion: AiPromptVersion, input: string): Promise<EnrichmentResult>;
}
