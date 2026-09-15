import OpenAI from "npm:openai@7.10.0";
import { zodTextFormat } from "npm:openai@7.10.0/helpers/zod";
import { OpportunitySchema } from "./schemas.ts";
import type { AiEnrichmentProvider, AiPromptVersion, EnrichmentResult } from "./types.ts";

/**
 * Default active provider (AI_ENRICHMENT_PROVIDER=openai). Uses the
 * Responses API's Structured Outputs (zodTextFormat) — the response is
 * validated against OpportunitySchema at the SDK level, not parsed from
 * free text.
 */
export class OpenAiEnrichmentProvider implements AiEnrichmentProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async enrich(promptVersion: AiPromptVersion, input: string): Promise<EnrichmentResult> {
    const startedAt = Date.now();
    try {
      const response = await this.client.responses.parse({
        model: promptVersion.model,
        input: [
          { role: "system", content: promptVersion.system_prompt },
          { role: "user", content: input },
        ],
        text: { format: zodTextFormat(OpportunitySchema, "opportunity") },
      });

      const parsed = response.output_parsed;
      if (!parsed) {
        return {
          success: false,
          rawResponse: response,
          latencyMs: Date.now() - startedAt,
          errorMessage: "Model response had no parsed output",
        };
      }

      return {
        success: true,
        data: parsed,
        rawResponse: response,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - startedAt,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
