import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@4.5.4";
import OpenAI from "npm:openai@7.10.0";
import { zodTextFormat } from "npm:openai@7.10.0/helpers/zod";

/**
 * User-triggered (not cron), so this keeps Supabase's default JWT
 * verification enabled (verify_jwt: true at deploy time).
 *
 * This function is deliberately limited before the OpenAI request:
 * two successful/reserved generations per opportunity, 20 per company/day
 * and 100 per company/month. Reservations are completed as succeeded or
 * failed so provider errors never silently spend a successful-generation slot.
 *
 * The model receives only the explicitly approved opportunity context:
 * trade, postcode district, project type, planning summary, likely scope and
 * recommended action. Applicant names, phone numbers, email addresses and
 * other contact fields are never queried or sent. Copy is drafted only,
 * never sent automatically.
 */

export const OutreachSchema = z.object({
  intro_letter: z.string(),
  phone_opener: z.string(),
  doorstep_script: z.string(),
});

type OutreachReservation = {
  generation_id: string | null;
  allowed: boolean;
  generation_count: number;
  remaining_generations: number;
  reason: string | null;
};

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  let opportunityId: string;
  try {
    const body = await req.json();
    if (typeof body?.opportunity_id !== "string") throw new Error("missing opportunity_id");
    opportunityId = body.opportunity_id;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: opportunity } = await userClient
    .from("application_trade_opportunities")
    .select("id, postcode_district, likely_scope, recommended_action, trade_category_id, application_classification_id")
    .eq("id", opportunityId)
    .maybeSingle();

  if (!opportunity) return json({ error: "not_found" }, 404);

  const [{ data: trade }, { data: classification }] = await Promise.all([
    userClient.from("trade_categories").select("name").eq("id", opportunity.trade_category_id).maybeSingle(),
    userClient
      .from("application_classifications")
      .select("project_type, summary")
      .eq("id", opportunity.application_classification_id)
      .maybeSingle(),
  ]);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "provider_not_configured" }, 500);

  const input = [
    `Trade: ${trade?.name ?? "the trade"}`,
    `Project type: ${classification?.project_type ?? "a building project"}`,
    `Location: ${opportunity.postcode_district}`,
    `Project summary: ${classification?.summary ?? "not available"}`,
    `Likely scope of work: ${(opportunity.likely_scope ?? []).join(", ") || "not specified"}`,
    `Recommended action: ${opportunity.recommended_action ?? "introduce the business and offer a free quote"}`,
  ].join("\n");

  const { data: reservationData, error: reservationError } = await userClient.rpc(
    "reserve_outreach_generation",
    { p_opportunity_id: opportunityId },
  );
  const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as OutreachReservation | null;

  if (reservationError || !reservation) {
    if (reservationError?.message?.includes("opportunity_not_found")) {
      return json({ error: "not_found" }, 404);
    }
    return json({ error: "usage_guard_unavailable" }, 503);
  }

  if (!reservation.allowed) {
    return json({
      ok: false,
      error: "usage_limit",
      reason: reservation.reason,
      used_generations: reservation.generation_count,
      remaining_generations: reservation.remaining_generations,
    });
  }

  if (!reservation.generation_id) return json({ error: "usage_guard_unavailable" }, 503);

  async function completeGeneration(
    status: "succeeded" | "failed",
    options: {
      inputTokens?: number | null;
      outputTokens?: number | null;
      errorCode?: string | null;
    } = {},
  ) {
    await userClient.rpc("complete_outreach_generation", {
      p_generation_id: reservation.generation_id,
      p_status: status,
      p_model: "gpt-5.1",
      p_input_tokens: options.inputTokens ?? null,
      p_output_tokens: options.outputTokens ?? null,
      p_estimated_cost_usd: null,
      p_error_code: options.errorCode ?? null,
    });
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.parse({
      model: "gpt-5.1",
      input: [
        {
          role: "system",
          content:
            "You write short, professional outreach copy for UK trade businesses approaching homeowners or " +
            "developers about a planning application relevant to their trade. You have NO applicant name or contact " +
            "details — never invent one, never claim an existing relationship or prior contact, and never guarantee " +
            "work. Write: (1) a brief introductory letter (3-4 short paragraphs, no placeholder brackets, addressed " +
            "generically e.g. 'Dear Homeowner' or by referencing the project/area rather than a name), (2) a phone " +
            "call opener (2-3 sentences, natural spoken tone), (3) a doorstep script (short, friendly, in-person " +
            "tone). All three must be usable as-is or with minimal editing, and must not state any fact beyond what " +
            "you were given.",
        },
        { role: "user", content: input },
      ],
      text: { format: zodTextFormat(OutreachSchema, "outreach") },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      await completeGeneration("failed", { errorCode: "invalid_response" });
      return json({ error: "generation_failed" }, 502);
    }

    await completeGeneration("succeeded", {
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    });

    return json({
      ok: true,
      ...parsed,
      usage: {
        used_generations: reservation.generation_count,
        remaining_generations: reservation.remaining_generations,
      },
    });
  } catch {
    await completeGeneration("failed", { errorCode: "provider_error" });
    return json({ error: "generation_failed" }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
