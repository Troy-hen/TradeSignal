import Anthropic from "npm:@anthropic-ai/sdk@0.124.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.124.0/helpers/zod";
import { OpportunitySchema } from "./schemas.ts";
import type { AiEnrichmentProvider, AiPromptVersion, EnrichmentResult } from "./types.ts";

/**
 * Fully-implemented swappable alternative to OpenAI (AI_ENRICHMENT_PROVIDER=
 * anthropic). Uses messages.parse() with output_config.format — the SDK's
 * own structured-output helper, verified directly against the installed
 * SDK's source (src/resources/messages/messages.ts) rather than assumed.
 */
export class AnthropicEnrichmentProvider implements AiEnrichmentProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async enrich(promptVersion: AiPromptVersion, input: string): Promise<EnrichmentResult> {
    const startedAt = Date.now();
    try {
      const message = await this.client.messages.parse({
        model: promptVersion.model,
        max_tokens: 4096,
        system: promptVersion.system_prompt,
        messages: [{ role: "user", content: input }],
        output_config: { format: zodOutputFormat(OpportunitySchema) },
      });

      const parsed = message.parsed_output;
      if (!parsed) {
        return {
          success: false,
          rawResponse: message,
          latencyMs: Date.now() - startedAt,
          errorMessage: "Model response had no parsed output",
        };
      }

      return {
        success: true,
        data: parsed,
        rawResponse: message,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
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
