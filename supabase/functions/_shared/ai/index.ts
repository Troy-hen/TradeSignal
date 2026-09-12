import type { AiEnrichmentProvider } from "./types.ts";
import { OpenAiEnrichmentProvider } from "./openai-provider.ts";
import { AnthropicEnrichmentProvider } from "./anthropic-provider.ts";

/**
 * AI_ENRICHMENT_PROVIDER=openai (the default) needs OPENAI_API_KEY;
 * =anthropic needs ANTHROPIC_API_KEY. Switching providers is a deliberate
 * operational change — the active ai_prompt_versions row's `model` field
 * must also be updated to a model string valid for whichever provider is
 * now active (ai_prompt_versions has no provider column of its own, since
 * one prompt/schema is meant to work across providers; only the model
 * string is provider-specific).
 */
export function getAiProvider(): AiEnrichmentProvider {
  const providerName = Deno.env.get("AI_ENRICHMENT_PROVIDER") ?? "openai";

  if (providerName === "anthropic") {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured but AI_ENRICHMENT_PROVIDER=anthropic");
    return new AnthropicEnrichmentProvider(apiKey);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured but AI_ENRICHMENT_PROVIDER=openai");
  return new OpenAiEnrichmentProvider(apiKey);
}
