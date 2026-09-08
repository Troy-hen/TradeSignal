import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@4.5.4";
import OpenAI from "npm:openai@7.10.0";
import { zodTextFormat } from "npm:openai@7.10.0/helpers/zod";

/**
 * User-triggered (not cron), so this keeps Supabase's default JWT
 * verification enabled (verify_jwt: true at deploy time) rather than the
 * custom CRON_SECRET scheme the other four functions use. Queries run
 * through a client built from the CALLER's own forwarded JWT, never
 * service-role — that's what makes has_active_lead_match() actually gate
 * this: an authenticated user with no active claim on this opportunity's
 * district+trade gets nothing back, the same as any other RLS-protected
 * read.
 *
 * Deliberately never queries applicant_name/agent_company — the model
 * receives no name or contact details, so it has nothing to fabricate a
 * relationship from. Copy is drafted only, never sent.
 *
 * Kept as its own small standalone OpenAI call rather than reusing
 * classify-planning-application's _shared/ai module: that module's
 * interface is shaped around the single Opportunity schema, and
 * generalising it purely to serve this second, much smaller "lightweight
 * assistant" (the spec's own description) risked destabilising an
 * already-deployed, verified function for limited benefit.
 */

const OutreachSchema = z.object({
  intro_letter: z.string(),
  phone_opener: z.string(),
  doorstep_script: z.string(),
});

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
    if (!parsed) return json({ error: "generation_failed" }, 502);

    return json({ ok: true, ...parsed });
  } catch (err) {
    return json({ error: "generation_failed", message: err instanceof Error ? err.message : String(err) }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
