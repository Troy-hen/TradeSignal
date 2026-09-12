import { z } from "npm:zod@4.5.4";

/**
 * One combined structured-output call per application: project-level
 * fields + a list of per-trade packages, matching the spec's own example.
 * Both providers (OpenAI/Anthropic) enforce this at the SDK level via their
 * own structured-output helpers — never a hope-and-parse against free text.
 */
export const OpportunitySchema = z.object({
  project_summary: z.string(),
  project_type: z.string(),
  project_complexity: z.enum(["small", "medium", "large", "major"]),
  estimated_total_project_value_low: z.number(),
  estimated_total_project_value_high: z.number(),
  likely_start_window: z.string(),
  opportunity_timing: z.string(),
  confidence_score: z.number().min(0).max(1),
  trade_opportunities: z.array(
    z.object({
      trade_category_slug: z.string(),
      fit_score: z.number().min(0).max(100),
      estimated_trade_value_low: z.number(),
      estimated_trade_value_high: z.number(),
      likely_scope: z.array(z.string()),
      match_reasons: z.array(z.string()),
      recommended_action: z.string(),
      recommended_contact_timing: z.string(),
      confidence_score: z.number().min(0).max(1),
      risk_flags: z.array(z.string()),
    }),
  ),
});

export type Opportunity = z.infer<typeof OpportunitySchema>;
