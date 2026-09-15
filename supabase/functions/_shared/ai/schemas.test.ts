// AI structured-output validation (plan section 19: "AI JSON validation" —
// malformed/schema-violating model output must be rejected by the
// Zod-backed parse() call, not silently accepted). Imports the real
// production schemas directly rather than a duplicated copy, so this
// actually tracks the deployed shape.
//
// Run with: deno test supabase/functions/_shared/ai/schemas.test.ts
//
// Not runnable from the Next.js side of this repo or Node/Vitest — these
// schemas use Deno's npm: specifier (import { z } from "npm:zod@4.5.4"),
// which only Deno's module resolver understands. Requires the Deno CLI,
// which was not available to verify this file executes in the sandbox
// this suite was written in — reviewed carefully against Zod's documented
// .safeParse() behaviour instead; run it for real the first time from an
// environment with Deno installed (e.g. via the Supabase CLI toolchain).

import { assertEquals } from "jsr:@std/assert@1";
import { OpportunitySchema } from "./schemas.ts";
import { OutreachSchema } from "../../generate-outreach/index.ts";

const validOpportunity = {
  project_summary: "Single-storey rear extension with a full re-roof.",
  project_type: "Rear extension + re-roof",
  project_complexity: "medium",
  estimated_total_project_value_low: 45000,
  estimated_total_project_value_high: 65000,
  likely_start_window: "4-8 weeks after approval",
  opportunity_timing: "Contact now",
  confidence_score: 0.88,
  trade_opportunities: [
    {
      trade_category_slug: "roofing",
      fit_score: 92,
      estimated_trade_value_low: 9000,
      estimated_trade_value_high: 14000,
      likely_scope: ["Strip and re-cover existing roof"],
      match_reasons: ["Explicit full re-roof mentioned in proposal"],
      recommended_action: "Call this week",
      recommended_contact_timing: "Within 7 days",
      confidence_score: 0.88,
      risk_flags: [],
    },
  ],
};

Deno.test("OpportunitySchema accepts a well-formed model response", () => {
  const result = OpportunitySchema.safeParse(validOpportunity);
  assertEquals(result.success, true);
});

Deno.test("OpportunitySchema rejects a missing required field", () => {
  const { project_summary: _drop, ...missingField } = validOpportunity;
  const result = OpportunitySchema.safeParse(missingField);
  assertEquals(result.success, false);
});

Deno.test("OpportunitySchema rejects an out-of-range confidence_score", () => {
  const result = OpportunitySchema.safeParse({ ...validOpportunity, confidence_score: 1.5 });
  assertEquals(result.success, false);
});

Deno.test("OpportunitySchema rejects an invalid project_complexity enum value", () => {
  const result = OpportunitySchema.safeParse({ ...validOpportunity, project_complexity: "huge" });
  assertEquals(result.success, false);
});

Deno.test("OpportunitySchema rejects a wrong-typed trade_opportunities entry", () => {
  const result = OpportunitySchema.safeParse({
    ...validOpportunity,
    trade_opportunities: [{ ...validOpportunity.trade_opportunities[0], fit_score: "very high" }],
  });
  assertEquals(result.success, false);
});

Deno.test("OpportunitySchema rejects free text instead of structured JSON", () => {
  const result = OpportunitySchema.safeParse("Sorry, I can't provide a value estimate for this application.");
  assertEquals(result.success, false);
});

Deno.test("OutreachSchema accepts a well-formed response", () => {
  const result = OutreachSchema.safeParse({
    intro_letter: "Dear homeowner, ...",
    phone_opener: "Hi, I noticed your recent planning approval...",
    doorstep_script: "Good morning, I'm a local roofer...",
  });
  assertEquals(result.success, true);
});

Deno.test("OutreachSchema rejects a response missing a required field", () => {
  const result = OutreachSchema.safeParse({ intro_letter: "Dear homeowner, ..." });
  assertEquals(result.success, false);
});
