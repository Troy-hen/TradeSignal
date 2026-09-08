import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email/resend-client.ts";
import {
  newLeadInstantEmail,
  digestEmail,
  approvalAlertEmail,
  paymentFailedEmail,
  territoryAvailableEmail,
  type MatchSummary,
} from "../_shared/email/templates.ts";

/**
 * Triggered by pg_cron on three schedules with a { cadence } body: instant
 * (every 10 minutes), daily (07:00 UTC), weekly (Mondays 07:00 UTC). Also
 * handles approval alerts and any notification_log row a webhook/trigger queued
 * (payment_failed, territory_available) on every invocation regardless of
 * cadence — both are idempotent (guarded by triggered_notification /
 * status='queued'), so running them more often than strictly necessary is
 * harmless.
 *
 * notification_preferences has no default-row-creation trigger, so a
 * company with no row at all falls back to the documented product
 * defaults (score >=90 instant, all matches daily, approval alerts on).
 * Recipient is deliberately company-level (companies.billing_email), not
 * per-member — per-user preference overrides exist in the schema for a
 * future multi-seat flow but aren't consumed here yet.
 */

type Cadence = "instant" | "daily" | "weekly";

const DEFAULT_INSTANT_MIN_SCORE = 90;
const DEFAULT_DIGEST_MIN_SCORE = 0;
const DEFAULT_DIGEST_FREQUENCY: Cadence = "daily";
const MAX_MATCHES_PER_RUN = 500;

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let cadence: Cadence = "instant";
  try {
    const body = await req.json();
    if (body?.cadence === "daily" || body?.cadence === "weekly") cadence = body.cadence;
  } catch {
    // No/invalid body -> default instant.
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";

  const results = { newLeadEmails: 0, approvalAlerts: 0, queuedNotifications: 0, errors: 0 };

  await processNewLeadMatches(admin, appUrl, cadence, results);
  await processApprovalAlerts(admin, appUrl, results);
  await processQueuedNotifications(admin, appUrl, results);

  return json({ ok: true, cadence, ...results });
});

// deno-lint-ignore no-explicit-any
async function processNewLeadMatches(admin: any, appUrl: string, cadence: Cadence, results: Record<string, number>) {
  const { data: matches } = await admin
    .from("lead_matches")
    .select("id, company_id, application_trade_opportunity_id")
    .is("notified_at", null)
    .limit(MAX_MATCHES_PER_RUN);

  if (!matches || matches.length === 0) return;

  const oppIds = [...new Set(matches.map((m: { application_trade_opportunity_id: string }) => m.application_trade_opportunity_id))];
  const { data: opportunities } = await admin
    .from("application_trade_opportunities")
    .select(
      "id, opportunity_score, opportunity_bucket, postcode_district, trade_category_id, application_classification_id, estimated_trade_value_low, estimated_trade_value_high",
    )
    .in("id", oppIds);
  const oppById = new Map((opportunities ?? []).map((o: { id: string }) => [o.id, o]));

  const tradeIds = [...new Set((opportunities ?? []).map((o: { trade_category_id: string }) => o.trade_category_id))];
  const { data: trades } = await admin.from("trade_categories").select("id, name, slug").in("id", tradeIds);
  const tradeById = new Map((trades ?? []).map((t: { id: string }) => [t.id, t]));

  const classIds = [...new Set((opportunities ?? []).map((o: { application_classification_id: string }) => o.application_classification_id))];
  const { data: classifications } = await admin.from("application_classifications").select("id, project_type").in("id", classIds);
  const classById = new Map((classifications ?? []).map((c: { id: string }) => [c.id, c]));

  const companyIds = [...new Set(matches.map((m: { company_id: string }) => m.company_id))];
  const { data: companies } = await admin.from("companies").select("id, trading_name, billing_email").in("id", companyIds);
  const companyById = new Map((companies ?? []).map((c: { id: string }) => [c.id, c]));

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("company_id, instant_alert_min_score, digest_min_score, digest_frequency")
    .in("company_id", companyIds)
    .is("user_id", null);
  const prefByCompany = new Map((prefs ?? []).map((p: { company_id: string }) => [p.company_id, p]));

  const byCompany = new Map<string, { matchIds: string[]; summaries: MatchSummary[] }>();

  for (const m of matches) {
    const opp = oppById.get(m.application_trade_opportunity_id);
    if (!opp) continue;

    const pref = prefByCompany.get(m.company_id);
    const instantMin = pref?.instant_alert_min_score ?? DEFAULT_INSTANT_MIN_SCORE;
    const digestMin = pref?.digest_min_score ?? DEFAULT_DIGEST_MIN_SCORE;
    const digestFrequency = pref?.digest_frequency ?? DEFAULT_DIGEST_FREQUENCY;
    const score = opp.opportunity_score ?? 0;

    const eligible = cadence === "instant" ? score >= instantMin : cadence === digestFrequency && score >= digestMin;
    if (!eligible) continue;

    const trade = tradeById.get(opp.trade_category_id);
    const cls = classById.get(opp.application_classification_id);

    const entry = byCompany.get(m.company_id) ?? { matchIds: [], summaries: [] };
    entry.matchIds.push(m.id);
    entry.summaries.push({
      district: opp.postcode_district,
      tradeName: trade?.name ?? "Trade",
      projectType: cls?.project_type ?? null,
      score: opp.opportunity_score,
      bucket: opp.opportunity_bucket,
      valueLow: opp.estimated_trade_value_low,
      valueHigh: opp.estimated_trade_value_high,
      detailUrl: `${appUrl}/opportunities/${opp.id}`,
    });
    byCompany.set(m.company_id, entry);
  }

  for (const [companyId, entry] of byCompany) {
    const company = companyById.get(companyId);
    if (!company) continue;

    const template =
      cadence === "instant"
        ? newLeadInstantEmail({ companyName: company.trading_name, matches: entry.summaries })
        : digestEmail({
            companyName: company.trading_name,
            matches: entry.summaries,
            periodLabel: cadence === "daily" ? "today" : "this week",
            dashboardUrl: `${appUrl}/dashboard`,
          });

    const notificationType = cadence === "instant" ? "new_lead_instant" : `${cadence}_digest`;
    const sendResult = await sendEmail({ to: company.billing_email, subject: template.subject, html: template.html });

    if (sendResult.success) {
      await admin
        .from("lead_matches")
        .update({ notified_at: new Date().toISOString(), notification_channel: "email" })
        .in("id", entry.matchIds);
      await admin.from("notification_log").insert({
        company_id: companyId,
        notification_type: notificationType,
        status: "sent",
        subject: template.subject,
        provider_message_id: sendResult.messageId,
        sent_at: new Date().toISOString(),
      });
      results.newLeadEmails++;
    } else {
      await admin.from("notification_log").insert({
        company_id: companyId,
        notification_type: notificationType,
        status: "failed",
        subject: template.subject,
        error_message: sendResult.error,
      });
      results.errors++;
      // notified_at stays null on failure — naturally retried next tick.
    }
  }
}

// deno-lint-ignore no-explicit-any
async function processApprovalAlerts(admin: any, appUrl: string, results: Record<string, number>) {
  const { data: updates } = await admin
    .from("planning_application_updates")
    .select("id, planning_application_id")
    .eq("new_status", "approved")
    .eq("triggered_notification", false)
    .limit(100);

  for (const update of updates ?? []) {
    const { data: opportunities } = await admin
      .from("application_trade_opportunities")
      .select("id, postcode_district, trade_category_id, application_classification_id")
      .eq("planning_application_id", update.planning_application_id)
      .eq("is_active", true);

    for (const opp of opportunities ?? []) {
      const [{ data: matches }, { data: trade }, { data: cls }] = await Promise.all([
        admin.from("lead_matches").select("company_id").eq("application_trade_opportunity_id", opp.id),
        admin.from("trade_categories").select("name").eq("id", opp.trade_category_id).maybeSingle(),
        admin.from("application_classifications").select("project_type").eq("id", opp.application_classification_id).maybeSingle(),
      ]);

      for (const match of matches ?? []) {
        const { data: pref } = await admin
          .from("notification_preferences")
          .select("approval_alerts_enabled")
          .eq("company_id", match.company_id)
          .is("user_id", null)
          .maybeSingle();
        if (pref?.approval_alerts_enabled === false) continue; // explicit opt-out only

        const { data: company } = await admin
          .from("companies")
          .select("trading_name, billing_email")
          .eq("id", match.company_id)
          .maybeSingle();
        if (!company) continue;

        const template = approvalAlertEmail({
          companyName: company.trading_name,
          district: opp.postcode_district,
          tradeName: trade?.name ?? "Trade",
          projectType: cls?.project_type ?? null,
          detailUrl: `${appUrl}/opportunities/${opp.id}`,
        });

        const sendResult = await sendEmail({ to: company.billing_email, subject: template.subject, html: template.html });
        await admin.from("notification_log").insert({
          company_id: match.company_id,
          notification_type: "approval_alert",
          status: sendResult.success ? "sent" : "failed",
          subject: template.subject,
          provider_message_id: sendResult.success ? sendResult.messageId : null,
          sent_at: sendResult.success ? new Date().toISOString() : null,
          error_message: sendResult.success ? null : sendResult.error,
        });
        if (sendResult.success) results.approvalAlerts++;
        else results.errors++;
      }
    }

    // Marked handled after one best-effort attempt per matched company —
    // logged failures are visible on the admin health page; blindly
    // retrying on every future tick would risk duplicate sends to whichever
    // companies already succeeded.
    await admin.from("planning_application_updates").update({ triggered_notification: true }).eq("id", update.id);
  }
}

// deno-lint-ignore no-explicit-any
async function processQueuedNotifications(admin: any, appUrl: string, results: Record<string, number>) {
  const { data: queued } = await admin.from("notification_log").select("id, company_id, notification_type, metadata").eq("status", "queued").limit(100);

  for (const row of queued ?? []) {
    if (!row.company_id) {
      await admin.from("notification_log").update({ status: "failed", error_message: "no company_id" }).eq("id", row.id);
      results.errors++;
      continue;
    }

    const { data: company } = await admin.from("companies").select("trading_name, billing_email").eq("id", row.company_id).maybeSingle();
    if (!company) {
      await admin.from("notification_log").update({ status: "failed", error_message: "company not found" }).eq("id", row.id);
      results.errors++;
      continue;
    }

    let template: { subject: string; html: string } | null = null;

    if (row.notification_type === "payment_failed") {
      template = paymentFailedEmail({ companyName: company.trading_name, billingPortalUrl: `${appUrl}/billing` });
    } else if (row.notification_type === "territory_available") {
      const meta = row.metadata as { postcode_district?: string; trade_category_id?: string } | null;
      if (meta?.postcode_district && meta?.trade_category_id) {
        const { data: trade } = await admin.from("trade_categories").select("name, slug").eq("id", meta.trade_category_id).maybeSingle();
        if (trade) {
          template = territoryAvailableEmail({
            companyName: company.trading_name,
            district: meta.postcode_district,
            tradeName: trade.name,
            claimUrl: `${appUrl}/territories/${meta.postcode_district}/${trade.slug}`,
          });
        }
      }
    }

    if (!template) {
      await admin
        .from("notification_log")
        .update({ status: "failed", error_message: `Unhandled notification_type or missing metadata: ${row.notification_type}` })
        .eq("id", row.id);
      results.errors++;
      continue;
    }

    const sendResult = await sendEmail({ to: company.billing_email, subject: template.subject, html: template.html });
    await admin
      .from("notification_log")
      .update({
        status: sendResult.success ? "sent" : "failed",
        subject: template.subject,
        provider_message_id: sendResult.success ? sendResult.messageId : null,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.success ? null : sendResult.error,
      })
      .eq("id", row.id);

    if (sendResult.success) results.queuedNotifications++;
    else results.errors++;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
